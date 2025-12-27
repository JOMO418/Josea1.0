// ============================================
// ADMIN LAYOUT - MASTERPIECE INTEGRATION
// Complete Admin Shell with Josea Branding
// ============================================

import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/layouts/AdminSidebar';
import AdminHeader from '../components/layouts/AdminHeader';

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans selection:bg-amber-500/30">
      {/* ===== THE "SCIFI" SIDEBAR ===== */}
      <AdminSidebar />

      {/* ===== MAIN CONTENT COLUMN ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ===== THE "GLASS COMMAND" HEADER ===== */}
        <AdminHeader />

        {/* ===== MAIN CONTENT AREA ===== */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
