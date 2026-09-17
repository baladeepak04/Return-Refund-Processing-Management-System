import React, { useEffect, useState } from 'react';
import { BellIcon, CheckIcon, TruckIcon, ClockIcon, RefreshIcon, AlertIcon } from '../../components/ui/icons.jsx';
import { useAuth } from '../../lib/AuthContext.jsx';
import { listCommunications } from '../../lib/api.js';

// Milestone events and communication channel history.
const EVENT_META = {
  RETURN_INITIATED: { icon: <BellIcon />, tint: 'info', label: 'Return initiated' },
  PICKUP_SCHEDULED: { icon: <TruckIcon />, tint: 'info', label: 'Pickup scheduled' },
  QC_COMPLETE: { icon: <ClockIcon />, tint: 'warning', label: 'QC inspection complete' },
  REFUND_INITIATED: { icon: <RefreshIcon />, tint: 'info', label: 'Refund initiated' },
  REFUND_CREDITED: { icon: <CheckIcon />, tint: 'success', label: 'Refund credited' },
  REFUND_RECEIPT: { icon: <CheckIcon />, tint: 'info', label: 'Refund receipt (email)' },
  EXCHANGE_OUT_OF_STOCK: { icon: <AlertIcon />, tint: 'warning', label: 'Exchange item out of stock' },
  REPLACEMENT_DISPATCHED: { icon: <TruckIcon />, tint: 'info', label: 'Replacement dispatched' },
};
const DEFAULT_META = { icon: <AlertIcon />, tint: 'info', label: 'Update' };

const TINTS = {
  success: 'bg-success-50 text-success',
  warning: 'bg-warning-50 text-warning',
  info: 'bg-info-50 text-info',
};

export default function Notifications() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await listCommunications({ customerId: user.id });
      setRows(res.data);
    } catch (e) {
      console.error('customer Notifications error:', e);
      setError(e?.response?.data?.detail || 'Unable to synchronize communications and notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8 text-center animate-pulse max-w-2xl">
        <p className="text-sm font-medium text-text-secondary">Loading return milestones and notifications…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-3">
      {error && (
        <div className="bg-surface rounded-xl border border-danger-200 p-4 shadow-xs flex items-center justify-between">
          <p className="text-sm font-medium text-danger">{error}</p>
          <button
            onClick={loadData}
            className="px-3 py-1 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      )}
      {!error && rows.length === 0 && (
        <div className="bg-surface border border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-sm text-text-secondary">No notifications yet — you'll see updates here as your returns progress.</p>
        </div>
      )}
      {rows.map((n) => {
        const meta = EVENT_META[n.eventType] || DEFAULT_META;
        return (
          <div key={n.id} className="bg-surface border border-border rounded-lg p-4 flex gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${TINTS[meta.tint]}`}>
              {meta.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text">{meta.label}</p>
                <span className="text-xs text-text-muted">{n.sentAt ? new Date(n.sentAt).toLocaleString('en-IN') : '—'}</span>
              </div>
              <p className="text-sm text-text-secondary mt-0.5">
                Return {String(n.returnRequest?.id || '').slice(0, 8)} · via {n.channel}
                {n.status === 'FAILED' && <span className="text-danger"> · delivery failed</span>}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
