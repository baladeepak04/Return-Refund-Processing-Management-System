import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { HomeIcon, BoxIcon, RefreshIcon, HistoryIcon, CreditCardIcon, BellIcon, ChatIcon } from '../../components/ui/icons.jsx';
import Dashboard from './Dashboard.jsx';
import MyOrders from './MyOrders.jsx';
import InitiateReturn from './InitiateReturn.jsx';
import ReturnHistory from './ReturnHistory.jsx';
import RefundStatus from './RefundStatus.jsx';
import Notifications from './Notifications.jsx';
import SupportChat from './SupportChat.jsx';

const nav = [
  { to: '/customer', end: true, label: 'Dashboard', icon: <HomeIcon /> },
  { to: '/customer/orders', label: 'My Orders', icon: <BoxIcon /> },
  { to: '/customer/initiate-return', label: 'Initiate Return', icon: <RefreshIcon /> },
  { to: '/customer/return-history', label: 'Return History', icon: <HistoryIcon /> },
  { to: '/customer/refund-status', label: 'Refund Status', icon: <CreditCardIcon /> },
  { to: '/customer/notifications', label: 'Notifications', icon: <BellIcon /> },
  { to: '/customer/support-chat', label: 'Support Chat', icon: <ChatIcon /> },
];

const titles = {
  '/customer': 'My Dashboard',
  '/customer/orders': 'My Orders',
  '/customer/initiate-return': 'Initiate Return',
  '/customer/return-history': 'Return History',
  '/customer/refund-status': 'Refund Status',
  '/customer/notifications': 'Notifications',
  '/customer/support-chat': 'Support Chat',
};

export default function CustomerPortal() {
  const path = useLocation().pathname;
  return (
    <AppShell brandLabel="ReturnFlow" portalLabel="Customer Portal" navItems={nav} pageTitle={titles[path] || 'ReturnFlow'}>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<MyOrders />} />
        <Route path="my-orders" element={<Navigate to="/customer/orders" replace />} />
        <Route path="initiate-return" element={<InitiateReturn />} />
        <Route path="return-history" element={<ReturnHistory />} />
        <Route path="refund-status" element={<RefundStatus />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="support-chat" element={<SupportChat />} />
        <Route path="chat" element={<Navigate to="/customer/support-chat" replace />} />
        <Route path="*" element={<Navigate to="/customer" replace />} />
      </Routes>
    </AppShell>
  );
}
