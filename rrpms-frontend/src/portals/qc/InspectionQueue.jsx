import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import { listReturns, listQcInspections } from '../../lib/api.js';
import { exportToCSV } from '../../lib/exportUtils.js';
import { humanize } from '../../lib/enums.js';
import BarcodeScannerModal from '../../components/modals/BarcodeScannerModal.jsx';

export default function InspectionQueue() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [rRes, qRes] = await Promise.all([listReturns(), listQcInspections()]);
      setReturns(Array.isArray(rRes.data) ? rRes.data : []);
      setInspections(Array.isArray(qRes.data) ? qRes.data : []);
    } catch (e) {
      console.error('qc InspectionQueue error:', e);
      setError(e?.response?.data?.detail || 'Unable to synchronize incoming inspection queue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const inspectedReturnIds = useMemo(
    () => new Set(inspections.map((i) => i.returnRequest?.id)),
    [inspections]
  );

  const pending = useMemo(
    () =>
      returns
        .filter(
          (r) =>
            !r.draft &&
            ['INITIATED', 'PICKUP_SCHEDULED', 'RECEIVED', 'IN_TRANSIT', 'QC_IN_PROGRESS'].includes(r.status) &&
            !inspectedReturnIds.has(r.id)
        )
        .sort((a, b) => new Date(b.initiatedAt || 0) - new Date(a.initiatedAt || 0)),
    [returns, inspectedReturnIds]
  );

  const filteredPending = useMemo(() => {
    return pending.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const pName = (r.items?.[0]?.productName || '').toLowerCase();
      const cName = (r.customerName || '').toLowerCase();
      const cEmail = (r.customerEmail || '').toLowerCase();
      const retId = String(r.id || '').toLowerCase();
      const reason = String(r.reasonCode || '').toLowerCase();
      return (
        pName.includes(q) ||
        cName.includes(q) ||
        cEmail.includes(q) ||
        retId.includes(q) ||
        reason.includes(q)
      );
    });
  }, [pending, statusFilter, searchQuery]);

  function handleScanSuccess(scannedReturn) {
    navigate(`/qc/inspection/${scannedReturn.id}`);
  }

  const handleExportCSV = () => {
    const cols = [
      { key: 'id', label: 'Return ID', accessor: (r) => String(r.id).slice(0, 8) },
      { key: 'customerName', label: 'Customer Name', accessor: (r) => r.customerName || (r.customerId ? `Customer ${String(r.customerId).slice(0, 8)}` : 'Retail Customer') },
      { key: 'customerEmail', label: 'Customer Email', accessor: (r) => r.customerEmail || '' },
      { key: 'productName', label: 'Product Name', accessor: (r) => r.items?.[0]?.productName || 'Returned Product' },
      { key: 'reasonCode', label: 'Stated Return Reason', accessor: (r) => humanize(r.reasonCode) },
      { key: 'status', label: 'Inward Status' },
      { key: 'initiatedAt', label: 'Initiated Date', accessor: (r) => r.initiatedAt ? new Date(r.initiatedAt).toISOString() : '' },
    ];
    exportToCSV('returnflow_qc_inward_manifest', cols, filtered);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RECEIVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_TRANSIT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'QC_IN_PROGRESS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8 text-center animate-pulse">
        <p className="text-sm font-medium text-text-secondary">Loading incoming QC quarantine queue…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface rounded-xl border border-danger-200 p-4 shadow-xs flex items-center justify-between">
        <p className="text-sm font-medium text-danger">{error}</p>
        <button
          onClick={loadData}
          className="px-3 py-1 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-md transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-5 rounded-xl border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading font-bold text-text text-base">Inward QC Quarantine Queue</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary border border-primary-100">
              {pending.length} Pending
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Incoming return packages awaiting warehouse dock check-in, physical verification, and technical grading.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-border text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5"
            title="Download Inward Inspection Manifest as CSV"
          >
            <span>📥 Export Manifest CSV</span>
          </button>
          <Button
            onClick={() => setScannerOpen(true)}
            className="text-xs font-semibold shadow-sm flex items-center gap-1.5"
          >
            <span>📷</span>
            <span>Scan Inward AWB Barcode</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-3.5 rounded-xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'ALL', label: `All (${pending.length})` },
            {
              id: 'RECEIVED',
              label: `Received (${pending.filter((r) => r.status === 'RECEIVED').length})`,
            },
            {
              id: 'IN_TRANSIT',
              label: `In Transit (${pending.filter((r) => r.status === 'IN_TRANSIT').length})`,
            },
            {
              id: 'QC_IN_PROGRESS',
              label: `QC Active (${pending.filter((r) => r.status === 'QC_IN_PROGRESS').length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer, product, or return ID..."
            className="w-full border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <svg
            className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Queue Listing */}
      <div className="bg-white border border-border/80 rounded-xl divide-y divide-border/60 shadow-xs overflow-hidden">
        {filteredPending.length === 0 ? (
          <div className="text-center py-14 px-4 text-text-muted">
            <span className="text-3xl block mb-2">📦</span>
            <p className="font-semibold text-sm text-text">No packages match the current view</p>
            <p className="text-xs text-text-muted mt-1">
              {searchQuery
                ? 'Try adjusting your search keywords or clear filters.'
                : 'All inward shipments have completed technical grading.'}
            </p>
          </div>
        ) : (
          filteredPending.map((r) => {
            const productName = r.items?.[0]?.productName || 'General Return Item';
            const customerName =
              r.customerName || `Customer ${String(r.customerId || '').slice(0, 8)}`;
            const refundVal = r.refundAmount
              ? `₹${Number(r.refundAmount).toLocaleString('en-IN')}`
              : null;

            return (
              <div
                key={r.id}
                className="flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/70 transition-colors gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100">
                      #{String(r.id).slice(0, 8)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                        r.status
                      )}`}
                    >
                      {r.status}
                    </span>
                    {refundVal && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {refundVal}
                      </span>
                    )}
                  </div>

                  {/* Product Name Display */}
                  <h3 className="font-heading font-semibold text-sm text-slate-900 truncate" title={productName}>
                    {productName}
                  </h3>

                  {/* Customer Name Display */}
                  <div className="flex items-center gap-3 text-xs text-text-secondary flex-wrap">
                    <p className="flex items-center gap-1">
                      <span className="text-slate-400 font-medium">Customer:</span>
                      <strong className="text-slate-800 font-semibold">{customerName}</strong>
                      {r.customerEmail && (
                        <span className="text-text-muted text-[11px]">({r.customerEmail})</span>
                      )}
                    </p>
                    <span className="text-slate-300">•</span>
                    <p>
                      <span className="text-slate-400 font-medium">Reason: </span>
                      <span className="font-medium text-slate-700">{r.reasonCode}</span>
                    </p>
                    {r.initiatedAt && (
                      <>
                        <span className="text-slate-300">•</span>
                        <p className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                          <span>🕒</span>
                          <span>
                            {new Date(r.initiatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            , {new Date(r.initiatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/qc/inspection/${r.id}`)}
                    className="text-xs font-semibold shadow-xs flex items-center gap-1"
                  >
                    <span>Inspect Package</span>
                    <span>→</span>
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Optical Scanner Modal */}
      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        availableReturns={pending}
      />
    </div>
  );
}
