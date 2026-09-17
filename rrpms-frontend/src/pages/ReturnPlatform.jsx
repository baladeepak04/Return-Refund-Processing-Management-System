import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext.jsx';
import { ROLE_LABEL } from '../lib/enums.js';

// Sub-components from portals
import InitiateReturn from '../portals/customer/InitiateReturn.jsx';
import ReturnHistory from '../portals/customer/ReturnHistory.jsx';
import RefundStatus from '../portals/customer/RefundStatus.jsx';

import ReturnLookup from '../portals/support/ReturnLookup.jsx';
import CustomerSearch from '../portals/support/CustomerSearch.jsx';
import InitiateOnBehalf from '../portals/support/InitiateOnBehalf.jsx';

import InspectionQueue from '../portals/qc/InspectionQueue.jsx';
import InspectionHistory from '../portals/qc/InspectionHistory.jsx';

import RefundQueue from '../portals/finance/RefundQueue.jsx';
import LiabilityDashboard from '../portals/finance/LiabilityDashboard.jsx';

import ReturnPolicies from '../portals/admin/ReturnPolicies.jsx';
import FraudQueue from '../portals/admin/FraudQueue.jsx';
import Analytics from '../portals/admin/Analytics.jsx';
import RtmBatches from '../portals/supplier/RtmBatches.jsx';

import { BoxIcon, RefreshIcon, CreditCardIcon, AlertIcon, CheckIcon } from '../components/ui/icons.jsx';
import LifecycleSimulator from '../components/demo/LifecycleSimulator.jsx';


export default function ReturnPlatform() {
  const { user } = useAuth();

  // Role perspectives
  const TABS = [
    { id: 'customer', label: 'Customer Operations', desc: 'Return initiation wizard, status timeline, refund tracker' },
    { id: 'support', label: 'Support Console', desc: 'Customer return lookup, return override form, manual refund trigger' },
    { id: 'qc', label: 'Warehouse QC Staff', desc: 'Receipt scanner, inspection form with image upload, disposition decision' },
    { id: 'finance', label: 'Finance Management', desc: 'Refund queue, COD refund processing, liability dashboard' },
    { id: 'admin', label: 'Admin & Operations', desc: 'Policy config, fraud queue, analytics, RTM management' },
  ];

  // Map user's current role to default tab
  const getInitialTab = () => {
    if (!user) return 'customer';
    if (user.role === 'customer_support') return 'support';
    if (user.role === 'warehouse_qc') return 'qc';
    if (user.role === 'finance') return 'finance';
    if (user.role === 'admin' || user.role === 'supplier_manager') return 'admin';
    return 'customer';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Sub-tabs within each domain
  const [customerSubTab, setCustomerSubTab] = useState('wizard');
  const [supportSubTab, setSupportSubTab] = useState('lookup');
  const [qcSubTab, setQcSubTab] = useState('queue');
  const [financeSubTab, setFinanceSubTab] = useState('queue');
  const [adminSubTab, setAdminSubTab] = useState('policies');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-100 text-primary-800 uppercase tracking-wider">
              Operations Control Plane
            </span>
            <span className="text-xs text-text-muted">Unified Operations Workspace</span>
          </div>
          <h1 className="text-2xl font-bold text-text mt-1">ReturnPlatform Console</h1>
          <p className="text-xs text-text-secondary mt-0.5 max-w-2xl">
            Integrated multi-role control plane unifying enterprise reverse logistics: Customer self-service, Support investigations & overrides, Warehouse QC grading, Finance settlement liabilities, and Platform fraud analytics.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 border border-border rounded-lg p-2.5 text-xs">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="font-semibold text-text">{user?.name}</p>
            <p className="text-text-muted text-[11px]">Logged in as: <strong className="text-primary">{ROLE_LABEL[user?.role]}</strong></p>
          </div>
        </div>
      </div>
 
      {/* Automated Reverse Logistics Pipeline Orchestrator */}
      <LifecycleSimulator />

      {/* Main Role Tabs */}
      <div className="flex border-b border-border space-x-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-4 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex flex-col items-start ${
              activeTab === tab.id
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-text-secondary hover:text-text hover:border-gray-300'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] font-normal text-text-muted hidden sm:inline">{tab.desc.split(',')[0]}</span>
          </button>
        ))}
      </div>

      {/* Domain Sub-Views */}
      <div className="space-y-6">
        {/* CUSTOMER TAB */}
        {activeTab === 'customer' && (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-gray-200 pb-2">
              <button
                onClick={() => setCustomerSubTab('wizard')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  customerSubTab === 'wizard' ? 'bg-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                }`}
              >
                1. Return Initiation Wizard
              </button>
              <button
                onClick={() => setCustomerSubTab('history')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  customerSubTab === 'history' ? 'bg-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                }`}
              >
                2. Status Timeline & History
              </button>
              <button
                onClick={() => setCustomerSubTab('refunds')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  customerSubTab === 'refunds' ? 'bg-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                }`}
              >
                3. Refund Tracker
              </button>
            </div>

            {customerSubTab === 'wizard' && <InitiateReturn />}
            {customerSubTab === 'history' && <ReturnHistory />}
            {customerSubTab === 'refunds' && <RefundStatus />}
          </div>
        )}

        {/* SUPPORT TAB */}
        {activeTab === 'support' && (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-gray-200 pb-2">
              <button
                onClick={() => setSupportSubTab('lookup')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  supportSubTab === 'lookup' ? 'bg-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                }`}
              >
                Customer Return Lookup & Overrides
              </button>
              <button
                onClick={() => setSupportSubTab('search')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  supportSubTab === 'search' ? 'bg-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                }`}
              >
                Search Customer
              </button>
              <button
                onClick={() => setSupportSubTab('onbehalf')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  supportSubTab === 'onbehalf' ? 'bg-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                }`}
              >
                Initiate On Behalf
              </button>
            </div>

            {supportSubTab === 'lookup' && <ReturnLookup />}
            {supportSubTab === 'search' && <CustomerSearch />}
            {supportSubTab === 'onbehalf' && <InitiateOnBehalf />}
          </div>
        )}

        {/* QC TAB */}
        {activeTab === 'qc' && (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-gray-200 pb-2">
              <button
                onClick={() => setQcSubTab('queue')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  qcSubTab === 'queue' ? 'bg-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                }`}
              >
                Receipt Scanner & Inspection Queue
              </button>
              <button
                onClick={() => setQcSubTab('history')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  qcSubTab === 'history' ? 'bg-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                }`}
              >
                Completed Inspection History
              </button>
            </div>

            {qcSubTab === 'queue' && <InspectionQueue />}
            {qcSubTab === 'history' && <InspectionHistory />}
          </div>
        )}

        {/* FINANCE TAB */}
        {activeTab === 'finance' && (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-gray-200 pb-2">
              <button
                onClick={() => setFinanceSubTab('queue')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  financeSubTab === 'queue' ? 'bg-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                }`}
              >
                Refund Processing Queue & Approvals
              </button>
              <button
                onClick={() => setFinanceSubTab('liability')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  financeSubTab === 'liability' ? 'bg-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                }`}
              >
                Outstanding Liability Dashboard
              </button>
            </div>

            {financeSubTab === 'queue' && <RefundQueue />}
            {financeSubTab === 'liability' && <LiabilityDashboard />}
          </div>
        )}

        {/* ADMIN TAB */}
        {activeTab === 'admin' && (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-gray-200 pb-2">
              <button
                onClick={() => setAdminSubTab('policies')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  adminSubTab === 'policies' ? 'bg-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                }`}
              >
                Policy Rules Engine
              </button>
              <button
                onClick={() => setAdminSubTab('fraud')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  adminSubTab === 'fraud' ? 'bg-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                }`}
              >
                Fraud & Risk Queue
              </button>
              <button
                onClick={() => setAdminSubTab('analytics')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  adminSubTab === 'analytics' ? 'bg-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                }`}
              >
                Settlement Analytics
              </button>
              <button
                onClick={() => setAdminSubTab('rtm')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  adminSubTab === 'rtm' ? 'bg-primary text-white' : 'bg-gray-100 text-text hover:bg-gray-200'
                }`}
              >
                Supplier RTM Batches
              </button>
            </div>

            {adminSubTab === 'policies' && <ReturnPolicies />}
            {adminSubTab === 'fraud' && <FraudQueue />}
            {adminSubTab === 'analytics' && <Analytics />}
            {adminSubTab === 'rtm' && <RtmBatches />}
          </div>
        )}
      </div>
    </div>
  );
}
