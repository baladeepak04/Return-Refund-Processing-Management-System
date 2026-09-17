import React, { useEffect, useState } from 'react';
import DataTable from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { humanize } from '../../lib/enums.js';
import { listRefunds, listReturns } from '../../lib/api.js';
import { generateCreditNotePdf } from '../../lib/creditNotePdf.js';

const METHOD_ICONS = {
  BANK_TRANSFER: '🏦',
  ORIGINAL_METHOD: '💳',
  STORE_CREDIT: '🎁',
};

export default function ApprovedRefunds() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [refRes, retRes] = await Promise.all([
        listRefunds(),
        listReturns().catch(() => ({ data: [] })),
      ]);
      const refunds = Array.isArray(refRes.data) ? refRes.data : [];
      const returns = Array.isArray(retRes.data) ? retRes.data : [];
      const returnMap = new Map(returns.map((r) => [r.id, r]));

      const approved = refunds
        .filter((r) => r.status !== 'PENDING')
        .map((r) => {
          const ret = returnMap.get(r.returnRequest?.id) || r.returnRequest || {};
          const customerName =
            ret.customerName ||
            r.returnRequest?.customerName ||
            (ret.customerId ? `Customer ${String(ret.customerId).slice(0, 8)}` : 'Retail Customer');
          const customerEmail = ret.customerEmail || r.returnRequest?.customerEmail || '';
          const productName =
            ret.items?.[0]?.productName ||
            r.returnRequest?.items?.[0]?.productName ||
            'Settled Return Merchandise';
          const returnId = ret.id || r.returnRequest?.id;
          const orderId = ret.orderId || r.returnRequest?.orderId;
          const methodLabel = humanize(r.method);
          const disbursedAt = r.creditedAt || r.initiatedAt || new Date().toISOString();

          return {
            ...r,
            customerName,
            customerEmail,
            productName,
            returnId,
            orderId,
            methodLabel,
            disbursedAt,
          };
        });

      // Sort newest-first so recently approved refunds appear at the top
      approved.sort((a, b) => new Date(b.disbursedAt || 0) - new Date(a.disbursedAt || 0));

      setRows(approved);
    } catch (e) {
      console.error('finance ApprovedRefunds error:', e);
      setError(
        e?.response?.data?.detail ||
          'Unable to synchronize approved refund records. Please verify service connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns = [
    {
      key: 'id',
      header: 'Refund ID',
      render: (r) => (
        <span className="text-primary font-mono font-semibold text-xs">
          #{String(r.id).slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'productName',
      header: 'Product Name',
      sortable: true,
      render: (r) => (
        <div className="max-w-[210px]">
          <p className="font-semibold text-slate-900 text-xs truncate" title={r.productName}>
            {r.productName}
          </p>
          {r.returnId && (
            <span className="text-[10px] text-text-muted font-mono">
              Return #{String(r.returnId).slice(0, 8)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-semibold text-text text-xs">{r.customerName}</p>
          {r.customerEmail && (
            <p className="text-[10px] text-text-muted">{r.customerEmail}</p>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (r) => (
        <span className="font-heading font-bold text-slate-900 text-xs">
          ₹{Number(r.amount).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
          <span>{METHOD_ICONS[r.method] || '💵'}</span>
          <span>{r.methodLabel}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge value={r.status} />,
    },
    {
      key: 'disbursedAt',
      header: 'Disbursed (Date & Time)',
      sortable: true,
      render: (r) => {
        const ts = r.disbursedAt || r.creditedAt || r.initiatedAt;
        return ts ? (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 text-xs">
              {new Date(ts).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className="text-[10px] text-text-muted font-mono font-medium">
              {new Date(ts).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          </div>
        ) : (
          '—'
        );
      },
    },
    {
      key: 'action',
      header: 'GST Compliance',
      render: (r) => (
        <button
          onClick={() =>
            generateCreditNotePdf({
              refundId: r.id,
              returnId: r.returnId,
              orderId: r.orderId,
              customerName: r.customerName,
              amount: r.amount,
              refundMethod: r.method,
              bankRef: r.razorpayRefundId || `UTR-${String(r.id).slice(0, 8).toUpperCase()}`,
              itemDescription: r.productName,
              quantity: 1,
            })
          }
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-primary bg-primary-50 border border-primary-100 hover:bg-primary-100 transition-colors shadow-xs"
        >
          <span>📄</span>
          <span>GST Credit Note</span>
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8 text-center animate-pulse">
        <p className="text-sm font-medium text-text-secondary">Loading settlement records…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface rounded-xl border border-danger-200 p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-danger">{error}</p>
          <button
            onClick={loadData}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-md transition-colors shadow-xs"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <DataTable
      title="Approved & Settled Refunds"
      columns={columns}
      rows={rows}
      initialSortKey="disbursedAt"
      initialSortDir="desc"
      searchKeys={[
        'id',
        'productName',
        'customerName',
        'customerEmail',
        'methodLabel',
        'status',
        'amount',
      ]}
      exportFilename="approved-refunds"
    />
  );
}
