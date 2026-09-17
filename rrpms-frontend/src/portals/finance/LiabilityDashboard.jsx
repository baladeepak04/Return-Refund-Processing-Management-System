import React, { useEffect, useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { StatCard } from '../../components/ui/Card.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { listRefunds, listReturns } from '../../lib/api.js';
import { humanize } from '../../lib/enums.js';

const LIABILITY_THEMES = {
  BANK_TRANSFER: {
    color: '#2563EB', // Blue-600
    icon: '🏦',
    label: 'Bank Transfer',
    riskTag: 'Direct Cash Outflow',
    riskBg: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Committed NEFT/IMPS payout from operational bank reserves.',
  },
  ORIGINAL_METHOD: {
    color: '#10B981', // Emerald-500
    icon: '💳',
    label: 'Original Method',
    riskTag: 'Gateway Reversal',
    riskBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Reversed through payment aggregator settlement balance.',
  },
  STORE_CREDIT: {
    color: '#F59E0B', // Amber-500
    icon: '🎁',
    label: 'Store Credit',
    riskTag: 'Zero Cash Drain (Closed-Loop)',
    riskBg: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Digital wallet ledger liability; capital stays within ecosystem.',
  },
};

export default function LiabilityDashboard() {
  const [refunds, setRefunds] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMethodIndex, setActiveMethodIndex] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [refRes, retRes] = await Promise.all([
        listRefunds(),
        listReturns().catch(() => ({ data: [] })),
      ]);
      setRefunds(Array.isArray(refRes.data) ? refRes.data : []);
      setReturns(Array.isArray(retRes.data) ? retRes.data : []);
    } catch (e) {
      console.error('finance LiabilityDashboard error:', e);
      setError(e?.response?.data?.detail || 'Unable to synchronize liability metrics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const returnMap = useMemo(() => new Map(returns.map((r) => [r.id, r])), [returns]);

  const outstanding = useMemo(
    () => refunds.filter((r) => !['CREDITED', 'FAILED'].includes(r.status)),
    [refunds]
  );
  const totalLiability = useMemo(
    () => outstanding.reduce((s, r) => s + Number(r.amount || 0), 0),
    [outstanding]
  );
  const highValueCount = useMemo(
    () => outstanding.filter((r) => r.approvalRequired).length,
    [outstanding]
  );
  const awaitingApproval = useMemo(
    () => outstanding.filter((r) => r.status === 'PENDING').length,
    [outstanding]
  );

  const { methodData, totalExposure } = useMemo(() => {
    const byMethod = {};
    outstanding.forEach((r) => {
      const m = r.method || 'ORIGINAL_METHOD';
      byMethod[m] = (byMethod[m] || 0) + Number(r.amount || 0);
    });

    const total = Object.values(byMethod).reduce((a, b) => a + b, 0);
    const data = Object.entries(byMethod).map(([method, value]) => {
      const theme = LIABILITY_THEMES[method] || {
        color: '#64748B',
        icon: '💵',
        label: humanize(method),
        riskTag: 'Pending Outflow',
        riskBg: 'bg-slate-100 text-slate-700 border-slate-200',
        description: 'Pending settlement liability.',
      };
      const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
      return {
        method,
        name: theme.label,
        value,
        pct: Number(pct),
        ...theme,
      };
    }).sort((a, b) => b.value - a.value);

    return { methodData: data, totalExposure: total };
  }, [outstanding]);

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8 text-center animate-pulse">
        <p className="text-sm font-medium text-text-secondary">Loading liability analytics…</p>
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

      {/* Executive Liability KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Outstanding Liability"
          value={`₹${totalLiability.toLocaleString('en-IN')}`}
          tint="warning"
          trend={`${outstanding.length} active uncredited claims`}
        />
        <StatCard
          label="Awaiting Finance Authorization"
          value={awaitingApproval}
          tint="danger"
          trend="Pending review in refund queue"
        />
        <StatCard
          label="High-Value Claims Exposed"
          value={highValueCount}
          tint="info"
          trend="Threshold: > ₹5,000"
        />
      </div>

      {/* Unique "Outstanding Liability by Method" Visualization */}
      <div className="bg-white border border-border/80 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-base">
                🛡️
              </span>
              <div>
                <h2 className="font-heading font-bold text-text text-lg tracking-tight">
                  Outstanding Liability by Method
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Live liquidity exposure and capital reservation breakdown across payment channels.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Total Unsettled Exposure:</span>
            <span className="font-heading font-extrabold text-rose-600 text-base">
              ₹{totalExposure.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {methodData.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <span className="text-3xl block mb-1">🎉</span>
            <p className="font-semibold text-sm text-text">Zero Outstanding Liability</p>
            <p className="text-xs text-text-muted mt-0.5">
              All approved refunds have been disbursed and settled.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-6">
            {/* Interactive Ring Donut with Centered Live Metric (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
              <div className="w-60 h-60 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={methodData}
                      dataKey="value"
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

                {/* Center Ring Live Metric (Clean HUD without tooltip collision) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                  {activeMethodIndex !== null && methodData[activeMethodIndex] ? (
                    <div className="flex flex-col items-center">
                      <span className="text-lg mb-0.5">{methodData[activeMethodIndex].icon}</span>
                      <span className="font-heading font-extrabold text-slate-900 text-xl leading-none">
                        ₹{methodData[activeMethodIndex].value.toLocaleString('en-IN')}
                      </span>
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
                        {methodData[activeMethodIndex].pct}% liability
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        Total Exposure
                      </span>
                      <span className="font-heading font-extrabold text-slate-900 text-2xl leading-tight my-0.5">
                        ₹{totalExposure.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                        {outstanding.length} Open Claims
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-text-muted mt-1 text-center">
                Hover or tap any segment to view exposure by settlement rail.
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
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${m.riskBg}`}
                            >
                              {m.riskTag}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted hidden sm:block">
                            {m.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-heading font-extrabold text-sm text-slate-900 block">
                          ₹{m.value.toLocaleString('en-IN')}
                        </span>
                        <span className="font-semibold text-xs text-slate-600">
                          {m.pct}% share
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

      {/* Active Liability Claims Schedule */}
      <div className="bg-white border border-border/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
          <div>
            <h3 className="font-heading font-bold text-text text-base">
              Active Liability Schedule
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Specific merchandise return claims currently pending settlement.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            {outstanding.length} Open Records
          </span>
        </div>

        <div className="divide-y divide-border/60 overflow-x-auto">
          {outstanding.map((r) => {
            const ret = returnMap.get(r.returnRequest?.id) || r.returnRequest || {};
            const productName =
              ret.items?.[0]?.productName ||
              r.returnRequest?.items?.[0]?.productName ||
              'Return Merchandise';
            const customerName =
              ret.customerName ||
              r.returnRequest?.customerName ||
              (ret.customerId ? `Customer ${String(ret.customerId).slice(0, 8)}` : 'Retail Customer');
            const theme = LIABILITY_THEMES[r.method] || {
              icon: '💵',
              label: humanize(r.method),
              riskBg: 'bg-slate-100 text-slate-700 border-slate-200',
            };

            return (
              <div
                key={r.id}
                className="py-3.5 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100">
                      #{String(r.id).slice(0, 8)}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.riskBg}`}
                    >
                      {theme.icon} {theme.label}
                    </span>
                    <StatusBadge value={r.status} />
                  </div>
                  <p className="font-heading font-semibold text-sm text-slate-900 truncate" title={productName}>
                    {productName}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Customer: <strong className="text-slate-800 font-semibold">{customerName}</strong>
                    {r.initiatedAt && (
                      <span className="text-text-muted ml-2">
                        · Initiated: {new Date(r.initiatedAt).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-heading font-extrabold text-sm text-slate-900 block">
                    ₹{Number(r.amount).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-text-muted">Uncredited</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
