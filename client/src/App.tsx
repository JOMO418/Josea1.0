// ============================================
// ROOT APP COMPONENT
// React Router Setup with Authentication Protection
// ============================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useStore } from './store/useStore';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import AdminRoute from './components/auth/AdminRoute';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Sales from './pages/Sales';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Restock from './pages/Restock';
import DebtTracking from './pages/DebtTracking';
import Login from './pages/Login';
import CommandCenter from './pages/admin/CommandCenter';
import GlobalInventory from './pages/admin/GlobalInventory';
import StockAllocation from './pages/admin/StockAllocation';
import SalesAudit from './pages/admin/SalesAudit';
import BranchOrders from './pages/admin/BranchOrders';
import AdminCustomers from './pages/admin/Customers';
import Procurement from './pages/admin/Procurement';
import AccessControl from './pages/admin/AccessControl';
import UserRoles from './pages/admin/UserRoles';
import ComingSoon from './pages/admin/ComingSoon';
import SystemConfig from './pages/admin/SystemConfig';

// ===== PROTECTED ROUTE WRAPPER =====
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// ===== MAIN APP =====
function App() {
  return (
    <BrowserRouter>
      {/* Toast Notification System - Dark Mode Zinc Theme */}
      <Toaster
        position="top-right"
        expand={false}
        richColors
        theme="dark"
        toastOptions={{
          style: {
            background: '#09090b',
            border: '1px solid #27272a',
            color: '#fafafa',
          },
          className: 'font-sans',
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Application Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<POS />} />
          <Route path="sales" element={<Sales />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="customers" element={<Customers />} />
          <Route path="restock" element={<Restock />} />
          <Route path="debts" element={<DebtTracking />} />

          {/* Future Routes */}
          <Route path="transfers" element={<div className="p-8 text-white">Transfers (Coming Soon)</div>} />
          <Route path="credits" element={<div className="p-8 text-white">Credits (Coming Soon)</div>} />

          {/* 404 Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>

        {/* Admin Routes - Protected by Role-Based Access Control */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/command-center" replace />} />
            <Route path="command-center" element={<CommandCenter />} />
            <Route path="inventory" element={<GlobalInventory />} />
            <Route path="allocation" element={<StockAllocation />} />
            <Route path="orders" element={<BranchOrders />} />
            <Route path="audit" element={<SalesAudit />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="procurement" element={<Procurement />} />
            <Route path="staff" element={<AccessControl />} />
            <Route path="roles" element={<UserRoles />} />
            <Route path="settings" element={<SystemConfig />} />
            <Route path="coming-soon" element={<ComingSoon />} />

            {/* Catch-all for undefined admin routes - redirect to coming soon */}
            <Route path="*" element={<ComingSoon />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
