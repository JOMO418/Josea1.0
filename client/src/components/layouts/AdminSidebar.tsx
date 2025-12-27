// ============================================
// THE "MASTERPIECE" ADMIN SIDEBAR
// Enterprise UX, Haptic Toggles, Purple Branding
// ============================================

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  PackageSearch,
  Truck,
  ScrollText,
  Banknote,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Code2,
  LogOut,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

// ===== NAVIGATION CONFIG =====
const NAV_ITEMS = [
  { name: 'Command Center', path: '/admin/command-center', icon: LayoutDashboard },
  { name: 'Global Inventory', path: '/admin/inventory', icon: PackageSearch },
  { name: 'Stock Allocation', path: '/admin/allocation', icon: Truck },
  { name: 'Sales Audit', path: '/admin/audit', icon: ScrollText },
  { name: 'Debt Manager', path: '/admin/debts', icon: Banknote },
  { name: 'Access Control', path: '/admin/staff', icon: ShieldCheck },
];

// ===== ANIMATION VARIANTS =====
const sidebarVariants = {
  expanded: {
    width: '16rem',
    transition: { type: 'spring' as const, stiffness: 100, damping: 20 },
  },
  collapsed: {
    width: '5rem',
    transition: { type: 'spring' as const, stiffness: 100, damping: 20 },
  },
};

export default function AdminSidebar() {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false); // Default Collapsed
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const location = useLocation();
  const logout = useStore((state) => state.logout);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.aside
      initial="collapsed"
      animate={isExpanded ? 'expanded' : 'collapsed'}
      variants={sidebarVariants}
      className="relative bg-slate-950 border-r border-slate-800 flex flex-col h-screen z-50 shadow-2xl"
    >
      {/* ===== HEADER ===== */}
      <div className="h-20 flex items-center justify-center border-b border-slate-900/50 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="full-logo"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-2"
            >
              {/* Logo Icon */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <span className="text-white font-bold">P</span>
              </div>
              {/* Text */}
              <div>
                <h1 className="text-lg font-bold text-white leading-none tracking-tight">
                  PRAM <span className="text-amber-500">HQ</span>
                </h1>
                <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase mt-0.5">
                  Admin Portal
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="mini-logo"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-500 font-black shadow-inner"
            >
              P
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== NAVIGATION ===== */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-visible">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <div key={item.path} className="relative group">
              <Link
                to={item.path}
                onMouseEnter={() => setHoveredPath(item.path)}
                onMouseLeave={() => setHoveredPath(null)}
                className={`
                  flex items-center gap-4 p-3 rounded-xl transition-all duration-300 relative overflow-hidden
                  ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }
                `}
              >
                {/* Active Marker (Glowing Bar) */}
                {isActive && (
                  <motion.div
                    layoutId="active-marker"
                    className="absolute left-0 w-1 h-8 bg-gradient-to-b from-amber-400 to-amber-600 rounded-r-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                  />
                )}

                <Icon
                  className={`w-5 h-5 flex-shrink-0 relative z-10 ${
                    isActive ? 'stroke-amber-400' : ''
                  }`}
                />

                <span
                  className={`whitespace-nowrap font-medium transition-opacity duration-200 relative z-10 ${
                    isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                  }`}
                >
                  {item.name}
                </span>
              </Link>

              {/* SMART TOOLTIP (Only visible when collapsed + hovered) */}
              {!isExpanded && hoveredPath === item.path && (
                <motion.div
                  initial={{ opacity: 0, x: 10, scale: 0.95 }}
                  animate={{ opacity: 1, x: 20, scale: 1 }}
                  exit={{ opacity: 0, x: 10, scale: 0.95 }}
                  className="absolute left-full top-1/2 -translate-y-1/2 z-[60] ml-2 px-3 py-1.5 bg-slate-900 text-amber-500 text-xs font-bold rounded-md border border-slate-700 shadow-2xl whitespace-nowrap pointer-events-none"
                >
                  {item.name}
                  {/* Tiny Arrow */}
                  <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-slate-700 transform rotate-45" />
                </motion.div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ===== SIGN OUT BUTTON ===== */}
      <div className="px-3 pb-3">
        <button
          onClick={handleSignOut}
          className={`
            w-full flex items-center gap-4 p-3 rounded-xl
            bg-red-500/10 border border-red-500/20 text-red-400
            hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-300
            transition-all duration-200 font-medium
            ${isExpanded ? 'justify-start' : 'justify-center'}
          `}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span
            className={`whitespace-nowrap transition-opacity duration-200 ${
              isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
            }`}
          >
            Sign Out
          </span>
        </button>
      </div>

      {/* ===== BRANDING FOOTER (PURPLE) ===== */}
      <div className="p-4 border-t border-slate-900/50 bg-slate-950/50 backdrop-blur-sm">
        {isExpanded ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <p className="text-[9px] text-slate-600 font-bold tracking-widest mb-1">
              POWERED BY
            </p>
            <p className="text-[10px] font-black uppercase bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Josea Software Solutions
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="flex flex-col items-center justify-center gap-1"
          >
            <Code2 className="w-5 h-5 text-violet-500" />
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-[9px] font-black text-violet-500"
            >
              JSS
            </motion.span>
          </motion.div>
        )}
      </div>

      {/* ===== HAPTIC TOGGLE BAR (THE GLOW SPINE) ===== */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 h-32 w-6 group flex items-center justify-start focus:outline-none z-40"
      >
        {/* The Bar */}
        <div
          className={`
          h-full w-1 rounded-full transition-all duration-300 
          bg-slate-800 group-hover:bg-amber-500 group-hover:w-1.5 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.6)]
        `}
        />

        {/* The Icon (Only appears on hover) */}
        <div className="absolute left-2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-slate-900 border border-slate-700 rounded-full p-1 shadow-xl transform -translate-x-2 group-hover:translate-x-0">
          {isExpanded ? (
            <ChevronLeft className="w-3 h-3 text-amber-400" />
          ) : (
            <ChevronRight className="w-3 h-3 text-amber-400" />
          )}
        </div>
      </button>
    </motion.aside>
  );
}