import React, { useEffect, useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { StatCard } from '../../components/ui/Card.jsx';
import { DISPOSITION_LABEL } from '../../lib/enums.js';
import { listQcInspections } from '../../lib/api.js';

const DISPOSITION_CONFIG = {
  RESTOCK_NEW: {
    color: '#10B981', // Emerald-500
    icon: '🔄',
    tag: 'Full Value Restock',
    tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Inventory returned to primary shelf stock at 100% retail price.',
  },
  RESTOCK_REFURB: {
    color: '#3B82F6', // Blue-500
    icon: '🛠️',
    tag: 'Refurbished Market',
    tagBg: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Minor repackaging or testing required for B-stock/refurb sale.',
  },
  RTM: {
    color: '#8B5CF6', // Violet-500
    icon: '↩️',
    tag: 'Vendor Credit Claim',
    tagBg: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Returned to original manufacturer/vendor for 100% credit memo.',
  },
  LIQUIDATE: {
    color: '#F59E0B', // Amber-500
    icon: '🏷️',
    tag: 'B2B Bulk Liquidation',
    tagBg: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Auctioned in secondary lots to certified salvage buyers.',
  },
  DISPOSE: {
    color: '#EF4444', // Red-500
    icon: '🗑️',
    tag: 'Scrap & E-Waste',
    tagBg: 'bg-red-50 text-red-700 border-red-200',
    description: 'Unrepairable or hazardous units directed to recycling.',
  },
};

export default function QcReports() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listQcInspections();
      setInspections(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('qc QcReports error:', e);
      setError(e?.response?.data?.detail || 'Unable to synchronize quality control analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const total = inspections.length;
  const passRate =
    total > 0
      ? Math.round(
          (inspections.filter((i) => ['MINT', 'GOOD'].includes(i.conditionGrade)).length /
            total) *
            100
        )
      : 0;
  const mismatchFlags = inspections.filter((i) => i.complaintValidated === false).length;

  const chartData = useMemo(() => {
    const byDisposition = {};
    inspections.forEach((i) => {
      const disp = i.disposition || 'RESTOCK_NEW';
      byDisposition[disp] = (byDisposition[disp] || 0) + 1;
    });

    return Object.entries(byDisposition).map(([disposition, value]) => {
      const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
      const config = DISPOSITION_CONFIG[disposition] || {
        color: '#94A3B8',
        icon: '📦',
        tag: 'Standard Routing',
        tagBg: 'bg-slate-100 text-slate-700 border-slate-200',
        description: 'Standard post-inspection inventory assignment.',
      };

      return {
        disposition,
        name: DISPOSITION_LABEL[disposition] || disposition,
        value,
        pct: Number(pct),
        ...config,
      };
    }).sort((a, b) => b.value - a.value);
  }, [inspections, total]);

  // Executive summary metrics
  const restockUnits = useMemo(() => {
    return (
      (inspections.filter((i) => ['RESTOCK_NEW', 'RESTOCK_REFURB'].includes(i.disposition)).length /
        (total || 1)) *
      100
    ).toFixed(1);
  }, [inspections, total]);

  const rtmUnits = useMemo(() => {
    return (
      (inspections.filter((i) => i.disposition === 'RTM').length / (total || 1)) *
      100
    ).toFixed(1);
  }, [inspections, total]);

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8 text-center animate-pulse">
        <p className="text-sm font-medium text-text-secondary">Loading quality control metrics…</p>
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

      {/* QC Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="QC Pass Rate"
          value={`${passRate}%`}
          tint="success"
          trend={`${total} total inspections graded`}
        />
        <StatCard
          label="Total Inspections Processed"
          value={total}
          tint="info"
          trend="100% technical audit coverage"
        />
        <StatCard
          label="Customer Reason Mismatches"
          value={mismatchFlags}
          tint="danger"
          trend="Physical condition differed from claim"
        />
      </div>

      {/* Unique & Premium Disposition Breakdown Widget */}
      <div className="bg-white border border-border/80 rounded-2xl p-6 sm:p-7 shadow-xs">
        {/* Header with Title and Executive Summary Metrics */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 text-primary flex items-center justify-center font-bold text-base">
                🎯
              </span>
              <div>
                <h2 className="font-heading font-bold text-text text-lg tracking-tight">
                  Disposition Breakdown
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Multi-channel warehouse routing analysis across {total} inspected returns.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                Direct Inventory Retention
              </span>
              <span className="font-heading font-bold text-emerald-800 text-sm">
                {restockUnits}% Restocked
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200">
              <span className="text-[10px] uppercase font-bold text-purple-600 block">
                Vendor RTM Recovery
              </span>
              <span className="font-heading font-bold text-purple-800 text-sm">
                {rtmUnits}% Reclaimed
              </span>
            </div>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <span className="text-3xl block mb-2">📋</span>
            <p className="font-semibold text-sm text-text">No inspections recorded yet</p>
            <p className="text-xs text-text-muted mt-1">Processed returns will populate disposition statistics.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-6">
            {/* Interactive Ring Donut with Centered Live Metric (4 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
              <div className="w-64 h-64 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={74}
                      outerRadius={106}
                      paddingAngle={3}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                      onClick={(_, index) =>
                        setActiveIndex((prev) => (prev === index ? null : index))
                      }
                    >
                      {chartData.map((d, index) => (
                        <Cell
                          key={d.disposition}
                          fill={d.color}
                          opacity={activeIndex === null || activeIndex === index ? 1 : 0.35}
                          className="transition-all duration-300 cursor-pointer"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Ring Floating Metric (Clean HUD without tooltip collision) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                  {activeIndex !== null && chartData[activeIndex] ? (
                    <div className="flex flex-col items-center">
                      <span className="text-xl mb-0.5">{chartData[activeIndex].icon}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-heading font-extrabold text-slate-900 text-2xl leading-none">
                          {chartData[activeIndex].value}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">units</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 mt-1 max-w-[125px] truncate leading-tight block">
                        {chartData[activeIndex].name}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 border"
                        style={{
                          backgroundColor: `${chartData[activeIndex].color}15`,
                          color: chartData[activeIndex].color,
                          borderColor: `${chartData[activeIndex].color}30`,
                        }}
                      >
                        {chartData[activeIndex].pct}% share
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        Total Inspected
                      </span>
                      <span className="font-heading font-extrabold text-slate-900 text-3xl leading-none my-1">
                        {total}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Units Processed
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-text-muted mt-2 text-center">
                Hover or tap any segment to explore channel yield.
              </p>
            </div>

            {/* Distinctive Disposition Cards with Progress Bars (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              {chartData.map((d, index) => {
                const isHovered = activeIndex === index;
                return (
                  <div
                    key={d.disposition}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isHovered
                        ? 'border-slate-400 bg-slate-50/90 shadow-xs translate-x-1'
                        : 'border-border/70 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm shadow-2xs"
                          style={{ backgroundColor: `${d.color}15`, color: d.color }}
                        >
                          {d.icon}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-bold text-xs text-slate-900">
                              {d.name}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${d.tagBg}`}
                            >
                              {d.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted hidden sm:block truncate">
                            {d.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className="font-heading font-bold text-sm text-slate-900">
                            {d.value}
                          </span>
                          <span className="text-[11px] text-text-muted">units</span>
                        </div>
                        <span className="font-semibold text-xs text-slate-600">
                          {d.pct}%
                        </span>
                      </div>
                    </div>

                    {/* Channel Percentage Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${d.pct}%`,
                          backgroundColor: d.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
