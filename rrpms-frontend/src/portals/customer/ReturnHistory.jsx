import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataTable from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Select, Input, Textarea } from '../../components/ui/Input.jsx';
import { humanize } from '../../lib/enums.js';
import { useAuth } from '../../lib/AuthContext.jsx';
import { listReturns, listReturnDrafts, finalizeReturnDraft, schedulePickup, reschedulePickup, submitSatisfaction } from '../../lib/api.js';
import { useEventStream } from '../../lib/useEventStream.js';
import ShippingLabelModal from '../../components/modals/ShippingLabelModal.jsx';
import TrackingModal from '../../components/modals/TrackingModal.jsx';
import FeedbackModal from '../../components/modals/FeedbackModal.jsx';
import { PrinterIcon, TruckIcon, StarIcon } from '../../components/ui/icons.jsx';

export default function ReturnHistory() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [finalizingId, setFinalizingId] = useState(null);
  const [finalizeError, setFinalizeError] = useState('');
  const [pickupTarget, setPickupTarget] = useState(null);
  const [pickupForm, setPickupForm] = useState({ logisticsPartner: 'SHIPROCKET', pickupDate: '', pickupSlot: '', pickupAddress: '' });
  const [pickupSubmitting, setPickupSubmitting] = useState(false);
  const [pickupError, setPickupError] = useState('');
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [labelTarget, setLabelTarget] = useState(null);
  const [trackingTarget, setTrackingTarget] = useState(null);

  // Real-time automatic updates on milestone events
  useEventStream(() => {
    load();
  });

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const [returnsRes, draftsRes] = await Promise.all([
        listReturns({ customerId: user.id }),
        listReturnDrafts(user.id),
      ]);
      // Jackson serializes the Lombok `isDraft` boolean getter as `draft`.
      const activeReturns = returnsRes.data.filter((r) => !r.draft);
      activeReturns.sort((a, b) => new Date(b.initiatedAt || 0) - new Date(a.initiatedAt || 0));
      setRows(activeReturns);
      setDrafts(draftsRes.data);
    } catch (e) {
      console.error('customer ReturnHistory error:', e);
      setError(e?.response?.data?.detail || 'Unable to retrieve your return history at this time.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleFinalize(id) {
    setFinalizingId(id);
    setFinalizeError('');
    try {
      await finalizeReturnDraft(id);
      await load();
    } catch (e) {
      console.error('customer ReturnHistory error:', e);
      setFinalizeError(e?.response?.data?.detail || 'Could not complete this draft.');
    } finally {
      setFinalizingId(null);
    }
  }

  // Schedule doorstep pickup with carrier.
  async function handleSchedulePickup() {
    setPickupSubmitting(true);
    setPickupError('');
    try {
      await schedulePickup(pickupTarget.id, pickupForm);
      setPickupTarget(null);
      await load();
    } catch (e) {
      console.error('customer ReturnHistory error:', e);
      setPickupError(e?.response?.data?.detail || 'Could not schedule pickup.');
    } finally {
      setPickupSubmitting(false);
    }
  }

  async function handleReschedulePickup() {
    setRescheduleSubmitting(true);
    setRescheduleError('');
    try {
      await reschedulePickup(rescheduleTarget.id, { pickupDate: rescheduleDate, pickupSlot: rescheduleSlot || null });
      setRescheduleTarget(null);
      await load();
    } catch (e) {
      console.error('customer ReturnHistory error:', e);
      setRescheduleError(e?.response?.data?.detail || 'Could not reschedule pickup.');
    } finally {
      setRescheduleSubmitting(false);
    }
  }

  // Customer satisfaction score submission once return has completed
  async function handleSubmitFeedback() {
    setFeedbackSubmitting(true);
    setFeedbackError('');
    try {
      await submitSatisfaction(feedbackTarget.id, { rating: feedbackRating, comment: feedbackComment });
      setFeedbackTarget(null);
      setFeedbackRating(null);
      setFeedbackComment('');
      await load();
    } catch (e) {
      console.error('customer ReturnHistory error:', e);
      setFeedbackError(e?.response?.data?.detail || 'Could not submit feedback.');
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  const columns = [
    { key: 'id', header: 'Return ID', sortable: true, render: (r) => <span className="text-primary font-medium font-mono">#{String(r.id).slice(0, 8)}</span> },
    {
      key: 'product',
      header: 'Product',
      render: (r) => {
        const item = r.items?.[0];
        const name = item?.productName || 'Order Product';
        return (
          <div className="max-w-xs">
            <p className="text-sm font-semibold text-text line-clamp-1" title={name}>
              {name}
            </p>
            {r.items?.length > 1 && (
              <span className="text-[10px] text-slate-500 font-medium">
                +{r.items.length - 1} more
              </span>
            )}
          </div>
        );
      },
    },
    { key: 'returnType', header: 'Type', render: (r) => <span className="text-xs font-semibold text-slate-700 uppercase">{humanize(r.returnType)}</span> },
    { key: 'reasonCode', header: 'Reason', render: (r) => <span className="text-xs text-text-secondary">{humanize(r.reasonCode)}</span> },
    {
      key: 'initiatedAt',
      header: 'Initiated (Date & Time)',
      sortable: true,
      render: (r) =>
        r.initiatedAt ? (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 text-xs">
              {new Date(r.initiatedAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className="text-[10px] text-text-muted font-mono font-medium">
              {new Date(r.initiatedAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          </div>
        ) : (
          '—'
        ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
    { key: 'preferredRefundMethod', header: 'Refund Via', render: (r) => humanize(r.preferredRefundMethod) },
    {
      key: 'amount',
      header: 'Refund Value',
      sortable: true,
      render: (r) => {
        const val = r.refundAmount != null ? r.refundAmount : (r.amount != null ? r.amount : (r.items?.[0]?.price || 0));
        return (
          <span className="font-semibold text-slate-900 whitespace-nowrap">
            ₹{Number(val).toLocaleString('en-IN')}{' '}
            <span className="text-[10px] text-slate-500 font-normal">INR</span>
          </span>
        );
      },
    },
    {
      key: 'actions', header: '', render: (r) => {
        const isComplete = ['REFUNDED', 'EXCHANGE_DISPATCHED', 'CLOSED'].includes(r.status);
        const hasPickup = ['PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'RECEIVED', 'QC_DONE', 'REFUND_INITIATED', 'REFUNDED'].includes(r.status);

        return (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {r.status === 'INITIATED' && (
              <Button size="sm" variant="outline" onClick={() => { setPickupTarget(r); setPickupError(''); }}>
                Schedule Pickup
              </Button>
            )}

            {r.status === 'PICKUP_SCHEDULED' && (
              <Button size="sm" variant="outline" onClick={() => { setRescheduleTarget(r); setRescheduleError(''); setRescheduleDate(''); setRescheduleSlot(''); }}>
                Reschedule
              </Button>
            )}

            {hasPickup && (
              <>
                <button
                  type="button"
                  onClick={() => setTrackingTarget(r)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-primary/30 text-primary bg-primary-50/50 hover:bg-primary-100 rounded-md transition-colors"
                  title="Track Courier Transit Telemetry"
                >
                  <TruckIcon className="w-3.5 h-3.5" />
                  Track
                </button>
                <button
                  type="button"
                  onClick={() => setLabelTarget(r)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-300 text-text hover:bg-gray-100 rounded-md transition-colors"
                  title="Print Reverse Shipping Label"
                >
                  <PrinterIcon className="w-3.5 h-3.5 text-gray-500" />
                  Label
                </button>
              </>
            )}

            {isComplete && !r.satisfactionSubmittedAt && (
              <button
                type="button"
                onClick={() => setFeedbackTarget(r)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-md font-medium transition-colors"
              >
                <StarIcon className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                Rate Experience
              </button>
            )}

            {r.satisfactionSubmittedAt && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                ★ {r.satisfactionRating}/10
              </span>
            )}
          </div>
        );
      },
    },
  ];

  if (loading) return <p className="text-sm text-text-secondary">Loading return records…</p>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg">
          {error}
        </div>
      )}
      {drafts.length > 0 && (
        <div className="bg-surface border border-warning-200 rounded-lg p-4">
          <h2 className="font-semibold text-text mb-1">Saved Drafts</h2>
          <p className="text-xs text-text-muted mb-3">
            Complete saved return drafts within 24 hours before automatic expiration.
          </p>
          {finalizeError && <p className="text-xs text-danger bg-danger-50 rounded-md px-2 py-1.5 mb-2">{finalizeError}</p>}
          <div className="space-y-2">
            {drafts.map((d) => (
              <div key={d.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2">
                <div>
                  <span className="text-sm font-mono text-text">{String(d.id).slice(0, 8)}</span>
                  <span className="text-xs text-text-secondary ml-2">{humanize(d.returnType)} · {d.reasonCode === 'DRAFT' ? 'No reason set' : humanize(d.reasonCode)}</span>
                  {d.draftExpiresAt && (
                    <span className="text-xs text-text-muted ml-2">expires {new Date(d.draftExpiresAt).toLocaleString('en-IN')}</span>
                  )}
                </div>
                <Button size="sm" onClick={() => handleFinalize(d.id)} disabled={finalizingId === d.id}>
                  {finalizingId === d.id ? 'Completing…' : 'Complete Return'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      <DataTable
        title="Return History"
        columns={columns}
        rows={rows}
        initialSortKey="initiatedAt"
        initialSortDir="desc"
        searchKeys={['reasonCode', 'returnType']}
        exportFilename="return-history"
        initialQuery={params.get('q') || ''}
      />

      <Modal open={!!pickupTarget} onClose={() => setPickupTarget(null)} title="Schedule Pickup"
        footer={
          <>
            <Button variant="outline" onClick={() => setPickupTarget(null)}>Cancel</Button>
            <Button onClick={handleSchedulePickup} disabled={pickupSubmitting || !pickupForm.pickupDate || !pickupForm.pickupAddress}>
              {pickupSubmitting ? 'Scheduling…' : 'Schedule'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {pickupError && <p className="text-xs text-danger bg-danger-50 rounded-md px-2 py-1.5">{pickupError}</p>}
          <Select
            label="Logistics partner"
            value={pickupForm.logisticsPartner}
            onChange={(e) => setPickupForm((f) => ({ ...f, logisticsPartner: e.target.value }))}
            options={[{ value: 'SHIPROCKET', label: 'Shiprocket' }, { value: 'DELHIVERY', label: 'Delhivery' }]}
          />
          <Input
            label="Pickup date" type="date"
            value={pickupForm.pickupDate}
            onChange={(e) => setPickupForm((f) => ({ ...f, pickupDate: e.target.value }))}
          />
          <Input
            label="Pickup slot (optional)"
            value={pickupForm.pickupSlot}
            onChange={(e) => setPickupForm((f) => ({ ...f, pickupSlot: e.target.value }))}
            placeholder="e.g. 2:00 PM - 5:00 PM"
          />
          <Textarea
            label="Pickup address"
            rows={3}
            value={pickupForm.pickupAddress}
            onChange={(e) => setPickupForm((f) => ({ ...f, pickupAddress: e.target.value }))}
            placeholder="Full address for the reverse pickup"
          />
        </div>
      </Modal>

      <Modal open={!!rescheduleTarget} onClose={() => setRescheduleTarget(null)} title="Reschedule Pickup"
        footer={
          <>
            <Button variant="outline" onClick={() => setRescheduleTarget(null)}>Cancel</Button>
            <Button onClick={handleReschedulePickup} disabled={rescheduleSubmitting || !rescheduleDate}>
              {rescheduleSubmitting ? 'Rescheduling…' : 'Reschedule'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {rescheduleError && <p className="text-xs text-danger bg-danger-50 rounded-md px-2 py-1.5">{rescheduleError}</p>}
          <p className="text-xs text-text-muted">
            Doorstep pickups can be rescheduled up to 2 times per carrier shipment policy.
          </p>
          <Input
            label="New pickup date" type="date"
            value={rescheduleDate}
            onChange={(e) => setRescheduleDate(e.target.value)}
          />
          <Input
            label="New pickup slot (optional)"
            value={rescheduleSlot}
            onChange={(e) => setRescheduleSlot(e.target.value)}
            placeholder="e.g. 2:00 PM - 5:00 PM"
          />
        </div>
      </Modal>

      <FeedbackModal
        isOpen={!!feedbackTarget}
        onClose={() => setFeedbackTarget(null)}
        returnRequest={feedbackTarget}
        onSubmitted={() => load()}
      />

      <ShippingLabelModal
        isOpen={!!labelTarget}
        onClose={() => setLabelTarget(null)}
        returnRequest={labelTarget}
        pickup={labelTarget ? { awbNumber: `AWB${labelTarget.id.substring(0, 8).toUpperCase()}`, logisticsPartner: 'SHIPROCKET', pickupOtp: labelTarget.id.substring(0, 4).toUpperCase() } : null}
      />

      <TrackingModal
        isOpen={!!trackingTarget}
        onClose={() => setTrackingTarget(null)}
        returnRequest={trackingTarget}
        pickup={trackingTarget ? { awbNumber: `AWB${trackingTarget.id.substring(0, 8).toUpperCase()}`, logisticsPartner: 'SHIPROCKET' } : null}
      />
    </div>
  );
}
