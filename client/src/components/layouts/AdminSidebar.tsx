// ============================================
// DENSE HYBRID CONSOLE ADMIN SIDEBAR
// Collapsible with Icon-Only Mode & Tooltips
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  PackageSearch,
  Banknote,
  ShieldCheck,
  Settings,
  ChevronDown,
  LogOut,
  Code2,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  UserCog,
  Shield,
  Warehouse,
  Receipt,
  GitBranch,
  ShoppingCart,
  Truck,
  CreditCard,
  UsersRound,
  FileText,
  Cog,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

// ===== NAVIGATION DATA STRUCTURE =====
interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType; // Each item now has its own icon
  exists?: boolean; // Mark if route exists
}

interface NavGroup {
  id: string;
  label: string;
  type: 'single' | 'group';
  path?: string;
  icon: React.ElementType;
  index: string;
  items?: NavItem[];
  exists?: boolean; // Mark if route exists
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'intelligence',
    label: 'INTELLIGENCE',
    type: 'single',
    path: '/admin/command-center',
    icon: LayoutDashboard,
    index: '00',
    exists: true,
  },
  {
    id: 'supply',
    label: 'SUPPLY CHAIN',
    type: 'group',
    icon: PackageSearch,
    index: '01',
    items: [
      { name: 'Global Inventory', path: '/admin/inventory', icon: Warehouse, exists: true },
      { name: 'Stock Allocation', path: '/admin/allocation', icon: GitBranch, exists: true },
      { name: 'Branch Orders', path: '/admin/orders', icon: ShoppingCart, exists: true },
      { name: 'Procurements', path: '/admin/procurement', icon: Package, exists: true },
      { name: 'Supplier Registry', path: '/admin/suppliers', icon: Truck, exists: false },
    ],
  },
  {
    id: 'revenue',
    label: 'REVENUE OPS',
    type: 'group',
    icon: Banknote,
    index: '02',
    items: [
      { name: 'Sales Audit', path: '/admin/audit', icon: Receipt, exists: true },
      { name: 'Debt Portfolio', path: '/admin/debts', icon: CreditCard, exists: false },
      { name: 'Customer Intelligence', path: '/admin/customers', icon: UsersRound, exists: true },
      { name: 'Transaction Logs', path: '/admin/logs', icon: FileText, exists: false },
    ],
  },
  {
    id: 'staff',
    label: 'STAFF CONTROL',
    type: 'group',
    icon: ShieldCheck,
    index: '03',
    items: [
      { name: 'Access Management', path: '/admin/staff', icon: UserCog, exists: true },
      { name: 'User Roles', path: '/admin/roles', icon: Shield, exists: true },
    ],
  },
  {
    id: 'system',
    label: 'SYSTEM CONTROL',
    type: 'group',
    icon: Settings,
    index: '04',
    items: [{ name: 'System Configuration', path: '/admin/settings', icon: Cog, exists: true }],
  },
];

// ===== ALL PAGES IN ORDER (Shown in Collapsed Mode) =====
// Priority order: Most used first, then all remaining pages
const ALL_PAGES_ORDERED = [
  // Priority Pages - Most Used
  { name: 'Global Inventory', path: '/admin/inventory', icon: Warehouse, exists: true },
  { name: 'Sales Audit', path: '/admin/audit', icon: Receipt, exists: true },
  { name: 'Stock Allocation', path: '/admin/allocation', icon: GitBranch, exists: true },
  { name: 'Branch Orders', path: '/admin/orders', icon: ShoppingCart, exists: true },

  // Remaining Pages
  { name: 'Customer Intelligence', path: '/admin/customers', icon: UsersRound, exists: true },
  { name: 'Procurements', path: '/admin/procurement', icon: Package, exists: true },
  { name: 'Supplier Registry', path: '/admin/suppliers', icon: Truck, exists: false },
  { name: 'Debt Portfolio', path: '/admin/debts', icon: CreditCard, exists: false },
  { name: 'Transaction Logs', path: '/admin/logs', icon: FileText, exists: false },
  { name: 'Access Management', path: '/admin/staff', icon: UserCog, exists: true },
  { name: 'User Roles', path: '/admin/roles', icon: Shield, exists: true },
  { name: 'System Configuration', path: '/admin/settings', icon: Cog, exists: true },
];

// ===== SMART TOOLTIP COMPONENT =====
interface TooltipProps {
  content: string;
  children: React.ReactNode;
  show: boolean;
}

function Tooltip({ content, children, show }: TooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState({ top: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHovered && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.top + rect.height / 2 });
    }
  }, [isHovered]);

  if (!show) return <>{children}</>;

  return (
    <>
      <div
        ref={buttonRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
      </div>
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="
            fixed px-4 py-2.5
            bg-gradient-to-br from-amber-950/95 via-yellow-950/95 to-amber-900/95
            text-amber-200/90 text-sm font-semibold
            rounded-lg whitespace-nowrap pointer-events-none z-[9999]
            border border-amber-700/40
            shadow-[0_8px_30px_rgba(217,119,6,0.2),0_0_20px_rgba(180,83,9,0.15),inset_0_1px_0_rgba(251,191,36,0.1)]
            backdrop-blur-md
            -translate-y-1/2
          "
          style={{
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
            left: '80px',
            top: `${position.top}px`,
          }}
        >
          <span className="relative z-10">{content}</span>
          {/* Tooltip Arrow with Elegant Golden Accent */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-px">
            <div className="w-0 h-0 border-[8px] border-transparent border-r-amber-700/40" />
            <div className="absolute top-0 left-[2px] w-0 h-0 border-[8px] border-transparent border-r-amber-950/95" />
          </div>
        </motion.div>
      )}
    </>
  );
}

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useStore((state) => state.logout);

  // Sidebar collapsed state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('adminSidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['intelligence', 'supply', 'revenue', 'staff', 'system'])
  );

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleGroup = (groupId: string) => {
    if (isCollapsed) return; // Don't toggle groups when collapsed
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path: string, exists?: boolean) => {
    if (exists === false) {
      navigate('/admin/coming-soon', { state: { intendedPath: path } });
    } else {
      navigate(path);
    }
  };

  const isPathActive = (path: string) => location.pathname === path;

  const isGroupActive = (group: NavGroup) => {
    if (group.type === 'single' && group.path) {
      return isPathActive(group.path);
    }
    if (group.type === 'group' && group.items) {
      return group.items.some((item) => isPathActive(item.path));
    }
    return false;
  };

  return (
    <motion.aside
      animate={{
        width: isCollapsed ? 64 : 256,
        boxShadow: isCollapsed
          ? '0 0 0 rgba(0, 0, 0, 0)'
          : '4px 0 24px -2px rgba(0, 0, 0, 0.4)',
      }}
      transition={{
        type: 'spring',
        stiffness: 120,
        damping: 20,
        mass: 0.8,
      }}
      className="bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen overflow-hidden relative"
    >
      {/* ===== ELEGANT EDGE COLLAPSE TRIGGER ===== */}
      <motion.div
        className="absolute top-0 right-0 h-full w-8 z-50 flex items-center justify-center group cursor-pointer"
        onClick={toggleSidebar}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Hover reveal zone with spring animation */}
        <motion.div
          className="h-20 w-1 bg-zinc-800 rounded-full flex items-center justify-center"
          whileHover={{
            width: 28,
            height: 28,
            backgroundColor: '#18181b',
            borderColor: '#3f3f46',
            borderWidth: 1,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
        >
          {/* Icon that fades in on hover */}
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="text-zinc-400"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <PanelLeftClose className="w-3.5 h-3.5 text-amber-400" />
            )}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ===== HEADER - DENSE CONSOLE STYLE ===== */}
      <div className="px-3 py-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="expanded-header"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="flex items-center gap-2 flex-1"
            >
              {/* Terminal Prompt Style */}
              <motion.div
                whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.05 }}
                transition={{ duration: 0.5 }}
                className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0"
              >
                <span className="text-amber-500 font-black text-sm">P</span>
              </motion.div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-black text-white tracking-tight leading-none truncate">
                  PRAM <span className="text-amber-500">HQ</span>
                </h1>
                <p className="text-[9px] text-zinc-600 font-mono tracking-widest uppercase leading-tight mt-0.5">
                  ADMIN CONSOLE
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed-header"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
              className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto"
            >
              <span className="text-amber-500 font-black text-sm">P</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== NAVIGATION - DENSE GROUPS ===== */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar">
        {isCollapsed ? (
          // COLLAPSED MODE: Show ALL pages in priority order
          <>
            {/* Command Center - Always first */}
            <Tooltip content="Command Center" show={true}>
              <motion.button
                onClick={() => handleNavigation('/admin/command-center', true)}
                whileHover={{ scale: 1.08, x: 2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`
                  flex items-center justify-center w-full px-2 py-2.5 rounded-lg mb-1.5 transition-all
                  ${
                    isPathActive('/admin/command-center')
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-500/10'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
                  }
                `}
              >
                <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
              </motion.button>
            </Tooltip>

            {/* Divider */}
            <div className="h-px bg-zinc-800/50 my-2 mx-1" />

            {/* All Pages in Priority Order */}
            {ALL_PAGES_ORDERED.map((page, index) => {
              const PageIcon = page.icon;
              const pageActive = isPathActive(page.path);

              return (
                <Tooltip key={page.path} content={page.name} show={true}>
                  <motion.button
                    onClick={() => handleNavigation(page.path, page.exists)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * 0.03,
                      type: 'spring',
                      stiffness: 300,
                      damping: 25,
                    }}
                    whileHover={{ scale: 1.08, x: 2 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      flex items-center justify-center w-full px-2 py-2.5 rounded-lg mb-1.5 transition-all relative
                      ${
                        pageActive
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-500/10'
                          : page.exists === false
                            ? 'text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-400 border border-transparent opacity-60'
                            : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
                      }
                    `}
                  >
                    <PageIcon className="w-4.5 h-4.5 flex-shrink-0" />
                    {page.exists === false && (
                      <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-zinc-600 rounded-full" />
                    )}
                  </motion.button>
                </Tooltip>
              );
            })}
          </>
        ) : (
          // EXPANDED MODE: Show all groups
          NAV_GROUPS.map((group, groupIndex) => {
            const Icon = group.icon;
            const isExpanded = expandedGroups.has(group.id);
            const isActive = isGroupActive(group);

            return (
              <motion.div
                key={group.id}
                className="mb-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: groupIndex * 0.05,
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                }}
              >
              {/* Group Header / Single Item */}
              {group.type === 'single' && group.path ? (
                // Single navigation item
                <Tooltip content={group.label} show={isCollapsed}>
                  <motion.button
                    onClick={() => handleNavigation(group.path!, group.exists)}
                    whileHover={{ scale: 1.02, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`
                      flex items-center gap-2 px-2 py-2.5 rounded-lg transition-all text-xs w-full
                      ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-500/10'
                          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
                      }
                      ${isCollapsed ? 'justify-center' : ''}
                    `}
                  >
                    {!isCollapsed && (
                      <span className="text-[10px] font-mono text-zinc-600 w-5">
                        {group.index}
                      </span>
                    )}

                    <Icon className="w-4 h-4 flex-shrink-0" />

                    {!isCollapsed && (
                      <span className="font-bold tracking-tight flex-1 text-left truncate">
                        {group.label}
                      </span>
                    )}
                  </motion.button>
                </Tooltip>
              ) : (
                // Group header (collapsible) OR individual items when collapsed
                <>
                  {!isCollapsed ? (
                    // Expanded mode: Show group header with items
                    <>
                      <motion.button
                        onClick={() => toggleGroup(group.id)}
                        whileHover={{ scale: 1.02, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className={`
                          w-full flex items-center gap-2 px-2 py-2.5 rounded-lg transition-all text-xs
                          ${
                            isActive
                              ? 'bg-zinc-900 text-amber-400 border border-zinc-800'
                              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
                          }
                        `}
                      >
                        <span className="text-[10px] font-mono text-zinc-600 w-5">
                          {group.index}
                        </span>
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="font-bold tracking-tight flex-1 text-left truncate">
                          {group.label}
                        </span>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </motion.div>
                      </motion.button>

                      {/* Group Items - Dense Nested List */}
                      {group.type === 'group' && group.items && (
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-7 mt-0.5 space-y-0.5 border-l border-zinc-800 pl-3 py-1">
                                {group.items.map((item, itemIndex) => {
                                  const ItemIcon = item.icon;
                                  const itemActive = isPathActive(item.path);

                                  return (
                                    <motion.button
                                      key={item.path}
                                      onClick={() => handleNavigation(item.path, item.exists)}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{
                                        delay: itemIndex * 0.03,
                                        type: 'spring',
                                        stiffness: 300,
                                        damping: 25,
                                      }}
                                      whileHover={{ scale: 1.02, x: 2 }}
                                      whileTap={{ scale: 0.98 }}
                                      className={`
                                        w-full text-left px-2 py-1.5 rounded text-xs transition-all flex items-center gap-2
                                        ${
                                          itemActive
                                            ? 'bg-amber-500/10 text-amber-400 font-bold border-l-2 border-amber-500 -ml-[1px] shadow-lg shadow-amber-500/10'
                                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 border-l-2 border-transparent -ml-[1px]'
                                        }
                                        ${item.exists === false ? 'italic' : ''}
                                      `}
                                    >
                                      <ItemIcon className="w-3 h-3 flex-shrink-0" />
                                      <span className="flex-1">{item.name}</span>
                                      {item.exists === false && (
                                        <span className="ml-1 text-[9px] text-zinc-600">
                                          (soon)
                                        </span>
                                      )}
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}
                    </>
                  ) : null}
                </>
              )}
            </motion.div>
          );
        })
        )}
      </nav>

      {/* ===== SIGN OUT - ELEGANT STYLE ===== */}
      <div className="px-2 pb-1.5 border-t border-zinc-800 pt-1.5 bg-zinc-950/50">
        <Tooltip content="Sign Out" show={isCollapsed}>
          <motion.button
            onClick={handleSignOut}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`
              w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm
              bg-gradient-to-r from-red-500/10 to-red-600/10
              border border-red-500/30 text-red-400
              hover:from-red-500/20 hover:to-red-600/20 hover:border-red-500/50 hover:text-red-300
              hover:shadow-lg hover:shadow-red-500/20
              transition-all font-bold tracking-tight
              ${isCollapsed ? 'justify-center px-2' : 'justify-start'}
              group/signout
            `}
          >
            {!isCollapsed && (
              <div className="w-6 h-6 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 group-hover/signout:bg-red-500/20 group-hover/signout:border-red-500/30 transition-all">
                <LogOut className="w-3.5 h-3.5" />
              </div>
            )}
            {isCollapsed && <LogOut className="w-4.5 h-4.5 flex-shrink-0" />}
            {!isCollapsed && (
              <div className="flex flex-col items-start">
                <span className="text-xs font-bold">Sign Out</span>
                <span className="text-[9px] text-red-500/60 font-normal">End session</span>
              </div>
            )}
          </motion.button>
        </Tooltip>
      </div>

      {/* ===== FOOTER BRANDING - SOPHISTICATED ===== */}
      <AnimatePresence mode="wait">
        {!isCollapsed ? (
          <motion.div
            key="expanded-branding"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="px-2.5 py-1.5 border-t border-purple-500/20 bg-gradient-to-b from-zinc-950 to-black"
          >
            <div className="flex flex-col items-center justify-center gap-0.5">
              {/* Powered By Badge - Compact */}
              <div className="flex items-center gap-1 mb-0">
                <div className="w-3.5 h-3.5 rounded bg-gradient-to-br from-purple-500/20 to-violet-600/20 border border-purple-500/30 flex items-center justify-center">
                  <Code2 className="w-2 h-2 text-purple-400" />
                </div>
                <p className="text-[8px] font-bold uppercase text-purple-400/80 tracking-[0.08em]">
                  Powered By
                </p>
              </div>

              {/* Main Branding - Compact */}
              <div className="relative">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/15 via-violet-500/15 to-purple-600/15 blur-lg" />

                {/* Text Container */}
                <div className="relative bg-gradient-to-br from-zinc-900/50 to-zinc-950/50 border border-purple-500/30 rounded-md px-2.5 py-1 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-0">
                    <p className="text-[11px] font-black uppercase bg-gradient-to-r from-purple-400 via-violet-400 to-purple-500 bg-clip-text text-transparent tracking-[0.12em] leading-none">
                      JOSEA SOFTWARE
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="h-px w-1.5 bg-purple-500/40" />
                      <p className="text-[7px] font-bold uppercase text-purple-500/70 tracking-[0.18em]">
                        SOLUTIONS
                      </p>
                      <div className="h-px w-1.5 bg-purple-500/40" />
                    </div>
                  </div>

                  {/* Corner Accents - Smaller */}
                  <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-purple-500/50 rounded-tl" />
                  <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-purple-500/50 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-purple-500/50 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-purple-500/50 rounded-br" />
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed-branding"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="px-2 py-3 border-t border-zinc-900 bg-zinc-950/80"
          >
            <Tooltip content="Powered by JOSEA SOFTWARE SOLUTIONS" show={true}>
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="relative w-full flex items-center justify-center"
              >
                {/* Sophisticated Monogram Badge */}
                <div className="relative">
                  {/* Outer Glow Ring */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-violet-500/20 to-purple-600/20 rounded-lg blur-md" />

                  {/* Badge Container */}
                  <div className="relative w-10 h-10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black rounded-lg border-2 border-purple-500/40 shadow-lg shadow-purple-500/25 flex items-center justify-center overflow-hidden">
                    {/* Animated Background Gradient */}
                    <motion.div
                      animate={{
                        background: [
                          'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
                          'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
                          'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
                        ],
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0"
                    />

                    {/* JS Monogram */}
                    <div className="relative z-10">
                      <p className="text-lg font-black bg-gradient-to-br from-purple-400 via-violet-400 to-purple-500 bg-clip-text text-transparent tracking-tighter">
                        JS
                      </p>
                    </div>

                    {/* Corner Accent */}
                    <div className="absolute top-0 right-0 w-2 h-2 bg-purple-500/30 blur-sm" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 bg-violet-500/30 blur-sm" />
                  </div>
                </div>
              </motion.div>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}