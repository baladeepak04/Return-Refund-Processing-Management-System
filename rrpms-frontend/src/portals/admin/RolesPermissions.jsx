import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext.jsx';
import { listUsers } from '../../lib/api.js';
import Button from '../../components/ui/Button.jsx';
import { CheckIcon, CloseIcon, UsersIcon, ShieldIcon, AlertIcon } from '../../components/ui/icons.jsx';
import { ROLE_LABEL, ROLE_PORTAL_PATH } from '../../lib/enums.js';
import { useNavigate } from 'react-router-dom';

const MATRIX_ROWS = [
  { feature: 'Return Policy Configuration', admin: 'FULL', support: 'NONE', qc: 'NONE', finance: 'NONE', supplier: 'NONE', customer: 'NONE', adminDesc: 'Full Access (CRUD)' },
  { feature: 'Return & Exchange Initiation', admin: 'FULL', support: 'SCOPED', qc: 'NONE', finance: 'NONE', supplier: 'NONE', customer: 'SCOPED', supportDesc: 'On Behalf of Customer', customerDesc: 'Self-Service' },
  { feature: 'Return Window Overrides', admin: 'FULL', support: 'SCOPED', qc: 'NONE', finance: 'NONE', supplier: 'NONE', customer: 'NONE', adminDesc: 'Unlimited Override', supportDesc: 'Up to +7 Days' },
  { feature: 'QC Inspection & Grading', admin: 'FULL', support: 'VIEW', qc: 'FULL', finance: 'VIEW', supplier: 'NONE', customer: 'VIEW', qcDesc: 'Inspect, Photo Upload & Grade' },
  { feature: 'Refund Approvals (> ₹5,000)', admin: 'FULL', support: 'NONE', qc: 'NONE', finance: 'FULL', supplier: 'NONE', customer: 'NONE', financeDesc: 'High-Value Dual Auth' },
  { feature: 'Fraud Queue & Blacklisting', admin: 'FULL', support: 'SCOPED', qc: 'SCOPED', finance: 'NONE', supplier: 'NONE', customer: 'NONE', adminDesc: 'Full Blacklist & Clear', supportDesc: 'Flag Only', qcDesc: 'Flag Mismatch' },
  { feature: 'Restock & Relisting Decisions', admin: 'FULL', support: 'NONE', qc: 'FULL', finance: 'NONE', supplier: 'NONE', customer: 'NONE', qcDesc: 'Restock / Relabel / Dispose' },
  { feature: 'Supplier RTM Consolidation', admin: 'FULL', support: 'NONE', qc: 'SCOPED', finance: 'NONE', supplier: 'FULL', customer: 'NONE', supplierDesc: 'Batch, Dispatch & Settle' },
  { feature: 'Operational Analytics & P&L', admin: 'FULL', support: 'VIEW', qc: 'VIEW', finance: 'FULL', supplier: 'VIEW', customer: 'NONE', adminDesc: 'Full Telemetry & P&L' },
];

const ROLE_DETAILS = {
  admin: {
    title: 'Platform Administrator',
    responsibilities: 'Configures return policies, refund rules, logistics partners, reviews platform-wide return analytics, and resolves fraud disputes.',
    endpoints: ['/api/v1/policies/**', '/api/v1/admin/users/**', '/api/v1/analytics/**', '/api/v1/fraud/**'],
  },
  customer_support: {
    title: 'Customer Support Specialist',
    responsibilities: 'Assists customers with return requests, initiates returns on behalf of customers, overrides return windows up to +7 days, handles exceptions.',
    endpoints: ['/api/v1/returns/overrides', '/api/v1/returns/{id}/override', '/api/v1/returns (on behalf)', '/api/v1/communications'],
  },
  warehouse_qc: {
    title: 'Warehouse QC Inspector',
    responsibilities: 'Scans arrival barcodes, inspects physical/functional condition, uploads photographic evidence, decides disposition (Restock, Liquidate, RTM, Dispose).',
    endpoints: ['/api/v1/qc', '/api/v1/qc/{id}', '/api/v1/returns/{id}/pickup/delivered', '/api/v1/restock/**'],
  },
  finance: {
    title: 'Finance Manager',
    responsibilities: 'Monitors total return liability, approves high-value refunds (> ₹5,000), manages COD bank transfers, and reconciles supplier credit notes.',
    endpoints: ['/api/v1/refunds', '/api/v1/refunds/{id}/approve', '/api/v1/refunds/{id}/reject', '/api/v1/analytics/refund-tat'],
  },
  supplier_manager: {
    title: 'Supplier Operations Manager',
    responsibilities: 'Initiates supplier returns for factory-defective items, manages RTM batches and logistics, and reconciles supplier credit notes.',
    endpoints: ['/api/v1/rtm', '/api/v1/rtm/**', '/api/v1/supplier-returns', '/api/v1/analytics/supplier-rtm'],
  },
  customer: {
    title: 'Customer',
    responsibilities: 'Initiates self-service return/exchange, schedules doorstep pickup with OTP, tracks reverse shipment AWB, and receives refund or replacement.',
    endpoints: ['/api/v1/orders', '/api/v1/returns', '/api/v1/returns/{id}/pickup', '/api/v1/refunds (own)'],
  },
};

const SIMULATOR_ACTIONS = [
  { id: 'policy_create', label: 'Create / Edit Return Policy', allowedRoles: ['admin'], rule: 'Strictly restricted to Platform Administrator to prevent unauthorized policy mutations.' },
  { id: 'refund_high_value', label: 'Authorize Refund > ₹5,000', allowedRoles: ['admin', 'finance'], rule: 'Dual-control finance authorization enforced by statutory financial compliance.' },
  { id: 'override_window', label: 'Override Expired Return Window (+7 Days)', allowedRoles: ['admin', 'customer_support'], rule: 'Customer support permitted up to +7 days exception override with mandatory justification.' },
  { id: 'qc_inspection', label: 'Complete Physical QC Grading', allowedRoles: ['admin', 'warehouse_qc'], rule: 'Warehouse QC certification gate required before any refund clearance.' },
  { id: 'rtm_settle', label: 'Consolidate & Settle RTM Batches', allowedRoles: ['admin', 'supplier_manager'], rule: 'Vendor operations clearance required to reconcile vendor credit notes.' },
  { id: 'blacklist_user', label: 'Blacklist Fraudulent Account', allowedRoles: ['admin'], rule: 'Administrative security privilege with instant token invalidation.' },
];

export default function RolesPermissions() {
  const { user, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('admin');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Simulator state
  const [simRole, setSimRole] = useState('customer_support');
  const [simAction, setSimAction] = useState('override_window');
  const [simResult, setSimResult] = useState(null);

  useEffect(() => {
    listUsers()
      .then((res) => {
        setUsers(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => console.error('RolesPermissions listUsers error:', err))
      .finally(() => setLoadingUsers(false));
  }, []);

  const handleTestPermission = () => {
    const actionObj = SIMULATOR_ACTIONS.find((a) => a.id === simAction);
    if (!actionObj) return;
    const isAllowed = actionObj.allowedRoles.includes(simRole);
    setSimResult({
      allowed: isAllowed,
      action: actionObj.label,
      roleName: ROLE_LABEL[simRole],
      rule: actionObj.rule,
    });
  };

  const renderBadge = (type, customDesc) => {
    if (type === 'FULL') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckIcon className="w-3 h-3" />
          {customDesc || 'Full Access'}
        </span>
      );
    }
    if (type === 'SCOPED') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          ● {customDesc || 'Scoped'}
        </span>
      );
    }
    if (type === 'VIEW') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          👁️ {customDesc || 'View Only'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[11px] text-text-muted px-2 py-0.5 rounded-md bg-surface-raised border border-border">
        — No Access
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
              Security & Compliance
            </span>
            <span className="text-xs text-text-muted">RBAC Architecture</span>
          </div>
          <h2 className="text-xl font-bold text-text mt-1">Role-Based Permission Matrix</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Strict 6-role permission enforcement across Customer, Support, QC Staff, Finance Manager, Supplier Manager, and Admin.
          </p>
        </div>
      </div>

      {/* Role Selector Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(ROLE_DETAILS).map(([roleKey, details]) => {
          const userCount = users.filter((u) => u.role.toLowerCase() === roleKey).length;
          return (
            <button
              key={roleKey}
              type="button"
              onClick={() => setSelectedRole(roleKey)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                selectedRole === roleKey
                  ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                  : 'border-border bg-surface hover:bg-surface-raised'
              }`}
            >
              <span className="block text-xs font-bold text-text">{ROLE_LABEL[roleKey]}</span>
              <span className="block text-[11px] text-text-muted mt-0.5 truncate">{details.title}</span>
              <span className="inline-block mt-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-raised border border-border text-text-secondary">
                {userCount} {userCount === 1 ? 'user' : 'users'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Role Inspector Details */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
          <div>
            <h3 className="text-base font-bold text-text flex items-center gap-2">
              Role Profile: {ROLE_LABEL[selectedRole]} ({ROLE_DETAILS[selectedRole].title})
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-3xl leading-relaxed">
              {ROLE_DETAILS[selectedRole].responsibilities}
            </p>
          </div>

          <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-md text-xs font-semibold self-start sm:self-auto">
            Portal: {ROLE_PORTAL_PATH[selectedRole]}
          </span>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase text-text-muted mb-2">Permitted API Endpoint Seams:</h4>
          <div className="flex flex-wrap gap-2">
            {ROLE_DETAILS[selectedRole].endpoints.map((ep) => (
              <span key={ep} className="font-mono text-xs bg-surface-raised border border-border px-2.5 py-1 rounded text-text">
                {ep}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Enterprise RBAC Permission Matrix Table */}
      <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text">Enterprise Feature Access Matrix (RBAC)</h3>
            <p className="text-xs text-text-muted mt-0.5">Authorization entitlements and operational access levels by role.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-surface-raised border-b border-border text-text-secondary uppercase">
                <th className="py-3.5 px-4 font-semibold">System Feature</th>
                <th className="py-3.5 px-4 font-semibold">Admin</th>
                <th className="py-3.5 px-4 font-semibold">Customer Support</th>
                <th className="py-3.5 px-4 font-semibold">QC Staff</th>
                <th className="py-3.5 px-4 font-semibold">Finance</th>
                <th className="py-3.5 px-4 font-semibold">Supplier Manager</th>
                <th className="py-3.5 px-4 font-semibold">Customer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MATRIX_ROWS.map((row, idx) => (
                <tr key={idx} className="hover:bg-surface-raised/50 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-text">{row.feature}</td>
                  <td className="py-3.5 px-4">{renderBadge(row.admin, row.adminDesc)}</td>
                  <td className="py-3.5 px-4">{renderBadge(row.support, row.supportDesc)}</td>
                  <td className="py-3.5 px-4">{renderBadge(row.qc, row.qcDesc)}</td>
                  <td className="py-3.5 px-4">{renderBadge(row.finance, row.financeDesc)}</td>
                  <td className="py-3.5 px-4">{renderBadge(row.supplier, row.supplierDesc)}</td>
                  <td className="py-3.5 px-4">{renderBadge(row.customer, row.customerDesc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive RBAC Permission Sandbox & Tester */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
            ⚡
          </div>
          <div>
            <h3 className="font-bold text-text text-base">RBAC Policy Simulator & Sandbox</h3>
            <p className="text-xs text-text-muted">Simulate and evaluate role access against specific system operations in real time.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-text block mb-1.5">Select Role Persona:</label>
            <select
              value={simRole}
              onChange={(e) => {
                setSimRole(e.target.value);
                setSimResult(null);
              }}
              className="w-full bg-surface-raised border border-border text-text text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-primary focus:outline-hidden"
            >
              {Object.entries(ROLE_DETAILS).map(([k, v]) => {
                const prefix = k === 'customer_support' ? '🎧 ' : k === 'customer' ? '👤 ' : k === 'admin' ? '👑 ' : k === 'warehouse_qc' ? '📦 ' : k === 'finance' ? '💰 ' : '🏭 ';
                const label = k === 'customer' ? 'Customer (Consumer / Self-Service)' : k === 'customer_support' ? 'Customer Support (Support Specialist with Overrides)' : `${ROLE_LABEL[k]} (${v.title})`;
                return (
                  <option key={k} value={k}>{prefix}{label}</option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-text block mb-1.5">Test System Operation:</label>
            <select
              value={simAction}
              onChange={(e) => {
                setSimAction(e.target.value);
                setSimResult(null);
              }}
              className="w-full bg-surface-raised border border-border text-text text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-primary focus:outline-hidden"
            >
              {SIMULATOR_ACTIONS.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              variant="primary"
              onClick={handleTestPermission}
              className="w-full justify-center h-10 text-xs"
            >
              Evaluate Access Rule →
            </Button>
          </div>
        </div>

        {simResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-1.5 mt-3 animate-scale-up ${
              simResult.allowed
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              <span>{simResult.allowed ? '✅ Access Granted' : '🚫 Access Denied'}</span>
              <span className="font-normal text-text-muted">· Role: <strong>{simResult.roleName}</strong></span>
            </div>
            <p className="text-text-secondary">
              Operation: <strong>{simResult.action}</strong>
            </p>
            <p className="text-text-muted pt-1 border-t border-border">
              Policy Rule: {simResult.rule}
            </p>
            {!simResult.allowed && simRole === 'customer' && simAction === 'override_window' && (
              <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-300 text-[11px]">
                💡 <strong>Try this:</strong> End customers cannot override their own return windows. Switch the <strong>Select Role Persona</strong> dropdown to <strong>🎧 Customer Support</strong> or <strong>👑 Platform Administrator</strong> and click evaluate to see <strong>✅ Access Granted</strong>!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Personas & Fast Switcher */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-text">Assigned Platform Personas</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Active user accounts across platform roles. Click "Switch Persona" to inspect that role's portal and workflow.
          </p>
        </div>

        {loadingUsers ? (
          <p className="text-xs text-text-muted">Loading assigned users...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-4 border border-border rounded-xl bg-surface-raised flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-text">{u.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                      {ROLE_LABEL[u.role.toLowerCase()]}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted font-mono mt-1">{u.email}</p>
                  <p className="text-[11px] text-text-secondary mt-0.5">Dept: {u.department || '—'}</p>
                </div>

                <Button
                  size="sm"
                  variant={user.email === u.email ? 'outline' : 'secondary'}
                  disabled={user.email === u.email}
                  onClick={async () => {
                    await loginAsDemo(u.email, 'Password123!');
                    navigate(ROLE_PORTAL_PATH[u.role.toLowerCase()] || '/home');
                  }}
                  className="w-full text-xs"
                >
                  {user.email === u.email ? 'Currently Active' : 'Switch to this Persona →'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
