import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Select, Input, Textarea } from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import { RETURN_TYPE, PREFERRED_REFUND_METHOD, humanize } from '../../lib/enums.js';
import { initiateReturn, listPolicies, listUsers, listOrders } from '../../lib/api.js';
import { RefreshIcon, ArrowLeftIcon, BoxIcon, CheckIcon } from '../../components/ui/icons.jsx';

const REASON_CODES = ['DEFECTIVE', 'WRONG_ITEM', 'SIZE_FIT_ISSUE', 'CHANGED_MIND', 'DAMAGED_IN_TRANSIT'];

// Support staff initiating return on behalf of customer.
export default function InitiateOnBehalf() {
  const [searchParams] = useSearchParams();
  const [policies, setPolicies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    customerId: searchParams.get('customerId') || '',
    productName: 'Nike Air Zoom Pegasus 40 Running Shoes',
    refundAmount: 3499,
    orderId: crypto.randomUUID(),
    orderLineId: crypto.randomUUID(),
    skuId: crypto.randomUUID(),
    policyId: '',
    returnType: 'RETURN',
    reasonCode: '',
    preferredRefundMethod: 'ORIGINAL',
    supportNote: '',
    useOverride: false,
    overrideExtraDays: 3,
    overrideReason: '',
  });
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedItemKey, setSelectedItemKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [polRes, usersRes] = await Promise.all([
          listPolicies(),
          listUsers().catch(() => ({ data: [] })),
        ]);
        const pols = Array.isArray(polRes.data) ? polRes.data : [];
        setPolicies(pols);

        const customerList = (usersRes.data || []).filter((u) => u.role === 'CUSTOMER');
        setCustomers(customerList);

        const initialCid = searchParams.get('customerId');
        if (initialCid) {
          update('customerId', initialCid);
        } else if (customerList.length > 0) {
          update('customerId', customerList[0].id);
        }

        if (pols.length > 0) {
          update('policyId', pols[0].id);
        }
      } catch { /* handled inline */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch orders for active customer
  useEffect(() => {
    if (!form.customerId) {
      setCustomerOrders([]);
      return;
    }
    setLoadingOrders(true);
    listOrders({ customerId: form.customerId })
      .then((res) => {
        const orderList = Array.isArray(res.data) ? res.data : [];
        setCustomerOrders(orderList);

        const items = [];
        orderList.forEach((o) => {
          (o.items || []).forEach((it) => {
            items.push({
              ...it,
              orderId: o.orderId,
              deliveryDate: o.deliveryDate,
              delivered: o.delivered,
            });
          });
        });

        const targetOrderId = searchParams.get('orderId');
        const matched = targetOrderId ? items.find((i) => i.orderId === targetOrderId) : items[0];
        if (matched) {
          selectOrderItem(matched, 'RETURN');
        }
      })
      .catch(() => setCustomerOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [form.customerId]);

  function selectOrderItem(item, returnType = 'RETURN') {
    const key = `${item.orderId}-${item.lineId || item.skuId}`;
    setSelectedItemKey(key);

    const matchedPolicy = policies.find((p) => (p.name || '').toLowerCase() === (item.category || '').toLowerCase()) ||
      policies.find((p) => p.entityType === 'PLATFORM') || policies[0];

    setForm((f) => ({
      ...f,
      productName: item.productName || f.productName,
      refundAmount: Number(item.price) || f.refundAmount,
      orderId: item.orderId || f.orderId,
      orderLineId: item.lineId || crypto.randomUUID(),
      skuId: item.skuId || crypto.randomUUID(),
      policyId: matchedPolicy?.id || f.policyId,
      returnType: returnType,
    }));
  }

  function getItemEligibility(item) {
    const policy = policies.find((p) => (p.name || '').toLowerCase() === (item.category || '').toLowerCase()) ||
      policies.find((p) => p.entityType === 'PLATFORM') || policies[0];
    const windowDays = policy?.returnWindowDays || 14;
    const delivery = item.deliveryDate ? new Date(item.deliveryDate) : new Date(Date.now() - 3 * 86400000);
    const daysSince = Math.floor((Date.now() - delivery.getTime()) / (1000 * 60 * 60 * 24));
    const isEligible = daysSince <= windowDays;
    return {
      policy,
      windowDays,
      daysSince,
      isEligible,
    };
  }

  function update(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await initiateReturn({
        orderId: form.orderId,
        customerId: form.customerId,
        returnType: form.returnType,
        reasonCode: form.reasonCode,
        preferredRefundMethod: form.preferredRefundMethod,
        policyId: form.policyId,
        refundAmount: Number(form.refundAmount) || 3499,
        items: [{
          orderLineId: form.orderLineId,
          skuId: form.skuId,
          quantity: 1,
          productName: form.productName,
          returnReason: form.reasonCode,
          evidenceUrls: ['DEFECTIVE', 'DAMAGED_IN_TRANSIT'].includes(form.reasonCode)
            ? ['https://mock-s3.rrpms.local/evidence/support-override-defect-photo.jpg']
            : [],
        }],
        overrideExtraDays: form.useOverride ? form.overrideExtraDays : null,
        overrideReason: form.useOverride ? form.overrideReason : null,
      });

      const matchedCust = customers.find((c) => String(c.id).toLowerCase() === String(form.customerId).toLowerCase());
      const custDisplayName = matchedCust ? matchedCust.name : form.customerId.slice(0, 8);

      setSuccess(`Return #${String(res.data.id).slice(0, 8)} successfully initiated on behalf of ${custDisplayName} for ${form.productName}.`);
    } catch (e) {
      console.error('support InitiateOnBehalf error:', e);
      setError(e?.response?.data?.detail || 'Could not create the return. Please check the details and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCustomer = customers.find((c) => String(c.id).toLowerCase() === String(form.customerId).toLowerCase());

  return (
    <div className="max-w-2xl bg-surface border border-border rounded-xl p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <Link
          to="/support/customer-search"
          className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Customer Directory
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <RefreshIcon className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-text text-lg">Initiate Return on Behalf of Customer</h2>
        </div>
        <p className="text-xs text-text-muted">
          Authorize customer return cases directly from the support desk, apply category policies, and grant authorized window overrides with audit trails.
        </p>
      </div>

      {error && <p className="text-sm text-danger bg-danger-50 border border-danger-200 rounded-lg px-3.5 py-2.5">{error}</p>}
      {success && (
        <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 space-y-2">
          <p className="font-semibold">{success}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => navigate('/support/return-lookup')}>
              Go to Return Lookup →
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSuccess('')}>
              Initiate Another
            </Button>
          </div>
        </div>
      )}

      {/* Customer Selection */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-text uppercase tracking-wider">
          Customer Account
        </label>
        {customers.length > 0 ? (
          <select
            value={form.customerId}
            onChange={(e) => update('customerId', e.target.value)}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.email}) {c.isVip ? '★ VIP' : ''}
              </option>
            ))}
          </select>
        ) : (
          <Input
            label="Customer ID (UUID)"
            value={form.customerId}
            onChange={(e) => update('customerId', e.target.value)}
            placeholder="Paste the customer's user ID"
          />
        )}
        {selectedCustomer && (
          <p className="text-xs text-text-muted">
            Selected: <strong className="text-text">{selectedCustomer.name}</strong> ({selectedCustomer.email}) · Preferred: {selectedCustomer.preferredChannel}
          </p>
        )}
      </div>

      {/* Customer Eligible Orders & Items Selector */}
      {form.customerId && (
        <div className="space-y-2.5 pt-1 border-t border-border/70">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-text uppercase tracking-wider">
              Customer Purchased Items (Eligible for Return / Exchange)
            </label>
            {loadingOrders && (
              <span className="text-[11px] text-text-muted animate-pulse">Loading customer orders…</span>
            )}
          </div>

          {customerOrders.length === 0 && !loadingOrders ? (
            <p className="text-xs text-text-muted italic bg-slate-50 border border-border/60 rounded-lg p-3">
              No recent purchases found in customer order history. You may manually enter order items below.
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {customerOrders.flatMap((order) =>
                (order.items || []).map((item) => {
                  const itemKey = `${order.orderId}-${item.lineId || item.skuId}`;
                  const isSelected = selectedItemKey === itemKey;
                  const fullItem = { ...item, orderId: order.orderId, deliveryDate: order.deliveryDate };
                  const { isEligible } = getItemEligibility(fullItem);

                  return (
                    <div
                      key={itemKey}
                      className={`p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-primary bg-primary-50/20 ring-1 ring-primary shadow-xs'
                          : 'border-border bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="w-11 h-11 object-cover rounded-lg border shrink-0" />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-400 border border-border/80">
                              <BoxIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-text truncate" title={item.productName}>
                              {item.productName}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted mt-0.5">
                              <span className="font-semibold text-slate-900">₹{Number(item.price).toLocaleString('en-IN')}</span>
                              <span>·</span>
                              <span>{item.category}</span>
                              <span>·</span>
                              <span className="font-mono text-[10px]">Order #{order.orderId.slice(0, 8)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isEligible
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {isEligible ? 'Eligible' : 'Override Req.'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => selectOrderItem(fullItem, 'RETURN')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                isSelected && form.returnType === 'RETURN'
                                  ? 'bg-primary text-white border-primary shadow-xs'
                                  : 'bg-white text-slate-700 border-border hover:bg-slate-50'
                              }`}
                            >
                              Return
                            </button>
                            <button
                              type="button"
                              onClick={() => selectOrderItem(fullItem, 'EXCHANGE')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                isSelected && form.returnType === 'EXCHANGE'
                                  ? 'bg-primary text-white border-primary shadow-xs'
                                  : 'bg-white text-slate-700 border-border hover:bg-slate-50'
                              }`}
                            >
                              Exchange
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Product Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Product Name"
          value={form.productName}
          onChange={(e) => update('productName', e.target.value)}
          placeholder="e.g. Nike Air Zoom Pegasus Running Shoes"
        />
        <Input
          label="Refund Amount (₹ INR)"
          type="number"
          value={form.refundAmount}
          onChange={(e) => update('refundAmount', Number(e.target.value))}
          placeholder="3499"
        />
      </div>

      {/* Policy and Reason */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Return policy & Window"
          value={form.policyId}
          onChange={(e) => update('policyId', e.target.value)}
          options={policies.length > 0
            ? policies.map((p) => ({ value: p.id, label: `${p.name} (${p.returnWindowDays}d window)` }))
            : [{ value: '', label: 'No policies exist yet' }]}
        />
        <Select
          label="Return type"
          value={form.returnType}
          onChange={(e) => update('returnType', e.target.value)}
          options={RETURN_TYPE.map((v) => ({ value: v, label: humanize(v) }))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Reason Code"
          value={form.reasonCode}
          onChange={(e) => update('reasonCode', e.target.value)}
          options={[{ value: '', label: 'Select a reason' }, ...REASON_CODES.map((v) => ({ value: v, label: humanize(v) }))]}
        />
        <Select
          label="Preferred refund method"
          value={form.preferredRefundMethod}
          onChange={(e) => update('preferredRefundMethod', e.target.value)}
          options={PREFERRED_REFUND_METHOD.map((v) => ({ value: v, label: humanize(v) }))}
        />
      </div>

      <Textarea
        label="Support note (Internal audit)"
        rows={2}
        value={form.supportNote}
        onChange={(e) => update('supportNote', e.target.value)}
        placeholder="Reason for assisting customer, customer request details..."
      />

      {/* Return Window Exception Override */}
      <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-4 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-amber-900 cursor-pointer">
          <input
            type="checkbox"
            checked={form.useOverride}
            onChange={(e) => update('useOverride', e.target.checked)}
            className="rounded text-primary focus:ring-primary"
          />
          Authorize return window exception (+1 to +7 additional days)
        </label>
        {form.useOverride && (
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-medium text-text-secondary">
              Extra Extension Days
              <input
                type="number"
                min={1}
                max={7}
                value={form.overrideExtraDays}
                onChange={(e) => update('overrideExtraDays', Number(e.target.value))}
                className="w-full border border-border rounded-md px-3 py-2 text-sm mt-1 bg-white"
              />
            </label>
            <Input
              label="Override justification (Mandatory audit trail)"
              value={form.overrideReason}
              onChange={(e) => update('overrideReason', e.target.value)}
              placeholder="e.g. Courier delivery scan delayed by 4 days, customer traveling"
            />
          </div>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={submitting || !form.customerId || !form.policyId || !form.reasonCode || (form.useOverride && !form.overrideReason)}
        className="w-full justify-center py-2.5"
      >
        {submitting ? 'Creating Case…' : 'Initiate Customer Return'}
      </Button>
    </div>
  );
}
