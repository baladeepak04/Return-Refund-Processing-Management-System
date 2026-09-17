import React, { useEffect, useState } from 'react';
import DataTable from '../../components/ui/DataTable.jsx';
import Button from '../../components/ui/Button.jsx';
import { StatCard } from '../../components/ui/Card.jsx';
import { FileIcon, CheckCircleIcon, TrendIcon, AlertTriangleIcon } from '../../components/ui/icons.jsx';
import { listRtmBatches, settleRtmBatch } from '../../lib/api.js';

export default function CreditNotes() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'RECONCILED' | 'PENDING'
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [settlingId, setSettlingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listRtmBatches();
      setBatches(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('supplier CreditNotes error:', e);
      setError(e?.response?.data?.detail || 'Unable to synchronize vendor credit notes. Please try again.');
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

  const handleSettle = async (batchId) => {
    setSettlingId(batchId);
    try {
      await settleRtmBatch(batchId);
      showToast('Credit Note successfully reconciled & settled!');
      if (selectedVoucher && selectedVoucher.batchId === batchId) {
        setSelectedVoucher((prev) => ({ ...prev, status: 'Reconciled' }));
      }
      await loadData();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not settle credit note.');
    } finally {
      setSettlingId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center animate-pulse">
        <p className="text-sm font-medium text-text-secondary">Loading vendor credit note ledger & audit records…</p>
      </div>
    );
  }

  // Parse batch items
  const parseItems = (b) => {
    if (!b.itemsJson) {
      return [{ item: `${b.supplierName} Consolidated Returns`, qty: 1, value: Number(b.creditNoteValue || 0) }];
    }
    try {
      const parsed = JSON.parse(b.itemsJson);
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : [{ item: `${b.supplierName} Consolidated Returns`, qty: 1, value: Number(b.creditNoteValue || 0) }];
    } catch {
      return [{ item: `${b.supplierName} Consolidated Returns`, qty: 1, value: Number(b.creditNoteValue || 0) }];
    }
  };

  const allRows = batches.map((b) => {
    const isReconciled = b.status === 'SETTLED';
    const items = parseItems(b);
    return {
      id: `CN-${String(b.id).slice(0, 6)}`,
      batchId: b.id,
      rtmId: String(b.id).slice(0, 8),
      supplier: b.supplierName,
      value: Number(b.creditNoteValue || 0),
      status: isReconciled ? 'Reconciled' : 'Awaiting settlement',
      rawStatus: b.status,
      awbNumber: b.awbNumber || 'DEL-RTM-' + String(b.id).slice(0, 6).toUpperCase(),
      dispatchDate: b.dispatchDate || '2026-09-01',
      items,
      disputed: b.disputed,
      disputeNotes: b.disputeNotes,
    };
  });

  // KPI calculations
  const totalValue = allRows.reduce((s, r) => s + r.value, 0);
  const reconciledRows = allRows.filter((r) => r.status === 'Reconciled');
  const pendingRows = allRows.filter((r) => r.status === 'Awaiting settlement');
  const reconciledValue = reconciledRows.reduce((s, r) => s + r.value, 0);
  const pendingValue = pendingRows.reduce((s, r) => s + r.value, 0);
  const realizationRate = totalValue > 0 ? Math.round((reconciledValue / totalValue) * 100) : 0;

  // Filtered rows
  const rows = allRows.filter((r) => {
    if (activeFilter === 'RECONCILED') return r.status === 'Reconciled';
    if (activeFilter === 'PENDING') return r.status === 'Awaiting settlement';
    return true;
  });

  const columns = [
    {
      key: 'id',
      header: 'Credit Note',
      render: (r) => (
        <button
          onClick={() => setSelectedVoucher(r)}
          className="text-primary hover:underline font-semibold font-mono text-left tracking-tight"
          title="Click to view digital voucher"
        >
          {r.id}
        </button>
      ),
    },
    {
      key: 'rtmId',
      header: 'RTM Batch',
      render: (r) => <span className="text-orange-600 font-medium font-mono">{r.rtmId}</span>,
    },
    {
      key: 'supplier',
      header: 'Supplier',
      sortable: true,
      render: (r) => (
        <div>
          <span className="font-medium text-text">{r.supplier}</span>
          <span className="block text-[11px] text-text-muted">{r.items.length} item line{r.items.length !== 1 ? 's' : ''}</span>
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      sortable: true,
      render: (r) => (
        <span className="font-semibold text-text">
          ₹{r.value.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            r.status === 'Reconciled'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          }`}
        >
          {r.status}
        </span>
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
            onClick={() => setSelectedVoucher(r)}
          >
            View Voucher
          </Button>
          {r.status === 'Awaiting settlement' && (
            <Button
              size="sm"
              variant="success"
              disabled={settlingId === r.batchId}
              onClick={() => handleSettle(r.batchId)}
            >
              {settlingId === r.batchId ? 'Settling…' : 'Settle'}
            </Button>
          )}
        </div>
      ),
    },
  ];

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
            onClick={loadData}
            className="px-3 py-1 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Credit Notes"
          value={`₹${totalValue.toLocaleString('en-IN')}`}
          trend={`${allRows.length} total issued notes`}
          icon={<FileIcon />}
          tint="info"
        />
        <StatCard
          label="Reconciled (Realized)"
          value={`₹${reconciledValue.toLocaleString('en-IN')}`}
          trend={`${reconciledRows.length} notes reconciled`}
          icon={<CheckCircleIcon />}
          tint="success"
        />
        <StatCard
          label="Awaiting Settlement"
          value={`₹${pendingValue.toLocaleString('en-IN')}`}
          trend={`${pendingRows.length} notes in process`}
          icon={<AlertTriangleIcon />}
          tint="warning"
        />
        <StatCard
          label="Realization Index"
          value={`${realizationRate}%`}
          trend="Settled vs Issued"
          icon={<TrendIcon />}
          tint="primary"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex bg-surface-raised p-1 rounded-xl border border-border text-xs">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === 'ALL'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-muted hover:text-text'
            }`}
          >
            All Notes ({allRows.length})
          </button>
          <button
            onClick={() => setActiveFilter('RECONCILED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === 'RECONCILED'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Reconciled ({reconciledRows.length})
          </button>
          <button
            onClick={() => setActiveFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === 'PENDING'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Awaiting Settlement ({pendingRows.length})
          </button>
        </div>

        <span className="text-xs text-text-muted">
          Showing {rows.length} of {allRows.length} credit notes
        </span>
      </div>

      {/* Main Data Table */}
      {rows.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-text-muted">No credit notes found matching this filter.</p>
        </div>
      ) : (
        <DataTable
          title="Vendor Credit Notes & Settlement Vouchers"
          columns={columns}
          rows={rows}
          searchKeys={['id', 'supplier', 'rtmId']}
          exportFilename="credit-notes-ledger"
        />
      )}

      {/* Enterprise Credit Note Voucher Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-scale-up space-y-6 my-8">
            {/* Modal Header Actions */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary">
                  Official Statement
                </span>
                <span className="font-mono text-sm text-text-muted">Ref: {selectedVoucher.id}</span>
              </div>
              <div className="flex items-center gap-2 no-print">
                <Button size="sm" variant="outline" onClick={handlePrint}>
                  🖨️ Print / PDF
                </Button>
                <button
                  onClick={() => setSelectedVoucher(null)}
                  className="text-text-muted hover:text-text text-lg p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Voucher Content */}
            <div id="voucher-printable-area" className="printable-document space-y-6 p-4 bg-surface-raised rounded-xl border border-border">
              {/* Company & Vendor Letterhead */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-border pb-4">
                <div>
                  <h3 className="text-lg font-bold text-text">ReturnFlow Logistics & RMA Network</h3>
                  <p className="text-xs text-text-muted mt-0.5">Corporate Supply Chain & Vendor Operations</p>
                  <p className="text-xs text-text-muted">GSTIN: 29AABCR1928K1ZV · Bengaluru, India</p>
                </div>
                <div className="sm:text-right">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">Credit Voucher</span>
                  <span className="font-mono font-bold text-base text-primary">{selectedVoucher.id}</span>
                  <p className="text-xs text-text-secondary mt-1">Date: {new Date().toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              {/* Vendor & Consignment Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-text-muted font-medium uppercase tracking-wider text-[10px]">Credited Vendor:</span>
                  <p className="font-bold text-text text-sm">{selectedVoucher.supplier}</p>
                  <p className="text-text-secondary">Vendor Code: VND-{selectedVoucher.supplier.slice(0, 3).toUpperCase()}-904</p>
                  <p className="text-text-secondary">Payment Terms: Immediate Settlement</p>
                </div>
                <div className="space-y-1">
                  <span className="text-text-muted font-medium uppercase tracking-wider text-[10px]">Consignment Ref:</span>
                  <p className="font-medium text-text">RTM Batch: <span className="font-mono text-orange-600">{selectedVoucher.rtmId}</span></p>
                  <p className="text-text-secondary">Logistics AWB: <span className="font-mono">{selectedVoucher.awbNumber}</span></p>
                  <p className="text-text-secondary">Dispatch Date: {selectedVoucher.dispatchDate}</p>
                </div>
              </div>

              {/* Itemized Returns Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-text uppercase tracking-wider">Itemized Return Reconciliation</h4>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface text-text-muted uppercase border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3">Description / SKU</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Credit Value (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedVoucher.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface/50">
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

              {/* Total & Status Stamp */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-muted">Reconciliation Status:</span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        selectedVoucher.status === 'Reconciled'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}
                    >
                      {selectedVoucher.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted mt-1">Authorized by ReturnFlow Automated Clearing House</p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-text-muted block">Total Credit Approved</span>
                  <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    ₹{selectedVoucher.value.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 no-print">
              <Button variant="outline" size="sm" onClick={() => setSelectedVoucher(null)}>
                Close
              </Button>
              {selectedVoucher.status === 'Awaiting settlement' && (
                <Button
                  variant="success"
                  size="sm"
                  disabled={settlingId === selectedVoucher.batchId}
                  onClick={() => handleSettle(selectedVoucher.batchId)}
                >
                  {settlingId === selectedVoucher.batchId ? 'Settling…' : 'Reconcile & Settle Note'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
