import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/AuthContext.jsx';
import { listReturns, listRefunds, listQcInspections } from '../../lib/api.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { CreditCardIcon, CheckIcon, ClockIcon } from '../../components/ui/icons.jsx';
import { generateCreditNotePdf } from '../../lib/creditNotePdf.js';
import { humanize } from '../../lib/enums.js';

function titleCase(s) {
  return (s || '').toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

export default function RefundStatus() {
  const { user } = useAuth();
  const [refunds, setRefunds] = useState([]);
  const [pendingReturns, setPendingReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [returnsRes, refundsRes, qcRes] = await Promise.all([
          listReturns({ customerId: user.id }),
          listRefunds({ customerId: user.id }),
          listQcInspections({ customerId: user.id }),
        ]);
        const myReturns = Array.isArray(returnsRes.data) ? returnsRes.data : [];
        const allRefunds = Array.isArray(refundsRes.data) ? refundsRes.data : [];
        const allQc = Array.isArray(qcRes.data) ? qcRes.data : [];

        const mine = allRefunds.map((rf) => {
          const retReq = rf.returnRequest || {};
          const ret = myReturns.find((r) => r.id === retReq.id) || retReq;
          const qc = allQc.find((q) => q.returnRequest?.id === (ret?.id || retReq.id));
          return {
            id: rf.id,
            returnId: ret?.id || retReq.id,
            orderId: ret?.orderId || retReq.orderId,
            reasonCode: ret?.reasonCode || retReq.reasonCode || 'RETURN',
            amount: rf.amount,
            method: rf.method,
            status: rf.status,
            initiatedAt: ret?.initiatedAt || retReq.initiatedAt,
            qcAt: qc?.inspectedAt,
            refundInitiatedAt: rf.initiatedAt,
            creditedAt: rf.creditedAt,
          };
        });
        setRefunds(mine);

        // Identify returns currently in reverse pipeline before refund initiation
        const refundedReturnIds = new Set(allRefunds.map((rf) => (rf.returnRequest?.id || rf.returnId)));
        const awaiting = myReturns.filter(
          (r) => !['REFUNDED', 'CLOSED', 'CANCELLED'].includes(r.status) && !refundedReturnIds.has(r.id)
        );
        setPendingReturns(awaiting);
      } catch (e) {
        console.error('RefundStatus load failed:', e);
        setError('Unable to retrieve your refunds at this time.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  if (loading) return <p className="text-text-secondary text-sm">Loading refunds…</p>;
  if (error) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg">
        {error}
      </div>
    );
  }
  if (refunds.length === 0 && pendingReturns.length === 0) {
    return (
      <div className="bg-white border border-border rounded-xl p-8 text-center text-text-secondary text-sm shadow-xs">
        <p className="font-semibold text-text mb-1">No active refunds</p>
        <p className="text-xs text-text-muted">Approved refunds will appear here once returned items complete quality control inspection.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active & Completed Refunds */}
      {refunds.map((r) => {
        const isCredited = r.status === 'CREDITED';
        const timeline = [
          { label: 'Return Initiated', done: !!r.initiatedAt, date: fmt(r.initiatedAt) },
          { label: 'QC Approved', done: !!r.qcAt || isCredited, note: (r.qcAt || isCredited) ? 'Item passed quality inspection' : undefined, date: fmt(r.qcAt) },
          { label: 'Refund Processing', done: !!r.refundInitiatedAt || isCredited, date: fmt(r.refundInitiatedAt) },
          { label: 'Refund Credited', done: isCredited, note: isCredited ? `Credited to your ${humanize(r.method)} account` : undefined, date: fmt(r.creditedAt) },
        ];
        return (
          <div key={r.id} className="bg-surface border border-border rounded-lg p-5 shadow-xs">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-primary-50 text-primary flex items-center justify-center shrink-0">
                  <CreditCardIcon />
                </div>
                <div>
                  <p className="font-medium text-text">{humanize(r.reasonCode)}</p>
                  <p className="text-xs text-text-secondary font-mono">
                    REF-{String(r.id || '').slice(0, 8)} · RTN-{String(r.returnId || '').slice(0, 8)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-base text-emerald-700">
                  ₹{Number(r.amount || 0).toLocaleString('en-IN')}{' '}
                  <span className="text-xs font-semibold text-emerald-800">INR</span>
                </p>
                <StatusBadge value={r.status} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-text-secondary uppercase mb-2">Refund Details</p>
                <Row label="Method" value={humanize(r.method)} />
                <Row label="Refund Amount (INR)" value={`₹${Number(r.amount || 0).toLocaleString('en-IN')} INR`} highlight />
                {r.status === 'CREDITED' && (
                  <div className="mt-3 bg-success-50 text-success text-xs rounded-lg p-3 flex items-center justify-between flex-wrap gap-2 border border-success-200">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckIcon /> Refund credited successfully.
                    </div>
                    <button
                      onClick={() =>
                        generateCreditNotePdf({
                          refundId: r.id,
                          returnId: r.returnId,
                          orderId: r.orderId || 'ORD-98214',
                          customerName: user.name || 'Customer',
                          amount: r.amount,
                          refundMethod: r.method,
                        })
                      }
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      📄 Download GST Credit Note (PDF)
                    </button>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary uppercase mb-2">Refund Timeline</p>
                <ol className="space-y-3">
                  {timeline.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5 ${s.done ? 'bg-success text-white' : 'border-2 border-border'}`}>
                        {s.done && <CheckIcon />}
                      </span>
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-medium ${s.done ? 'text-text' : 'text-text-muted'}`}>{s.label}</p>
                          {s.note && <p className="text-xs text-text-secondary">{s.note}</p>}
                        </div>
                        <span className="text-xs text-text-muted">{s.date || 'Pending'}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        );
      })}

      {/* In-Flight Returns Approaching Refund */}
      {pendingReturns.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-text flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-amber-600" />
              Returns In Pipeline (Awaiting QC Inspection & Refund Disbursement)
            </h3>
            <span className="text-xs text-text-muted">{pendingReturns.length} active return{pendingReturns.length > 1 ? 's' : ''}</span>
          </div>

          <div className="space-y-3">
            {pendingReturns.map((ret) => (
              <div key={ret.id} className="bg-white border border-amber-200/80 rounded-lg p-4 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-text">{humanize(ret.reasonCode)}</p>
                      <StatusBadge value={ret.status} />
                    </div>
                    <p className="text-xs text-text-muted font-mono mt-0.5">
                      Return ID: {String(ret.id).slice(0, 8)} · Initiated on {fmt(ret.initiatedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md font-medium">
                      Refund Method: <strong className="font-semibold">{humanize(ret.preferredRefundMethod)}</strong>
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-text-secondary">
                  <span>Logistics / Warehouse Status: <strong className="text-slate-800">{ret.status.replace(/_/g, ' ')}</strong></span>
                  <span className="text-primary font-medium">Settlement initiates immediately upon QC approval</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between text-sm py-1.5">
      <span className="text-text-secondary">{label}</span>
      <span className={highlight ? 'text-success font-semibold' : 'text-text font-medium'}>{value}</span>
    </div>
  );
}
