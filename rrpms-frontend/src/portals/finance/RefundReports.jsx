import React, { useEffect, useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { StatCard } from '../../components/ui/Card.jsx';
import { humanize } from '../../lib/enums.js';
import { listRefunds } from '../../lib/api.js';

const METHOD_THEMES = {
  BANK_TRANSFER: {
    color: '#2563EB', // Blue-600
    icon: '🏦',
    label: 'Bank Transfer',
    subtext: 'Direct account credit (NEFT/IMPS/RTGS)',
    tag: 'T+1 Disbursal',
    tagBg: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  ORIGINAL_METHOD: {
    color: '#10B981', // Emerald-500
    icon: '💳',
    label: 'Original Method',
    subtext: 'Card / NetBanking / UPI gateway reversal',
    tag: '3-5 Banking Days',
    tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  STORE_CREDIT: {
    color: '#F59E0B', // Amber-500
    icon: '🎁',
    label: 'Store Credit',
    subtext: 'Instant digital wallet with +5% loyalty bonus',
    tag: 'Instant Settlement',
    tagBg: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

export default function RefundReports() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMethodIndex, setActiveMethodIndex] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listRefunds();
      setRefunds(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('finance RefundReports error:', e);
      setError(e?.response?.data?.detail || 'Unable to synchronize refund reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const thisMonth = useMemo(() => {
    return refunds.filter((r) => {
      const d = r.initiatedAt ? new Date(r.initiatedAt) : null;
      const now = new Date();
      return (
        d &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    });
  }, [refunds]);

  const totalRefunded = useMemo(
    () =>
      thisMonth
        .filter((r) => r.status === 'CREDITED')
        .reduce((s, r) => s + Number(r.amount || 0), 0),
    [thisMonth]
  );

  const avgRefund = useMemo(
    () =>
      thisMonth.length > 0
        ? Math.round(
            thisMonth.reduce((s, r) => s + Number(r.amount || 0), 0) /
              thisMonth.length
          )
        : 0,
    [thisMonth]
  );

  const failedCount = useMemo(
    () => refunds.filter((r) => r.status === 'FAILED').length,
    [refunds]
  );

  const failRate =
    refunds.length > 0
      ? ((failedCount / refunds.length) * 100).toFixed(2)
      : '0.00';

  const total = refunds.length || 1;

  const methodData = useMemo(() => {
    const byMethod = {};
    refunds.forEach((r) => {
      const m = r.method || 'ORIGINAL_METHOD';
      byMethod[m] = (byMethod[m] || 0) + 1;
    });

    return Object.entries(byMethod).map(([method, count]) => {
      const theme = METHOD_THEMES[method] || {
        color: '#64748B',
        icon: '💵',
        label: humanize(method),
        subtext: 'Payment disbursement channel',
        tag: 'Standard SLA',
        tagBg: 'bg-slate-100 text-slate-700 border-slate-200',
      };
      const pct = Math.round((count / total) * 100);
      return {
        method,
        name: theme.label,
        count,
        pct,
        ...theme,
      };
    }).sort((a, b) => b.count - a.count);
  }, [refunds, total]);

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8 text-center animate-pulse">
        <p className="text-sm font-medium text-text-secondary">Loading financial audit reports…</p>
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

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Refunded (This Month)"
          value={`₹${totalRefunded.toLocaleString('en-IN')}`}
          tint="success"
          trend="Successfully credited payouts"
        />
        <StatCard
          label="Transactions (This Month)"
          value={thisMonth.length}
          tint="primary"
          trend={`${refunds.length} all-time refund records`}
        />
        <StatCard
          label="Avg. Refund Ticket"
          value={`₹${avgRefund.toLocaleString('en-IN')}`}
          tint="info"
          trend="Across all return categories"
        />
        <StatCard
          label="Failed Txns"
          value={failedCount}
          tint="danger"
          trend={`${failRate}% gateway failure rate`}
        />
      </div>

      {/* Unique "Refunds by Method" Reporting Card */}
      <div className="bg-white border border-border/80 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-base">
                📊
              </span>
              <div>
                <h2 className="font-heading font-bold text-text text-lg tracking-tight">
                  Refunds by Method
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Transactional channel distribution and customer payment rail preferences across {refunds.length} cases.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Total Cases Analyzed:</span>
            <span className="font-heading font-extrabold text-slate-900 text-base">
              {refunds.length} Transactions
            </span>
          </div>
        </div>

        {methodData.length === 0 ? (
          <p className="text-sm text-text-muted py-12 text-center">No refunds recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-6">
            {/* Interactive Ring Donut with Centered Live Metric (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
              <div className="w-60 h-60 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={methodData}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={68}
                      outerRadius={98}
                      paddingAngle={4}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      onMouseEnter={(_, idx) => setActiveMethodIndex(idx)}
                      onMouseLeave={() => setActiveMethodIndex(null)}
                      onClick={(_, idx) =>
                        setActiveMethodIndex((prev) => (prev === idx ? null : idx))
                      }
                    >
                      {methodData.map((m, idx) => (
                        <Cell
                          key={m.method}
                          fill={m.color}
                          opacity={
                            activeMethodIndex === null || activeMethodIndex === idx ? 1 : 0.35
                          }
                          className="transition-all duration-300 cursor-pointer"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Ring Floating Metric (Clean HUD without tooltip collision) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                  {activeMethodIndex !== null && methodData[activeMethodIndex] ? (
                    <div className="flex flex-col items-center">
                      <span className="text-lg mb-0.5">{methodData[activeMethodIndex].icon}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-heading font-extrabold text-slate-900 text-2xl leading-none">
                          {methodData[activeMethodIndex].count}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">txns</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 mt-1 max-w-[125px] truncate">
                        {methodData[activeMethodIndex].name}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 border"
                        style={{
                          backgroundColor: `${methodData[activeMethodIndex].color}15`,
                          color: methodData[activeMethodIndex].color,
                          borderColor: `${methodData[activeMethodIndex].color}30`,
                        }}
                      >
                        {methodData[activeMethodIndex].pct}% claims
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        Audit Sample
                      </span>
                      <span className="font-heading font-extrabold text-slate-900 text-3xl leading-none my-1">
                        {refunds.length}
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        Disbursement Events
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-text-muted mt-1 text-center">
                Hover or tap any segment to inspect transaction volume.
              </p>
            </div>

            {/* Rich Method Breakdown Cards (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              {methodData.map((m, idx) => {
                const isHovered = activeMethodIndex === idx;
                return (
                  <div
                    key={m.method}
                    onMouseEnter={() => setActiveMethodIndex(idx)}
                    onMouseLeave={() => setActiveMethodIndex(null)}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isHovered
                        ? 'border-slate-400 bg-slate-50/90 shadow-xs translate-x-1'
                        : 'border-border/70 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base shadow-2xs"
                          style={{ backgroundColor: `${m.color}15`, color: m.color }}
                        >
                          {m.icon}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-bold text-xs text-slate-900">
                              {m.name}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${m.tagBg}`}
                            >
                              {m.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted hidden sm:block">
                            {m.subtext}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className="font-heading font-extrabold text-sm text-slate-900">
                            {m.count}
                          </span>
                          <span className="text-[11px] text-text-muted">txns</span>
                        </div>
                        <span className="font-semibold text-xs text-slate-600">
                          {m.pct}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${m.pct}%`,
                          backgroundColor: m.color,
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
