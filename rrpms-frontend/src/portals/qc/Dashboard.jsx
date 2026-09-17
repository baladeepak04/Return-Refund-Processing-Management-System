import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../../components/ui/Card.jsx';
import { ClockIcon, CheckIcon, XIcon, TrendIcon } from '../../components/ui/icons.jsx';
import Button from '../../components/ui/Button.jsx';
import { listReturns, listQcInspections } from '../../lib/api.js';
import { DISPOSITION_LABEL } from '../../lib/enums.js';

const DISPOSITION_COLORS = {
  RESTOCK_NEW: '#16A34A',
  RESTOCK_REFURB: '#2563EB',
  LIQUIDATE: '#F59E0B',
  DISPOSE: '#DC2626',
  RTM: '#7C3AED',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [rRes, qRes] = await Promise.all([listReturns(), listQcInspections()]);
      setReturns(Array.isArray(rRes.data) ? rRes.data : []);
      setInspections(Array.isArray(qRes.data) ? qRes.data : []);
    } catch (e) {
      console.error('qc Dashboard error:', e);
      setError(e?.response?.data?.detail || 'Unable to synchronize QC metrics. Please try again.');
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
      returns.filter(
        (r) =>
          ['RECEIVED', 'IN_TRANSIT', 'QC_IN_PROGRESS'].includes(r.status) &&
          !inspectedReturnIds.has(r.id)
      ),
    [returns, inspectedReturnIds]
  );

  const passRate =
    inspections.length > 0
      ? Math.round(
          (inspections.filter((i) => ['MINT', 'GOOD'].includes(i.conditionGrade)).length /
            inspections.length) *
            100
        )
      : 0;

  // Disposition summary counts
  const dispositionCounts = useMemo(() => {
    const map = {};
    inspections.forEach((i) => {
      const disp = i.disposition || 'RESTOCK_NEW';
      map[disp] = (map[disp] || 0) + 1;
    });
    return Object.entries(map).map(([key, count]) => ({
      key,
      name: DISPOSITION_LABEL[key] || key,
      count,
      pct: inspections.length > 0 ? Math.round((count / inspections.length) * 100) : 0,
      color: DISPOSITION_COLORS[key] || '#94A3B8',
    }));
  }, [inspections]);

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8 text-center animate-pulse">
        <p className="text-sm font-medium text-text-secondary">Loading quality control dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* QC KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Inspection"
          value={pending.length}
          icon={<ClockIcon />}
          tint="warning"
          trend={`${returns.filter((r) => r.status === 'RECEIVED').length} in dock received`}
        />
        <StatCard
          label="Total Inspected"
          value={inspections.length}
          icon={<CheckIcon />}
          tint="success"
          trend="Graded & routed"
        />
        <StatCard
          label="Rejected / Scrapped"
          value={inspections.filter((i) => ['DAMAGED', 'UNUSABLE'].includes(i.conditionGrade)).length}
          icon={<XIcon />}
          tint="danger"
          trend="Failed physical/functional"
        />
        <StatCard
          label="QC Pass Rate"
          value={`${passRate}%`}
          icon={<TrendIcon />}
          tint="info"
          trend="Mint & Good grade share"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Inspection Queue (Spans 2 columns on lg) */}
        <div className="lg:col-span-2 bg-white border border-border/80 rounded-xl shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border/60 bg-slate-50/40">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-text text-base">Active Inspection Queue</h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary border border-primary-100">
                  {pending.length} Awaiting QC
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Top return packages queued for physical grading and defect validation.
              </p>
            </div>
            {pending.length > 0 && (
              <button
                onClick={() => navigate('/qc/inspection-queue')}
                className="text-primary hover:text-primary-dark text-xs font-semibold"
              >
                View Full Queue ({pending.length}) →
              </button>
            )}
          </div>

          {pending.length === 0 ? (
            <div className="text-center py-12 px-4 text-text-muted">
              <span className="text-2xl block mb-1">🎉</span>
              <p className="font-semibold text-sm text-text">QC Queue is Clear</p>
              <p className="text-xs text-text-muted mt-1">No packages are currently awaiting inspection.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {pending.slice(0, 6).map((r) => {
                const productName = r.items?.[0]?.productName || 'General Return Item';
                const customerName =
                  r.customerName || `Customer ${String(r.customerId || '').slice(0, 8)}`;
                const statusBg =
                  r.status === 'RECEIVED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : r.status === 'IN_TRANSIT'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200';

                return (
                  <div
                    key={r.id}
                    className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-primary bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100">
                          #{String(r.id).slice(0, 8)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBg}`}
                        >
                          {r.status}
                        </span>
                        {r.refundAmount && (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            ₹{Number(r.refundAmount).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      {/* Product Name */}
                      <p className="font-heading font-semibold text-sm text-slate-900 truncate" title={productName}>
                        {productName}
                      </p>

                      {/* Customer Name & Reason */}
                      <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
                        <span>
                          Customer:{' '}
                          <strong className="text-slate-800 font-semibold">{customerName}</strong>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>
                          Reason: <span className="text-slate-700 font-medium">{r.reasonCode}</span>
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => navigate(`/qc/inspection/${r.id}`)}
                      className="text-xs font-semibold shadow-xs shrink-0"
                    >
                      Inspect →
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {pending.length > 6 && (
            <div className="p-3 bg-slate-50/70 border-t border-border/60 text-center">
              <button
                onClick={() => navigate('/qc/inspection-queue')}
                className="text-xs font-semibold text-primary hover:text-primary-dark"
              >
                + {pending.length - 6} more packages in queue · Open Inward Queue
              </button>
            </div>
          )}
        </div>

        {/* Quick Inspection Summary & Disposition Snapshot */}
        <div className="space-y-4">
          <div className="bg-white border border-border/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-bold text-text text-sm">Disposition Snapshot</h3>
              <button
                onClick={() => navigate('/qc/qc-reports')}
                className="text-primary hover:text-primary-dark text-xs font-semibold"
              >
                Full Analytics →
              </button>
            </div>
            <p className="text-xs text-text-muted mb-4">
              Routing breakdown across {inspections.length} inspected items.
            </p>

            <div className="space-y-3">
              {dispositionCounts.map((d) => (
                <div key={d.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="font-medium text-slate-700">{d.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {d.count}{' '}
                      <span className="text-slate-400 font-normal">({d.pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${d.pct}%`, backgroundColor: d.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <span>⚡</span>
              <span>Warehouse QC Actions</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Scan arrival AWB barcodes directly on the inward dock to load the technical grading checklist.
            </p>
            <div className="pt-1 flex flex-col gap-2">
              <button
                onClick={() => navigate('/qc/inspection-queue')}
                className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>📷</span>
                <span>Open Optical Barcode Scanner</span>
              </button>
              <button
                onClick={() => navigate('/qc/inspection-history')}
                className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors text-center"
              >
                Review Completed Inspections ({inspections.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
