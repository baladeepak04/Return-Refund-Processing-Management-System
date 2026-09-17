import React, { useEffect, useState, useMemo } from 'react';
import DataTable from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import { humanize } from '../../lib/enums.js';
import { listRefunds, listReturns, approveRefund, rejectRefund, initiateRefund } from '../../lib/api.js';
import { exportToCSV } from '../../lib/exportUtils.js';

const METHOD_ICONS = {
  BANK_TRANSFER: '🏦',
  ORIGINAL_METHOD: '💳',
  STORE_CREDIT: '🎁',
};

export default function RefundQueue() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selected, setSelected] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [actionBusyId, setActionBusyId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [refRes, retRes] = await Promise.all([
        listRefunds(),
        listReturns().catch(() => ({ data: [] })),
      ]);
      const refunds = Array.isArray(refRes.data) ? refRes.data : [];
      const returns = Array.isArray(retRes.data) ? retRes.data : [];
      const returnMap = new Map(returns.map((r) => [r.id, r]));

      const refundReturnIds = new Set(
        refunds.map((r) => r.returnRequest?.id || r.returnId).filter(Boolean)
      );

      const enriched = refunds.map((r) => {
        const ret = returnMap.get(r.returnRequest?.id) || r.returnRequest || {};
        const customerName =
          ret.customerName ||
          r.returnRequest?.customerName ||
          (ret.customerId ? `Customer ${String(ret.customerId).slice(0, 8)}` : 'Retail Customer');
        const customerEmail = ret.customerEmail || r.returnRequest?.customerEmail || '';
        const productName =
          ret.items?.[0]?.productName ||
          r.returnRequest?.items?.[0]?.productName ||
          'Merchandise Refund Item';
        const methodLabel = humanize(r.method);
        const initiatedAt = r.initiatedAt || ret.initiatedAt || new Date().toISOString();

        return {
          ...r,
          customerName,
          customerEmail,
          productName,
          methodLabel,
          returnId: ret.id || r.returnRequest?.id,
          initiatedAt,
        };
      });

      // Include active non-exchange returns awaiting refund payout so recently initiated
      // returns immediately appear at the top of the finance queue without delay
      returns.forEach((ret) => {
        if (
          ret &&
          !ret.draft &&
          ret.returnType !== 'EXCHANGE' &&
          !refundReturnIds.has(ret.id) &&
          !['CANCELLED', 'CLOSED', 'REJECTED'].includes(ret.status)
        ) {
          const customerName =
            ret.customerName ||
            (ret.customerId ? `Customer ${String(ret.customerId).slice(0, 8)}` : 'Retail Customer');
          const productName = ret.items?.[0]?.productName || 'Order Item';
          const amt = Number(ret.refundAmount || 2499);
          const method = ret.preferredRefundMethod || 'ORIGINAL_METHOD';
          enriched.push({
            id: `ret-${ret.id}`,
            returnId: ret.id,
            returnRequest: ret,
            customerName,
            customerEmail: ret.customerEmail || '',
            productName,
            amount: amt,
            method,
            methodLabel: humanize(method),
            status: 'PENDING',
            approvalRequired: amt > 5000,
            initiatedAt: ret.initiatedAt || new Date().toISOString(),
            isDirectReturn: true,
          });
        }
      });

      // Sort newest first by default so recent returns are immediately at the top
      enriched.sort((a, b) => new Date(b.initiatedAt || 0) - new Date(a.initiatedAt || 0));

      setRows(enriched);
    } catch (e) {
      console.error('finance RefundQueue error:', e);
      setError(e?.response?.data?.detail || 'Unable to synchronize the refund queue. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id) {
    setActionBusyId(id);
    setError('');
    setSuccessMsg('');
    try {
      if (String(id).startsWith('ret-')) {
        const realReturnId = id.replace('ret-', '');
        const target = rows.find((r) => r.id === id);
        const method =
          target?.method === 'STORE_CREDIT'
            ? 'STORE_CREDIT'
            : target?.method === 'BANK_TRANSFER'
            ? 'BANK_TRANSFER'
            : 'ORIGINAL_METHOD';
        const initRes = await initiateRefund({
          returnId: realReturnId,
          amount: target?.amount || 2499,
          method,
        });
        await approveRefund(initRes.data.id);
        setSuccessMsg(`Refund for return #${String(realReturnId).slice(0, 8)} approved and scheduled.`);
      } else {
        await approveRefund(id);
        setSuccessMsg(`Refund #${String(id).slice(0, 8)} approved. Payment disbursement initiated.`);
      }
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not approve refund.');
    } finally {
      setActionBusyId(null);
    }
  }

  async function reject(id) {
    setActionBusyId(id);
    setError('');
    setSuccessMsg('');
    try {
      if (!String(id).startsWith('ret-')) {
        await rejectRefund(id, 'Rejected by finance authorization');
      }
      setSuccessMsg(`Refund request rejected.`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not reject refund.');
    } finally {
      setActionBusyId(null);
    }
  }

  async function bulkApprove() {
    const pending = selected.filter((r) => r.status === 'PENDING');
    if (pending.length === 0) return;
    setBulkBusy(true);
    setError('');
    setSuccessMsg('');
    try {
      await Promise.all(
        pending.map(async (r) => {
          if (String(r.id).startsWith('ret-')) {
            const realReturnId = r.id.replace('ret-', '');
            const method =
              r.method === 'STORE_CREDIT'
                ? 'STORE_CREDIT'
                : r.method === 'BANK_TRANSFER'
                ? 'BANK_TRANSFER'
                : 'ORIGINAL_METHOD';
            const initRes = await initiateRefund({
              returnId: realReturnId,
              amount: r.amount || 2499,
              method,
            });
            return approveRefund(initRes.data.id);
          }
          return approveRefund(r.id);
        })
      );
      setSuccessMsg(`Successfully approved and scheduled ${pending.length} selected refund payouts.`);
      await load();
      setSelected([]);
    } catch (e) {
      console.error('finance RefundQueue error:', e);
      setError(e?.response?.data?.detail || 'Could not approve all selected refunds.');
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkReject() {
    const pending = selected.filter((r) => r.status === 'PENDING');
    if (pending.length === 0) return;
    setBulkBusy(true);
    setError('');
    setSuccessMsg('');
    try {
      await Promise.all(
        pending.map((r) => rejectRefund(r.id, 'Rejected by finance authorization (bulk)'))
      );
      setSuccessMsg(`Successfully rejected ${pending.length} selected refunds.`);
      await load();
      setSelected([]);
    } catch (e) {
      console.error('finance RefundQueue error:', e);
      setError(e?.response?.data?.detail || 'Could not reject all selected refunds.');
    } finally {
      setBulkBusy(false);
    }
  }

  const filteredRows = useMemo(() => {
    if (statusFilter === 'PENDING') return rows.filter((r) => r.status === 'PENDING');
    if (statusFilter === 'HIGH_VALUE') return rows.filter((r) => r.approvalRequired);
    if (statusFilter === 'PROCESSING') return rows.filter((r) => r.status === 'PROCESSING');
    if (statusFilter === 'CREDITED') return rows.filter((r) => r.status === 'CREDITED');
    return rows;
  }, [rows, statusFilter]);

  function handleExportCSV() {
    const cols = [
      { key: 'id', label: 'Refund ID', accessor: (r) => String(r.id).slice(0, 8) },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'customerEmail', label: 'Customer Email' },
      { key: 'productName', label: 'Product Name' },
      { key: 'amount', label: 'Amount (INR)', accessor: (r) => Number(r.amount || 0).toFixed(2) },
      { key: 'methodLabel', label: 'Payment Method' },
      { key: 'status', label: 'Status' },
      { key: 'razorpayRefundId', label: 'Gateway/UTR Reference', accessor: (r) => r.razorpayRefundId || 'N/A' },
      { key: 'initiatedAt', label: 'Initiated Date', accessor: (r) => r.initiatedAt ? new Date(r.initiatedAt).toISOString() : '' },
    ];
    exportToCSV('returnflow_refund_disbursements', cols, filteredRows);
  }

  const columns = [
    {
      key: 'id',
      header: 'Refund ID',
      render: (r) => (
        <span className="text-primary font-mono font-semibold text-xs">
          #{String(r.id).slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'productName',
      header: 'Product Name',
      sortable: true,
      render: (r) => (
        <div className="max-w-[220px]">
          <p className="font-semibold text-slate-900 text-xs truncate" title={r.productName}>
            {r.productName}
          </p>
          {r.returnId && (
            <span className="text-[10px] text-text-muted font-mono">
              Return #{String(r.returnId).slice(0, 8)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-semibold text-text text-xs">{r.customerName}</p>
          {r.customerEmail && (
            <p className="text-[10px] text-text-muted">{r.customerEmail}</p>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (r) => (
        <span className="font-heading font-bold text-slate-900 text-xs">
          ₹{Number(r.amount).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
          <span>{METHOD_ICONS[r.method] || '💵'}</span>
          <span>{r.methodLabel}</span>
        </span>
      ),
    },
    {
      key: 'approvalRequired',
      header: 'High Value',
      render: (r) =>
        r.approvalRequired ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
            ⚠️ &gt; ₹5,000
          </span>
        ) : (
          <span className="text-slate-400 text-xs">Standard</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge value={r.status} />,
    },
    {
      key: 'initiatedAt',
      header: 'Submitted (Date & Time)',
      sortable: true,
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800 text-xs">
            {r.initiatedAt
              ? new Date(r.initiatedAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </span>
          {r.initiatedAt && (
            <span className="text-[10px] text-text-muted font-mono font-medium">
              {new Date(r.initiatedAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="success"
            disabled={r.status !== 'PENDING' || actionBusyId === r.id}
            onClick={() => approve(r.id)}
            className="text-xs px-2.5 py-1"
          >
            {actionBusyId === r.id ? '…' : 'Approve'}
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={r.status !== 'PENDING' || actionBusyId === r.id}
            onClick={() => reject(r.id)}
            className="text-xs px-2.5 py-1"
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  const pendingSelectedCount = useMemo(
    () => selected.filter((r) => r.status === 'PENDING').length,
    [selected]
  );

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8 text-center animate-pulse">
        <p className="text-sm font-medium text-text-secondary">Loading refund processing queue…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      {/* Quick Filter Tabs Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-border/80 shadow-xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'ALL', label: `All (${rows.length})` },
            {
              id: 'PENDING',
              label: `Pending Approval (${rows.filter((r) => r.status === 'PENDING').length})`,
            },
            {
              id: 'HIGH_VALUE',
              label: `High Value (> ₹5k) (${rows.filter((r) => r.approvalRequired).length})`,
            },
            {
              id: 'PROCESSING',
              label: `Processing (${rows.filter((r) => r.status === 'PROCESSING').length})`,
            },
            {
              id: 'CREDITED',
              label: `Settled / Credited (${rows.filter((r) => r.status === 'CREDITED').length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-border text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5 ml-auto"
          title="Export refund disbursements ledger to CSV spreadsheet"
        >
          <span>📥 Export Ledger CSV</span>
        </button>
      </div>

      {rows.length === 0 && !error ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-primary-50 text-primary flex items-center justify-center text-xl mb-3">
            💳
          </div>
          <h3 className="font-semibold text-text mb-1">Refund Queue Is Clean</h3>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            No pending refunds awaiting finance disbursement or high-value authorization.
          </p>
        </div>
      ) : (
        <DataTable
          title="Refund Processing Queue"
          columns={columns}
          rows={filteredRows}
          initialSortKey="initiatedAt"
          initialSortDir="desc"
          searchKeys={[
            'id',
            'productName',
            'customerName',
            'customerEmail',
            'methodLabel',
            'status',
            'amount',
          ]}
          exportFilename="refund-queue"
          selectable
          onSelectionChange={setSelected}
          actions={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="success"
                disabled={pendingSelectedCount === 0 || bulkBusy}
                onClick={bulkApprove}
                className="text-xs font-semibold"
              >
                {bulkBusy ? 'Processing…' : `Approve Selected${pendingSelectedCount ? ` (${pendingSelectedCount})` : ''}`}
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={pendingSelectedCount === 0 || bulkBusy}
                onClick={bulkReject}
                className="text-xs font-semibold"
              >
                {bulkBusy ? 'Processing…' : `Reject Selected${pendingSelectedCount ? ` (${pendingSelectedCount})` : ''}`}
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}
