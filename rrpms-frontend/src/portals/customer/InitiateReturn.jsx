import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import { Select, Textarea, Input } from '../../components/ui/Input.jsx';
import { PREFERRED_REFUND_METHOD, RETURN_TYPE, humanize } from '../../lib/enums.js';
import { initiateReturn, saveReturnDraft, listPolicies, schedulePickup, listOrders } from '../../lib/api.js';
import { useAuth } from '../../lib/AuthContext.jsx';
import { BoxIcon, CheckIcon, ClockIcon } from '../../components/ui/icons.jsx';

const STEPS = ['Select Items', 'Reason & Evidence', 'Refund Method', 'Schedule Pickup', 'Confirm'];

const REASON_CODES = ['DEFECTIVE', 'WRONG_ITEM', 'SIZE_FIT_ISSUE', 'CHANGED_MIND', 'DAMAGED_IN_TRANSIT'];

export default function InitiateReturn() {
  const { user } = useAuth();
  const location = useLocation();
  const prefilled = location.state || {};
  const [step, setStep] = useState(0);
  const [policies, setPolicies] = useState([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [policiesError, setPoliciesError] = useState('');
  const [customerOrders, setCustomerOrders] = useState([]);

  const [form, setForm] = useState({
    orderId: prefilled.orderId || '',
    orderLineId: prefilled.orderLineId || '',
    skuId: prefilled.skuId || '',
    productName: prefilled.productName || '',
    category: prefilled.category || 'Footwear',
    price: prefilled.price || 4299,
    quantity: 1,
    exchangeSkuId: '',
    policyId: prefilled.policyId || '',
    returnType: prefilled.returnType || 'RETURN',
    reasonCode: '',
    evidenceNote: '',
    evidenceFiles: [],
    preferredRefundMethod: 'ORIGINAL',
    bankAccountNumber: '',
    bankIfsc: '',
    pickupOrDropoff: 'pickup',
    logisticsPartner: 'SHIPROCKET',
    pickupDate: '',
    pickupSlot: '2:00 PM - 5:00 PM',
    pickupAddress: '42, MG Road, Indiranagar, Bengaluru 560038',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Load policies and delivered customer orders
  useEffect(() => {
    (async () => {
      setPoliciesLoading(true);
      try {
        const [polRes, ordersRes] = await Promise.all([
          listPolicies(),
          user?.id ? listOrders({ customerId: user.id }).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        ]);

        const pols = Array.isArray(polRes.data) ? polRes.data : [];
        setPolicies(pols);

        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
        setCustomerOrders(orders);

        // Gather delivered items
        const allItems = [];
        orders.forEach((o) => {
          (o.items || []).forEach((item) => {
            allItems.push({
              ...item,
              orderId: o.orderId,
              deliveryDate: o.deliveryDate,
            });
          });
        });

        // If no prefilled item, select first delivered item or realistic default
        if (!prefilled.productName && allItems.length > 0) {
          const first = allItems[0];
          applySelectedItem(first, pols);
        } else if (prefilled.productName) {
          // Find matching policy for prefilled item category
          const matchedPolicy = findPolicyForCategory(prefilled.category, pols);
          setForm((f) => ({
            ...f,
            policyId: prefilled.policyId || matchedPolicy?.id || (pols[0]?.id || ''),
          }));
        } else if (pols.length > 0) {
          setForm((f) => ({
            ...f,
            productName: 'Puma Nitro Elite Running Shoes (UK 7, Electric Blue)',
            category: 'Footwear',
            price: 4299,
            policyId: pols.find((p) => p.name === 'Footwear')?.id || pols[0].id,
          }));
        }
      } catch (e) {
        console.error('customer InitiateReturn error:', e);
        setPoliciesError(e?.response?.data?.detail || 'Unable to retrieve return policies and orders.');
      } finally {
        setPoliciesLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function findPolicyForCategory(cat, polList) {
    if (!cat || !polList || polList.length === 0) return polList?.[0];
    const cLower = cat.toLowerCase();
    return (
      polList.find((p) => p.name.toLowerCase() === cLower) ||
      polList.find((p) => p.name.toLowerCase().includes(cLower)) ||
      polList.find((p) => p.entityType === 'PLATFORM') ||
      polList[0]
    );
  }

  function applySelectedItem(item, polList = policies) {
    const matchedPolicy = findPolicyForCategory(item.category, polList);
    setForm((f) => ({
      ...f,
      orderId: item.orderId || crypto.randomUUID(),
      orderLineId: item.lineId || crypto.randomUUID(),
      skuId: item.skuId || crypto.randomUUID(),
      productName: item.productName,
      category: item.category || 'Apparel',
      price: Number(item.price) || 3499,
      policyId: matchedPolicy?.id || f.policyId || polList[0]?.id || '',
    }));
  }

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Flattened delivered items for picker
  const availableItems = useMemo(() => {
    const items = [];
    customerOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        items.push({
          ...item,
          orderId: o.orderId,
          deliveryDate: o.deliveryDate,
        });
      });
    });
    return items;
  }, [customerOrders]);

  function buildPayload() {
    return {
      orderId: form.orderId || crypto.randomUUID(),
      customerId: user.id,
      returnType: form.returnType,
      reasonCode: form.reasonCode,
      preferredRefundMethod: form.preferredRefundMethod,
      policyId: form.policyId,
      refundAmount: Number(form.price) * Number(form.quantity),
      bankAccountNumber: form.preferredRefundMethod === 'BANK_TRANSFER' ? form.bankAccountNumber : null,
      bankIfsc: form.preferredRefundMethod === 'BANK_TRANSFER' ? form.bankIfsc : null,
      salesChannel: 'WEB',
      items: [{
        orderLineId: form.orderLineId || crypto.randomUUID(),
        skuId: form.skuId || crypto.randomUUID(),
        productName: form.productName,
        quantity: form.quantity,
        returnReason: form.reasonCode,
        exchangeSkuId: form.returnType === 'EXCHANGE' && form.exchangeSkuId ? form.exchangeSkuId : null,
        evidenceUrls: form.evidenceFiles?.length > 0
          ? form.evidenceFiles.map((f) => `https://mock-s3.rrpms.local/evidence/${crypto.randomUUID()}-${f.name}`)
          : (['DEFECTIVE', 'DAMAGED_IN_TRANSIT'].includes(form.reasonCode)
              ? [`https://mock-s3.rrpms.local/evidence/${crypto.randomUUID()}-item-defect-evidence.jpg`]
              : []),
      }],
    };
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const res = await initiateReturn(buildPayload());
      if (form.pickupOrDropoff === 'pickup' && form.pickupDate && form.pickupAddress && res?.data?.id) {
        try {
          await schedulePickup(res.data.id, {
            logisticsPartner: form.logisticsPartner || 'SHIPROCKET',
            pickupDate: form.pickupDate,
            pickupSlot: form.pickupSlot || '2:00 PM - 5:00 PM',
            pickupAddress: form.pickupAddress,
          });
        } catch (pickupErr) {
          console.warn('Pickup scheduling notice:', pickupErr);
        }
      }
      navigate('/customer/return-history');
    } catch (e) {
      console.error('customer InitiateReturn error:', e);
      setError(e?.response?.data?.detail || 'Could not submit the return. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveDraft() {
    setSubmitting(true);
    setError('');
    try {
      await saveReturnDraft(buildPayload());
      navigate('/customer/return-history');
    } catch (e) {
      console.error('customer InitiateReturn error:', e);
      setError(e?.response?.data?.detail || 'Could not save the draft. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedPolicy = policies.find((p) => p.id === form.policyId);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Initiate Return or Exchange</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Returns comply with Consumer Protection Rules 2020. Zero reverse pickup or restocking deductions.
          </p>
        </div>
      </div>

      {/* Stepper Header */}
      <ol className="flex items-center gap-2 max-w-2xl bg-surface border border-border rounded-xl p-3 shadow-2xs">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2 flex-1">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                i < step
                  ? 'bg-success text-white'
                  : i === step
                  ? 'bg-primary text-white ring-2 ring-primary/20'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </span>
            <span className={`text-xs hidden sm:inline truncate font-medium ${i === step ? 'text-primary font-bold' : 'text-slate-500'}`}>
              {s}
            </span>
            {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < step ? 'bg-success' : 'bg-border'}`} />}
          </li>
        ))}
      </ol>

      <div className="bg-surface border border-border rounded-xl p-6 shadow-xs max-w-2xl">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-text text-base">Select Item & Return Policy</h2>
              <p className="text-xs text-text-muted">
                Each product category features its tailored return limit and inspection guidelines.
              </p>
            </div>

            {/* Delivered Item Picker (if multiple items available in customer orders) */}
            {availableItems.length > 0 && !prefilled.productName && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text uppercase tracking-wider">
                  Choose from Delivered Orders
                </label>
                <select
                  value={form.skuId}
                  onChange={(e) => {
                    const match = availableItems.find((i) => i.skuId === e.target.value);
                    if (match) applySelectedItem(match);
                  }}
                  className="w-full text-xs font-medium border border-border rounded-lg px-3 py-2.5 bg-white text-text focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {availableItems.map((item) => (
                    <option key={item.skuId} value={item.skuId}>
                      {item.productName} — ₹{Number(item.price).toLocaleString('en-IN')} ({item.category})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Item & Financial Valuation Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                    Item Selected For Reverse Logistics
                  </span>
                  <h4 className="font-bold text-base text-slate-900 mt-0.5">{form.productName}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                    <span>Category: <strong className="text-slate-700">{form.category}</strong></span>
                    <span>·</span>
                    <span>Quantity: <strong>1 Unit</strong></span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Product Price
                  </span>
                  <div className="text-xl font-black text-slate-900">
                    ₹{Number(form.price).toLocaleString('en-IN')}{' '}
                    <span className="text-xs font-semibold text-slate-500">INR</span>
                  </div>
                </div>
              </div>

              {/* Financial Valuation Preview Box */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-900">Estimated Refund Value:</span>
                  <span className="text-xs text-emerald-700">(Zero Reverse Logistics Deductions)</span>
                </div>
                <span className="font-black text-sm text-emerald-800">
                  ₹{Number(form.price).toLocaleString('en-IN')} INR
                </span>
              </div>
            </div>

            {policiesError && <p className="text-sm text-danger bg-danger-50 rounded-md px-3 py-2">{policiesError}</p>}
            {policiesLoading && !policiesError && <p className="text-sm text-text-muted">Loading policies…</p>}

            {/* Category Policy Selector & Window Display */}
            {policies.length > 0 && (
              <div className="space-y-2">
                <Select
                  label="Category Return Policy"
                  value={form.policyId}
                  onChange={(e) => update('policyId', e.target.value)}
                  options={policies.map((p) => ({
                    value: p.id,
                    label: `${p.name} — ${p.returnWindowDays} Day Return Limit`,
                  }))}
                />
                {selectedPolicy && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900">
                    <ClockIcon className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      <strong>{selectedPolicy.name} Policy:</strong> Allows up to{' '}
                      <strong>{selectedPolicy.returnWindowDays} days</strong> from physical delivery.
                      {selectedPolicy.freeReturn ? ' Includes free doorstep pickup with zero deductions.' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-text text-base">Reason & Evidence</h2>
            <Select
              label="Return type"
              options={RETURN_TYPE.map((v) => ({ value: v, label: humanize(v) }))}
              value={form.returnType}
              onChange={(e) => update('returnType', e.target.value)}
            />
            {form.returnType === 'EXCHANGE' && (
              <>
                <Input
                  label="Exchange for SKU (size/colour swap)"
                  value={form.exchangeSkuId}
                  onChange={(e) => update('exchangeSkuId', e.target.value)}
                  placeholder="Paste the replacement item's SKU ID"
                />
                <p className="text-xs text-text-muted -mt-2">
                  Replacement item SKU will be matched at warehouse intake. Any applicable price differences will be adjusted automatically during refund/settlement.
                </p>
              </>
            )}
            <Select
              label="Reason for return"
              options={[{ value: '', label: 'Select a reason' }, ...REASON_CODES.map((v) => ({ value: v, label: humanize(v) }))]}
              value={form.reasonCode}
              onChange={(e) => update('reasonCode', e.target.value)}
            />
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                type="file"
                id="evidence-upload"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => update('evidenceFiles', Array.from(e.target.files || []))}
              />
              <label htmlFor="evidence-upload" className="cursor-pointer text-sm text-primary font-medium hover:underline">
                Click to upload photos/video
              </label>
              <span className="text-sm text-text-muted"> of the item {['DEFECTIVE', 'DAMAGED_IN_TRANSIT'].includes(form.reasonCode) && <span className="text-danger">(required for this reason)</span>}</span>
              {form.evidenceFiles?.length > 0 && (
                <ul className="mt-3 text-xs text-text-secondary space-y-1">
                  {form.evidenceFiles.map((f, i) => <li key={i}>{f.name} ({(f.size / 1024).toFixed(0)} KB)</li>)}
                </ul>
              )}
            </div>
            <Textarea label="Additional notes" rows={3} value={form.evidenceNote} onChange={(e) => update('evidenceNote', e.target.value)} placeholder="Describe the issue..." />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-text text-base">Preferred Refund Method</h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                Refund Value: ₹{Number(form.price).toLocaleString('en-IN')} INR
              </span>
            </div>
            {PREFERRED_REFUND_METHOD.map((m) => {
              const basePrice = Number(form.price || 3499);
              const storeCreditTotal = Math.round(basePrice * 1.05);
              return (
                <label key={m} className={`flex items-center justify-between border rounded-lg p-4 cursor-pointer transition-colors ${form.preferredRefundMethod === m ? 'border-primary bg-primary-50/60 ring-1 ring-primary/20' : 'border-border hover:bg-slate-50'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-text text-sm">{humanize(m)}</p>
                      {m === 'STORE_CREDIT' && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          +5% Instant Bonus
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {m === 'ORIGINAL' && `Credited ₹${basePrice.toLocaleString('en-IN')} INR to your original card / UPI account in 5–7 business days.`}
                      {m === 'STORE_CREDIT' && `Instant credit of ₹${storeCreditTotal.toLocaleString('en-IN')} INR within 24 hours (+₹${Math.round(basePrice * 0.05).toLocaleString('en-IN')} bonus).`}
                      {m === 'BANK_TRANSFER' && `NEFT transfer of ₹${basePrice.toLocaleString('en-IN')} INR to verified bank account in 7 business days.`}
                    </p>
                  </div>
                  <input type="radio" name="refundMethod" checked={form.preferredRefundMethod === m} onChange={() => update('preferredRefundMethod', m)} />
                </label>
              );
            })}
            {form.preferredRefundMethod === 'BANK_TRANSFER' && (
              <div className="border border-border rounded-lg p-4 space-y-3 bg-gray-50">
                <p className="text-xs text-text-secondary">
                  Required for direct bank transfer. Bank details are AES-256 encrypted at rest.
                </p>
                <Input label="Bank account number" value={form.bankAccountNumber} onChange={(e) => update('bankAccountNumber', e.target.value)} placeholder="e.g. 000123456789" />
                <Input label="IFSC code" value={form.bankIfsc} onChange={(e) => update('bankIfsc', e.target.value.toUpperCase())} placeholder="e.g. HDFC0001234" />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-text text-base">Schedule Reverse Pickup</h2>
            <div className="flex gap-3 mb-3">
              <button type="button" onClick={() => update('pickupOrDropoff', 'pickup')} className={`flex-1 border rounded-lg p-3 text-sm font-medium ${form.pickupOrDropoff === 'pickup' ? 'border-primary bg-primary-50 text-primary' : 'border-border text-text'}`}>Doorstep Reverse Pickup</button>
              <button type="button" onClick={() => update('pickupOrDropoff', 'dropoff')} className={`flex-1 border rounded-lg p-3 text-sm font-medium ${form.pickupOrDropoff === 'dropoff' ? 'border-primary bg-primary-50 text-primary' : 'border-border text-text'}`}>Registered Drop-off Point</button>
            </div>

            {form.pickupOrDropoff === 'pickup' && (
              <div className="space-y-3 bg-gray-50 border border-border p-4 rounded-lg">
                <Select
                  label="Logistics Partner"
                  value={form.logisticsPartner}
                  onChange={(e) => update('logisticsPartner', e.target.value)}
                  options={[{ value: 'SHIPROCKET', label: 'Shiprocket Reverse Express' }, { value: 'DELHIVERY', label: 'Delhivery Surface Return' }]}
                />
                <Input
                  label="Pickup Date"
                  type="date"
                  value={form.pickupDate}
                  onChange={(e) => update('pickupDate', e.target.value)}
                />
                <Input
                  label="Preferred Time Slot"
                  value={form.pickupSlot}
                  onChange={(e) => update('pickupSlot', e.target.value)}
                  placeholder="e.g. 2:00 PM - 5:00 PM"
                />
                <Textarea
                  label="Pickup Address"
                  rows={2}
                  value={form.pickupAddress}
                  onChange={(e) => update('pickupAddress', e.target.value)}
                  placeholder="Street address, landmark, PIN code"
                />
                <p className="text-[11px] text-text-muted">
                  Logistics agent will verify item and generate OTP handover upon doorstep receipt.
                </p>
              </div>
            )}

            {form.pickupOrDropoff === 'dropoff' && (
              <div className="p-4 bg-gray-50 border border-border rounded-lg text-xs space-y-2">
                <p className="font-semibold text-text">Authorized Drop-off Guidelines</p>
                <p className="text-text-secondary">Take the item to your nearest registered ReturnFlow Hub. Staff will scan the barcode on arrival to confirm receipt.</p>
                <p className="text-primary font-medium">Nearest Hub: ReturnFlow Indiranagar Center (1.2 km away)</p>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-text text-base mb-2">Confirm Your Return & Settlement Details</h2>

            {/* Financial Settlement Breakdown */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Item Name & SKU</span>
                <span className="font-semibold text-slate-900">{form.productName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Original Purchase Price</span>
                <span className="font-semibold text-slate-900">₹{Number(form.price).toLocaleString('en-IN')} INR</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Reverse Courier & Restock Fee</span>
                <span className="font-semibold text-emerald-700">FREE (₹0.00)</span>
              </div>
              {form.preferredRefundMethod === 'STORE_CREDIT' && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-800 font-medium">Store Credit Incentive (+5% Bonus)</span>
                  <span className="font-bold text-emerald-700">+₹{Math.round(Number(form.price) * 0.05).toLocaleString('en-IN')} INR</span>
                </div>
              )}
              <div className="pt-2.5 border-t border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-emerald-950 block">Net Refund Disbursement</span>
                  <span className="text-[11px] text-emerald-700 font-medium">Credited via {humanize(form.preferredRefundMethod)}</span>
                </div>
                <span className="text-xl font-black text-emerald-700">
                  ₹{(form.preferredRefundMethod === 'STORE_CREDIT' ? Math.round(Number(form.price) * 1.05) : Number(form.price)).toLocaleString('en-IN')}{' '}
                  <span className="text-xs font-bold text-emerald-800">INR</span>
                </span>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-lg p-3 space-y-1">
              <SummaryRow label="Policy" value={selectedPolicy ? `${selectedPolicy.name} (${selectedPolicy.returnWindowDays}d window)` : '—'} />
              <SummaryRow label="Type" value={humanize(form.returnType)} />
              <SummaryRow label="Reason" value={form.reasonCode ? humanize(form.reasonCode) : '—'} />
              <SummaryRow label="Logistics Method" value={form.pickupOrDropoff === 'pickup' ? 'Doorstep Carrier Pickup' : 'Hub Drop-off'} />
            </div>

            {error && <p className="text-xs text-danger bg-danger-50 rounded-md px-2 py-1.5">{error}</p>}
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t border-border">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={(step === 0 && !form.policyId) || (step === 1 && !form.reasonCode) || (step === 2 && form.preferredRefundMethod === 'BANK_TRANSFER' && (!form.bankAccountNumber || !form.bankIfsc))}>Continue →</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSaveDraft} disabled={submitting || !form.policyId}>Save as Draft</Button>
              <Button onClick={handleSubmit} disabled={submitting || !form.policyId}>{submitting ? 'Submitting...' : 'Submit Return'}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm py-2 border-b border-border last:border-0">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text font-medium">{value}</span>
    </div>
  );
}
