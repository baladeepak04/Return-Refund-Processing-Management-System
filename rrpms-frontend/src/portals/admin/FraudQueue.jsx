import React, { useEffect, useState } from 'react';
import DataTable from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import { StatCard } from '../../components/ui/Card.jsx';
import { AlertIcon, CheckCircleIcon, BoxIcon, UsersIcon, ShieldIcon } from '../../components/ui/icons.jsx';
import { humanize } from '../../lib/enums.js';
import { getFraudQueue, blacklistFraudFlag, investigateFraudFlag, clearFraudFlag } from '../../lib/api.js';

export default function FraudQueue() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'OPEN' | 'INVESTIGATING' | 'CONFIRMED' | 'CLEARED'
  const [selectedCase, setSelectedCase] = useState(null);
  const [blacklistModalCase, setBlacklistModalCase] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getFraudQueue();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('admin FraudQueue error:', e);
      setError(e?.response?.data?.detail || 'Unable to load fraud queue records at this time.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleBlacklist(caseItem) {
    setActionBusy(true);
    try {
      await blacklistFraudFlag(caseItem.id);
      showToast(`Customer ${caseItem.customerName || caseItem.customerId} blacklisted & account deactivated.`);
      setBlacklistModalCase(null);
      if (selectedCase && selectedCase.id === caseItem.id) {
        setSelectedCase((prev) => ({ ...prev, status: 'CONFIRMED' }));
      }
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not blacklist user.');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleInvestigate(caseItem) {
    setActionBusy(true);
    try {
      await investigateFraudFlag(caseItem.id);
      showToast(`Case ${String(caseItem.id).slice(0, 8)} marked under active investigation.`);
      if (selectedCase && selectedCase.id === caseItem.id) {
        setSelectedCase((prev) => ({ ...prev, status: 'INVESTIGATING' }));
      }
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not update investigation status.');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleClear(caseItem) {
    setActionBusy(true);
    try {
      await clearFraudFlag(caseItem.id);
      showToast(`Case ${String(caseItem.id).slice(0, 8)} cleared as false-positive.`);
      if (selectedCase && selectedCase.id === caseItem.id) {
        setSelectedCase((prev) => ({ ...prev, status: 'CLEARED' }));
      }
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not clear fraud flag.');
    } finally {
      setActionBusy(false);
    }
  }

  // Top KPI counts
  const totalCases = rows.length;
  const criticalCases = rows.filter((r) => (r.riskScore || 0) >= 90).length;
  const investigatingCases = rows.filter((r) => r.status === 'INVESTIGATING').length;
  const confirmedCases = rows.filter((r) => r.status === 'CONFIRMED').length;

  // Filtered rows
  const filteredRows = rows.filter((r) => {
    if (activeFilter === 'ALL') return true;
    return r.status === activeFilter;
  });

  const columns = [
    {
      key: 'id',
      header: 'Case ID',
      render: (r) => (
        <button
          onClick={() => setSelectedCase(r)}
          className="text-rose-600 hover:underline font-bold font-mono text-left tracking-tight"
          title="Click to inspect investigation case"
        >
          {String(r.id).slice(0, 8)}
        </button>
      ),
    },
    {
      key: 'customer',
      header: 'Customer Details',
      sortable: true,
      render: (r) => (
        <div>
          <span className="font-bold text-text block">{r.customerName || `Customer ${String(r.customerId).slice(0, 8)}`}</span>
          {r.customerEmail && (
            <span className="text-[11px] text-text-muted font-mono block">{r.customerEmail}</span>
          )}
          <span className="text-[10px] text-text-muted font-mono">ID: {String(r.customerId).slice(0, 8)}</span>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Flagged Product',
      render: (r) => (
        <div className="max-w-xs">
          <span className="font-medium text-text block truncate" title={r.productName}>
            {r.productName || 'General Merchandise'}
          </span>
          <span className="text-[11px] text-text-muted block">
            {r.returnRequest ? `Return Ref: ${String(r.returnRequest.id).slice(0, 8)}` : 'Account-Level Risk Pattern'}
          </span>
        </div>
      ),
    },
    {
      key: 'flagType',
      header: 'Case Reason & Pattern',
      render: (r) => (
        <div className="max-w-xs">
          <span className="font-semibold text-xs text-text block">
            {humanize(r.flagType)}
          </span>
          <span className="text-[11px] text-text-secondary line-clamp-2 mt-0.5">
            {r.caseSummary || 'Automated policy rule threshold exceeded.'}
          </span>
        </div>
      ),
    },
    {
      key: 'riskScore',
      header: 'Risk Score',
      sortable: true,
      render: (r) => {
        const score = r.riskScore || 0;
        let badgeClass = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
        if (score >= 90) badgeClass = 'bg-rose-500/15 text-rose-600 border-rose-500/30';
        else if (score >= 75) badgeClass = 'bg-amber-500/15 text-amber-600 border-amber-500/30';

        return (
          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border inline-block ${badgeClass}`}>
            {r.riskScore != null ? `${r.riskScore}/100` : '—'}
          </span>
        );
      },
    },
    {
      key: 'returnCount',
      header: 'Velocity',
      sortable: true,
      render: (r) => (
        <div>
          <span className="font-semibold text-text">{r.returnCount || 0} returns</span>
          {r.returnRatePercent && (
            <span className="block text-[11px] text-rose-600 font-medium">{r.returnRatePercent}% rate</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Risk Status',
      render: (r) => <StatusBadge value={r.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => {
        const isBlacklisted = r.status === 'CONFIRMED';
        return (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedCase(r)}
            >
              Investigate
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={isBlacklisted}
              onClick={() => setBlacklistModalCase(r)}
            >
              {isBlacklisted ? 'Blacklisted ✓' : 'Blacklist'}
            </Button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center animate-pulse">
        <p className="text-sm font-medium text-text-secondary">Loading fraud queue telemetry and investigation records…</p>
      </div>
    );
  }

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
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center justify-between shadow-xs">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={load}>Retry</Button>
        </div>
      )}

      {/* Top Stat Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Risk Flags"
          value={totalCases}
          trend="Flagged by heuristic engine"
          icon={<AlertIcon />}
          tint="warning"
        />
        <StatCard
          label="Critical Severity (≥90)"
          value={criticalCases}
          trend="Urgent audit required"
          icon={<AlertIcon />}
          tint="danger"
        />
        <StatCard
          label="Under Investigation"
          value={investigatingCases}
          trend="Active agent caseload"
          icon={<ShieldIcon />}
          tint="info"
        />
        <StatCard
          label="Confirmed & Blacklisted"
          value={confirmedCases}
          trend="Accounts locked"
          icon={<CheckCircleIcon />}
          tint="primary"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex bg-surface-raised p-1 rounded-xl border border-border text-xs">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === 'ALL' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'
            }`}
          >
            All Cases ({rows.length})
          </button>
          <button
            onClick={() => setActiveFilter('OPEN')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === 'OPEN' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'
            }`}
          >
            Open ({rows.filter((r) => r.status === 'OPEN').length})
          </button>
          <button
            onClick={() => setActiveFilter('INVESTIGATING')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === 'INVESTIGATING' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'
            }`}
          >
            Investigating ({investigatingCases})
          </button>
          <button
            onClick={() => setActiveFilter('CONFIRMED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === 'CONFIRMED' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'
            }`}
          >
            Blacklisted ({confirmedCases})
          </button>
          <button
            onClick={() => setActiveFilter('CLEARED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === 'CLEARED' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'
            }`}
          >
            Cleared ({rows.filter((r) => r.status === 'CLEARED').length})
          </button>
        </div>

        <span className="text-xs text-text-muted">
          Showing {filteredRows.length} of {rows.length} cases
        </span>
      </div>

      {/* Data Table */}
      {filteredRows.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-text-muted">No cases found matching the "{activeFilter}" filter.</p>
        </div>
      ) : (
        <DataTable
          title="Fraud Detection & Risk Monitoring Queue"
          columns={columns}
          rows={filteredRows}
          searchKeys={['customerName', 'productName', 'flagType', 'customerId']}
          exportFilename="fraud-queue-export"
        />
      )}

      {/* Investigation Case Drawer / Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-xl w-full p-6 animate-scale-up space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                  🛡️
                </span>
                <div>
                  <h3 className="font-bold text-text text-base">Fraud Case Investigation</h3>
                  <p className="text-xs text-rose-600 font-mono">Case Ref: {String(selectedCase.id).slice(0, 8)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-text-muted hover:text-text text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Customer & Product Card */}
            <div className="p-4 bg-surface-raised rounded-xl border border-border space-y-3 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-text-muted uppercase text-[10px] font-semibold">Target Account</span>
                  <p className="font-bold text-sm text-text mt-0.5">{selectedCase.customerName || 'Anonymous User'}</p>
                  <p className="text-text-secondary font-mono">{selectedCase.customerEmail || 'No email attached'}</p>
                  <p className="text-text-muted font-mono mt-0.5">Customer UUID: {selectedCase.customerId}</p>
                </div>
                <div className="text-right">
                  <span className="text-text-muted uppercase text-[10px] font-semibold">Current Status</span>
                  <div className="mt-1"><StatusBadge value={selectedCase.status} /></div>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <span className="text-text-muted uppercase text-[10px] font-semibold">Flagged Merchandise:</span>
                <p className="font-semibold text-text text-sm mt-0.5">{selectedCase.productName}</p>
              </div>
            </div>

            {/* Case Details */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-text uppercase tracking-wider text-[10px]">Pattern Details & Algorithmic Heuristics:</span>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1.5">
                <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">
                  {humanize(selectedCase.flagType)}
                </p>
                <p className="text-text-secondary leading-relaxed">
                  {selectedCase.caseSummary || 'Return pattern severely deviated from baseline consumer behavior.'}
                </p>
                <div className="flex items-center gap-4 pt-1 text-[11px] text-text-muted">
                  <span>Risk Score: <strong className="text-rose-600">{selectedCase.riskScore}/100</strong></span>
                  <span>Return Velocity: <strong>{selectedCase.returnCount} returns</strong></span>
                  {selectedCase.returnRatePercent && <span>Return Rate: <strong>{selectedCase.returnRatePercent}%</strong></span>}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={actionBusy || selectedCase.status === 'CLEARED'}
                onClick={() => handleClear(selectedCase)}
              >
                Clear False-Positive
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionBusy || selectedCase.status === 'INVESTIGATING'}
                  onClick={() => handleInvestigate(selectedCase)}
                >
                  Mark Investigating
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={actionBusy || selectedCase.status === 'CONFIRMED'}
                  onClick={() => handleBlacklist(selectedCase)}
                >
                  {selectedCase.status === 'CONFIRMED' ? 'Blacklisted ✓' : 'Blacklist Customer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist Confirmation Modal */}
      {blacklistModalCase && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center text-xl mx-auto">
              ⚠️
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-text text-base">Confirm Account Blacklist</h3>
              <p className="text-xs text-text-muted">
                Are you sure you want to blacklist <strong>{blacklistModalCase.customerName || 'this customer'}</strong>?
              </p>
            </div>
            <div className="bg-surface-raised p-3 rounded-xl border border-border text-xs space-y-1 text-text-secondary">
              <p>• Account access will be disabled immediately.</p>
              <p>• Future return and exchange initiation will be blocked.</p>
              <p>• Associated Case: <strong className="text-text">{humanize(blacklistModalCase.flagType)}</strong></p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setBlacklistModalCase(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={actionBusy}
                onClick={() => handleBlacklist(blacklistModalCase)}
              >
                {actionBusy ? 'Blacklisting…' : 'Confirm & Blacklist'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
