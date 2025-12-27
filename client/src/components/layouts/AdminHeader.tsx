// ============================================
// THE "GLASS COMMAND" HEADER
// Glassmorphism Navigation Bar with Search
// ============================================

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Command } from 'lucide-react';
import { useStore } from '../../store/useStore';

// ===== PAGE TITLES =====
const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Command Center',
  '/admin/command-center': 'Command Center',
  '/admin/inventory': 'Global Inventory',
  '/admin/allocation': 'Stock Allocation',
  '/admin/audit': 'Sales Audit',
  '/admin/debts': 'Debt Manager',
  '/admin/staff': 'Access Control',
};

// ===== ADMIN HEADER COMPONENT =====
export default function AdminHeader() {
  const location = useLocation();
  const userName = useStore((state) => state.userName);
  const userRole = useStore((state) => state.userRole);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const currentPage = PAGE_TITLES[location.pathname] || 'Dashboard';

  // Format time as HH:mm:ss
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="flex items-center justify-between px-6 h-full">
        {/* ===== LEFT: BREADCRUMBS ===== */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 font-medium">Home</span>
          <span className="text-slate-700">/</span>
          <span className="text-white font-semibold">{currentPage}</span>
        </div>

        {/* ===== CENTER: SPOTLIGHT SEARCH ===== */}
        <div className="flex-1 flex justify-center px-8">
          <div className="relative w-full max-w-md">
            <div className="bg-slate-950/50 border border-slate-700/50 rounded-full px-4 py-1.5 flex items-center gap-3 focus-within:ring-1 ring-amber-500/50 transition-all">
              <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search command center..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none"
              />
              <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-900/50 border border-slate-700/50 rounded text-[10px] font-mono text-slate-500">
                <Command className="w-2.5 h-2.5" />
                <span>K</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== RIGHT: TIME + USER ===== */}
        <div className="flex items-center gap-4">
          {/* Time Display */}
          <span className="text-slate-400 font-mono text-sm tabular-nums">
            {formatTime(currentTime)}
          </span>

          {/* Divider */}
          <div className="h-4 w-px bg-slate-700" />

          {/* User Info */}
          <div className="flex items-center gap-3">
            <span className="text-white font-medium text-sm">{userName}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
              {userRole}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
