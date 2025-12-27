// ============================================
// SIDEBAR DRAWER COMPONENT
// Collapsible navigation with framer-motion
// ============================================

import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ClipboardList,
  TrendingUp,
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
  { label: 'POS', path: '/pos', icon: ShoppingCart },
  { label: 'Sales', path: '/sales', icon: TrendingUp },
  { label: 'My Stock', path: '/inventory', icon: Package },
  { label: 'Restock', path: '/restock', icon: ClipboardList },
  { label: 'Debts', path: '/debts', icon: CreditCard },
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
];

// ===== SIDEBAR COMPONENT =====

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSidebarOpen = useStore((state) => state.setSidebarOpen);
  const logout = useStore((state) => state.logout);

  const handleSignOut = () => {
    // Ensure sidebar is open before logout (clean state)
    setSidebarOpen(true);
    logout();
    navigate('/login');
  };

  return (
    <aside
      className="fixed top-0 left-0 h-screen bg-[var(--color-sidebar)] border-r border-slate-800 z-50"
      style={{ width: 'var(--sidebar-width)' }}
    >
      <div className="flex flex-col h-full">
        {/* Logo/Brand */}
        <div className="h-16 flex items-center justify-between border-b border-slate-800 px-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-9 h-9 bg-[var(--color-accent)] rounded-lg flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-white font-bold text-base leading-tight truncate">Pram Auto</h1>
              <p className="text-[10px] text-slate-400 leading-tight truncate">Manager Portal</p>
            </div>
          </div>

          {/* Close button - RED */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-red-500 hover:text-red-400 flex-shrink-0 ml-2"
            title="Collapse Sidebar"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
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
                      // Auto-close logic based on page
                      if (item.path === '/sales' || item.path === '/pos') {
                        // Force Full Screen mode for POS/Sales
                        setSidebarOpen(false);
                      } else {
                        // Keep sidebar visible for all other pages
                        setSidebarOpen(true);
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
    </aside>
  );
}
