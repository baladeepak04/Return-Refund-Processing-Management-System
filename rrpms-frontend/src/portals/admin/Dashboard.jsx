import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatCard } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { RefreshIcon, CreditCardIcon, AlertIcon, TrendIcon, CheckCircleIcon, BoxIcon } from '../../components/ui/icons.jsx';
import { humanize } from '../../lib/enums.js';
import { getReturnAnalytics, listRefunds, getFraudQueue, blacklistFraudFlag, investigateFraudFlag } from '../../lib/api.js';
import LifecycleSimulator from '../../components/demo/LifecycleSimulator.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const [returnsData, setReturnsData] = useState(null);
  const [refunds, setRefunds] = useState([]);
  const [fraudFlags, setFraudFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSimulator, setShowSimulator] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rRes, refRes, fRes] = await Promise.all([getReturnAnalytics(), listRefunds(), getFraudQueue()]);
      setReturnsData(rRes.data);
      setRefunds(Array.isArray(refRes.data) ? refRes.data : []);
      setFraudFlags(Array.isArray(fRes.data) ? fRes.data : []);
    } catch (e) {
      console.error('admin Dashboard error:', e);
      setError(e?.response?.data?.detail || 'Unable to retrieve dashboard telemetry at this time.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBlacklist = async (flag) => {
    setActionLoadingId(flag.id);
    try {
      await blacklistFraudFlag(flag.id);
      showToast(`Customer ${flag.customerName || 'Account'} blacklisted and access disabled.`);
      await loadData();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to blacklist user.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInvestigate = async (flag) => {
    setActionLoadingId(flag.id);
    try {
      await investigateFraudFlag(flag.id);
      showToast(`Case ${String(flag.id).slice(0, 8)} marked under investigation.`);
      await loadData();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to update investigation.');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading && !returnsData) return <p className="text-sm text-text-secondary">Loading telemetry…</p>;
  if (error && !returnsData) {
    return (
      <div className="bg-white border border-border rounded-xl p-8 text-center space-y-3 shadow-xs">
        <AlertIcon className="w-8 h-8 text-amber-500 mx-auto" />
        <h3 className="text-sm font-semibold text-text">Dashboard Telemetry Unavailable</h3>
        <p className="text-xs text-text-secondary max-w-sm mx-auto">{error}</p>
        <Button size="sm" variant="outline" onClick={loadData}>Retry Connection</Button>
      </div>
    );
  }

  const outstandingLiability = refunds
    .filter((r) => !['CREDITED', 'FAILED'].includes(r.status))
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const highPriorityFraud = fraudFlags.filter((f) => (f.riskScore || 0) >= 75).length;

  const byReasonData = Object.entries(returnsData?.byReason || {})
    .map(([reason, value]) => ({ reason: humanize(reason), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const topFraud = [...fraudFlags].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0)).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg border border-emerald-500 flex items-center gap-2 animate-slide-in">
          <CheckCircleIcon className="w-5 h-5 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold text-text">Enterprise Reverse Logistics Overview</h1>
          <p className="text-xs text-text-secondary mt-0.5">Real-time telemetry, fraud risk monitoring, and refund liabilities</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showSimulator ? 'primary' : 'outline'}
            onClick={() => setShowSimulator(!showSimulator)}
            className="flex items-center gap-1.5 shadow-xs"
          >
            <span>⚡</span>
            <span>{showSimulator ? 'Hide Pipeline Orchestrator' : 'Automated Pipeline'}</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={loadData} title="Refresh metrics">
            <RefreshIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showSimulator && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-300">
          <LifecycleSimulator onCompleted={loadData} />
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Returns" value={returnsData?.totalReturns || 0} icon={<RefreshIcon />} tint="primary" />
        <StatCard label="Outstanding Refund Liability" value={`₹${outstandingLiability.toLocaleString('en-IN')}`} icon={<CreditCardIcon />} tint="success" />
        <StatCard label="Fraud Flags" value={fraudFlags.length} icon={<AlertIcon />} tint="danger" trend={`${highPriorityFraud} high priority (score ≥75)`} />
        <StatCard label="Refunds Outstanding" value={refunds.filter((r) => !['CREDITED', 'FAILED'].includes(r.status)).length} icon={<TrendIcon />} tint="warning" />
      </div>

      {/* Quick Operation Bar */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
          <span className="font-semibold text-text">Admin Quick Actions:</span>
          <span>Inspect high-risk returns, review audit logs, and configure policies.</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/admin/fraud-queue')}>
            🛡️ Fraud Queue ({fraudFlags.length})
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/admin/audit-logs')}>
            📋 Audit Trail
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/admin/roles-permissions')}>
            🔑 RBAC Matrix
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/admin/return-policies')}>
            📜 Policies
          </Button>
        </div>
      </div>

      {/* Top Return Reasons Bar Chart */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-text text-base">Top Return Reasons</h2>
            <p className="text-xs text-text-muted mt-0.5">Distribution of consumer-reported return justifications</p>
          </div>
        </div>
        {byReasonData.length === 0 ? (
          <p className="text-sm text-text-muted py-8 text-center">No returns recorded yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byReasonData} layout="vertical" margin={{ left: 30, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 12, fill: 'currentColor' }} />
                <YAxis type="category" dataKey="reason" tick={{ fontSize: 12, fill: 'currentColor' }} width={120} />
                <Tooltip formatter={(val) => [`${val} returns`, 'Volume']} />
                <Bar dataKey="value" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Enhanced Customer Fraud Alert Section */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <AlertIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-text text-base">Fraud Alert – Highest Risk Returns</h2>
              <p className="text-xs text-text-muted">High anomaly velocity and condition mismatches requiring administrative intervention</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/fraud-queue')}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            View Full Fraud Queue ({fraudFlags.length}) →
          </button>
        </div>

        {topFraud.length === 0 ? (
          <p className="text-sm text-text-muted py-8 text-center">No fraud flags recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {topFraud.map((f) => {
              const isBusy = actionLoadingId === f.id;
              const displayName = f.customerName || `Customer ${String(f.customerId).slice(0, 8)}`;
              const displayProduct = f.productName || 'General Merchandise';
              const displayReason = f.caseSummary || humanize(f.flagType);
              const isBlacklisted = f.status === 'CONFIRMED';
              const isInvestigating = f.status === 'INVESTIGATING';

              return (
                <div
                  key={f.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-surface-raised rounded-xl border border-border hover:border-border/80 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-text">{displayName}</span>
                        {f.customerEmail && (
                          <span className="text-xs text-text-muted font-mono">({f.customerEmail})</span>
                        )}
                        <span className="text-[11px] font-mono text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border">
                          ID: {String(f.customerId).slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-xs text-primary font-medium flex items-center gap-1">
                        <BoxIcon className="w-3.5 h-3.5" />
                        <span>Product: <strong>{displayProduct}</strong></span>
                      </p>
                      <p className="text-xs text-text-secondary">
                        Flag Reason: <span className="font-medium text-text">{displayReason}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <div className="text-right text-xs">
                      <span className="text-text-muted block text-[10px] uppercase font-semibold">Risk Assessment</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-xs inline-block ${
                        (f.riskScore || 0) >= 90
                          ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                      }`}>
                        {f.riskScore ?? '—'}/100
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={isBusy || isBlacklisted}
                        onClick={() => handleBlacklist(f)}
                      >
                        {isBusy ? 'Processing…' : isBlacklisted ? 'Blacklisted ✓' : 'Blacklist'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => handleInvestigate(f)}
                      >
                        {isInvestigating ? 'Investigating…' : 'Investigate'}
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
