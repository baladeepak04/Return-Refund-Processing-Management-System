import React from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
export default function AppShell({ brandLabel, portalLabel, navItems, iconBg, pageTitle, notificationCount, children }) {
  return (
    <div className="flex min-h-screen bg-bg">
      {/* WCAG 2.4.1 Bypass Blocks — keyboard users can skip the sidebar nav
          without tabbing through every item on every page. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:border focus:border-primary focus:rounded-md focus:px-3 focus:py-2 focus:text-sm focus:text-primary"
      >
        Skip to main content
      </a>
      <Sidebar brandLabel={brandLabel} portalLabel={portalLabel} navItems={navItems} iconBg={iconBg} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar pageTitle={pageTitle} notificationCount={notificationCount} />
        <main id="main-content" tabIndex={-1} className="p-6 flex-1">{children}</main>
      </div>
    </div>
  );
}
