import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '../../components/ui/Card.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import { BoxIcon, RefreshIcon, ClockIcon, CreditCardIcon, CheckIcon, TruckIcon } from '../../components/ui/icons.jsx';
import { useAuth } from '../../lib/AuthContext.jsx';
import { listReturns, setPreferredChannel } from '../../lib/api.js';
import { humanize } from '../../lib/enums.js';
import TrackingModal from '../../components/modals/TrackingModal.jsx';

// Return lifecycle sequence for progress tracking.
const STATUS_ORDER = [
  'INITIATED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'RECEIVED',
  'QC_IN_PROGRESS', 'QC_DONE', 'REFUND_INITIATED', 'REFUNDED',
];
const STATUS_LABEL = {
  INITIATED: 'Return Initiated', PICKUP_SCHEDULED: 'Pickup Scheduled', IN_TRANSIT: 'Item In Transit',
  RECEIVED: 'Item Received', QC_IN_PROGRESS: 'QC In Progress', QC_DONE: 'QC Complete',
  REFUND_INITIATED: 'Refund Initiated', REFUNDED: 'Refund Credited',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [channel, setChannel] = useState(user?.preferredChannel || 'SMS');
  const [channelSaving, setChannelSaving] = useState(false);
  const [trackingTarget, setTrackingTarget] = useState(null);

  async function handleChannelChange(e) {
    const value = e.target.value;
    setChannel(value);
    setChannelSaving(true);
    try {
      await setPreferredChannel(value);
    } finally {
      setChannelSaving(false);
    }
  }
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await listReturns({ customerId: user.id });
        const list = Array.isArray(res.data) ? res.data : [];
        setReturns(list.filter((r) => !r.draft));
      } catch (e) {
        console.error('customer Dashboard error:', e, {
          message: e?.message, code: e?.code, config: e?.config,
        });
        setError(e?.response?.data?.detail || 'Unable to retrieve your return requests.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  if (loading) return <p className="text-sm text-text-secondary">Loading dashboard…</p>;

  const active = returns.filter((r) => !['REFUNDED', 'CLOSED', 'CANCELLED'].includes(r.status));
  const recent = [...returns].sort((a, b) => new Date(b.initiatedAt) - new Date(a.initiatedAt)).slice(0, 3);
  const trackedReturn = recent[0];
  const trackedIndex = trackedReturn && !['CANCELLED'].includes(trackedReturn.status)
    ? STATUS_ORDER.indexOf(trackedReturn.status) : -1;

  const hasPickup = trackedReturn && ['PICKUP_SCHEDULED', 'IN_TRANSIT', 'RECEIVED', 'QC_DONE', 'REFUNDED'].includes(trackedReturn.status);
  const otpCode = trackedReturn ? trackedReturn.id.substring(0, 4).toUpperCase() : '4921';

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg p-6 flex items-center justify-between">
        <div>
          <p className="text-white/80">Good morning,</p>
          <h2 className="text-2xl font-bold">{user?.name}</h2>
          <p className="text-white/80 mt-1">You have {active.length} active return{active.length !== 1 ? 's' : ''}.</p>
        </div>
        <Link to="/customer/initiate-return">
          <Button variant="outline" className="!bg-white !text-primary">New Return →</Button>
        </Link>
      </div>

      <div className="bg-surface border border-border rounded-lg p-3 flex items-center justify-between max-w-sm">
        <span className="text-xs text-text-secondary">Notification preference:</span>
        <select value={channel} onChange={handleChannelChange} disabled={channelSaving} aria-label="Notification channel preference" className="text-sm border border-border rounded-md px-2 py-1">
          <option value="SMS">SMS</option>
          <option value="EMAIL">Email</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
      </div>

      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Returns" value={returns.length} icon={<BoxIcon />} tint="primary" />
        <StatCard label="Active Returns" value={active.length} icon={<RefreshIcon />} tint="warning" />
        <StatCard label="Completed Returns" value={returns.filter((r) => r.status === 'REFUNDED').length} icon={<CreditCardIcon />} tint="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text">Recent Returns</h3>
            <Link to="/customer/return-history" className="text-sm text-primary hover:underline">View all →</Link>
          </div>

          {recent.length === 0 ? (
            <p className="text-sm text-text-muted">No returns yet.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center text-text-muted"><BoxIcon /></div>
                    <div>
                      <p className="text-sm font-semibold text-text truncate max-w-sm" title={r.items?.[0]?.productName || humanize(r.reasonCode)}>
                        {r.items?.[0]?.productName || humanize(r.reasonCode)}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        <span className="font-mono text-primary font-medium">#{String(r.id).slice(0, 8)}</span>
                        <span> · {humanize(r.reasonCode)}</span>
                        {r.refundAmount && (
                          <span className="font-semibold text-slate-800 ml-1.5">
                            · ₹{Number(r.refundAmount).toLocaleString('en-IN')}
                          </span>
                        )}
                        <span> · {new Date(r.initiatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={r.status} />
                    {['PICKUP_SCHEDULED', 'IN_TRANSIT', 'RECEIVED', 'QC_DONE', 'REFUNDED'].includes(r.status) && (
                      <button
                        type="button"
                        onClick={() => setTrackingTarget(r)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-primary/30 text-primary bg-primary-50/50 hover:bg-primary-100 rounded-md transition-colors"
                        title="Track Telemetry"
                      >
                        <TruckIcon className="w-3.5 h-3.5" />
                        Track
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text">Return Tracking</h3>
              {trackedReturn && <span className="text-xs text-primary font-medium font-mono">#{String(trackedReturn.id).slice(0, 8)}</span>}
            </div>

            {/* Doorstep Pickup Security OTP Card (FR3 & FR11) */}
            {trackedReturn && trackedReturn.status === 'PICKUP_SCHEDULED' && (
              <div className="mb-4 p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold text-amber-900 tracking-wider">
                    Doorstep Handover OTP
                  </span>
                  <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded">
                    Shiprocket Express
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div>
                    <span className="text-2xl font-mono font-bold text-slate-900 tracking-widest">
                      {otpCode}
                    </span>
                    <p className="text-[10px] text-amber-800 mt-0.5 leading-tight">
                      Share with field logistics executive upon physical item handover.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTrackingTarget(trackedReturn)}
                    className="px-2.5 py-1 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shrink-0 shadow-2xs"
                  >
                    Track Live
                  </button>
                </div>
              </div>
            )}

            {!trackedReturn ? (
              <p className="text-sm text-text-muted">No return to track yet.</p>
            ) : (
              <ol className="space-y-3.5">
                {STATUS_ORDER.map((status, i) => (
                  <li key={status} className="flex gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5 ${i <= trackedIndex ? 'bg-success text-white' : 'border-2 border-border'}`}>
                      {i <= trackedIndex && <CheckIcon />}
                    </span>
                    <p className={`text-xs font-medium ${i <= trackedIndex ? 'text-text' : 'text-text-muted'}`}>{STATUS_LABEL[status]}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {hasPickup && (
            <button
              type="button"
              onClick={() => setTrackingTarget(trackedReturn)}
              className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-primary bg-primary-50 hover:bg-primary-100 border border-primary-200/80 rounded-lg transition-colors"
            >
              <TruckIcon className="w-4 h-4" />
              <span>View Full Transit Telemetry</span>
            </button>
          )}
        </div>
      </div>

      <TrackingModal
        isOpen={!!trackingTarget}
        onClose={() => setTrackingTarget(null)}
        returnRequest={trackingTarget}
        pickup={trackingTarget ? { awbNumber: `AWB${trackingTarget.id.substring(0, 8).toUpperCase()}`, logisticsPartner: 'SHIPROCKET' } : null}
      />
    </div>
  );
}
