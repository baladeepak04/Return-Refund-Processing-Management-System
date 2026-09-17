import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { HomeIcon, ClipboardIcon, UsersIcon, KeyIcon, AlertIcon, BarChartIcon, FileIcon, SettingsIcon } from '../../components/ui/icons.jsx';
import { getFraudQueue } from '../../lib/api.js';
import Dashboard from './Dashboard.jsx';
import ReturnPolicies from './ReturnPolicies.jsx';
import UserManagement from './UserManagement.jsx';
import RolesPermissions from './RolesPermissions.jsx';
import FraudQueue from './FraudQueue.jsx';
import Analytics from './Analytics.jsx';
import AuditLogs from './AuditLogs.jsx';
import Settings from './Settings.jsx';

const baseNav = [
  { to: '/admin', end: true, label: 'Dashboard', icon: <HomeIcon /> },
  { to: '/admin/return-policies', label: 'Return Policies', icon: <ClipboardIcon /> },
  { to: '/admin/users', label: 'Users', icon: <UsersIcon /> },
  { to: '/admin/roles-permissions', label: 'Roles & Permissions', icon: <KeyIcon /> },
  { to: '/admin/fraud-queue', label: 'Fraud Queue', icon: <AlertIcon /> },
  { to: '/admin/analytics', label: 'Analytics', icon: <BarChartIcon /> },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: <FileIcon /> },
  { to: '/admin/settings', label: 'Settings', icon: <SettingsIcon /> },
];

const titles = {
  '/admin': 'Admin Dashboard',
  '/admin/return-policies': 'Return Policies',
  '/admin/users': 'User Management',
  '/admin/roles-permissions': 'Roles & Permissions',
  '/admin/fraud-queue': 'Fraud Queue',
  '/admin/analytics': 'Analytics',
  '/admin/audit-logs': 'Audit Logs',
  '/admin/settings': 'Settings',
};

export default function AdminPortal() {
  const path = useLocation().pathname;
  // Real open-fraud-flag count from the backend — this used to be a
  // hardcoded `badge: 12` that stayed 12 even when the queue was actually
  // empty. No fraud-flag-count endpoint exists, so we reuse the same
  // getFraudQueue() list the Fraud Queue page itself fetches.
  const [fraudCount, setFraudCount] = useState(0);
  useEffect(() => {
    getFraudQueue().then((res) => setFraudCount(res.data.length)).catch(() => setFraudCount(0));
  }, [path]);

  const nav = baseNav.map((item) =>
    item.to === '/admin/fraud-queue' ? { ...item, badge: fraudCount || undefined } : item
  );

  return (
    <AppShell brandLabel="ReturnFlow" portalLabel="Administrator" navItems={nav} iconBg="bg-gray-800" pageTitle={titles[path] || 'ReturnFlow'} notificationCount={fraudCount}>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="return-policies" element={<ReturnPolicies />} />
        <Route path="policies" element={<Navigate to="/admin/return-policies" replace />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="roles-permissions" element={<RolesPermissions />} />
        <Route path="roles" element={<Navigate to="/admin/roles-permissions" replace />} />
        <Route path="fraud-queue" element={<FraudQueue />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AppShell>
  );
}
