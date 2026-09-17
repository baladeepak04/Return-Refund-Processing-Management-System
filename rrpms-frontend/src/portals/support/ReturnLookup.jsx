import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DataTable from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Textarea } from '../../components/ui/Input.jsx';
import { listReturns, listUsers, cancelReturn } from '../../lib/api.js';
import api from '../../lib/api.js';
import { humanize } from '../../lib/enums.js';

export default function ReturnLookup() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [rawRows, setRawRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [extraDays, setExtraDays] = useState(3);
  const [overrideError, setOverrideError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [returnsRes, usersRes] = await Promise.all([
        listReturns(),
        listUsers().catch(() => ({ data: [] })),
      ]);
      setRawRows(Array.isArray(returnsRes.data) ? returnsRes.data : []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (e) {
      console.error('support ReturnLookup error:', e);
      setError(e?.response?.data?.detail || 'Unable to retrieve returns at this time.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const userMap = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      if (u.id) map.set(String(u.id).toLowerCase(), u);
    });
    return map;
  }, [users]);

  // Enrich rows with customer and product names for both display and search
  const enrichedRows = useMemo(() => {
    return rawRows.map((r) => {
      const u = userMap.get(String(r.customerId).toLowerCase());
      const customerName = u?.name || r.customerName || `Customer ${String(r.customerId).slice(0, 8)}`;
      const customerEmail = u?.email || r.customerEmail || '';
      const isVip = u?.isVip || false;
      const productName = r.items?.[0]?.productName || 'Order Product';

      return {
        ...r,
        customerName,
        customerEmail,
        isVip,
        productName,
      };
    });
  }, [rawRows, userMap]);

  const columns = [
    {
      key: 'id',
      header: 'Return ID',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-primary font-semibold text-xs bg-primary-50 px-2 py-1 rounded-md" title={r.id}>
          #{String(r.id).slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      sortable: true,
      render: (r) => (
        <div className="min-w-36">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-sm font-semibold text-text hover:text-primary cursor-pointer"
              onClick={() => navigate(`/support/customer-history?customerId=${r.customerId}&customerName=${encodeURIComponent(r.customerName)}`)}
              title="View Customer History"
            >
              {r.customerName}
            </span>
            {r.isVip && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                VIP
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-secondary truncate mt-0.5" title={r.customerEmail || r.customerId}>
            {r.customerEmail || `ID: ${String(r.customerId).slice(0, 8)}`}
          </p>
        </div>
      ),
    },
    {
      key: 'productName',
      header: 'Product Name',
      sortable: true,
      render: (r) => {
        const refund = r.refundAmount != null ? `₹${Number(r.refundAmount).toLocaleString('en-IN')}` : null;
        return (
          <div className="max-w-xs">
            <p className="text-sm font-medium text-text line-clamp-1" title={r.productName}>
              {r.productName}
            </p>
            {refund && (
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                {refund}
              </p>
            )}
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
      key: 'reasonCode',
      header: 'Reason',
      render: (r) => <span className="text-xs text-text-secondary">{humanize(r.reasonCode)}</span>,
    },
    {
      key: 'returnType',
      header: 'Type',
      render: (r) => <span className="text-xs font-medium text-slate-700 uppercase">{humanize(r.returnType)}</span>,
    },
    {
      key: 'supportOverride',
      header: 'Override',
      render: (r) => (
        r.supportOverride ? (
          <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-medium" title={r.supportOverrideReason || 'Support override active'}>
            Overridden
          </span>
        ) : '—'
      ),
    },
    {
      key: 'initiatedAt',
      header: 'Initiated',
      sortable: true,
      render: (r) => (r.initiatedAt ? new Date(r.initiatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex gap-1.5 items-center">
          {r.status === 'INITIATED' && (
            <Button size="sm" variant="outline" onClick={() => cancel(r.id)}>Cancel</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setOverrideTarget(r)}>Override</Button>
        </div>
      ),
    },
  ];

  async function cancel(id) {
    if (!confirm('Are you sure you want to cancel this return?')) return;
    try {
      await cancelReturn(id);
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to cancel return');
    }
  }

  async function confirmOverride() {
    if (!reason.trim()) { setOverrideError('A reason is required to override the return window.'); return; }
    if (extraDays < 1 || extraDays > 7) { setOverrideError('Support override is limited to a maximum of 7 additional days.'); return; }
    setSaving(true);
    try {
      await api.put(`/returns/${overrideTarget.id}/override`, { extraDays, reason });
      setOverrideTarget(null);
      await load();
    } catch (e) {
      console.error('support ReturnLookup error:', e);
      setOverrideError(e?.response?.data?.detail || 'Could not save the override.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8 text-center animate-pulse">
        <p className="text-sm font-medium text-text-secondary">Loading customer return cases…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={load}>Retry</Button>
        </div>
      )}
      <DataTable
        title="Customer Return Cases"
        columns={columns}
        rows={enrichedRows}
        searchKeys={['id', 'customerName', 'customerEmail', 'productName', 'reasonCode', 'customerId']}
        exportFilename="return-cases"
        initialQuery={params.get('q') || ''}
      />

      <Modal
        open={!!overrideTarget}
        onClose={() => setOverrideTarget(null)}
        title="Override Return Window"
        footer={
          <>
            <Button variant="outline" onClick={() => setOverrideTarget(null)}>Cancel</Button>
            <Button onClick={confirmOverride} disabled={saving}>{saving ? 'Saving…' : 'Confirm Override'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Support agents may extend the return window for <strong>{overrideTarget?.customerName || 'customer'}</strong> by up to <strong>7 additional days</strong>. Standard extensions require audit justification.
          </p>
          <label className="block">
            <span className="block text-sm font-medium text-text mb-1">Additional days (max 7)</span>
            <input
              type="number"
              min={1}
              max={7}
              value={extraDays}
              onChange={(e) => setExtraDays(Number(e.target.value))}
              className="w-full border border-border rounded-md px-3 py-2 text-sm"
            />
          </label>
          <Textarea
            label="Reason (required, logged for audit)"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer travel delay, courier delay confirmation, escalation approved by..."
          />
          {overrideError && <p className="text-xs text-danger">{overrideError}</p>}
        </div>
      </Modal>
    </div>
  );
}
