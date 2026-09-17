import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { HomeIcon, ClockIcon, CheckIcon, FileIcon, BarChartIcon } from '../../components/ui/icons.jsx';
import { listRefunds } from '../../lib/api.js';
import Dashboard from './Dashboard.jsx';
import RefundQueue from './RefundQueue.jsx';
import ApprovedRefunds from './ApprovedRefunds.jsx';
import RefundReports from './RefundReports.jsx';
import LiabilityDashboard from './LiabilityDashboard.jsx';

const baseNav = [
  { to: '/finance', end: true, label: 'Dashboard', icon: <HomeIcon /> },
  { to: '/finance/refund-queue', label: 'Refund Queue', icon: <ClockIcon /> },
  { to: '/finance/approved-refunds', label: 'Approved Refunds', icon: <CheckIcon /> },
  { to: '/finance/refund-reports', label: 'Refund Reports', icon: <FileIcon /> },
  { to: '/finance/liability-dashboard', label: 'Liability Dashboard', icon: <BarChartIcon /> },
];

const titles = {
  '/finance': 'Finance Dashboard',
  '/finance/refund-queue': 'Refund Queue',
  '/finance/approved-refunds': 'Approved Refunds',
  '/finance/refund-reports': 'Refund Reports',
  '/finance/liability-dashboard': 'Liability Dashboard',
};

export default function FinancePortal() {
  const path = useLocation().pathname;
  // Real PENDING-refund count from the backend — was a hardcoded `badge: 23`
  // that never reflected the actual queue.
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    listRefunds()
      .then((res) => setPendingCount(res.data.filter((r) => r.status === 'PENDING').length))
      .catch(() => setPendingCount(0));
  }, [path]);

  const nav = baseNav.map((item) =>
    item.to === '/finance/refund-queue' ? { ...item, badge: pendingCount || undefined } : item
  );

  return (
    <AppShell brandLabel="ReturnFlow" portalLabel="Finance Manager" navItems={nav} iconBg="bg-green-600" pageTitle={titles[path] || 'ReturnFlow'} notificationCount={pendingCount}>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="refund-queue" element={<RefundQueue />} />
        <Route path="approved-refunds" element={<ApprovedRefunds />} />
        <Route path="approved" element={<Navigate to="/finance/approved-refunds" replace />} />
        <Route path="refund-reports" element={<RefundReports />} />
        <Route path="reports" element={<Navigate to="/finance/refund-reports" replace />} />
        <Route path="liability-dashboard" element={<LiabilityDashboard />} />
        <Route path="liability" element={<Navigate to="/finance/liability-dashboard" replace />} />
        <Route path="*" element={<Navigate to="/finance" replace />} />
      </Routes>
    </AppShell>
  );
}
