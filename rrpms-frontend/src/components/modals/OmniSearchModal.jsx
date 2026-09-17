import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { listReturns, listUsers } from '../../lib/api.js';
import StatusBadge from '../ui/StatusBadge.jsx';
import { humanize } from '../../lib/enums.js';
import {
  SearchIcon,
  BoxIcon,
  CloseIcon,
  CheckIcon,
  ClockIcon,
  AlertIcon,
  ActivityIcon,
} from '../ui/icons.jsx';

const STATIC_ACTIONS = [
  { id: 'nav-qc-queue', label: 'QC Inspection Queue', category: 'Navigation', path: '/qc/inspection-queue', icon: '🔍', desc: 'Inspect received goods and grade condition' },
  { id: 'nav-qc-reports', label: 'QC Defect & Disposition Reports', category: 'Navigation', path: '/qc/reports', icon: '📊', desc: 'View pass/fail rates and disposition breakdowns' },
  { id: 'nav-fin-queue', label: 'Finance Refund Approval Queue', category: 'Navigation', path: '/finance/refund-queue', icon: '💳', desc: 'Review and approve pending customer disbursements' },
  { id: 'nav-fin-liability', label: 'Finance Liability & Reserve Dashboard', category: 'Navigation', path: '/finance/liability', icon: '📈', desc: 'Monitor return reserves and supplier recovery pipeline' },
  { id: 'nav-supp-rtm', label: 'Supplier RTM Consignment Batches', category: 'Navigation', path: '/supplier/rtm-batches', icon: '📦', desc: 'Track batch shipments dispatched to manufacturers' },
  { id: 'nav-supp-perf', label: 'Supplier Quality Intelligence Matrix', category: 'Navigation', path: '/supplier/performance', icon: '⭐', desc: 'Analyze supplier defect rates and tier classifications' },
  { id: 'nav-supp-credit', label: 'Supplier Credit Notes & Settlements', category: 'Navigation', path: '/supplier/credit-notes', icon: '📄', desc: 'View and offset manufacturer credit notes' },
  { id: 'nav-admin-fraud', label: 'Admin Return Fraud Review Queue', category: 'Navigation', path: '/admin/fraud-queue', icon: '🛡️', desc: 'Investigate serial returners and flagged accounts' },
  { id: 'nav-admin-policies', label: 'Return Policy Engine Configuration', category: 'Navigation', path: '/admin/return-policies', icon: '⚙️', desc: 'Configure return windows, fees, and category rules' },
  { id: 'nav-admin-audit', label: 'Platform Audit & Compliance Logs', category: 'Navigation', path: '/admin/audit-logs', icon: '📜', desc: 'Inspect immutable trail of all system actions' },
  { id: 'nav-support-lookup', label: 'Customer Support Return Lookup', category: 'Navigation', path: '/support/return-lookup', icon: '🎧', desc: 'Search return cases by order or return ID' },
  { id: 'nav-support-timeline', label: 'Customer Communications Timeline', category: 'Navigation', path: '/support/activity-timeline', icon: '💬', desc: 'Audit SMS, Email, and WhatsApp dispatches' },
  { id: 'nav-platform', label: 'Unified ReturnPlatform Console', category: 'Navigation', path: '/platform', icon: '⚡', desc: 'Integrated multi-role operations control plane' },
  { id: 'nav-customer-home', label: 'Customer Self-Service Hub', category: 'Navigation', path: '/customer', icon: '👤', desc: 'Initiate returns and track doorstep pickups' },
];

export default function OmniSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [returns, setReturns] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setLoading(true);
      Promise.all([
        listReturns().catch(() => ({ data: [] })),
        listUsers().catch(() => ({ data: [] })),
      ])
        .then(([retRes, userRes]) => {
          setReturns(Array.isArray(retRes.data) ? retRes.data : []);
          setUsers(Array.isArray(userRes.data) ? userRes.data : []);
        })
        .finally(() => setLoading(false));

      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [isOpen]);

  const userMap = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      if (u.id) map.set(String(u.id).toLowerCase(), u);
    });
    return map;
  }, [users]);

  // Filtered Results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default to quick navigation shortcuts and top 3 recent returns
      const topReturns = returns.slice(0, 3).map((r) => {
        const u = r.customerId ? userMap.get(String(r.customerId).toLowerCase()) : null;
        return {
          id: `ret-${r.id}`,
          type: 'return',
          title: `Return #${String(r.id).slice(0, 8)}`,
          subtitle: `${r.items?.[0]?.productName || humanize(r.reasonCode)} · ${u?.name || r.customerName || 'Customer'}`,
          status: r.status,
          amount: r.refundAmount || r.amount || r.items?.[0]?.price,
          action: () => {
            onClose();
            navigate(`/support/return-lookup?q=${String(r.id).slice(0, 8)}`);
          },
        };
      });

      const actions = STATIC_ACTIONS.slice(0, 5).map((a) => ({
        id: a.id,
        type: 'action',
        title: a.label,
        subtitle: a.desc,
        icon: a.icon,
        action: () => {
          onClose();
          navigate(a.path);
        },
      }));

      return [...topReturns, ...actions];
    }

    const matchedReturns = [];
    returns.forEach((r) => {
      const u = r.customerId ? userMap.get(String(r.customerId).toLowerCase()) : null;
      const custName = u?.name || r.customerName || '';
      const custEmail = u?.email || r.customerEmail || '';
      const prodName = r.items?.[0]?.productName || '';
      const idStr = String(r.id || '');
      const reason = humanize(r.reasonCode);

      if (
        idStr.toLowerCase().includes(q) ||
        custName.toLowerCase().includes(q) ||
        custEmail.toLowerCase().includes(q) ||
        prodName.toLowerCase().includes(q) ||
        reason.toLowerCase().includes(q)
      ) {
        matchedReturns.push({
          id: `ret-${r.id}`,
          type: 'return',
          title: `Return #${idStr.slice(0, 8)}`,
          subtitle: `${prodName || reason} · ${custName || 'Customer'}`,
          status: r.status,
          amount: r.refundAmount || r.amount || r.items?.[0]?.price,
          action: () => {
            onClose();
            navigate(`/support/return-lookup?q=${idStr.slice(0, 8)}`);
          },
        });
      }
    });

    const matchedUsers = [];
    users.forEach((u) => {
      if (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
      ) {
        matchedUsers.push({
          id: `user-${u.id}`,
          type: 'user',
          title: u.name,
          subtitle: `${u.email} · Role: ${humanize(u.role)}`,
          role: u.role,
          action: () => {
            onClose();
            navigate(`/support/customer-history?customerId=${u.id}&customerName=${encodeURIComponent(u.name)}`);
          },
        });
      }
    });

    const matchedActions = [];
    STATIC_ACTIONS.forEach((a) => {
      if (
        a.label.toLowerCase().includes(q) ||
        a.desc.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      ) {
        matchedActions.push({
          id: a.id,
          type: 'action',
          title: a.label,
          subtitle: a.desc,
          icon: a.icon,
          action: () => {
            onClose();
            navigate(a.path);
          },
        });
      }
    });

    return [
      ...matchedReturns.slice(0, 6),
      ...matchedUsers.slice(0, 4),
      ...matchedActions.slice(0, 5),
    ];
  }, [query, returns, users, userMap, navigate, onClose]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Universal Omni-Search"
      >
        {/* Search Header */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-100">
          <SearchIcon className="w-5 h-5 text-slate-400 absolute left-4" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search returns, customers, products, or fast actions... (Type to filter)"
            className="w-full pl-8 pr-16 py-1.5 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-900 placeholder:text-slate-400"
          />
          <div className="flex items-center gap-1.5 absolute right-4">
            <kbd className="px-2 py-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Close search"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results Stream */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-50">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Indexing return entities & personnel records...
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No matching records found for <span className="font-semibold text-slate-700">"{query}"</span>.
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary-50 text-primary border border-primary-200/80 shadow-2xs'
                        : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          item.type === 'return'
                            ? 'bg-blue-100 text-blue-700'
                            : item.type === 'user'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {item.type === 'return' ? (
                          <BoxIcon className="w-4 h-4" />
                        ) : item.type === 'user' ? (
                          <span className="text-xs font-bold">👤</span>
                        ) : (
                          <span className="text-xs">{item.icon || '⚡'}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-xs truncate leading-tight">
                            {item.title}
                          </p>
                          {item.type === 'return' && (
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              RETURN
                            </span>
                          )}
                          {item.type === 'user' && (
                            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded">
                              {item.role}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 ml-3">
                      {item.amount != null && (
                        <span className="text-xs font-bold text-slate-800">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </span>
                      )}
                      {item.status && <StatusBadge value={item.status} />}
                      {isSelected && (
                        <span className="text-[10px] font-bold text-primary bg-white px-2 py-0.5 rounded shadow-2xs border border-primary-200">
                          ↵ Select
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono shadow-2xs">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono shadow-2xs ml-1">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono shadow-2xs">↵</kbd> to select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono shadow-2xs">ESC</kbd> to close
            </span>
          </div>
          <span className="text-[10px] font-medium text-slate-400">
            ReturnFlow Enterprise Spotlight
          </span>
        </div>
      </div>
    </div>
  );
}
