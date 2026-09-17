import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { HomeIcon, BoxIcon, TruckIcon, FileIcon, TrendIcon, CreditCardIcon } from '../../components/ui/icons.jsx';
import { listSupplierReturns } from '../../lib/api.js';
import Dashboard from './Dashboard.jsx';
import SupplierReturns from './SupplierReturns.jsx';
import RtmBatches from './RtmBatches.jsx';
import CreditNotes from './CreditNotes.jsx';
import Performance from './Performance.jsx';
import Settlement from './Settlement.jsx';

const baseNav = [
  { to: '/supplier', end: true, label: 'Dashboard', icon: <HomeIcon /> },
  { to: '/supplier/supplier-returns', label: 'Supplier Returns', icon: <BoxIcon /> },
  { to: '/supplier/rtm-batches', label: 'RTM Batches', icon: <TruckIcon /> },
  { to: '/supplier/credit-notes', label: 'Credit Notes', icon: <FileIcon /> },
  { to: '/supplier/performance', label: 'Performance', icon: <TrendIcon /> },
  { to: '/supplier/settlement', label: 'Settlement', icon: <CreditCardIcon /> },
];

const titles = {
  '/supplier': 'Supplier Dashboard',
  '/supplier/supplier-returns': 'Supplier Returns',
  '/supplier/rtm-batches': 'RTM Batches',
  '/supplier/credit-notes': 'Credit Notes',
  '/supplier/performance': 'Performance',
  '/supplier/settlement': 'Settlement',
};

export default function SupplierPortal() {
  const path = useLocation().pathname;
  // Real ACCUMULATED-status count (items not yet RTM-batched) — same filter
  // SupplierReturns.jsx uses for its "eligible for batching" selection. Was
  // a hardcoded `badge: 8`.
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    listSupplierReturns()
      .then((res) => setPendingCount(res.data.filter((r) => r.status === 'ACCUMULATED').length))
      .catch(() => setPendingCount(0));
  }, [path]);

  const nav = baseNav.map((item) =>
    item.to === '/supplier/supplier-returns' ? { ...item, badge: pendingCount || undefined } : item
  );

  return (
    <AppShell brandLabel="ReturnFlow" portalLabel="Supplier Manager" navItems={nav} iconBg="bg-orange-600" pageTitle={titles[path] || 'ReturnFlow'} notificationCount={pendingCount}>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="supplier-returns" element={<SupplierReturns />} />
        <Route path="rtm-batches" element={<RtmBatches />} />
        <Route path="credit-notes" element={<CreditNotes />} />
        <Route path="performance" element={<Performance />} />
        <Route path="settlement" element={<Settlement />} />
        <Route path="*" element={<Navigate to="/supplier" replace />} />
      </Routes>
    </AppShell>
  );
}
