import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { AlertIcon, CheckIcon, ClockIcon, UsersIcon } from '../../components/ui/icons.jsx';
import { listReturns, listCommunications, listUsers } from '../../lib/api.js';
import { humanize } from '../../lib/enums.js';

// Operations queue summary across active returns, overrides, and fraud reviews.
export default function Dashboard() {
  const [returns, setReturns] = useState([]);
  const [comms, setComms] = useState([]);
  const [userMap, setUserMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [returnsRes, commsRes, usersRes] = await Promise.all([
          listReturns(),
          listCommunications(),
          listUsers().catch(() => ({ data: [] })),
        ]);
        const retList = Array.isArray(returnsRes.data) ? returnsRes.data : [];
        setReturns(retList);
        setComms(Array.isArray(commsRes.data) ? commsRes.data : []);

        const map = new Map();
        (usersRes.data || []).forEach((u) => {
          if (u.id) map.set(String(u.id).toLowerCase(), u);
        });
        setUserMap(map);
      } catch (e) {
        console.error('support Dashboard error:', e);
        setError(e?.response?.data?.detail || 'Unable to load support dashboard metrics.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openReturns = returns.filter((r) => !['REFUNDED', 'CLOSED', 'CANCELLED'].includes(r.status));
  const resolvedTotal = returns.filter((r) => ['REFUNDED', 'CLOSED'].includes(r.status)).length;
  const uniqueCustomers = new Set(returns.map((r) => r.customerId)).size;

  if (loading) return <p className="text-sm text-text-secondary py-8 text-center">Loading support dashboard…</p>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open Returns" value={openReturns.length} icon={<AlertIcon />} tint="warning" />
        <StatCard label="Resolved" value={resolvedTotal} icon={<CheckIcon />} tint="success" />
        <StatCard label="Total Returns" value={returns.length} icon={<ClockIcon />} tint="info" />
        <StatCard label="Customers Involved" value={uniqueCustomers} icon={<UsersIcon />} tint="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-text text-base">Open Returns</h2>
              <p className="text-xs text-text-muted">Return requests requiring logistics or inspection attention</p>
            </div>
            <button onClick={() => navigate('/support/return-lookup')} className="text-sm text-primary font-medium hover:underline">
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {openReturns.length === 0 && <p className="text-sm text-text-muted py-4 text-center">No open returns right now.</p>}
            {openReturns.slice(0, 6).map((r) => {
              const u = userMap.get(String(r.customerId).toLowerCase());
              const customerName = u?.name || r.customerName || `Customer ${String(r.customerId).slice(0, 8)}`;
              const productName = r.items?.[0]?.productName || 'Order Product';
              const refundVal = r.refundAmount ? `₹${Number(r.refundAmount).toLocaleString('en-IN')}` : null;

              return (
                <div key={r.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50 border-b border-border last:border-0 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-text">{customerName}</span>
                        <span className="font-mono text-xs text-primary font-medium bg-primary-50 px-1.5 py-0.5 rounded">
                          #{String(r.id).slice(0, 8)}
                        </span>
                        <span className="text-xs text-slate-500 font-normal">· {humanize(r.reasonCode)}</span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5 truncate" title={productName}>
                        <span className="font-medium text-slate-700">{productName}</span>
                        {refundVal && <span className="text-slate-500 font-semibold ml-2">({refundVal})</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <StatusBadge value={r.status} />
                    <Button size="sm" variant="outline" onClick={() => navigate(`/support/return-lookup?q=${String(r.id).slice(0, 8)}`)}>
                      Handle
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 shadow-xs">
          <h2 className="font-semibold text-text text-base mb-1">Recent Activity</h2>
          <p className="text-xs text-text-muted mb-4">Real-time notification milestones</p>
          <ul className="space-y-3 mb-5">
            {comms.length === 0 && <li className="text-xs text-text-muted py-3 text-center">No communications logged yet.</li>}
            {comms.slice(0, 4).map((c) => (
              <ActivityItem
                key={c.id}
                title={humanize(c.eventType)}
                note={`via ${humanize(c.channel)} ${c.returnRequest?.customerName ? `· ${c.returnRequest.customerName}` : ''}`}
                time={c.sentAt ? new Date(c.sentAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : ''}
              />
            ))}
          </ul>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Quick Actions</p>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/support/return-lookup')}>
              Override Return Window
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/support/return-lookup')}>
              Lookup Return by ID
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/support/customer-search')}>
              Search Customer Directory
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ title, note, time }) {
  return (
    <li className="flex gap-2.5">
      <span className="w-5 h-5 rounded-full bg-success-50 text-success flex items-center justify-center shrink-0 mt-0.5">
        <CheckIcon className="w-3 h-3" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text">{title}</p>
        {note && <p className="text-[11px] text-text-secondary truncate">{note}</p>}
      </div>
      <span className="text-[11px] text-text-muted shrink-0">{time}</span>
    </li>
  );
}
