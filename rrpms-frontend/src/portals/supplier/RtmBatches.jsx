import React, { useEffect, useState } from 'react';
import DataTable from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import { StatCard } from '../../components/ui/Card.jsx';
import { TruckIcon, BoxIcon, CheckCircleIcon, AlertTriangleIcon } from '../../components/ui/icons.jsx';
import { listRtmBatches, dispatchRtmBatch } from '../../lib/api.js';

export default function RtmBatches() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [dispatchingId, setDispatchingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listRtmBatches();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('supplier RtmBatches error:', e);
      setError(e?.response?.data?.detail || 'Unable to synchronize RTM batch directory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleDispatch = async (batchId) => {
    setDispatchingId(batchId);
    try {
      await dispatchRtmBatch(batchId);
      showToast('RTM Batch dispatched successfully with carrier assignment!');
      await loadData();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not dispatch batch.');
    } finally {
      setDispatchingId(null);
    }
  };

  // Parse items
  const parseItems = (b) => {
    if (!b.itemsJson) {
      return [{ item: `${b.supplierName} Consolidated Units`, qty: 1, value: Number(b.creditNoteValue || 0) }];
    }
    try {
      const parsed = JSON.parse(b.itemsJson);
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : [{ item: `${b.supplierName} Consolidated Units`, qty: 1, value: Number(b.creditNoteValue || 0) }];
    } catch {
      return [{ item: `${b.supplierName} Consolidated Units`, qty: 1, value: Number(b.creditNoteValue || 0) }];
    }
  };

  // Top Metrics
  const totalBatches = rows.length;
  const inTransitBatches = rows.filter((r) => r.status === 'DISPATCHED');
  const accumulatedBatches = rows.filter((r) => r.status === 'ACCUMULATED');
  const settledBatches = rows.filter((r) => r.status === 'SETTLED');

  const totalValue = rows.reduce((s, r) => s + Number(r.creditNoteValue || 0), 0);
  const inTransitVal = inTransitBatches.reduce((s, r) => s + Number(r.creditNoteValue || 0), 0);
  const accumulatedVal = accumulatedBatches.reduce((s, r) => s + Number(r.creditNoteValue || 0), 0);
  const settledVal = settledBatches.reduce((s, r) => s + Number(r.creditNoteValue || 0), 0);

  const tableRows = rows.map((b) => {
    const items = parseItems(b);
    const totalUnits = items.reduce((s, i) => s + (i.qty || 1), 0);
    return {
      ...b,
      items,
      totalUnits,
      displayAwb: b.awbNumber || 'EXP-RTM-' + String(b.id).slice(0, 6).toUpperCase(),
    };
  });

  const columns = [
    {
      key: 'id',
      header: 'RTM ID',
      render: (r) => (
        <button
          onClick={() => setSelectedBatch(r)}
          className="text-orange-600 hover:underline font-semibold font-mono text-left tracking-tight"
          title="Click to view manifest"
        >
          {String(r.id).slice(0, 8)}
        </button>
      ),
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      sortable: true,
      render: (r) => (
        <div>
          <span className="font-medium text-text">{r.supplierName}</span>
          <span className="block text-[11px] text-text-muted">{r.totalUnits} units · {r.items.length} product lines</span>
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
      header: 'Dispatch & Carrier',
      render: (r) => (
        <div>
          <span className="text-sm text-text-secondary block">
            {r.dispatchDate ? new Date(r.dispatchDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unscheduled'}
          </span>
          <span className="font-mono text-[11px] text-text-muted">
            AWB: {r.displayAwb}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge value={r.status} />
          {r.disputed && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium">
              Dispute
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedBatch(r)}
          >
            Manifest
          </Button>
          {r.status === 'ACCUMULATED' && (
            <Button
              size="sm"
              variant="primary"
              disabled={dispatchingId === r.id}
              onClick={() => handleDispatch(r.id)}
            >
              {dispatchingId === r.id ? 'Dispatching…' : 'Dispatch'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center animate-pulse">
        <p className="text-sm font-medium text-text-secondary">Loading RTM batches and consignment manifests…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
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
            onClick={loadData}
            className="px-3 py-1 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Stat Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total RTM Batches"
          value={totalBatches}
          trend={`₹${totalValue.toLocaleString('en-IN')} total batch value`}
          icon={<BoxIcon />}
          tint="info"
        />
        <StatCard
          label="In Transit (Dispatched)"
          value={inTransitBatches.length}
          trend={`₹${inTransitVal.toLocaleString('en-IN')} under courier SLA`}
          icon={<TruckIcon />}
          tint="primary"
        />
        <StatCard
          label="Accumulated (Ready)"
          value={accumulatedBatches.length}
          trend={`₹${accumulatedVal.toLocaleString('en-IN')} ready to dispatch`}
          icon={<AlertTriangleIcon />}
          tint="warning"
        />
        <StatCard
          label="Settled & Cleared"
          value={settledBatches.length}
          trend={`₹${settledVal.toLocaleString('en-IN')} realized`}
          icon={<CheckCircleIcon />}
          tint="success"
        />
      </div>

      {tableRows.length === 0 && !error ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-text-muted">No RTM batches found. Create a batch from Supplier Returns.</p>
        </div>
      ) : (
        <DataTable
          title="Return-to-Manufacturer (RTM) Batches & Consignments"
          columns={columns}
          rows={tableRows}
          searchKeys={['id', 'supplierName', 'awbNumber']}
          exportFilename="rtm-batches-directory"
        />
      )}

      {/* Batch Manifest & Packing Slip Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div id="manifest-printable-area" className="printable-document bg-surface border border-border rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-scale-up space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-orange-500/10 text-orange-600">
                  Batch Manifest
                </span>
                <span className="font-mono text-sm font-semibold text-text">
                  RTM-{String(selectedBatch.id).slice(0, 8)}
                </span>
              </div>
              <div className="flex items-center gap-2 no-print">
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  🖨️ Print Packing Slip
                </Button>
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="text-text-muted hover:text-text text-lg p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Consignment Logistics Header */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-surface-raised rounded-xl border border-border text-xs">
              <div className="space-y-1">
                <span className="text-text-muted uppercase text-[10px] font-semibold tracking-wider">Manufacturer / Hub:</span>
                <p className="font-bold text-text text-sm">{selectedBatch.supplierName}</p>
                <p className="text-text-secondary">Carrier Partner: BlueDart Surface Cargo</p>
                <p className="text-text-secondary">Consignment AWB: <span className="font-mono font-medium text-text">{selectedBatch.displayAwb}</span></p>
              </div>
              <div className="space-y-1">
                <span className="text-text-muted uppercase text-[10px] font-semibold tracking-wider">Batch Status & Timeline:</span>
                <div className="mt-1"><StatusBadge value={selectedBatch.status} /></div>
                <p className="text-text-secondary mt-1">
                  Dispatch Date: {selectedBatch.dispatchDate ? new Date(selectedBatch.dispatchDate).toLocaleDateString('en-IN') : 'Scheduled upon dispatch'}
                </p>
                <p className="text-text-secondary">
                  Total Items: <strong className="text-text">{selectedBatch.totalUnits} units</strong>
                </p>
              </div>
            </div>

            {/* Dispute Warning if applicable */}
            {selectedBatch.disputed && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
                <AlertTriangleIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-700 dark:text-amber-400 font-semibold block">Active Vendor Dispute:</strong>
                  <p className="text-text-secondary mt-0.5">{selectedBatch.disputeNotes}</p>
                </div>
              </div>
            )}

            {/* Manifest Item Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text uppercase tracking-wider">Consolidated Packing Manifest</h4>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-raised text-text-muted uppercase border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">Product Description</th>
                      <th className="py-2.5 px-3 text-center">Units</th>
                      <th className="py-2.5 px-3 text-right">Declared Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedBatch.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-surface-raised/40">
                        <td className="py-2.5 px-3 font-medium text-text">{item.item}</td>
                        <td className="py-2.5 px-3 text-center text-text-secondary">{item.qty}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-text">
                          ₹{Number(item.value).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="text-xs text-text-muted">
                Declared Total Credit Note Value
              </div>
              <div className="text-lg font-bold text-text">
                ₹{Number(selectedBatch.creditNoteValue || 0).toLocaleString('en-IN')}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 no-print">
              <Button variant="outline" size="sm" onClick={() => setSelectedBatch(null)}>
                Close
              </Button>
              {selectedBatch.status === 'ACCUMULATED' && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={dispatchingId === selectedBatch.id}
                  onClick={() => {
                    handleDispatch(selectedBatch.id);
                    setSelectedBatch(null);
                  }}
                >
                  {dispatchingId === selectedBatch.id ? 'Dispatching…' : 'Dispatch Consignment'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
