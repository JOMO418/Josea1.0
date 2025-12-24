// ============================================
// SIDEBAR DRAWER COMPONENT
// Collapsible navigation with framer-motion
// ============================================

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  TrendingUp,
  ArrowLeftRight,
  CreditCard,
  X,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useStore } from '../store/useStore';

// ===== NAVIGATION ITEMS =====

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'POS', path: '/pos', icon: ShoppingCart },
  { label: 'Inventory', path: '/inventory', icon: Package },
  { label: 'Sales', path: '/sales', icon: TrendingUp },
  { label: 'Transfers', path: '/transfers', icon: ArrowLeftRight },
  { label: 'Credits', path: '/credits', icon: CreditCard },
];

// ===== SIDEBAR COMPONENT =====

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDrawerOpen = useStore((state) => state.isDrawerOpen);
  const toggleDrawer = useStore((state) => state.toggleDrawer);
  const logout = useStore((state) => state.logout);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Backdrop Overlay (visible on mobile/tablet when drawer is open) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={toggleDrawer}
          />
        )}
      </AnimatePresence>

      {/* Drawer Sidebar */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 h-screen bg-[var(--color-sidebar)] border-r border-slate-800 z-50"
            style={{ width: 'var(--sidebar-width)' }}
          >
            <div className="flex flex-col h-full">
              {/* Logo/Brand */}
              <div className="h-16 flex items-center justify-between border-b border-slate-800 px-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--color-accent)] rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-white font-bold text-lg">Pram Auto</h1>
                    <p className="text-xs text-slate-400">Manager Portal</p>
                  </div>
                </div>

                {/* Close button (visible on mobile) */}
                <button
                  onClick={toggleDrawer}
                  className="lg:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 overflow-y-auto py-6 px-4">
                <ul className="space-y-2">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => {
                            // Close drawer on mobile after navigation
                            if (window.innerWidth < 1024) {
                              toggleDrawer();
                            }
                          }}
                          className={`
                            flex items-center gap-3 px-4 py-3 rounded-lg
                            transition-all duration-200
                            ${
                              isActive
                                ? 'bg-[var(--color-accent)] text-white shadow-lg'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }
                          `}
                        >
                          <Icon size={20} />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* Sign Out Button */}
              <div className="px-4 pb-4">
                <button
                  onClick={handleSignOut}
                  className="
                    w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg
                    bg-red-500/10 border border-red-500/20 text-red-400
                    hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-300
                    transition-all duration-200 font-medium
                  "
                >
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Footer Info - FIXED AT BOTTOM */}
              <div className="p-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 text-center mb-3">
                  v1.0.0 • {new Date().getFullYear()}
                </p>
                {/* Premium Branding - ALWAYS VISIBLE */}
                <div className="mt-3 pt-3 border-t border-slate-800/50">
                  <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-transparent bg-clip-text text-center">
                    <p className="text-[10px] font-semibold tracking-wide">
                      POWERED BY
                    </p>
                    <p className="text-xs font-bold mt-0.5">
                      Josea Software Solutions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
