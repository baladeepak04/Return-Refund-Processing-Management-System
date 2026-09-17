import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext.jsx';
import { ROLE_LABEL, humanize } from '../../lib/enums.js';
import { listCommunications } from '../../lib/api.js';
import { useEventStream } from '../../lib/useEventStream.js';
import { useToast } from '../../lib/ToastContext.jsx';
import OmniSearchModal from '../modals/OmniSearchModal.jsx';

// Each portal has one natural "search landing" page with a real DataTable
// search box; quick search here gets you there with the query prefilled via
// ?q=, rather than pretending to search across the whole app at once.
const PORTAL_SEARCH_TARGET = {
  '/support': '/support/return-lookup',
  '/qc': '/qc/inspection-history',
  '/finance': '/finance/refund-queue',
  '/supplier': '/supplier/supplier-returns',
  '/admin': '/admin/fraud-queue',
  '/customer': '/customer/return-history',
};

const DEMO_PORTALS = [
  { role: 'customer', title: 'Customer Portal', name: 'Priya Sharma', email: 'priya@example.com', path: '/customer', emoji: '👤' },
  { role: 'customer_support', title: 'Support Console', name: 'Rahul Verma', email: 'rahul.support@returnflow.io', path: '/support', emoji: '🎧' },
  { role: 'warehouse_qc', title: 'Warehouse QC', name: 'Deepak Nair', email: 'deepak.qc@returnflow.io', path: '/qc', emoji: '🔍' },
  { role: 'finance', title: 'Finance Portal', name: 'Kavita Iyer', email: 'kavita.finance@returnflow.io', path: '/finance', emoji: '💳' },
  { role: 'supplier_manager', title: 'Supplier Portal', name: 'Sunita Reddy', email: 'sunita.supplier@returnflow.io', path: '/supplier', emoji: '📦' },
  { role: 'admin', title: 'Super Admin', name: 'Arjun Mehta', email: 'admin@returnflow.io', path: '/admin', emoji: '🛡️' },
];

function getNotificationDetails(n) {
  const ret = n.returnRequest;
  const retId = ret?.id ? String(ret.id).slice(0, 8) : null;
  const prodName = ret?.items?.[0]?.productName || 'Ordered Merchandise';
  const customer = ret?.customerName || (ret?.customerId ? `Customer ${String(ret.customerId).slice(0, 8)}` : 'Customer');
  const amount = ret?.refundAmount != null ? ret.refundAmount : (ret?.amount != null ? ret.amount : ret?.items?.[0]?.price);
  const type = (n.eventType || '').toUpperCase();

  let title = humanize(n.eventType || 'STATUS_UPDATE');
  let desc = n.message || n.template;

  if (!desc) {
    if (type.includes('INITIATE')) {
      title = 'Return Initiated';
      desc = `Return registered for ${prodName}. Awaiting doorstep pickup scheduling.`;
    } else if (type.includes('PICKUP_SCHE')) {
      title = 'Pickup Scheduled';
      desc = `Doorstep pickup slot confirmed for ${prodName}. Security OTP generated.`;
    } else if (type.includes('PICKED_UP') || type.includes('PICKUP_CONF')) {
      title = 'Package Collected';
      desc = `Field logistics agent picked up ${prodName}. En route to sorting hub.`;
    } else if (type.includes('TRANSIT')) {
      title = 'In Transit';
      desc = `Package en route to central Peenya QC warehouse facility.`;
    } else if (type.includes('RECEIVED') || type.includes('WAREHOUSE')) {
      title = 'Warehouse Inwarded';
      desc = `Package inwarded at Peenya Dock 4. Queued for technical inspection.`;
    } else if (type.includes('QC')) {
      title = 'QC Graded';
      desc = `Technical grading completed for ${prodName}. Restock routing confirmed.`;
    } else if (type.includes('REFUND_INIT')) {
      title = 'Refund Queued';
      desc = amount ? `Refund of ₹${Number(amount).toLocaleString('en-IN')} queued for gateway settlement.` : `Refund authorized by finance manager.`;
    } else if (type.includes('REFUND_CREDIT') || type.includes('REFUNDED')) {
      title = 'Refund Settled';
      desc = amount ? `₹${Number(amount).toLocaleString('en-IN')} credited to customer source account.` : `Disbursement credited successfully.`;
    } else if (type.includes('RECEIPT')) {
      title = 'Refund Advice Sent';
      desc = `Digital refund advice and credit confirmation dispatched.`;
    } else if (type.includes('FEEDBACK')) {
      title = 'Experience Rated';
      desc = `Customer submitted satisfaction rating for completed return case.`;
    } else {
      desc = `Milestone status updated to ${humanize(type)} for return #${retId || 'case'}.`;
    }
  }

  let channelBadge = 'bg-purple-50 text-purple-700 border-purple-200';
  if (n.channel === 'WHATSAPP') {
    channelBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (n.channel === 'EMAIL') {
    channelBadge = 'bg-blue-50 text-blue-700 border-blue-200';
  }

  let icon = '📦';
  if (type.includes('QC') || type.includes('INSPECT')) icon = '🔍';
  else if (type.includes('REFUND') || type.includes('CREDIT')) icon = '💳';
  else if (type.includes('PICKUP') || type.includes('TRANSIT')) icon = '🚚';
  else if (type.includes('FRAUD') || type.includes('ALERT')) icon = '⚠️';

  return { title, desc, retId, prodName, customer, icon, channelBadge };
}

export default function Topbar({ pageTitle, notificationCount = 0 }) {
  const { user, signOut, loginAsDemo } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchValue, setSearchValue] = useState('');
  const [showOmniSearch, setShowOmniSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [notificationsList, setNotificationsList] = useState([]);
  const [notifCategory, setNotifCategory] = useState('ALL');
  const notifRef = useRef(null);
  const settingsRef = useRef(null);
  const roleMenuRef = useRef(null);

  const loadNotifications = useCallback(() => {
    if (!user) return;
    const isCustomer = user.role === 'customer';
    listCommunications(isCustomer ? { customerId: user.id } : {})
      .then((res) => {
        setNotificationsList(Array.isArray(res.data) ? res.data.slice(0, 15) : []);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications, showNotifications]);

  // Hook into real-time SSE stream from Spring Boot backend
  useEventStream((type, payload) => {
    loadNotifications();
  });

  // Global Cmd+K / Ctrl+K keyboard shortcut for OmniSearch
  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowOmniSearch((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setShowNotifications(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target))
        setShowSettings(false);
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target))
        setShowRoleMenu(false);
    }
    function onEscape(e) {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowSettings(false);
        setShowRoleMenu(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  function handleSignOut() {
    signOut();
    navigate('/login');
  }

  async function handleSwitchPortal(portal) {
    try {
      if (loginAsDemo) {
        await loginAsDemo(portal.email);
      }
      setShowRoleMenu(false);
      navigate(portal.path);
    } catch (err) {
      console.error('Failed to switch portal:', err);
      navigate(portal.path);
    }
  }

  function handleSearchKeyDown(e) {
    if (e.key !== 'Enter' || !searchValue.trim()) return;
    const portalPrefix = '/' + location.pathname.split('/')[1];
    const target = PORTAL_SEARCH_TARGET[portalPrefix] || portalPrefix;
    navigate(`${target}?q=${encodeURIComponent(searchValue.trim())}`);
  }

  const initial = user?.name ? user.name.charAt(0) : '?';

  return (
    <header className="h-16 border-b border-border/80 bg-white/85 backdrop-blur-md flex items-center px-6 gap-4 sticky top-0 z-10 shadow-xs transition-all">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={() => {
            const portalBase = '/' + location.pathname.split('/')[1];
            if (location.pathname !== portalBase && location.pathname !== `${portalBase}/`) {
              navigate(portalBase, { replace: true });
              return;
            }
            if (portalBase !== '/admin') {
              navigate('/admin');
            } else {
              navigate('/home');
            }
          }}
          className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all shrink-0 shadow-2xs"
          title="Navigate back"
        >
          <svg
            className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="hidden sm:inline">Back</span>
        </button>
        <h1 className="font-heading font-bold text-text text-base tracking-tight truncate">
          {pageTitle}
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-3 sm:gap-4">
        {/* 1-Click Role / Portal Switcher */}
        <div className="relative" ref={roleMenuRef}>
          <button
            type="button"
            onClick={() => {
              setShowRoleMenu((s) => !s);
              setShowNotifications(false);
              setShowSettings(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-50 hover:bg-primary-100 text-primary border border-primary-200/80 transition-all shadow-2xs"
            title="Switch between operational role portals"
          >
            <span>⚡ Switch Portal</span>
            <svg className="w-3 h-3 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-border rounded-xl shadow-xl py-2 text-xs z-30 animate-in fade-in zoom-in-95">
              <div className="px-3.5 py-1.5 border-b border-border/70 mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Role & Portal
                </p>
              </div>
              <div className="space-y-0.5 px-1.5">
                {DEMO_PORTALS.map((p) => {
                  const isActive = user?.role === p.role;
                  return (
                    <button
                      key={p.role}
                      type="button"
                      onClick={() => handleSwitchPortal(p)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{p.emoji}</span>
                        <div>
                          <p className="font-semibold leading-tight">{p.title}</p>
                          <p className="text-[10px] text-text-muted">{p.name}</p>
                        </div>
                      </div>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {/* Quick Search & Spotlight Command Palette Trigger */}
        <div className="relative hidden md:block">
          <button
            type="button"
            onClick={() => setShowOmniSearch(true)}
            className="flex items-center justify-between border border-border/90 rounded-lg pl-8 pr-2.5 py-1.5 text-xs w-64 bg-slate-50/80 hover:bg-white hover:border-primary/50 text-slate-500 hover:text-slate-800 transition-all shadow-xs text-left group"
            title="Open Universal Omni-Search (Cmd+K / Ctrl+K)"
          >
            <svg
              className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="truncate">Search returns, users...</span>
            <kbd className="text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs group-hover:border-slate-300">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Notifications & Live Alert Stream */}
        <div className="relative" ref={notifRef}>
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text hover:bg-slate-100 transition-colors relative"
            aria-label="Notifications"
            aria-haspopup="true"
            aria-expanded={showNotifications}
            onClick={() => {
              setShowNotifications((s) => !s);
              setShowSettings(false);
            }}
          >
            <BellIcon />
            {notificationsList.length > 0 && (
              <span className="absolute 1.5 top-1.5 right-1.5 bg-danger text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                {notificationsList.length > 9 ? '9+' : notificationsList.length}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[410px] max-w-[94vw] bg-white border border-border/90 rounded-2xl shadow-2xl p-4 text-xs z-30 animate-in fade-in zoom-in-95">
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-border/70 mb-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-text text-sm">
                    Notifications
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {notificationsList.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    addToast('Live milestone: Return parcel handed over to Shiprocket courier agent.', 'milestone', 'Live Milestone');
                  }}
                  className="text-[11px] font-semibold text-primary hover:text-primary-dark bg-primary-50 hover:bg-primary-100 border border-primary-200/80 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1"
                  title="Dispatch simulated test event"
                >
                  <span>⚡</span>
                  <span>Test Alert</span>
                </button>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex gap-1 mb-2.5 bg-slate-100 p-1 rounded-lg">
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'QC', label: 'QC' },
                  { id: 'REFUND', label: 'Refunds' },
                  { id: 'LOGISTICS', label: 'Logistics' },
                  { id: 'ALERT', label: 'Alerts' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setNotifCategory(tab.id)}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${
                      notifCategory === tab.id
                        ? 'bg-white text-primary shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Notifications Stream */}
              {notificationsList.length === 0 ? (
                <p className="text-text-secondary text-xs leading-relaxed py-6 text-center">
                  No unread notifications at this time.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto divide-y divide-border/40 pr-1">
                  {notificationsList
                    .filter((n) => {
                      if (notifCategory === 'ALL') return true;
                      const type = (n.eventType || '').toUpperCase();
                      const msg = (n.message || '').toUpperCase();
                      const text = `${type} ${msg}`;
                      if (notifCategory === 'QC') return text.includes('QC') || text.includes('INSPECT') || text.includes('WAREHOUSE');
                      if (notifCategory === 'REFUND') return text.includes('REFUND') || text.includes('CREDIT');
                      if (notifCategory === 'LOGISTICS') return text.includes('PICKUP') || text.includes('TRANSIT') || text.includes('DELIVERY') || text.includes('SHIPMENT');
                      if (notifCategory === 'ALERT') return text.includes('FRAUD') || text.includes('ALERT') || text.includes('FAIL') || n.status === 'FAILED';
                      return true;
                    })
                    .map((n, idx) => {
                      const details = getNotificationDetails(n);
                      return (
                        <div
                          key={n.id || idx}
                          onClick={() => {
                            if (details.retId) {
                              setShowNotifications(false);
                              navigate(`/support/return-lookup?q=${details.retId}`);
                            }
                          }}
                          className={`pt-2 first:pt-0 p-2 rounded-xl transition-colors hover:bg-slate-50 cursor-pointer ${
                            idx === 0 ? 'bg-primary-50/25' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="text-base shrink-0 p-1.5 rounded-lg bg-slate-100 flex items-center justify-center">
                              {details.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="font-semibold text-xs text-text truncate">
                                  {details.title}
                                </span>
                                <span className="text-[10px] text-slate-400 font-normal shrink-0">
                                  {n.sentAt ? new Date(n.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                </span>
                              </div>
                              <p className="text-[11px] text-text-secondary leading-snug">
                                {details.desc}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-[10px]">
                                <span className={`px-1.5 py-0.2 rounded font-bold border ${details.channelBadge}`}>
                                  {n.channel || 'SMS'}
                                </span>
                                {details.retId && (
                                  <span className="font-mono font-semibold text-primary bg-primary-50 px-1.5 py-0.2 rounded border border-primary-100">
                                    #{details.retId}
                                  </span>
                                )}
                                <span className="text-slate-500 font-medium truncate max-w-[150px]">
                                  {details.prodName}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Universal OmniSearch Palette */}
        <OmniSearchModal
          isOpen={showOmniSearch}
          onClose={() => setShowOmniSearch(false)}
        />

        {/* Settings Dropdown */}
        <div className="relative" ref={settingsRef}>
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text hover:bg-slate-100 transition-colors"
            aria-label="Settings"
            aria-haspopup="true"
            aria-expanded={showSettings}
            onClick={() => {
              setShowSettings((s) => !s);
              setShowNotifications(false);
            }}
          >
            <GearIcon />
          </button>
          {showSettings && (
            <div className="absolute right-0 mt-2 w-60 bg-white border border-border rounded-xl shadow-xl py-2 text-xs z-20 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2.5 border-b border-border/70 bg-slate-50/50">
                <p className="text-[11px] text-text-muted">Signed in as</p>
                <p className="font-semibold text-text truncate mt-0.5">
                  {user?.name}
                </p>
                <p className="text-[10px] text-primary font-bold uppercase tracking-wider mt-0.5">
                  {ROLE_LABEL[user?.role] || user?.role}
                </p>
              </div>
              <div className="py-1">
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-danger hover:bg-rose-50 font-medium transition-colors flex items-center gap-2"
                >
                  <LogoutIcon />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-border/80">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-primary-dark text-white flex items-center justify-center text-xs font-heading font-bold shadow-xs shadow-primary/20">
            {initial}
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="text-xs font-semibold text-text">{user?.name}</p>
            <p className="text-[10px] font-medium text-text-muted">
              {ROLE_LABEL[user?.role] || user?.role}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
