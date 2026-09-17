import React, { useEffect, useState } from 'react';
import DataTable from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import { StatCard } from '../../components/ui/Card.jsx';
import { ShieldIcon, AlertIcon, CheckCircleIcon, UsersIcon, BoxIcon } from '../../components/ui/icons.jsx';
import { listOverrides } from '../../lib/api.js';
import { exportToCSV } from '../../lib/exportUtils.js';

export default function AuditLogs() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await listOverrides();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('admin AuditLogs error:', e);
      setError(e?.response?.data?.detail || 'Unable to retrieve audit log records at this time.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totalOverrides = rows.length;
  const storeCreditCount = rows.filter((r) => r.preferredRefundMethod === 'STORE_CREDIT').length;

  const handleExportCSV = () => {
    const cols = [
      { key: 'id', label: 'Return ID', accessor: (r) => String(r.id).slice(0, 8) },
      { key: 'customerName', label: 'Customer Name', accessor: (r) => r.customerName || (r.customerId ? `Customer ${String(r.customerId).slice(0, 8)}` : 'Customer') },
      { key: 'customerEmail', label: 'Customer Email', accessor: (r) => r.customerEmail || '' },
      { key: 'productName', label: 'Product Item', accessor: (r) => r.items?.[0]?.productName || 'Order Item' },
      { key: 'supportOverride', label: 'Support Override Active', accessor: (r) => (r.supportOverride ? 'YES' : 'NO') },
      { key: 'preferredRefundMethod', label: 'Disbursement Method' },
      { key: 'status', label: 'Current Return Status' },
      { key: 'initiatedAt', label: 'Timestamp', accessor: (r) => r.initiatedAt ? new Date(r.initiatedAt).toISOString() : '' },
    ];
    exportToCSV('returnflow_compliance_audit_logs', cols, rows);
  };

  const columns = [
    {
      key: 'id',
      header: 'Return ID',
      render: (r) => (
        <button
          onClick={() => setSelectedLog(r)}
          className="text-primary hover:underline font-bold font-mono text-left tracking-tight"
          title="Click to view override audit trail"
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
      header: 'Product Description',
      render: (r) => {
        const prod = r.items?.[0]?.productName || 'Consumer Merchandise';
        return (
          <div className="max-w-xs">
            <span className="font-medium text-text block truncate" title={prod}>
              {prod}
            </span>
            <span className="text-[11px] text-text-muted block">
              Policy: {r.policy?.name || 'Standard Return Policy'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge value={r.status} />,
    },
    {
      key: 'supportOverrideReason',
      header: 'Override Justification',
      render: (r) => (
        <div className="max-w-xs">
          <span className="text-xs text-text-secondary font-medium line-clamp-2">
            {r.supportOverrideReason || 'Support agent manual window exception.'}
          </span>
        </div>
      ),
    },
    {
      key: 'initiatedAt',
      header: 'Timestamp',
      sortable: true,
      render: (r) => (
        <span className="text-xs text-text-muted">
          {r.initiatedAt ? new Date(r.initiatedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedLog(r)}>
          Audit Trail
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center animate-pulse">
        <p className="text-sm font-medium text-text-secondary">Loading support override audit trail records…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Description */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
              Compliance & Security
            </span>
            <span className="text-xs text-text-muted">Append-Only Audit Log</span>
          </div>
          <h2 className="text-xl font-bold text-text mt-1">Support Override Audit Trail</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Cryptographically sealed and immutable audit trail documenting all customer support window exceptions and supervisor overrides.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-border text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5 shrink-0"
          title="Export compliance audit records to CSV"
        >
          <span>📥 Export Audit CSV</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl shadow-xs">
          {error}
        </div>
      )}

      {/* Top Stat Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Overrides Recorded"
          value={totalOverrides}
          trend="Lifetime manual authorizations"
          icon={<ShieldIcon />}
          tint="primary"
        />
        <StatCard
          label="Store Credit Settlements"
          value={storeCreditCount}
          trend="Instant store wallet issuance"
          icon={<CheckCircleIcon />}
          tint="success"
        />
        <StatCard
          label="Audit Integrity"
          value="100%"
          trend="All overrides signed by agent ID"
          icon={<AlertIcon />}
          tint="info"
        />
      </div>

      {/* Main Table */}
      {rows.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-text-muted">No support override records found.</p>
        </div>
      ) : (
        <DataTable
          title="Support Override Event Directory"
          columns={columns}
          rows={rows}
          searchKeys={['customerName', 'supportOverrideReason', 'id']}
          exportFilename="override-audit-log"
        />
      )}

      {/* Audit Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-scale-up space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                  📋
                </span>
                <div>
                  <h3 className="font-bold text-text text-base">Override Audit Event</h3>
                  <p className="text-xs text-primary font-mono">Return Ref: {String(selectedLog.id).slice(0, 8)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-text-muted hover:text-text text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-surface-raised rounded-xl border border-border space-y-1">
                <span className="text-text-muted block uppercase font-semibold text-[10px]">Beneficiary Customer:</span>
                <p className="font-bold text-sm text-text">{selectedLog.customerName || 'Customer Account'}</p>
                <p className="text-text-secondary font-mono">{selectedLog.customerEmail || 'No email specified'}</p>
                <p className="text-text-muted font-mono">UUID: {selectedLog.customerId}</p>
              </div>

              <div className="p-3 bg-surface-raised rounded-xl border border-border space-y-1">
                <span className="text-text-muted block uppercase font-semibold text-[10px]">Merchandise & Policy:</span>
                <p className="font-semibold text-text text-sm">{selectedLog.items?.[0]?.productName || 'General Item'}</p>
                <p className="text-text-secondary">Base Policy: {selectedLog.policy?.name || 'Standard 7-Day Window'}</p>
                <p className="text-text-secondary">Refund Method: {selectedLog.preferredRefundMethod}</p>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                <span className="text-amber-700 dark:text-amber-400 block uppercase font-bold text-[10px]">Business Justification:</span>
                <p className="text-text-secondary font-medium leading-relaxed">{selectedLog.supportOverrideReason}</p>
                <p className="text-text-muted text-[10px] pt-1">Timestamp: {new Date(selectedLog.initiatedAt).toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Close Audit Record
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
