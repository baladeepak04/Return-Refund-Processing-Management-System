import React, { useEffect, useState } from 'react';
import DataTable from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import { StatCard } from '../../components/ui/Card.jsx';
import { TruckIcon, FileIcon, TrendIcon, CheckCircleIcon, AlertTriangleIcon } from '../../components/ui/icons.jsx';
import {
  listRtmBatches,
  dispatchRtmBatch,
  markRtmBatchReceived,
  settleRtmBatch,
  resolveRtmBatchDispute,
} from '../../lib/api.js';

export default function Settlement() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [activeDisputeModal, setActiveDisputeModal] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await listRtmBatches();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('supplier Settlement error:', e);
      setError(e?.response?.data?.detail || 'Unable to synchronize RTM settlement batches. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  async function handleDispatch(id) {
    setActionLoadingId(id);
    try {
      await dispatchRtmBatch(id);
      showToast('RTM Batch dispatched successfully to supplier logistics network.');
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not dispatch batch.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleMarkReceived(id) {
    setActionLoadingId(id);
    try {
      await markRtmBatchReceived(id);
      showToast('Batch delivery confirmed by supplier warehouse. Ready for settlement.');
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not mark batch as received.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleSettle(id) {
    setActionLoadingId(id);
    try {
      await settleRtmBatch(id);
      showToast('RTM Batch reconciled! Credit note settled successfully.');
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not settle batch.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleResolveDispute(id) {
    setActionLoadingId(id);
    try {
      await resolveRtmBatchDispute(id);
      showToast('Vendor dispute marked as resolved. Batch is now eligible for full settlement.');
      setActiveDisputeModal(null);
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not resolve dispute.');
    } finally {
      setActionLoadingId(null);
    }
  }

  // Financial Metrics
  const totalBatches = rows.length;
  const accumulatedBatches = rows.filter((r) => r.status === 'ACCUMULATED');
  const dispatchedBatches = rows.filter((r) => r.status === 'DISPATCHED');
  const receivedBatches = rows.filter((r) => r.status === 'RECEIVED_BY_SUPPLIER');
  const settledBatches = rows.filter((r) => r.status === 'SETTLED');

  const accumulatedVal = accumulatedBatches.reduce((s, b) => s + Number(b.creditNoteValue || 0), 0);
  const inTransitVal = dispatchedBatches.reduce((s, b) => s + Number(b.creditNoteValue || 0), 0);
  const readyToSettleVal = receivedBatches.reduce((s, b) => s + Number(b.creditNoteValue || 0), 0);
  const settledVal = settledBatches.reduce((s, b) => s + Number(b.creditNoteValue || 0), 0);

  const columns = [
    {
      key: 'id',
      header: 'RTM ID',
      render: (r) => (
        <div>
          <span className="text-orange-600 font-semibold font-mono tracking-tight">{String(r.id).slice(0, 8)}</span>
          {r.awbNumber && (
            <p className="text-[11px] text-text-muted mt-0.5">AWB: {r.awbNumber}</p>
          )}
        </div>
      ),
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      sortable: true,
      render: (r) => (
        <div>
          <span className="font-medium text-text">{r.supplierName}</span>
          {r.disputed && (
            <button
              onClick={() => setActiveDisputeModal(r)}
              className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
            >
              <AlertTriangleIcon className="w-3 h-3" />
              Active Dispute
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'creditNoteValue',
      header: 'Credit Note Value',
      sortable: true,
      render: (r) => (
        <span className="font-semibold text-text">
          ₹{Number(r.creditNoteValue || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'dispatchDate',
      header: 'Dispatch Date',
      render: (r) => r.dispatchDate ? (
        <span className="text-sm text-text-secondary">
          {new Date(r.dispatchDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ) : (
        <span className="text-xs text-text-muted italic">Pending Dispatch</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge value={r.status} />,
    },
    {
      key: 'actions',
      header: 'Settlement Workflow',
      render: (r) => {
        const isBusy = actionLoadingId === r.id;
        if (r.status === 'ACCUMULATED') {
          return (
            <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => handleDispatch(r.id)}
            >
              {isBusy ? 'Dispatching…' : 'Dispatch Batch'}
            </Button>
          );
        }
        if (r.status === 'DISPATCHED') {
          return (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() => handleMarkReceived(r.id)}
                title="Confirm vendor delivery acknowledgment"
              >
                Mark Received
              </Button>
              <Button
                size="sm"
                variant="success"
                disabled={isBusy}
                onClick={() => handleSettle(r.id)}
                title="Directly settle and reconcile"
              >
                {isBusy ? 'Settling…' : 'Quick Settle'}
              </Button>
            </div>
          );
        }
        if (r.status === 'RECEIVED_BY_SUPPLIER') {
          return (
            <Button
              size="sm"
              variant="success"
              disabled={isBusy}
              onClick={() => handleSettle(r.id)}
            >
              {isBusy ? 'Settling…' : 'Reconcile & Settle'}
            </Button>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <CheckCircleIcon className="w-3.5 h-3.5" />
            Reconciled
          </span>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center animate-pulse">
        <p className="text-sm font-medium text-text-secondary">Loading RTM settlement ledger and pipeline…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg border border-emerald-500 flex items-center gap-2 animate-slide-in">
          <CheckCircleIcon className="w-5 h-5 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {error && (
        <div className="bg-surface rounded-xl border border-danger-200 p-4 shadow-xs flex items-center justify-between">
          <p className="text-sm font-medium text-danger">{error}</p>
          <button
            onClick={load}
            className="px-3 py-1 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Settlement KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Awaiting Dispatch"
          value={accumulatedBatches.length}
          trend={`₹${accumulatedVal.toLocaleString('en-IN')} unbatched`}
          icon={<TruckIcon />}
          tint="warning"
        />
        <StatCard
          label="In Transit (Dispatched)"
          value={dispatchedBatches.length}
          trend={`₹${inTransitVal.toLocaleString('en-IN')} pending ack`}
          icon={<TruckIcon />}
          tint="info"
        />
        <StatCard
          label="Ready to Settle"
          value={receivedBatches.length}
          trend={`₹${readyToSettleVal.toLocaleString('en-IN')} delivered`}
          icon={<FileIcon />}
          tint="primary"
        />
        <StatCard
          label="Settled & Reconciled"
          value={`₹${settledVal.toLocaleString('en-IN')}`}
          trend={`${settledBatches.length} of ${totalBatches} batches settled`}
          icon={<TrendIcon />}
          tint="success"
        />
      </div>

      {/* Pipeline Information Banner */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="font-medium text-text">Settlement Workflow Guide:</span>
          <span className="text-text-muted">
            1. Dispatch Batch → 2. Supplier Warehouse Ack (or Quick Settle) → 3. Reconcile & Settle Credit Note.
          </span>
        </div>
        <div className="flex items-center gap-2 text-text-muted">
          <span>Disputes can be reviewed and resolved prior to final settlement.</span>
        </div>
      </div>

      {rows.length === 0 && !error ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-primary-50 text-primary flex items-center justify-center text-xl mb-3">
            📋
          </div>
          <h3 className="font-semibold text-text mb-1">No Active RTM Batches</h3>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            Consolidate accumulated vendor return items from the Supplier Returns inventory to create a new batch.
          </p>
        </div>
      ) : (
        <DataTable
          title="Return-to-Manufacturer (RTM) Settlement Pipeline"
          columns={columns}
          rows={rows}
          searchKeys={['id', 'supplierName', 'awbNumber']}
          exportFilename="rtm-settlement"
        />
      )}

      {/* Dispute Resolution Modal */}
      {activeDisputeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-scale-up space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <AlertTriangleIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-text text-base">Vendor Dispute Details</h3>
                  <p className="text-xs text-text-muted">Batch {String(activeDisputeModal.id).slice(0, 8)} · {activeDisputeModal.supplierName}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveDisputeModal(null)}
                className="text-text-muted hover:text-text text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-sm space-y-2">
              <p className="font-semibold text-amber-700 dark:text-amber-400">Supplier Contestation Note:</p>
              <p className="text-text-secondary leading-relaxed">
                {activeDisputeModal.disputeNotes || 'Supplier has flagged a discrepancy with the return condition or warranty eligibility.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-surface-raised p-3 rounded-lg border border-border">
              <div>
                <span className="text-text-muted block">Credit Note Value:</span>
                <span className="font-semibold text-text">₹{Number(activeDisputeModal.creditNoteValue || 0).toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-text-muted block">AWB Tracking:</span>
                <span className="font-mono text-text">{activeDisputeModal.awbNumber || 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveDisputeModal(null)}
              >
                Close
              </Button>
              <Button
                variant="success"
                size="sm"
                disabled={actionLoadingId === activeDisputeModal.id}
                onClick={() => handleResolveDispute(activeDisputeModal.id)}
              >
                {actionLoadingId === activeDisputeModal.id ? 'Resolving…' : 'Accept & Resolve Dispute'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
