import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { HomeIcon, ClipboardIcon, HistoryIcon, FileIcon } from '../../components/ui/icons.jsx';
import { listReturns, listQcInspections } from '../../lib/api.js';
import Dashboard from './Dashboard.jsx';
import InspectionQueue from './InspectionQueue.jsx';
import InspectionWorkspace from './InspectionWorkspace.jsx';
import InspectionHistory from './InspectionHistory.jsx';
import QcReports from './QcReports.jsx';

const baseNav = [
  { to: '/qc', end: true, label: 'Dashboard', icon: <HomeIcon /> },
  { to: '/qc/inspection-queue', label: 'Inspection Queue', icon: <ClipboardIcon /> },
  { to: '/qc/inspection-history', label: 'Inspection History', icon: <HistoryIcon /> },
  { to: '/qc/qc-reports', label: 'QC Reports', icon: <FileIcon /> },
];

const titles = {
  '/qc': 'QC Dashboard',
  '/qc/inspection-queue': 'Inspection Queue',
  '/qc/inspection-history': 'Inspection History',
  '/qc/qc-reports': 'QC Reports',
};

export default function QcPortal() {
  const path = useLocation().pathname;
  // Real pending-inspection count — same RECEIVED/IN_TRANSIT-minus-already-
  // inspected logic InspectionQueue.jsx itself uses. Was a hardcoded `badge: 7`.
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    Promise.all([listReturns(), listQcInspections()])
      .then(([rRes, qRes]) => {
        const inspectedIds = new Set(qRes.data.map((i) => i.returnRequest?.id));
        const pending = rRes.data.filter(
          (r) => ['RECEIVED', 'IN_TRANSIT'].includes(r.status) && !inspectedIds.has(r.id)
        );
        setPendingCount(pending.length);
      })
      .catch(() => setPendingCount(0));
  }, [path]);

  const nav = baseNav.map((item) =>
    item.to === '/qc/inspection-queue' ? { ...item, badge: pendingCount || undefined } : item
  );

  const getPageTitle = (p) => {
    if (titles[p]) return titles[p];
    if (p.startsWith('/qc/inspection/')) return 'Inspection Workspace';
    return 'ReturnFlow';
  };

  return (
    <AppShell brandLabel="ReturnFlow" portalLabel="QC Staff" navItems={nav} iconBg="bg-orange-500" pageTitle={getPageTitle(path)} notificationCount={pendingCount}>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="inspection-queue" element={<InspectionQueue />} />
        <Route path="queue" element={<Navigate to="/qc/inspection-queue" replace />} />
        <Route path="inspection/:returnId" element={<InspectionWorkspace />} />
        <Route path="workspace/:returnId" element={<InspectionWorkspace />} />
        <Route path="inspection-history" element={<InspectionHistory />} />
        <Route path="history" element={<Navigate to="/qc/inspection-history" replace />} />
        <Route path="qc-reports" element={<QcReports />} />
        <Route path="reports" element={<Navigate to="/qc/qc-reports" replace />} />
        <Route path="*" element={<Navigate to="/qc" replace />} />
      </Routes>
    </AppShell>
  );
}
