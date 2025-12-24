// ============================================
// MAIN LAYOUT SHELL - COMMAND CENTER
// Collapsible Drawer + Premium Glassmorphism Topbar
// ============================================

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
  '/transfers': 'Transfers',
  '/credits': 'Credits',
};

// ===== MAIN LAYOUT COMPONENT =====

export default function MainLayout() {
  const location = useLocation();
  const isDrawerOpen = useStore((state) => state.isDrawerOpen);
  const toggleDrawer = useStore((state) => state.toggleDrawer);
  const branchName = useStore((state) => state.branchName);
  const userName = useStore((state) => state.userName);

  const currentPage = PAGE_TITLES[location.pathname] || 'Dashboard';

  return (
    <div className="min-h-screen bg-[var(--color-main-bg)]">
      {/* ===== SIDEBAR DRAWER ===== */}
      <Sidebar />

      {/* ===== COMMAND CENTER TOPBAR ===== */}
      <header
        className="fixed top-0 right-0 z-30 h-16 transition-all duration-300"
        style={{
          left: isDrawerOpen ? 'var(--sidebar-width)' : '0',
          backgroundColor: 'rgb(9 9 11 / 0.8)', // bg-zinc-950/80
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgb(39 39 42)', // border-zinc-800
        }}
      >
        <div className="h-full px-6 flex items-center justify-between">
          {/* ===== LEFT SECTION: Menu + Breadcrumbs ===== */}
          <div className="flex items-center gap-6">
            {/* Menu Toggle Button */}
            <button
              onClick={toggleDrawer}
              className="p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5 text-slate-300" />
            </button>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 uppercase tracking-wider font-medium">
                PRAM AUTO
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-white font-bold uppercase tracking-wide">
                {currentPage}
              </span>
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
          marginLeft: isDrawerOpen ? 'var(--sidebar-width)' : '0',
          paddingTop: 'var(--topbar-height)',
        }}
      >
        <div className="p-8">
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
