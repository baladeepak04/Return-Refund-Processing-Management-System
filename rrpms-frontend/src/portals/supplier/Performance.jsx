import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { StatCard } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { TrendIcon, ShieldIcon, AlertTriangleIcon, CheckCircleIcon, BoxIcon } from '../../components/ui/icons.jsx';
import { listSupplierReturns, listRtmBatches } from '../../lib/api.js';

export default function Performance() {
  const [returns, setReturns] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('financial'); // 'financial' | 'quality' | 'sla'
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [rRes, bRes] = await Promise.all([listSupplierReturns(), listRtmBatches()]);
      setReturns(Array.isArray(rRes.data) ? rRes.data : []);
      setBatches(Array.isArray(bRes.data) ? bRes.data : []);
    } catch (e) {
      console.error('supplier Performance error:', e);
      setError(e?.response?.data?.detail || 'Unable to synchronize supplier performance analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center animate-pulse">
        <p className="text-sm font-medium text-text-secondary">Loading supplier performance analytics & vendor matrix…</p>
      </div>
    );
  }

  // Aggregate stats per supplier
  const supplierMap = {};

  returns.forEach((r) => {
    const sName = r.supplierName || 'Unknown Supplier';
    if (!supplierMap[sName]) {
      supplierMap[sName] = {
        name: sName,
        returnCount: 0,
        returnValue: 0,
        creditNotesSettled: 0,
        creditNotesPending: 0,
        batchesTotal: 0,
        batchesSettled: 0,
        disputes: 0,
        conditionGrades: { MINT: 0, GOOD: 0, FAIR: 0, POOR: 0 },
      };
    }
    supplierMap[sName].returnCount += (r.quantity || 1);
    supplierMap[sName].returnValue += Number(r.value || 0);
    const grade = r.conditionGrade || 'GOOD';
    if (supplierMap[sName].conditionGrades[grade] !== undefined) {
      supplierMap[sName].conditionGrades[grade] += (r.quantity || 1);
    }
  });

  batches.forEach((b) => {
    const sName = b.supplierName || 'Unknown Supplier';
    if (!supplierMap[sName]) {
      supplierMap[sName] = {
        name: sName,
        returnCount: 0,
        returnValue: 0,
        creditNotesSettled: 0,
        creditNotesPending: 0,
        batchesTotal: 0,
        batchesSettled: 0,
        disputes: 0,
        conditionGrades: { MINT: 0, GOOD: 0, FAIR: 0, POOR: 0 },
      };
    }
    supplierMap[sName].batchesTotal += 1;
    const val = Number(b.creditNoteValue || 0);
    if (b.status === 'SETTLED') {
      supplierMap[sName].batchesSettled += 1;
      supplierMap[sName].creditNotesSettled += val;
    } else {
      supplierMap[sName].creditNotesPending += val;
    }
    if (b.disputed) {
      supplierMap[sName].disputes += 1;
    }
  });

  const supplierList = Object.values(supplierMap).map((s) => {
    const recoveryRate = s.returnValue > 0
      ? Math.min(100, Math.round((s.creditNotesSettled / s.returnValue) * 100))
      : (s.batchesSettled > 0 ? 100 : 0);

    const disputePenalty = s.disputes * 25;
    const recoveryScore = recoveryRate * 0.7;
    const qualityScore = Math.max(10, Math.min(100, Math.round(recoveryScore + (s.disputes === 0 ? 30 : 5) - disputePenalty)));

    let tier = 'Tier 2 · Monitored';
    let tierBadgeClass = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    if (qualityScore >= 80 && s.disputes === 0) {
      tier = '⭐ Tier 1 · Strategic';
      tierBadgeClass = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    } else if (qualityScore < 50 || s.disputes > 0) {
      tier = '⚠️ High Risk · Action Req.';
      tierBadgeClass = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    }

    return {
      ...s,
      recoveryRate,
      qualityScore,
      tier,
      tierBadgeClass,
    };
  });

  // Top KPIs
  const totalReturnUnits = returns.reduce((s, r) => s + (r.quantity || 1), 0);
  const totalGrossReturnValue = returns.reduce((s, r) => s + Number(r.value || 0), 0);
  const totalRecoveredCredit = batches.filter((b) => b.status === 'SETTLED').reduce((s, b) => s + Number(b.creditNoteValue || 0), 0);
  const overallRecoveryRate = totalGrossReturnValue > 0
    ? Math.round((totalRecoveredCredit / totalGrossReturnValue) * 100)
    : 0;

  // Filtered dataset for charts
  const filteredSuppliers = selectedSupplier === 'ALL'
    ? supplierList
    : supplierList.filter((s) => s.name === selectedSupplier);

  const financialChartData = filteredSuppliers.map((s) => ({
    supplier: s.name.replace(/(India|Pvt Ltd|Electronics|Distribution)/gi, '').trim(),
    fullName: s.name,
    returnValue: s.returnValue,
    creditSettled: s.creditNotesSettled,
    creditPending: s.creditNotesPending,
  }));

  const qualityChartData = filteredSuppliers.map((s) => ({
    supplier: s.name.replace(/(India|Pvt Ltd|Electronics|Distribution)/gi, '').trim(),
    fullName: s.name,
    MINT: s.conditionGrades.MINT,
    GOOD: s.conditionGrades.GOOD,
    FAIR: s.conditionGrades.FAIR,
    POOR: s.conditionGrades.POOR,
  }));

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

      {/* Top High-Impact KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Vendor Partners"
          value={supplierList.length}
          trend="All registered manufacturers"
          icon={<BoxIcon />}
          tint="info"
        />
        <StatCard
          label="Total Return Inventory Loss"
          value={`₹${totalGrossReturnValue.toLocaleString('en-IN')}`}
          trend={`${totalReturnUnits} product units routed`}
          icon={<AlertTriangleIcon />}
          tint="warning"
        />
        <StatCard
          label="Credit Recovered"
          value={`₹${totalRecoveredCredit.toLocaleString('en-IN')}`}
          trend="Realized into accounts ledger"
          icon={<CheckCircleIcon />}
          tint="success"
        />
        <StatCard
          label="Capital Recovery Index"
          value={`${overallRecoveryRate}%`}
          trend="Target benchmark: ≥ 85%"
          icon={<TrendIcon />}
          tint="primary"
        />
      </div>

      {/* Unique Visual Matrix Section */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-text">Vendor Performance & Quality Intelligence</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Live algorithmic scorecard tracking capital recovery, defect severity, and settlement velocity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Modes */}
            <div className="flex bg-surface-raised p-1 rounded-lg border border-border text-xs">
              <button
                onClick={() => setActiveTab('financial')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === 'financial'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Capital Recovery (₹)
              </button>
              <button
                onClick={() => setActiveTab('quality')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === 'quality'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Defect Severity
              </button>
              <button
                onClick={() => setActiveTab('sla')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === 'sla'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                SLA Compliance
              </button>
            </div>

            {/* Vendor Filter */}
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              aria-label="Filter supplier performance by vendor"
              className="bg-surface border border-border text-text text-xs rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-primary focus:outline-hidden"
            >
              <option value="ALL">All Suppliers ({supplierList.length})</option>
              {supplierList.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab 1: Financial Recovery Comparison */}
        {activeTab === 'financial' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Comparing Gross Return Value vs Settled Credit Notes & Pending Settlement</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-amber-500"></span>
                  <span>Gross Return Value</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-emerald-600"></span>
                  <span>Credit Settled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-blue-500"></span>
                  <span>Credit Pending</span>
                </div>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="supplier" tick={{ fontSize: 12, fill: 'currentColor' }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="bg-surface border border-border p-3 rounded-xl shadow-xl text-xs space-y-1.5">
                          <p className="font-bold text-text border-b border-border pb-1">
                            {payload[0]?.payload?.fullName || label}
                          </p>
                          <div className="flex justify-between gap-4 text-amber-600 dark:text-amber-400">
                            <span>Return Value:</span>
                            <span className="font-semibold">₹{Number(payload[0]?.payload?.returnValue || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                            <span>Settled Credit:</span>
                            <span className="font-semibold">₹{Number(payload[0]?.payload?.creditSettled || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-blue-600 dark:text-blue-400">
                            <span>Pending Settlement:</span>
                            <span className="font-semibold">₹{Number(payload[0]?.payload?.creditPending || 0).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="returnValue" name="Return Value" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="creditSettled" name="Settled Credit" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="creditPending" name="Pending Credit" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 2: Defect Severity / Condition Grades */}
        {activeTab === 'quality' && (
          <div className="space-y-4">
            <p className="text-xs text-text-muted">
              Visualizes the distribution of returned units across quality grades certified by QC inspection.
            </p>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={qualityChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="supplier" tick={{ fontSize: 12, fill: 'currentColor' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'currentColor' }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="bg-surface border border-border p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-text border-b border-border pb-1">
                            {payload[0]?.payload?.fullName || label}
                          </p>
                          <p className="text-emerald-500">Mint: {payload[0]?.payload?.MINT || 0} units</p>
                          <p className="text-blue-500">Good: {payload[0]?.payload?.GOOD || 0} units</p>
                          <p className="text-amber-500">Fair: {payload[0]?.payload?.FAIR || 0} units</p>
                          <p className="text-rose-500">Poor (Severe Defect): {payload[0]?.payload?.POOR || 0} units</p>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Bar dataKey="MINT" stackId="a" fill="#10B981" name="Mint" />
                  <Bar dataKey="GOOD" stackId="a" fill="#3B82F6" name="Good" />
                  <Bar dataKey="FAIR" stackId="a" fill="#F59E0B" name="Fair" />
                  <Bar dataKey="POOR" stackId="a" fill="#EF4444" name="Poor" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 3: SLA Turnaround Compliance */}
        {activeTab === 'sla' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {filteredSuppliers.map((s) => (
              <div key={s.name} className="bg-surface-raised border border-border p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-text text-sm">{s.name}</h3>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border inline-block mt-1 ${s.tierBadgeClass}`}>
                      {s.tier}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-text">{s.qualityScore}</span>
                    <span className="text-xs text-text-muted block">/ 100 Score</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-text-secondary">
                    <span>Reconciliation Speed (14-day SLA)</span>
                    <span className="font-semibold text-text">{s.batchesSettled}/{s.batchesTotal} Batches</span>
                  </div>
                  <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${s.batchesTotal > 0 ? (s.batchesSettled / s.batchesTotal) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border text-text-muted">
                  <span>Disputes: <strong className={s.disputes > 0 ? 'text-amber-500' : 'text-emerald-500'}>{s.disputes} active</strong></span>
                  <span>Recovery: <strong className="text-text">{s.recoveryRate}%</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Supplier Scorecard Matrix Table */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs">
        <h3 className="font-bold text-text text-base mb-3">Comprehensive Vendor Scorecard Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-raised text-xs text-text-muted uppercase border-b border-border">
              <tr>
                <th className="py-3 px-4">Supplier Partner</th>
                <th className="py-3 px-4">Partner Tier</th>
                <th className="py-3 px-4">Quality Score</th>
                <th className="py-3 px-4">Gross Return Loss</th>
                <th className="py-3 px-4">Credit Recovered</th>
                <th className="py-3 px-4">Recovery %</th>
                <th className="py-3 px-4">Disputes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {supplierList.map((s) => (
                <tr key={s.name} className="hover:bg-surface-raised/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-text">{s.name}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${s.tierBadgeClass}`}>
                      {s.tier}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className={`h-full ${s.qualityScore >= 80 ? 'bg-emerald-500' : s.qualityScore >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                          style={{ width: `${s.qualityScore}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-xs text-text">{s.qualityScore}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-text-secondary">
                    ₹{s.returnValue.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                    ₹{s.creditNotesSettled.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 font-medium text-text">
                    {s.recoveryRate}%
                  </td>
                  <td className="py-3 px-4">
                    {s.disputes > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        <AlertTriangleIcon className="w-3.5 h-3.5" />
                        {s.disputes} Flagged
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        Clean
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
