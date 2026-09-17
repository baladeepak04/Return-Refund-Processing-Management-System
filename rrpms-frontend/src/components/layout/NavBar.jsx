import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext.jsx';
import { ROLE_LABEL, ROLE_PORTAL_PATH, humanize } from '../../lib/enums.js';
import { listReturns, listRefunds, listCommunications } from '../../lib/api.js';
import { useEventStream } from '../../lib/useEventStream.js';
import { BellIcon, RefreshIcon, CreditCardIcon, BoxIcon, CheckIcon, CloseIcon } from '../ui/icons.jsx';

export default function NavBar() {
  const { user, logout, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeReturns, setActiveReturns] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [returnsOpen, setReturnsOpen] = useState(false);

  const notifRef = useRef(null);
  const refundRef = useRef(null);
  const profileRef = useRef(null);
  const returnsRef = useRef(null);

  // Close popovers on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (refundRef.current && !refundRef.current.contains(e.target)) setRefundOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (returnsRef.current && !returnsRef.current.contains(e.target)) setReturnsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll active data periodically
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function fetchData() {
      try {
        const isCustomer = user.role === 'customer';
        const params = isCustomer ? { customerId: user.id } : {};

        const [retRes, refRes, commRes] = await Promise.all([
          listReturns(params).catch(() => ({ data: [] })),
          listRefunds(params).catch(() => ({ data: [] })),
          listCommunications(isCustomer ? { customerId: user.id } : {}).catch(() => ({ data: [] })),
        ]);

        if (isMounted) {
          const retList = Array.isArray(retRes.data) ? retRes.data : [];
          const active = retList.filter(
            (r) => !['REFUNDED', 'EXCHANGE_DISPATCHED', 'CLOSED', 'CANCELLED'].includes(r.status) && !r.draft
          );
          setActiveReturns(active);

          const refList = Array.isArray(refRes.data) ? refRes.data : [];
          setRefunds(refList);

          const commList = Array.isArray(commRes.data) ? commRes.data : [];
          setNotifications(commList.slice(0, 10));
        }
      } catch (err) {
        console.error('NavBar data polling error:', err);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 15000); // 15s poll
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  // Real-time instant notification update via SSE
  useEventStream(() => {
    if (!user) return;
    const isCustomer = user.role === 'customer';
    const params = isCustomer ? { customerId: user.id } : {};
    Promise.all([
      listReturns(params).catch(() => ({ data: [] })),
      listRefunds(params).catch(() => ({ data: [] })),
      listCommunications(isCustomer ? { customerId: user.id } : {}).catch(() => ({ data: [] })),
    ]).then(([retRes, refRes, commRes]) => {
      const retList = Array.isArray(retRes.data) ? retRes.data : [];
      const active = retList.filter(
        (r) => !['REFUNDED', 'EXCHANGE_DISPATCHED', 'CLOSED', 'CANCELLED'].includes(r.status) && !r.draft
      );
      setActiveReturns(active);
      const refList = Array.isArray(refRes.data) ? refRes.data : [];
      setRefunds(refList);
      const commList = Array.isArray(commRes.data) ? commRes.data : [];
      setNotifications(commList.slice(0, 10));
    });
  });

  if (!user) return null;

  const inFlightRefunds = refunds.filter((r) => ['PENDING', 'INITIATED', 'PROCESSING'].includes(r.status));
  const inFlightAmount = inFlightRefunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const portalPath = ROLE_PORTAL_PATH[user.role] || '/customer';

  const demoRoles = [
    { email: 'priya@example.com', label: 'Customer (Priya)', role: 'customer' },
    { email: 'rahul.support@returnflow.io', label: 'Support (Rahul)', role: 'customer_support' },
    { email: 'deepak.qc@returnflow.io', label: 'QC Staff (Deepak)', role: 'warehouse_qc' },
    { email: 'kavita.finance@returnflow.io', label: 'Finance (Kavita)', role: 'finance' },
    { email: 'sunita.supplier@returnflow.io', label: 'Supplier (Sunita)', role: 'supplier_manager' },
    { email: 'admin@returnflow.io', label: 'Admin (Arjun)', role: 'admin' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-border/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Main Navigation */}
          <div className="flex items-center gap-6">
            <Link to="/home" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold shadow-xs group-hover:scale-105 transition-transform">
                <RefreshIcon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-text tracking-tight flex items-center gap-1.5">
                  ReturnFlow <span className="text-[10px] uppercase font-semibold tracking-wider bg-primary-50 text-primary px-1.5 py-0.5 rounded">RRPMS</span>
                </span>
                <span className="text-[11px] text-text-muted -mt-1 hidden sm:inline">Reverse Logistics & Refund Engine</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 ml-4 text-sm font-medium">
              <Link
                to="/home"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  location.pathname === '/home' || location.pathname === '/'
                    ? 'bg-primary-50 text-primary font-semibold'
                    : 'text-text-secondary hover:text-text hover:bg-gray-100'
                }`}
              >
                Customer Home
              </Link>
              <Link
                to={portalPath}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  location.pathname.startsWith(portalPath)
                    ? 'bg-primary-50 text-primary font-semibold'
                    : 'text-text-secondary hover:text-text hover:bg-gray-100'
                }`}
              >
                {ROLE_LABEL[user.role]} Console
              </Link>
              <Link
                to="/platform"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  location.pathname === '/platform'
                    ? 'bg-primary-50 text-primary font-semibold'
                    : 'text-text-secondary hover:text-text hover:bg-gray-100'
                }`}
              >
                Unified Platform
              </Link>
            </nav>
          </div>

          {/* Right Area: Active Returns Badge, Refund Status, Notifications, Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Active Returns Badge */}
            <div className="relative" ref={returnsRef}>
              <button
                type="button"
                onClick={() => setReturnsOpen(!returnsOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-border bg-gray-50 hover:bg-gray-100 text-xs font-medium text-text transition-colors"
                title="Active Returns in transit or QC"
              >
                <span className="relative flex h-2 w-2">
                  {activeReturns.length > 0 && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${activeReturns.length > 0 ? 'bg-warning' : 'bg-success'}`}></span>
                </span>
                <span className="hidden sm:inline">Returns</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-semibold ${
                  activeReturns.length > 0 ? 'bg-warning-100 text-warning-800' : 'bg-gray-200 text-text-muted'
                }`}>
                  {activeReturns.length}
                </span>
              </button>

              {returnsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-border p-4 z-50 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
                    <h4 className="font-semibold text-sm text-text">In-Progress Returns</h4>
                    <span className="text-xs text-text-muted">{activeReturns.length} active</span>
                  </div>
                  {activeReturns.length === 0 ? (
                    <p className="text-xs text-text-muted py-2 text-center">No returns currently in progress.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {activeReturns.map((ret) => (
                        <div key={ret.id} className="p-2 border border-border rounded-md bg-gray-50 text-xs flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-text">{ret.reasonCode || 'Return'}</p>
                            <p className="text-[11px] text-text-muted font-mono">{String(ret.id).slice(0, 8)}</p>
                          </div>
                          <span className="bg-primary-50 text-primary px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
                            {ret.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 pt-2 border-t border-border text-center">
                    <Link
                      to="/customer/return-history"
                      onClick={() => setReturnsOpen(false)}
                      className="text-xs text-primary font-medium hover:underline"
                    >
                      View All in Return History →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Refund Status Indicator */}
            <div className="relative" ref={refundRef}>
              <button
                type="button"
                onClick={() => setRefundOpen(!refundOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                  inFlightRefunds.length > 0
                    ? 'border-info-200 bg-info-50 text-info-800 hover:bg-info-100'
                    : 'border-border bg-gray-50 text-text-secondary hover:bg-gray-100'
                }`}
                title="Refund processing status"
              >
                <CreditCardIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refunds</span>
                {inFlightRefunds.length > 0 && (
                  <span className="font-semibold text-primary">₹{inFlightAmount.toLocaleString('en-IN')}</span>
                )}
              </button>

              {refundOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-border p-4 z-50 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
                    <h4 className="font-semibold text-sm text-text">Refund Status Overview</h4>
                    <span className="text-xs text-text-muted">{refunds.length} total</span>
                  </div>
                  <div className="bg-primary-50 rounded-lg p-3 mb-3 text-xs">
                    <div className="flex justify-between font-medium text-text">
                      <span>Pending / In-Transit:</span>
                      <span className="font-semibold text-primary">₹{inFlightAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-1">
                      SLA: 5–7 business days to bank method; 24 hrs for store credit (+5% bonus).
                    </p>
                  </div>
                  {refunds.length === 0 ? (
                    <p className="text-xs text-text-muted py-2 text-center">No refund records found.</p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {refunds.slice(0, 5).map((r) => (
                        <div key={r.id} className="flex justify-between items-center text-xs p-2 rounded bg-gray-50 border border-border">
                          <div>
                            <span className="font-semibold text-text">₹{Number(r.amount).toLocaleString('en-IN')}</span>
                            <span className="text-[11px] text-text-muted ml-2">via {humanize(r.method)}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            r.status === 'CREDITED' ? 'bg-success-100 text-success-800' : 'bg-warning-100 text-warning-800'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 pt-2 border-t border-border text-center">
                    <Link
                      to="/customer/refund-status"
                      onClick={() => setRefundOpen(false)}
                      className="text-xs text-primary font-medium hover:underline"
                    >
                      Open Full Refund Tracker →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 text-text-secondary hover:text-text rounded-full hover:bg-gray-100 transition-colors"
                title="Milestone Notifications"
                aria-label="Notifications"
              >
                <BellIcon className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-84 bg-white rounded-lg shadow-lg border border-border p-4 z-50 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
                    <h4 className="font-semibold text-sm text-text">Milestone Notifications</h4>
                    <span className="text-xs text-text-muted">{notifications.length} recent</span>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-text-muted py-4 text-center">No notifications yet.</p>
                  ) : (
                    <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {notifications.map((n) => (
                        <li key={n.id} className="text-xs border-b border-border pb-2 last:border-0">
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-text">{humanize(n.eventType)}</span>
                            <span className="text-[10px] text-text-muted">
                              {n.sentAt ? new Date(n.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-secondary mt-0.5">
                            Status alert via <strong className="text-primary">{humanize(n.channel)}</strong>
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 pt-2 border-t border-border text-center">
                    <Link
                      to="/customer/notifications"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-primary font-medium hover:underline"
                    >
                      View All Communications →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown & Role Persona Switcher */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full border border-border hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-semibold text-text leading-tight">{user.name}</span>
                  <span className="text-[10px] text-text-muted leading-tight">{ROLE_LABEL[user.role]}</span>
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-border p-3 z-50 animate-fadeIn">
                  <div className="pb-3 border-b border-border">
                    <p className="font-semibold text-sm text-text">{user.name}</p>
                    <p className="text-xs text-text-muted">{user.email}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-primary-100 text-primary-800 rounded">
                        {ROLE_LABEL[user.role]}
                      </span>
                      {user.department && user.department !== '—' && (
                        <span className="text-[11px] text-text-secondary">· {user.department}</span>
                      )}
                    </div>
                  </div>

                  <div className="py-2 border-b border-border">
                    <p className="text-[11px] uppercase font-semibold text-text-muted mb-1.5 px-1">
                      Switch Demo Role Persona
                    </p>
                    <div className="space-y-1">
                      {demoRoles.map((demo) => (
                        <button
                          key={demo.email}
                          type="button"
                          onClick={async () => {
                            setProfileOpen(false);
                            await loginAsDemo(demo.email, 'Password123!');
                            navigate(ROLE_PORTAL_PATH[demo.role] || '/home');
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                            user.email === demo.email ? 'bg-primary-50 text-primary font-medium' : 'hover:bg-gray-100 text-text'
                          }`}
                        >
                          <span>{demo.label}</span>
                          {user.email === demo.email && <CheckIcon className="w-3.5 h-3.5 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full text-left px-2 py-1.5 rounded text-xs text-danger font-medium hover:bg-danger-50 transition-colors flex items-center justify-between"
                    >
                      Sign Out
                      <CloseIcon className="w-3.5 h-3.5 text-danger" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
