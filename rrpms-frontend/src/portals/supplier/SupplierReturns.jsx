import React, { useEffect, useState } from 'react';
import DataTable from '../../components/ui/DataTable.jsx';
import { GradeBadge } from '../../components/ui/StatusBadge.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import { StatCard } from '../../components/ui/Card.jsx';
import { BoxIcon, TruckIcon, CheckCircleIcon, AlertTriangleIcon } from '../../components/ui/icons.jsx';
import { DISPOSITION_LABEL } from '../../lib/enums.js';
import { listSupplierReturns, createRtmBatch } from '../../lib/api.js';

export default function SupplierReturns() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState([]);
  const [creating, setCreating] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACCUMULATED' | 'BATCHED'
  const [selectedQcInspection, setSelectedQcInspection] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await listSupplierReturns();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('supplier SupplierReturns error:', e);
      setError(e?.response?.data?.detail || 'Unable to synchronize supplier return inventory. Please try again.');
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

  const eligibleSelection = selected.filter((r) => r.status === 'ACCUMULATED');
  const supplierIds = new Set(eligibleSelection.map((r) => r.supplierId));
  const canCreateBatch = eligibleSelection.length > 0 && supplierIds.size === 1;

  async function handleCreateBatch() {
    if (!canCreateBatch) return;
    setCreating(true);
    setError('');
    try {
      await createRtmBatch({
        supplierId: eligibleSelection[0].supplierId,
        supplierName: eligibleSelection[0].supplierName,
        supplierReturnIds: eligibleSelection.map((r) => r.id),
      });
      showToast(`RTM Batch created for ${eligibleSelection[0].supplierName} with ${eligibleSelection.length} return items!`);
      setSelected([]);
      await load();
    } catch (e) {
      console.error('supplier SupplierReturns error:', e);
      setError(e?.response?.data?.detail || 'Could not create the RTM batch.');
    } finally {
      setCreating(false);
    }
  }

  // Financial & inventory counts
  const readyItems = rows.filter((r) => r.status === 'ACCUMULATED');
  const batchedItems = rows.filter((r) => r.status !== 'ACCUMULATED');
  const readyVal = readyItems.reduce((s, r) => s + Number(r.value || 0), 0);
  const batchedVal = batchedItems.reduce((s, r) => s + Number(r.value || 0), 0);
  const totalVal = rows.reduce((s, r) => s + Number(r.value || 0), 0);

  // Supplier list for filter
  const suppliers = Array.from(new Set(rows.map((r) => r.supplierName))).filter(Boolean);

  // Filter rows
  const filteredRows = rows.filter((r) => {
    if (supplierFilter !== 'ALL' && r.supplierName !== supplierFilter) return false;
    if (statusFilter === 'ACCUMULATED' && r.status !== 'ACCUMULATED') return false;
    if (statusFilter === 'BATCHED' && r.status === 'ACCUMULATED') return false;
    return true;
  });

  // Helper to select all items of a single supplier that are ACCUMULATED
  const handleSelectAllForSupplier = (supplierName) => {
    const items = rows.filter((r) => r.supplierName === supplierName && r.status === 'ACCUMULATED');
    setSelected(items);
    showToast(`Selected all ${items.length} unbatched items for ${supplierName}.`);
  };

  const columns = [
    {
      key: 'id',
      header: 'SR ID',
      render: (r) => (
        <span className="text-orange-600 font-semibold font-mono tracking-tight">
          {String(r.id).slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      sortable: true,
      render: (r) => (
        <div>
          <span className="font-semibold text-text">{r.supplierName}</span>
          {r.rtmBatch && (
            <span className="block text-[11px] text-text-muted">
              Batch: RTM-{String(r.rtmBatch.id).slice(0, 6)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product Name',
      sortable: true,
      render: (r) => (
        <button
          onClick={() => setSelectedQcInspection(r)}
          className="text-left font-medium text-text hover:text-primary transition-colors block"
          title="Click to view QC inspection report"
        >
          {r.product}
        </button>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty',
      render: (r) => <span className="font-medium text-text">{r.quantity}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      sortable: true,
      render: (r) => (
        <span className="font-semibold text-text">
          ₹{Number(r.value || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'conditionGrade',
      header: 'QC Grade',
      render: (r) => (
        <button
          onClick={() => setSelectedQcInspection(r)}
          className="hover:opacity-80 transition-opacity"
          title="Inspect QC grading"
        >
          <GradeBadge grade={r.conditionGrade} />
        </button>
      ),
    },
    {
      key: 'disposition',
      header: 'Disposition',
      render: (r) => (
        <span className="text-xs font-medium text-text-secondary">
          {DISPOSITION_LABEL[r.disposition] || r.disposition}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Batch Status',
      render: (r) => <StatusBadge value={r.status} />,
    },
  ];

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center animate-pulse">
        <p className="text-sm font-medium text-text-secondary">Loading supplier return inventory & RMA registry…</p>
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
            onClick={load}
            className="px-3 py-1 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Inventory Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Ready for Batching"
          value={readyItems.length}
          trend={`₹${readyVal.toLocaleString('en-IN')} unbatched inventory`}
          icon={<BoxIcon />}
          tint="warning"
        />
        <StatCard
          label="Batched & Consigned"
          value={batchedItems.length}
          trend={`₹${batchedVal.toLocaleString('en-IN')} in active RTM`}
          icon={<TruckIcon />}
          tint="info"
        />
        <StatCard
          label="Total Return Pipeline"
          value={`₹${totalVal.toLocaleString('en-IN')}`}
          trend={`${rows.length} total return lines`}
          icon={<CheckCircleIcon />}
          tint="success"
        />
        <StatCard
          label="Supplier Partners"
          value={suppliers.length}
          trend="Unique vendors represented"
          icon={<BoxIcon />}
          tint="primary"
        />
      </div>

      {/* Filter & Batch Actions Bar */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Tabs */}
          <div className="flex bg-surface-raised p-1 rounded-lg border border-border text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              All Items ({rows.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACCUMULATED')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'ACCUMULATED'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Ready to Batch ({readyItems.length})
            </button>
            <button
              onClick={() => setStatusFilter('BATCHED')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'BATCHED'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              In Batches ({batchedItems.length})
            </button>
          </div>

          {/* Supplier Dropdown */}
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            aria-label="Filter supplier returns by vendor"
            className="bg-surface border border-border text-text text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-hidden"
          >
            <option value="ALL">All Suppliers ({suppliers.length})</option>
            {suppliers.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Quick Select-All Button when filtered to a supplier */}
          {supplierFilter !== 'ALL' && (
            <button
              onClick={() => handleSelectAllForSupplier(supplierFilter)}
              className="text-xs font-semibold text-primary hover:underline px-2 py-1"
            >
              Select All {supplierFilter} Ready Items
            </button>
          )}
        </div>

        {/* Create Batch Trigger */}
        <div className="flex items-center gap-2">
          {selected.length > 0 && supplierIds.size > 1 && (
            <span className="text-xs text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
              Select items from 1 supplier only
            </span>
          )}
          <Button
            size="sm"
            variant="primary"
            disabled={!canCreateBatch || creating}
            onClick={handleCreateBatch}
          >
            {creating
              ? 'Creating Batch…'
              : `Create RTM Batch${eligibleSelection.length ? ` (${eligibleSelection.length})` : ''}`}
          </Button>
        </div>
      </div>

      {/* Main Table */}
      {filteredRows.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-text-muted">No supplier return items match the selected filters.</p>
        </div>
      ) : (
        <DataTable
          title="Supplier Returns & RMA Consignment Inventory"
          columns={columns}
          rows={filteredRows}
          searchKeys={['supplierName', 'product', 'id']}
          exportFilename="supplier-returns-inventory"
          selectable
          onSelectionChange={setSelected}
        />
      )}

      {/* QC Inspection Details Modal */}
      {selectedQcInspection && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-scale-up space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-text text-base">QC Inspection & Return Audit</h3>
                <p className="text-xs text-text-muted font-mono mt-0.5">SR ID: {String(selectedQcInspection.id).slice(0, 8)}</p>
              </div>
              <button
                onClick={() => setSelectedQcInspection(null)}
                className="text-text-muted hover:text-text text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-surface-raised p-3 rounded-xl border border-border space-y-1">
                <span className="text-xs text-text-muted block">Product Description:</span>
                <p className="font-semibold text-text">{selectedQcInspection.product}</p>
                <div className="flex justify-between items-center pt-2 text-xs">
                  <span className="text-text-secondary">Vendor: <strong>{selectedQcInspection.supplierName}</strong></span>
                  <span className="text-text-secondary">Quantity: <strong>{selectedQcInspection.quantity} units</strong></span>
                  <span className="text-text-secondary">Value: <strong>₹{Number(selectedQcInspection.value).toLocaleString('en-IN')}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-raised p-3 rounded-xl border border-border">
                  <span className="text-xs text-text-muted block mb-1">Quality Grade</span>
                  <GradeBadge grade={selectedQcInspection.conditionGrade} />
                </div>
                <div className="bg-surface-raised p-3 rounded-xl border border-border">
                  <span className="text-xs text-text-muted block mb-1">Assigned Disposition</span>
                  <span className="font-semibold text-xs text-text">
                    {DISPOSITION_LABEL[selectedQcInspection.disposition] || selectedQcInspection.disposition}
                  </span>
                </div>
              </div>

              <div className="bg-surface-raised p-3 rounded-xl border border-border text-xs space-y-1">
                <span className="text-text-muted block">RTM Batch Association:</span>
                {selectedQcInspection.rtmBatch ? (
                  <p className="font-medium text-emerald-600 dark:text-emerald-400">
                    Consolidated into Batch RTM-{String(selectedQcInspection.rtmBatch.id).slice(0, 8)}
                  </p>
                ) : (
                  <p className="font-medium text-amber-600 dark:text-amber-400">
                    Unbatched · Staged in Warehouse Hub ready for batching
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setSelectedQcInspection(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
