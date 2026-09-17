import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { HomeIcon, UserSearchIcon, FileIcon, UsersIcon, ActivityIcon, RefreshIcon } from '../../components/ui/icons.jsx';
import Dashboard from './Dashboard.jsx';
import CustomerSearch from './CustomerSearch.jsx';
import ReturnLookup from './ReturnLookup.jsx';
import CustomerHistory from './CustomerHistory.jsx';
import ActivityTimeline from './ActivityTimeline.jsx';
import InitiateOnBehalf from './InitiateOnBehalf.jsx';

const nav = [
  { to: '/support', end: true, label: 'Dashboard', icon: <HomeIcon /> },
  { to: '/support/customer-search', label: 'Customer Search', icon: <UserSearchIcon /> },
  { to: '/support/initiate-on-behalf', label: 'Initiate Return', icon: <RefreshIcon /> },
  { to: '/support/return-lookup', label: 'Return Lookup', icon: <FileIcon /> },
  { to: '/support/customer-history', label: 'Customer History', icon: <UsersIcon /> },
  { to: '/support/activity-timeline', label: 'Activity Timeline', icon: <ActivityIcon /> },
];

const titles = {
  '/support': 'Support Dashboard',
  '/support/customer-search': 'Customer Search',
  '/support/initiate-on-behalf': 'Initiate Return on Behalf',
  '/support/return-lookup': 'Return Lookup',
  '/support/customer-history': 'Customer History',
  '/support/activity-timeline': 'Activity Timeline',
};

export default function SupportPortal() {
  const path = useLocation().pathname;
  return (
    <AppShell brandLabel="ReturnFlow" portalLabel="Customer Support" navItems={nav} iconBg="bg-purple-600" pageTitle={titles[path] || 'ReturnFlow'}>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="customer-search" element={<CustomerSearch />} />
        <Route path="initiate-on-behalf" element={<InitiateOnBehalf />} />
        <Route path="return-lookup" element={<ReturnLookup />} />
        <Route path="customer-history" element={<CustomerHistory />} />
        <Route path="activity-timeline" element={<ActivityTimeline />} />
        <Route path="*" element={<Navigate to="/support" replace />} />
      </Routes>
    </AppShell>
  );
}
