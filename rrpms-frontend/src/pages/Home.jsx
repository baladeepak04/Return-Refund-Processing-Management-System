import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { listReturns, listRefunds, listPolicies } from '../lib/api.js';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import Button from '../components/ui/Button.jsx';
import { StatCard } from '../components/ui/Card.jsx';
import {
  BoxIcon,
  RefreshIcon,
  CreditCardIcon,
  ClockIcon,
  CheckIcon,
  AlertIcon,
  ChatIcon,
  SearchIcon,
} from '../components/ui/icons.jsx';
import { humanize } from '../lib/enums.js';
import Footer from '../components/layout/Footer.jsx';

const STATUS_STEPS = [
  { id: 'INITIATED', label: 'Return Initiated' },
  { id: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled' },
  { id: 'IN_TRANSIT', label: 'In Transit' },
  { id: 'RECEIVED', label: 'Warehouse Received' },
  { id: 'QC_IN_PROGRESS', label: 'QC In Progress' },
  { id: 'QC_DONE', label: 'QC Complete' },
  { id: 'REFUND_INITIATED', label: 'Refund Initiated' },
  { id: 'REFUNDED', label: 'Refund Credited' },
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [returns, setReturns] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeReturnTab, setActiveReturnTab] = useState(0);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        if (!user) {
          try {
            const policiesRes = await listPolicies();
            setPolicies(Array.isArray(policiesRes?.data) ? policiesRes.data : []);
          } catch (_) {}
          setReturns([]);
          setRefunds([]);
          return;
        }

        const isCustomer = user.role === 'customer';
        const params = isCustomer ? { customerId: user.id } : {};

        const [returnsRes, refundsRes, policiesRes] = await Promise.allSettled([
          listReturns(params),
          listRefunds(params),
          listPolicies(),
        ]);

        const rList = returnsRes.status === 'fulfilled' && Array.isArray(returnsRes.value?.data)
          ? returnsRes.value.data
          : [];
        setReturns(rList.filter((r) => !r.draft));

        const refList = refundsRes.status === 'fulfilled' && Array.isArray(refundsRes.value?.data)
          ? refundsRes.value.data
          : [];
        setRefunds(refList);

        const pList = policiesRes.status === 'fulfilled' && Array.isArray(policiesRes.value?.data)
          ? policiesRes.value.data
          : [];
        setPolicies(pList);
      } catch (err) {
        console.warn('Home.jsx non-fatal data load:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const activeReturns = returns.filter(
    (r) => !['REFUNDED', 'EXCHANGE_DISPATCHED', 'CLOSED', 'CANCELLED'].includes(r.status)
  );
  const completedReturns = returns.filter(
    (r) => ['REFUNDED', 'EXCHANGE_DISPATCHED', 'CLOSED'].includes(r.status)
  );

  const selectedActiveReturn = activeReturns[activeReturnTab] || activeReturns[0] || null;

  function getStepIndex(status) {
    const idx = STATUS_STEPS.findIndex((s) => s.id === status);
    return idx === -1 ? 0 : idx;
  }

  const currentStepIndex = selectedActiveReturn ? getStepIndex(selectedActiveReturn.status) : 0;

  // Refund statistics
  const creditedRefunds = refunds.filter((r) => r.status === 'CREDITED');
  const inFlightRefunds = refunds.filter((r) => ['PENDING', 'INITIATED', 'PROCESSING'].includes(r.status));
  const totalRefunded = creditedRefunds.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const pendingRefundAmount = inFlightRefunds.reduce((acc, r) => acc + Number(r.amount || 0), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-primary to-primary-dark rounded-xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white mb-2">
            Customer Returns & Refunds Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {user?.name || 'Customer'}
          </h1>
          <p className="mt-2 text-white/85 text-sm leading-relaxed">
            Manage your product returns, track reverse logistics pickup status, monitor fast refunds, and view category policy windows.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/customer/initiate-return">
              <Button className="!bg-white !text-primary hover:!bg-gray-50 font-semibold shadow-xs">
                + Initiate Return / Exchange
              </Button>
            </Link>
            <Link to="/customer/orders">
              <Button variant="outline" className="!border-white/40 !text-white hover:!bg-white/10">
                <BoxIcon className="w-4 h-4 mr-1.5 inline" /> My Orders
              </Button>
            </Link>
            <Link to="/customer/support-chat">
              <Button variant="outline" className="!border-white/40 !text-white hover:!bg-white/10">
                <ChatIcon className="w-4 h-4 mr-1.5 inline" /> Support Assistant
              </Button>
            </Link>
          </div>
        </div>

        {/* Decorative Background Element */}
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-8 translate-y-8">
          <RefreshIcon className="w-72 h-72 text-white" />
        </div>
      </div>



      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Returns"
          value={activeReturns.length}
          icon={<RefreshIcon />}
          tint="warning"
          trend={`${activeReturns.length} in reverse logistics pipeline`}
        />
        <StatCard
          label="Pending Refunds"
          value={`₹${pendingRefundAmount.toLocaleString('en-IN')}`}
          icon={<CreditCardIcon />}
          tint="primary"
          trend={`${inFlightRefunds.length} refund(s) processing`}
        />
        <StatCard
          label="Credited Refunds"
          value={`₹${totalRefunded.toLocaleString('en-IN')}`}
          icon={<CheckIcon />}
          tint="success"
          trend={`${creditedRefunds.length} completed`}
        />
        <StatCard
          label="Total Return Requests"
          value={returns.length}
          icon={<BoxIcon />}
          tint="info"
          trend="Lifetime return history"
        />
      </div>

      {/* Active Returns Tracker */}
      <div className="bg-white border border-border rounded-xl shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <RefreshIcon className="w-5 h-5 text-primary" /> Active Returns Tracker
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Real-time milestone tracking for reverse pickup, warehouse receipt, QC grading, and refund dispatch.
            </p>
          </div>

          {activeReturns.length > 1 && (
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {activeReturns.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => setActiveReturnTab(i)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activeReturnTab === i ? 'bg-white text-primary shadow-xs' : 'text-text-secondary hover:text-text'
                  }`}
                >
                  Return #{String(r.id).slice(0, 6)}
                </button>
              ))}
            </div>
          )}
        </div>

        {!selectedActiveReturn ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-border">
            <BoxIcon className="w-12 h-12 text-text-muted mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-text text-sm">No Active Returns Right Now</p>
            <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
              All previous returns have been processed. Have an issue with a recent purchase?
            </p>
            <Link to="/customer/initiate-return" className="mt-4 inline-block">
              <Button size="sm">Start a New Return</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Return Meta Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-border text-xs">
              <div>
                <span className="text-text-muted block">Return ID:</span>
                <span className="font-mono font-bold text-text text-sm">{selectedActiveReturn.id}</span>
              </div>
              <div>
                <span className="text-text-muted block">Return Reason:</span>
                <span className="font-semibold text-text text-sm">{humanize(selectedActiveReturn.reasonCode)}</span>
              </div>
              <div>
                <span className="text-text-muted block">Refund Method:</span>
                <span className="font-semibold text-primary text-sm">
                  {humanize(selectedActiveReturn.preferredRefundMethod)}
                  {selectedActiveReturn.preferredRefundMethod === 'STORE_CREDIT' && ' (+5% bonus)'}
                </span>
              </div>
              <div>
                <span className="text-text-muted block">Current Status:</span>
                <StatusBadge value={selectedActiveReturn.status} />
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="relative py-4">
              <div className="overflow-hidden mb-2">
                <ol className="flex items-center w-full">
                  {STATUS_STEPS.map((step, idx) => {
                    const isCompleted = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <li key={step.id} className={`flex-1 relative ${idx < STATUS_STEPS.length - 1 ? 'pr-2' : ''}`}>
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all ${
                              isCurrent
                                ? 'bg-primary text-white ring-4 ring-primary-100'
                                : isCompleted
                                ? 'bg-success text-white'
                                : 'bg-gray-100 text-text-muted border border-border'
                            }`}
                          >
                            {isCompleted ? <CheckIcon className="w-4 h-4" /> : idx + 1}
                          </div>
                          <span
                            className={`text-[11px] font-medium mt-2 text-center max-w-[80px] leading-tight ${
                              isCurrent ? 'text-primary font-bold' : isCompleted ? 'text-text' : 'text-text-muted'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                        {idx < STATUS_STEPS.length - 1 && (
                          <div
                            className={`absolute top-4 left-1/2 w-full h-1 -translate-y-1/2 ${
                              idx < currentStepIndex ? 'bg-success' : 'bg-border'
                            }`}
                          />
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>

            {/* Contextual Action Banner */}
            <div className="flex flex-wrap items-center justify-between p-3.5 bg-primary-50/60 rounded-lg border border-primary-100 text-xs">
              <div className="flex items-center gap-2 text-primary-900">
                <AlertIcon className="w-4 h-4 text-primary shrink-0" />
                <span>
                  {selectedActiveReturn.status === 'INITIATED' &&
                    'Reverse pickup has not been booked yet. Please schedule your doorstep pickup.'}
                  {selectedActiveReturn.status === 'PICKUP_SCHEDULED' &&
                    'Your pickup is scheduled with logistics partner. Keep the item ready for handover.'}
                  {selectedActiveReturn.status === 'IN_TRANSIT' &&
                    'Shipment in transit to warehouse hub. SLA: warehouse delivery within 5 business days.'}
                  {selectedActiveReturn.status === 'RECEIVED' &&
                    'Item received at warehouse. Quality check will be completed within 24 business hours.'}
                  {selectedActiveReturn.status === 'QC_IN_PROGRESS' &&
                    'Warehouse inspector is currently reviewing item condition against stated complaint.'}
                  {selectedActiveReturn.status === 'QC_DONE' &&
                    'QC Inspection passed. Automated refund pipeline is triggering.'}
                  {selectedActiveReturn.status === 'REFUND_INITIATED' &&
                    'Refund initiated with payment gateway. Bank processing takes 5–7 business days.'}
                </span>
              </div>
              <div className="mt-2 sm:mt-0 flex gap-2">
                {selectedActiveReturn.status === 'INITIATED' && (
                  <Button size="sm" onClick={() => navigate('/customer/return-history')}>
                    Schedule Pickup →
                  </Button>
                )}
                {selectedActiveReturn.status === 'PICKUP_SCHEDULED' && (
                  <Button size="sm" variant="outline" onClick={() => navigate('/customer/return-history')}>
                    Reschedule Pickup
                  </Button>
                )}
                <Link to="/customer/support-chat">
                  <Button size="sm" variant="outline">
                    Ask Support
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Refund Status Card & Return Policy Quick Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Refund Status Card */}
        <div className="bg-white border border-border rounded-xl shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="font-bold text-base text-text flex items-center gap-2">
                <CreditCardIcon className="w-4 h-4 text-success" /> Refund Status Card
              </h3>
              <span className="text-xs text-text-muted">Settlement SLA Engine</span>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-gradient-to-br from-success-50 to-emerald-50/30 rounded-lg border border-success-200">
                <span className="text-xs text-success-800 font-semibold uppercase tracking-wider block">
                  Total Processed & Credited
                </span>
                <span className="text-2xl font-bold text-success-900 mt-1 block">
                  ₹{totalRefunded.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-success-700 mt-0.5 block">
                  {creditedRefunds.length} refund(s) successfully credited to accounts
                </span>
              </div>

              <div className="p-3.5 bg-primary-50 rounded-lg border border-primary-200">
                <span className="text-xs text-primary-800 font-semibold uppercase tracking-wider block">
                  In-Flight / Processing Refunds
                </span>
                <span className="text-2xl font-bold text-primary-900 mt-1 block">
                  ₹{pendingRefundAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-primary-700 mt-0.5 block">
                  Target SLA: 5–7 days original, 24h store credit (+5% bonus)
                </span>
              </div>

              <div className="border border-border rounded-lg p-3 text-xs space-y-2">
                <p className="font-semibold text-text">Refund Method SLA Timelines:</p>
                <div className="flex justify-between text-text-secondary">
                  <span>Store Credit (Wallet)</span>
                  <strong className="text-success font-medium">Within 24 Hours (+5% Bonus)</strong>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Card / UPI / Netbanking</span>
                  <strong className="text-text font-medium">5–7 Business Days</strong>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Cash on Delivery (NEFT)</span>
                  <strong className="text-text font-medium">7 Business Days</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border mt-4">
            <Link to="/customer/refund-status" className="w-full block">
              <Button variant="outline" className="w-full text-xs">
                View Detailed Refund Tracker →
              </Button>
            </Link>
          </div>
        </div>

        {/* Return Policy Quick Reference */}
        <div className="lg:col-span-2 bg-white border border-border rounded-xl shadow-xs p-6">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
            <h3 className="font-bold text-base text-text flex items-center gap-2">
              <BoxIcon className="w-4 h-4 text-primary" /> Return Policy Quick Reference
            </h3>
            <span className="text-xs text-text-muted">Eligibility Policy Rules</span>
          </div>

          <p className="text-xs text-text-secondary mb-4">
            Return eligibility and shipping terms configured by category and platform rules:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {policies.map((p) => {
              const isNonReturnable = p.returnWindowDays === 0;
              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-lg border transition-shadow hover:shadow-xs ${
                    isNonReturnable ? 'border-danger-200 bg-danger-50/30' : 'border-border bg-gray-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-text">{p.name}</h4>
                      <span className="text-[11px] text-text-muted uppercase tracking-wider">{p.entityType} Policy</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        isNonReturnable
                          ? 'bg-danger-100 text-danger-800'
                          : 'bg-primary-100 text-primary-800'
                      }`}
                    >
                      {isNonReturnable ? 'Non-Returnable' : `${p.returnWindowDays} Days Window`}
                    </span>
                  </div>

                  <ul className="mt-3 space-y-1.5 text-xs text-text-secondary">
                    <li className="flex items-center gap-1.5">
                      <span className={p.freeReturn ? 'text-success' : 'text-text-muted'}>
                        {p.freeReturn ? '✓ Free return shipping' : '• Standard return shipping'}
                      </span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className={p.exchangeEligible ? 'text-primary' : 'text-danger'}>
                        {p.exchangeEligible ? '✓ Exchange eligible (size/color)' : '✗ Exchange not permitted'}
                      </span>
                    </li>
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertIcon className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong>Support Exception Policy:</strong> Customer Support can grant a return window extension of up to <strong>+7 additional days</strong> for eligible verified logistics or travel delays.
            </div>
          </div>
        </div>
      </div>

      {/* Return History Quick Grid */}
      <div className="bg-white border border-border rounded-xl shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h3 className="font-bold text-base text-text">Recent Return Requests</h3>
            <p className="text-xs text-text-muted">Review return history, schedule pickups, or submit customer feedback.</p>
          </div>
          <Link to="/customer/return-history">
            <Button size="sm" variant="outline">
              View Full History ({returns.length}) →
            </Button>
          </Link>
        </div>

        {returns.length === 0 ? (
          <p className="text-xs text-text-muted py-6 text-center">No returns initiated yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-text-secondary uppercase">
                  <th className="py-2.5 px-3">Return ID</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Refund Method</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {returns.slice(0, 5).map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-primary">
                      {String(r.id).slice(0, 8)}
                    </td>
                    <td className="py-2.5 px-3">{humanize(r.returnType)}</td>
                    <td className="py-2.5 px-3">{humanize(r.reasonCode)}</td>
                    <td className="py-2.5 px-3 text-text-muted">
                      {r.initiatedAt ? new Date(r.initiatedAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge value={r.status} />
                    </td>
                    <td className="py-2.5 px-3">{humanize(r.preferredRefundMethod)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <Link to="/customer/return-history" className="text-primary hover:underline font-semibold">
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
