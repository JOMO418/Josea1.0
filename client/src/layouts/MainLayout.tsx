// ============================================
// MAIN LAYOUT SHELL - COMMAND CENTER
// Collapsible Drawer + Premium Glassmorphism Topbar
// ============================================

import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Bell, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import Sidebar from '../components/Sidebar';

// ===== PAGE METADATA =====

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/pos': 'POS',
  '/inventory': 'Inventory',
  '/sales': 'Sales',
  '/restock': 'Restock',
  '/debts': 'Debts',
  '/transfers': 'Transfers',
  '/credits': 'Credits',
};

// ===== MAIN LAYOUT COMPONENT =====

export default function MainLayout() {
  const location = useLocation();
  const isSidebarOpen = useStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useStore((state) => state.setSidebarOpen);
  const branchName = useStore((state) => state.branchName);
  const userName = useStore((state) => state.userName);

  const currentPage = PAGE_TITLES[location.pathname] || 'Dashboard';

  // ===== AUTO-RECOVERY LOGIC: FORCE SIDEBAR OPEN (EXCEPT FOR POS/SALES) =====
  useEffect(() => {
    // FORCE OPEN: If we are NOT on the '/sales' or '/pos' page, the sidebar MUST be visible.
    if (location.pathname !== '/sales' && location.pathname !== '/pos') {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false); // Only hide for POS and Sales (Full Screen)
    }
  }, [location.pathname, setSidebarOpen]);

  return (
    <div className="min-h-screen bg-[var(--color-main-bg)]">
      {/* ===== SIDEBAR DRAWER ===== */}
      {isSidebarOpen && <Sidebar />}

      {/* ===== COMMAND CENTER TOPBAR ===== */}
      <header
        className="fixed top-0 right-0 z-30 h-16 transition-all duration-300"
        style={{
          left: isSidebarOpen ? 'var(--sidebar-width)' : '0',
          backgroundColor: 'rgb(9 9 11 / 0.8)', // bg-zinc-950/80
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgb(39 39 42)', // border-zinc-800
        }}
      >
        <div className="h-full px-6 flex items-center justify-between">
          {/* ===== LEFT SECTION: Menu + Breadcrumbs ===== */}
          <div className="flex items-center gap-6">
            {/* Menu Toggle Button - Only visible when sidebar is open - ALWAYS BLUE */}
            {isSidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-blue-500/20 transition-colors"
                aria-label="Close sidebar"
              >
                <Menu className="w-5 h-5 text-blue-500" />
              </button>
            )}

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 uppercase tracking-wider font-medium">
                PRAM AUTO
              </span>
              <span className="text-slate-600">/</span>
              {location.pathname === '/pos' ? (
                <span className="font-bold uppercase tracking-wide">
                  <span className="text-purple-400 italic">Josea</span>
                  <span className="text-white"> POS</span>
                </span>
              ) : (
                <span className="text-white font-bold uppercase tracking-wide">
                  {currentPage}
                </span>
              )}
            </div>
          </div>

          {/* ===== CENTER SECTION: Branch Name ===== */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <div className="px-6 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <p className="text-emerald-400 font-bold text-sm uppercase tracking-widest">
                {branchName}
              </p>
            </div>
          </div>

          {/* ===== RIGHT SECTION: System Pulse + Notifications + User ===== */}
          <div className="flex items-center gap-4">
            {/* System Pulse (Socket.io connection indicator) */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/50">
              <div className="relative">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping opacity-75" />
              </div>
              <span className="text-xs text-slate-400 font-medium">LIVE</span>
            </div>

            {/* Notifications Bell */}
            <button
              className="p-2 rounded-lg hover:bg-zinc-800/50 transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-slate-300" />
              {/* Notification badge (placeholder) */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User Menu */}
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800/50 transition-colors">
              <div className="w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-white">{userName}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT AREA ===== */}
      <main
        className="min-h-screen transition-all duration-300"
        style={{
          marginLeft: isSidebarOpen ? 'var(--sidebar-width)' : '0',
          paddingTop: 'var(--topbar-height)',
        }}
      >
        <div className="relative p-8">
          {/* Emergency Hamburger Menu Button - Only visible when sidebar is closed */}
          {!isSidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed top-20 left-4 z-50 p-3 bg-blue-600 text-white rounded-lg shadow-xl hover:bg-blue-700 transition-all"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <Outlet />
        </div>
      </main>

      {/* ===== FIXED WATERMARK (Bottom Right) ===== */}
      <div className="fixed bottom-4 right-4 pointer-events-none z-10">
        <p className="text-slate-700 text-xs font-mono uppercase tracking-wider opacity-20">
          JOSEA POS v1.0
        </p>
      </div>
    </div>
  );
}