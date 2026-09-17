import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext.jsx';
import { ROLE_PORTAL_PATH } from './lib/enums.js';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import ReturnPlatform from './pages/ReturnPlatform.jsx';
import NavBar from './components/layout/NavBar.jsx';
import CustomerPortal from './portals/customer/CustomerPortal.jsx';
import SupportPortal from './portals/support/SupportPortal.jsx';
import QcPortal from './portals/qc/QcPortal.jsx';
import FinancePortal from './portals/finance/FinancePortal.jsx';
import SupplierPortal from './portals/supplier/SupplierPortal.jsx';
import AdminPortal from './portals/admin/AdminPortal.jsx';

const DEMO_ROLE_CREDENTIALS = {
  customer: 'priya@example.com',
  customer_support: 'rahul.support@returnflow.io',
  warehouse_qc: 'deepak.qc@returnflow.io',
  finance: 'kavita.finance@returnflow.io',
  supplier_manager: 'sunita.supplier@returnflow.io',
  admin: 'admin@returnflow.io',
};

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ role, children }) {
  const { user, loginAsDemo } = useAuth();
  const [switching, setSwitching] = React.useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const isAuthorized = user.role === role || user.role === 'admin';

  // Auto-sync demo persona when navigating between portals or hitting browser back/forward,
  // preventing redirect lock-in loops while ensuring backend tokens match portal permissions.
  React.useEffect(() => {
    if (!isAuthorized && DEMO_ROLE_CREDENTIALS[role]) {
      setSwitching(true);
      loginAsDemo(DEMO_ROLE_CREDENTIALS[role])
        .catch((e) => console.error('Demo auth sync failed:', e))
        .finally(() => setSwitching(false));
    }
  }, [user?.role, role, isAuthorized, loginAsDemo]);

  if (!isAuthorized || switching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-text-secondary">Syncing role session…</p>
        </div>
      </div>
    );
  }

  return children;
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'customer') return <Navigate to="/customer" replace />;
  return <Navigate to={ROLE_PORTAL_PATH[user.role] || '/login'} replace />;
}

function PortalRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_PORTAL_PATH[user.role] || '/admin'} replace />;
}

function HomeRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'customer') {
    return <Navigate to={ROLE_PORTAL_PATH[user.role] || '/admin'} replace />;
  }
  return (
    <MainLayout>
      <Home />
    </MainLayout>
  );
}

function MainLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <NavBar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

import { Provider } from 'react-redux';
import { store } from './store/index.js';
import { ToastProvider } from './lib/ToastContext.jsx';

export default function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />

        {/* Customer Storefront Home */}
        <Route
          path="/home"
          element={
            <RequireAuth>
              <HomeRoute />
            </RequireAuth>
          }
        />

        {/* Legacy /platform alias redirects to active role portal */}
        <Route path="/platform" element={<PortalRedirect />} />

        {/* Role-Specific Portals */}
        <Route path="/customer/*" element={<RequireRole role="customer"><CustomerPortal /></RequireRole>} />
        <Route path="/support/*" element={<RequireRole role="customer_support"><SupportPortal /></RequireRole>} />
        <Route path="/qc/*" element={<RequireRole role="warehouse_qc"><QcPortal /></RequireRole>} />
        <Route path="/finance/*" element={<RequireRole role="finance"><FinancePortal /></RequireRole>} />
        <Route path="/supplier/*" element={<RequireRole role="supplier_manager"><SupplierPortal /></RequireRole>} />
        <Route path="/admin/*" element={<RequireRole role="admin"><AdminPortal /></RequireRole>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ToastProvider>
    </AuthProvider>
    </Provider>
  );
}
