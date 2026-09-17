import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import DataTable from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import { listReturns, listUsers, listOrders } from '../../lib/api.js';
import { humanize } from '../../lib/enums.js';
import { UsersIcon, BoxIcon, ArrowLeftIcon } from '../../components/ui/icons.jsx';

function getInitials(name) {
  if (!name) return 'CU';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function CustomerHistory() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryCustomerId = params.get('customerId');
  const paramName = params.get('customerName');
  const paramEmail = params.get('customerEmail');

  const [customers, setCustomers] = useState([]);
  const [activeCustomerId, setActiveCustomerId] = useState(queryCustomerId || '');
  const [customer, setCustomer] = useState({
    name: paramName || '',
    email: paramEmail || '',
    isVip: false,
  });
  const [rows, setRows] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Initial load of customers directory
  useEffect(() => {
    (async () => {
      try {
        const usersRes = await listUsers().catch(() => ({ data: [] }));
        const custs = (usersRes.data || []).filter((u) => u.role === 'CUSTOMER');
        setCustomers(custs);
        if (!queryCustomerId && custs.length > 0) {
          setActiveCustomerId(custs[0].id);
        }
      } catch (e) {
        console.error('Failed to load customers:', e);
      }
    })();
  }, [queryCustomerId]);

  const loadData = async (cid) => {
    if (!cid) return;
    setLoading(true);
    setError('');
    try {
      const [returnsRes, ordersRes, usersRes] = await Promise.all([
        listReturns({ customerId: cid }).catch(() => ({ data: [] })),
        listOrders({ customerId: cid }).catch(() => ({ data: [] })),
        listUsers().catch(() => ({ data: [] })),
      ]);
      const returnData = Array.isArray(returnsRes.data) ? returnsRes.data : [];
      setRows(returnData);

      const orderData = Array.isArray(ordersRes.data) ? ordersRes.data : [];
      setOrders(orderData);

      // Resolve customer details from user directory or return record metadata
      const userMatch = (usersRes.data || []).find((u) => String(u.id).toLowerCase() === String(cid).toLowerCase());
      const firstReturn = returnData[0];

      setCustomer({
        name: userMatch?.name || firstReturn?.customerName || paramName || `Customer ${cid.slice(0, 8)}`,
        email: userMatch?.email || firstReturn?.customerEmail || paramEmail || '',
        isVip: userMatch?.isVip || false,
      });
    } catch (e) {
      console.error('support CustomerHistory error:', e);
      setError(e?.response?.data?.detail || 'Unable to retrieve customer return history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCustomerId) {
      loadData(activeCustomerId);
    }
  }, [activeCustomerId]);

  const customerId = activeCustomerId;

  const columns = [
    {
      key: 'id',
      header: 'Return ID',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-primary font-medium text-xs bg-primary-50 px-2 py-1 rounded-md" title={r.id}>
          #{String(r.id).slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'productName',
      header: 'Product Name',
      render: (r) => {
        const item = r.items?.[0];
        const productName = item?.productName || 'Order Item';
        const itemCount = r.items?.length || 1;

        return (
          <div className="max-w-xs">
            <p className="text-sm font-semibold text-text line-clamp-1" title={productName}>
              {productName}
            </p>
            {itemCount > 1 && (
              <span className="text-[10px] text-slate-500 font-medium">
                +{itemCount - 1} more item{itemCount - 1 > 1 ? 's' : ''}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'returnType',
      header: 'Type',
      render: (r) => (
        <span className="text-xs font-semibold text-slate-700 uppercase">
          {humanize(r.returnType)}
        </span>
      ),
    },
    {
      key: 'reasonCode',
      header: 'Reason',
      render: (r) => (
        <span className="text-xs text-text-secondary">
          {humanize(r.reasonCode)}
        </span>
      ),
    },
    {
      key: 'refundAmount',
      header: 'Refund Value',
      sortable: true,
      render: (r) => (
        <span className="font-semibold text-slate-900 text-sm whitespace-nowrap">
          {r.refundAmount != null ? `₹${Number(r.refundAmount).toLocaleString('en-IN')}` : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge value={r.status} />,
    },
    {
      key: 'initiatedAt',
      header: 'Initiated',
      sortable: true,
      render: (r) => (r.initiatedAt ? new Date(r.initiatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/support/customer-search"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Customer Search
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/support/initiate-on-behalf?customerId=${customerId}&customerName=${encodeURIComponent(customer.name || '')}`)}
        >
          + Initiate Return on Behalf
        </Button>
      </div>

      {/* Customer Header Banner */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3.5">
          <span className="w-12 h-12 rounded-full bg-primary-50 text-primary font-bold text-base flex items-center justify-center shrink-0 border border-primary/20">
            {getInitials(customer.name)}
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-text">
                {customer.name || 'Customer Account'}
              </h2>
              {customer.isVip && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                  VIP
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5 flex-wrap">
              {customer.email && <span className="font-medium text-slate-700">{customer.email}</span>}
              {customer.email && <span>·</span>}
              <span className="font-mono text-[11px] text-slate-500">Account UUID: {customerId}</span>
              <span>·</span>
              <span className="font-semibold text-primary">{rows.length} Total Case{rows.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {customers.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-text-secondary whitespace-nowrap">Switch Customer:</label>
            <select
              value={activeCustomerId}
              onChange={(e) => {
                const newId = e.target.value;
                setActiveCustomerId(newId);
                const match = customers.find((c) => String(c.id).toLowerCase() === String(newId).toLowerCase());
                navigate(`/support/customer-history?customerId=${newId}&customerName=${encodeURIComponent(match?.name || '')}`, { replace: true });
              }}
              className="text-xs font-semibold border border-border rounded-lg px-2.5 py-1.5 bg-white text-text shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email}) {c.isVip ? '★ VIP' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-surface rounded-xl border border-border p-8 text-center animate-pulse">
          <p className="text-sm font-medium text-text-secondary">Loading customer return history…</p>
        </div>
      )}

      {error && (
        <div className="bg-surface rounded-xl border border-danger-200 p-4 shadow-xs flex items-center justify-between">
          <p className="text-sm font-medium text-danger">{error}</p>
          <Button size="sm" onClick={loadData}>Retry</Button>
        </div>
      )}

      {!loading && !error && (
        <>
          <DataTable
            title="Customer Return History"
            columns={columns}
            rows={rows}
            exportFilename={`return-history-${customer.name ? customer.name.toLowerCase().replace(/\s+/g, '-') : customerId.slice(0, 8)}`}
          />

          {orders.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-text text-sm flex items-center gap-2">
                  <BoxIcon className="w-4 h-4 text-primary" />
                  Customer Orders & Purchased Items ({orders.length})
                </h3>
                <span className="text-xs text-text-muted">Delivered purchases available for claims</span>
              </div>
              <div className="divide-y divide-border/60">
                {orders.map((o) => (
                  <div key={o.orderId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500 font-medium">Order #{o.orderId.slice(0, 8)}</span>
                        <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">Delivered</span>
                        <span className="text-xs text-text-muted">· {o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('en-IN') : 'Delivered recently'}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-text font-medium">
                        {(o.items || []).map((it) => (
                          <span key={it.lineId || it.skuId} className="bg-slate-100 px-2 py-1 rounded text-slate-700">
                            {it.productName} (₹{Number(it.price).toLocaleString('en-IN')})
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => navigate(`/support/initiate-on-behalf?customerId=${customerId}&orderId=${o.orderId}&customerName=${encodeURIComponent(customer.name || '')}`)}
                    >
                      Initiate Return →
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
