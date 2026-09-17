import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { StatCard } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { ClockIcon, TrendIcon, AlertIcon } from '../../components/ui/icons.jsx';
import { humanize } from '../../lib/enums.js';
import { listRefunds, approveRefund, rejectRefund } from '../../lib/api.js';

const METHOD_THEMES = {
  BANK_TRANSFER: {
    color: '#2563EB', // Blue-600
    icon: '🏦',
    label: 'Bank Transfer',
    subtext: 'Direct NEFT / IMPS account credit',
    tag: 'T+1 Working Day',
    tagBg: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  ORIGINAL_METHOD: {
    color: '#10B981', // Emerald-500
    icon: '💳',
    label: 'Original Method',
    subtext: 'Card / UPI gateway reversal',
    tag: '3-5 Banking Days',
    tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  STORE_CREDIT: {
    color: '#F59E0B', // Amber-500
    icon: '🎁',
    label: 'Store Credit',
    subtext: 'Wallet balance with +5% retention bonus',
    tag: 'Instant Disbursal',
    tagBg: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [activeMethodIndex, setActiveMethodIndex] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await listRefunds();
      setRefunds(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('finance Dashboard error:', e);
      setError(e?.response?.data?.detail || 'Unable to synchronize finance metrics. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id) {
    setBusyId(id);
    setError('');
    setSuccessMsg('');
    try {
      await approveRefund(id);
      setSuccessMsg(`Refund #${String(id).slice(0, 8)} approved. Payment disbursement scheduled.`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not approve refund.');
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id) {
    setBusyId(id);
    setError('');
    setSuccessMsg('');
    try {
      await rejectRefund(id, 'Rejected by finance authorization');
      setSuccessMsg(`Refund #${String(id).slice(0, 8)} rejected.`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not reject refund.');
    } finally {
      setBusyId(null);
    }
  }

  const pending = useMemo(() => refunds.filter((r) => r.status === 'PENDING'), [refunds]);
  const pendingTotal = useMemo(
    () => pending.reduce((s, r) => s + Number(r.amount || 0), 0),
    [pending]
  );
  const creditedToday = useMemo(
    () =>
      refunds.filter(
        (r) =>
          r.status === 'CREDITED' &&
          r.creditedAt &&
          new Date(r.creditedAt).toDateString() === new Date().toDateString()
      ),
    [refunds]
  );
  const creditedTodayTotal = useMemo(
    () => creditedToday.reduce((s, r) => s + Number(r.amount || 0), 0),
    [creditedToday]
  );
  const highValuePending = useMemo(
    () => pending.filter((r) => r.approvalRequired),
    [pending]
  );

  const creditedWithTat = useMemo(
    () =>
      refunds.filter(
        (r) => r.status === 'CREDITED' && r.creditedAt && r.initiatedAt
      ),
    [refunds]
  );
  const avgTatDays =
    creditedWithTat.length > 0
      ? (
          creditedWithTat.reduce(
            (s, r) =>
              s + (new Date(r.creditedAt) - new Date(r.initiatedAt)) / 86400000,
            0
          ) / creditedWithTat.length
        ).toFixed(1)
      : '—';

  // Method data calculations
  const { methodData, totalMethodAmount } = useMemo(() => {
    const byMethod = {};
    refunds.forEach((r) => {
      const m = r.method || 'ORIGINAL_METHOD';
      byMethod[m] = (byMethod[m] || 0) + Number(r.amount || 0);
    });

    const total = Object.values(byMethod).reduce((a, b) => a + b, 0);
    const data = Object.entries(byMethod).map(([method, value]) => {
      const theme = METHOD_THEMES[method] || {
        color: '#64748B',
        icon: '💵',
        label: humanize(method),
        subtext: 'Payment disbursement',
        tag: 'Standard SLA',
        tagBg: 'bg-slate-100 text-slate-700 border-slate-200',
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

    return { methodData: data, totalMethodAmount: total };
  }, [refunds]);

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8 text-center animate-pulse">
        <p className="text-sm font-medium text-text-secondary">Loading executive finance summary…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl shadow-xs flex items-center justify-between">
          <p className="font-semibold flex items-center gap-1.5">
            <span>✅</span>
            <span>{successMsg}</span>
          </p>
          <button
            onClick={() => setSuccessMsg('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Refunds"
          value={`₹${pendingTotal.toLocaleString('en-IN')}`}
          icon={<ClockIcon />}
          tint="warning"
          trend={`${pending.length} cases awaiting payout`}
        />
        <StatCard
          label="Credited Today"
          value={`₹${creditedTodayTotal.toLocaleString('en-IN')}`}
          icon={<TrendIcon />}
          tint="success"
          trend={`${creditedToday.length} settlements released`}
        />
        <StatCard
          label="High Value Pending"
          value={highValuePending.length}
          icon={<AlertIcon />}
          tint="danger"
          trend="Mandatory approval (> ₹5,000)"
        />
        <StatCard
          label="Avg. TAT (Credited)"
          value={avgTatDays === '—' ? '—' : `${avgTatDays} days`}
          icon={<TrendIcon />}
          tint="info"
          trend="Banking disbursement SLA"
        />
      </div>

      {/* Unique "Refund Value by Method" Visualization */}
      <div className="bg-white border border-border/80 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base">
                💳
              </span>
              <div>
                <h2 className="font-heading font-bold text-text text-lg tracking-tight">
                  Refund Value by Method
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Portfolio capital allocation across banking rails, card gateways, and store credit.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Total Refund Pipeline:</span>
            <span className="font-heading font-extrabold text-slate-900 text-base">
              ₹{totalMethodAmount.toLocaleString('en-IN')}
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
                        {methodData[activeMethodIndex].pct}% volume
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        Total Pipeline
                      </span>
                      <span className="font-heading font-extrabold text-slate-900 text-2xl leading-tight my-0.5">
                        ₹{totalMethodAmount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {refunds.length} Transactions
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-text-muted mt-1 text-center">
                Hover or tap any segment to explore payment rail allocation.
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

      {/* High Value Refunds – Pending Approval Card */}
      <div className="bg-white border border-border/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm">
              ⚠️
            </span>
            <div>
              <h2 className="font-heading font-bold text-text text-base">
                High Value Refunds – Pending Approval
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Authorizations required for payouts exceeding the ₹5,000 threshold.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/finance/refund-queue')}
            className="text-xs font-semibold text-primary hover:text-primary-dark"
          >
            View All Queue ({refunds.length}) →
          </button>
        </div>

        {highValuePending.length === 0 ? (
          <div className="text-center py-10 text-text-muted">
            <span className="text-2xl block mb-1">✅</span>
            <p className="font-semibold text-sm text-text">No High-Value Refunds Pending</p>
            <p className="text-xs text-text-muted mt-0.5">
              All flagged transactions above ₹5,000 have been reviewed and authorized.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {highValuePending.map((r) => {
              const productName =
                r.returnRequest?.items?.[0]?.productName ||
                r.productName ||
                'High-Value Merchandise';
              const customerName =
                r.returnRequest?.customerName ||
                r.customerName ||
                (r.returnRequest?.customerId
                  ? `Customer ${String(r.returnRequest.customerId).slice(0, 8)}`
                  : 'Retail Customer');
              const customerEmail = r.returnRequest?.customerEmail || '';
              const theme = METHOD_THEMES[r.method] || {
                icon: '💵',
                label: humanize(r.method),
                tagBg: 'bg-slate-100 text-slate-700 border-slate-200',
              };

              return (
                <div
                  key={r.id}
                  className="py-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-primary bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100">
                        #{String(r.id).slice(0, 8)}
                      </span>
                      {r.returnRequest?.id && (
                        <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          Ret: #{String(r.returnRequest.id).slice(0, 8)}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.tagBg}`}
                      >
                        {theme.icon} {theme.label}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        High Value
                      </span>
                    </div>

                    {/* Product Name Display */}
                    <h3 className="font-heading font-semibold text-sm text-slate-900 truncate" title={productName}>
                      {productName}
                    </h3>

                    {/* Customer Name Display */}
                    <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
                      <p>
                        Customer: <strong className="text-slate-800 font-semibold">{customerName}</strong>
                        {customerEmail && (
                          <span className="text-text-muted text-[11px] ml-1">({customerEmail})</span>
                        )}
                      </p>
                      {r.returnRequest?.reasonCode && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600">Reason: {r.returnRequest.reasonCode}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="font-heading font-extrabold text-base text-slate-900 block">
                        ₹{Number(r.amount).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-text-muted font-medium">Payout Amount</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        disabled={busyId === r.id}
                        onClick={() => approve(r.id)}
                        className="text-xs font-semibold shadow-xs"
                      >
                        {busyId === r.id ? 'Processing…' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyId === r.id}
                        onClick={() => reject(r.id)}
                        className="text-xs font-semibold shadow-xs"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
