// ============================================
// USER ROLES - HIERARCHY & PERMISSIONS MATRIX
// Visual Role Tree + Capability Overview
// ============================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  ShieldCheck,
  UserCog,
  Users,
  ArrowDown,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  Building2,
  LayoutDashboard,
  Package,
  Receipt,
  CreditCard,
  Truck,
  FileText,
  Settings,
  Lock,
  Unlock,
  Eye,
  Plus,
  GitBranch,
  TrendingUp,
  ShieldAlert,
  Database,
  Zap,
} from 'lucide-react';

// ===== ROLE CONFIGURATION =====
const ROLES = {
  OWNER: {
    label: 'Owner',
    description: 'Supreme authority with full system access',
    icon: Crown,
    color: 'amber',
    gradient: 'from-amber-500 to-yellow-500',
    bgGlow: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    shadowColor: 'shadow-amber-500/30',
  },
  ADMIN: {
    label: 'Admin',
    description: 'Enterprise-wide management and oversight',
    icon: ShieldCheck,
    color: 'violet',
    gradient: 'from-violet-500 to-purple-500',
    bgGlow: 'bg-violet-500/20',
    borderColor: 'border-violet-500/30',
    textColor: 'text-violet-400',
    shadowColor: 'shadow-violet-500/30',
  },
  MANAGER: {
    label: 'Manager',
    description: 'Branch-level operations and sales',
    icon: UserCog,
    color: 'emerald',
    gradient: 'from-emerald-500 to-green-500',
    bgGlow: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    shadowColor: 'shadow-emerald-500/30',
  },
};

// ===== PERMISSION CATEGORIES =====

const PERMISSION_CATEGORIES = [
  {
    name: 'Dashboard & Intelligence',
    icon: LayoutDashboard,
    permissions: [
      {
        key: 'command_center',
        label: 'Command Center',
        icon: Zap,
        owner: 'full' as const,
        admin: 'full' as const,
        manager: 'none' as const,
        description: 'Global business intelligence dashboard',
      },
      {
        key: 'branch_dashboard',
        label: 'Branch Dashboard',
        icon: TrendingUp,
        owner: 'full' as const,
        admin: 'full' as const,
        manager: 'full' as const,
        description: 'Branch-specific performance metrics',
      },
    ],
  },
  {
    name: 'Sales Operations',
    icon: Receipt,
    permissions: [
      {
        key: 'pos',
        label: 'Point of Sale',
        icon: Receipt,
        owner: 'full' as const,
        admin: 'full' as const,
        manager: 'full' as const,
        description: 'Process sales transactions',
      },
      {
        key: 'sales_history',
        label: 'View Sales History',
        icon: FileText,
        owner: 'full' as const,
        admin: 'full' as const,
        manager: 'partial' as const,
        description: 'Manager: Own branch only',
      },
      {
        key: 'reversals',
        label: 'Process Reversals',
        icon: AlertTriangle,
        owner: 'full' as const,
        admin: 'partial' as const,
        manager: 'none' as const,
        description: 'Admin: Requires Owner approval',
      },
      {
        key: 'discounts',
        label: 'Apply Discounts',
        icon: CreditCard,
        owner: 'full' as const,
        admin: 'full' as const,
        manager: 'partial' as const,
        description: 'Manager: Up to 10% limit',
      },
    ],
  },
  {
    name: 'Inventory Management',
    icon: Package,
    permissions: [
      {
        key: 'global_inventory',
        label: 'Global Inventory',
        icon: Database,
        owner: 'full' as const,
        admin: 'full' as const,
        manager: 'none' as const,
        description: 'View and manage all branches',
      },
      {
        key: 'branch_inventory',
        label: 'Branch Inventory',
        icon: Package,
        owner: 'full' as const,
        admin: 'full' as const,
        manager: 'partial' as const,
        description: 'Manager: View only',
      },
      {
        key: 'stock_allocation',
        label: 'Stock Allocation',
        icon: GitBranch,
        owner: 'full' as const,
        admin: 'full' as const,
        manager: 'none' as const,
        description: 'Transfer stock between branches',
      },
      {
        key: 'add_products',
        label: 'Add Products',
        icon: Plus,
        owner: 'full' as const,
        admin: 'full' as const,
        manager: 'none' as const,
        description: 'Create new product records',
      },
    ],
  },
  {
    name: 'Procurement',
    icon: Truck,
    permissions: [
      {
        key: 'create_orders',
        label: 'Create Orders',
        icon: Plus,
        owner: 'full' as const,
        admin: 'full' as const,
        manager: 'none' as const,
        description: 'Create procurement orders',
      },
      {
        key: 'approve_payments',
        label: 'Approve Payments',
        icon: CreditCard,
        owner: 'full' as const,
        admin: 'partial' as const,
        manager: 'none' as const,
        description: 'Admin: Up to KES 100K',
      },
      {
        key: 'manage_suppliers',
        label: 'Manage Suppliers',
        icon: Building2,
        owner: 'full' as const,
        admin: 'full' as const,
        manager: 'none' as const,
        description: 'Add/edit supplier records',
      },
    ],
  },
  {
    name: 'Staff Control',
    icon: Users,
    permissions: [
      {
        key: 'view_users',
        label: 'View Users',
        icon: Eye,
        owner: 'full' as const,
        admin: 'full' as const,
        manager: 'none' as const,
        description: 'View user list and stats',
      },
      {
        key: 'create_users',
        label: 'Create Users',
        icon: Plus,
        owner: 'full' as const,
        admin: 'partial' as const,
        manager: 'none' as const,
        description: 'Admin: Managers only',
      },
      {
        key: 'suspend_users',
        label: 'Suspend Users',
        icon: Lock,
        owner: 'full' as const,
        admin: 'partial' as const,
        manager: 'none' as const,
        description: 'Admin: Managers only',
      },
      {
        key: 'reset_passwords',
        label: 'Reset Passwords',
        icon: Unlock,
        owner: 'full' as const,
        admin: 'partial' as const,
        manager: 'none' as const,
        description: 'Admin: Managers only',
      },
    ],
  },
  {
    name: 'System Settings',
    icon: Settings,
    permissions: [
      {
        key: 'branch_settings',
        label: 'Branch Settings',
        icon: Building2,
        owner: 'full' as const,
        admin: 'full' as const,
        manager: 'none' as const,
        description: 'Manage branch configuration',
      },
      {
        key: 'audit_logs',
        label: 'Audit Logs',
        icon: FileText,
        owner: 'full' as const,
        admin: 'full' as const,
        manager: 'none' as const,
        description: 'View system activity logs',
      },
      {
        key: 'system_config',
        label: 'System Configuration',
        icon: Settings,
        owner: 'full' as const,
        admin: 'none' as const,
        manager: 'none' as const,
        description: 'Global system settings',
      },
    ],
  },
];

// ===== PERMISSION STATUS INDICATOR =====
interface PermissionBadgeProps {
  status: 'full' | 'partial' | 'none';
  description?: string;
}

function PermissionBadge({ status, description }: PermissionBadgeProps) {
  const config = {
    full: {
      icon: Check,
      label: 'Full Access',
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
    },
    partial: {
      icon: AlertTriangle,
      label: 'Limited',
      bg: 'bg-amber-500/20',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
    },
    none: {
      icon: X,
      label: 'No Access',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      text: 'text-red-400/60',
    },
  };

  const c = config[status];
  const Icon = c.icon;

  return (
    <div className="relative group">
      <div className={`
        flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg
        ${c.bg} ${c.border} border ${c.text} text-xs font-bold
        transition-all cursor-help
      `}>
        <Icon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{c.label}</span>
      </div>

      {/* Tooltip */}
      {description && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg
          bg-slate-800 border border-slate-700 text-xs text-slate-300 whitespace-nowrap
          opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10
          shadow-xl">
          {description}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
}

// ===== ROLE TREE NODE =====
interface RoleNodeProps {
  role: keyof typeof ROLES;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  level: number;
}

function RoleNode({ role, isExpanded, onToggle, children, level }: RoleNodeProps) {
  const config = ROLES[role];
  const Icon = config.icon;

  return (
    <div className="relative">
      {/* Connection Line from Parent */}
      {level > 0 && (
        <div className="absolute -top-8 left-1/2 w-0.5 h-8 bg-gradient-to-b from-slate-600 to-slate-700" />
      )}

      {/* Node */}
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        className={`
          relative rounded-2xl overflow-hidden cursor-pointer
          bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90
          backdrop-blur-xl border ${config.borderColor}
          shadow-lg ${config.shadowColor}
          transition-all
        `}
        onClick={onToggle}
      >
        {/* Glow Effect */}
        <div className={`absolute inset-0 ${config.bgGlow} opacity-20`} />

        <div className="relative p-5">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className={`
              p-3 rounded-xl bg-gradient-to-br ${config.gradient}
              shadow-lg ${config.shadowColor}
            `}>
              <Icon className="w-6 h-6 text-white" />
            </div>

            {/* Info */}
            <div className="flex-1">
              <h3 className={`text-lg font-black ${config.textColor}`}>{config.label}</h3>
              <p className="text-sm text-slate-400">{config.description}</p>
            </div>

            {/* Expand Indicator */}
            {children && (
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                className="text-slate-500"
              >
                <ChevronRight className="w-5 h-5" />
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {isExpanded && children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 relative"
          >
            {/* Vertical Connection Line */}
            <div className="absolute top-0 left-1/2 w-0.5 h-full bg-slate-700" />

            {/* Children Container */}
            <div className="pt-8">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== ROLE CARD (for Capability Matrix) =====
interface RoleCardProps {
  role: keyof typeof ROLES;
  isSelected: boolean;
  onSelect: () => void;
}

function RoleCard({ role, isSelected, onSelect }: RoleCardProps) {
  const config = ROLES[role];
  const Icon = config.icon;

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`
        relative w-full rounded-xl overflow-hidden text-left transition-all
        ${isSelected
          ? `bg-gradient-to-br ${config.bgGlow} border-2 ${config.borderColor}`
          : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600'
        }
      `}
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className={`
            p-2 rounded-lg
            ${isSelected
              ? `bg-gradient-to-br ${config.gradient}`
              : 'bg-slate-700'
            }
          `}>
            <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
          </div>
          <div>
            <h4 className={`font-bold ${isSelected ? config.textColor : 'text-white'}`}>
              {config.label}
            </h4>
            <p className="text-xs text-slate-400 truncate">{config.description}</p>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ===== MAIN USER ROLES PAGE =====
export default function UserRoles() {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['OWNER', 'ADMIN']));
  const [selectedRole, setSelectedRole] = useState<keyof typeof ROLES>('ADMIN');
  const [viewMode, setViewMode] = useState<'tree' | 'matrix'>('tree');

  const toggleNode = (role: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(role)) {
        newSet.delete(role);
      } else {
        newSet.add(role);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
              <ShieldAlert className="w-6 h-6 text-violet-400" />
            </div>
            User Roles
          </h1>
          <p className="text-slate-400 mt-1">Role hierarchy and permission capabilities</p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <button
            onClick={() => setViewMode('tree')}
            className={`
              px-4 py-2 rounded-lg text-sm font-bold transition-all
              ${viewMode === 'tree'
                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                : 'text-slate-400 hover:text-white'
              }
            `}
          >
            <GitBranch className="w-4 h-4 inline-block mr-2" />
            Hierarchy
          </button>
          <button
            onClick={() => setViewMode('matrix')}
            className={`
              px-4 py-2 rounded-lg text-sm font-bold transition-all
              ${viewMode === 'matrix'
                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                : 'text-slate-400 hover:text-white'
              }
            `}
          >
            <Database className="w-4 h-4 inline-block mr-2" />
            Matrix
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'tree' ? (
          // ===== TREE VIEW =====
          <motion.div
            key="tree"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            {/* Role Hierarchy Tree */}
            <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-violet-400" />
                Role Hierarchy
              </h2>

              <div className="flex flex-col items-center space-y-4">
                {/* OWNER - Top Level */}
                <div className="w-full max-w-md">
                  <RoleNode
                    role="OWNER"
                    level={0}
                    isExpanded={expandedNodes.has('OWNER')}
                    onToggle={() => toggleNode('OWNER')}
                  >
                    {/* ADMIN - Second Level */}
                    <div className="flex justify-center">
                      <div className="w-full max-w-sm">
                        <RoleNode
                          role="ADMIN"
                          level={1}
                          isExpanded={expandedNodes.has('ADMIN')}
                          onToggle={() => toggleNode('ADMIN')}
                        >
                          {/* MANAGER - Third Level */}
                          <div className="flex justify-center">
                            <div className="w-full max-w-xs">
                              <RoleNode
                                role="MANAGER"
                                level={2}
                                isExpanded={false}
                                onToggle={() => {}}
                              />
                            </div>
                          </div>
                        </RoleNode>
                      </div>
                    </div>
                  </RoleNode>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-8 pt-6 border-t border-slate-700/50">
                <p className="text-sm text-slate-400 mb-3">Hierarchy Flow</p>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  {Object.entries(ROLES).map(([key, config], index) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${config.gradient}`} />
                      <span className={`text-sm font-medium ${config.textColor}`}>{config.label}</span>
                      {index < 2 && <ArrowDown className="w-4 h-4 text-slate-600 ml-2" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Capability Matrix - Compact View */}
            <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Database className="w-5 h-5 text-violet-400" />
                Capability Matrix
              </h2>

              {/* Role Selector */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {(Object.keys(ROLES) as Array<keyof typeof ROLES>).map((role) => (
                  <RoleCard
                    key={role}
                    role={role}
                    isSelected={selectedRole === role}
                    onSelect={() => setSelectedRole(role)}
                  />
                ))}
              </div>

              {/* Permissions for Selected Role */}
              <div className="space-y-6">
                {PERMISSION_CATEGORIES.map((category) => {
                  const CategoryIcon = category.icon;
                  return (
                    <div key={category.name}>
                      <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                        <CategoryIcon className="w-4 h-4 text-slate-500" />
                        {category.name}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {category.permissions.map((perm) => {
                          const PermIcon = perm.icon;
                          const roleKey = selectedRole.toLowerCase() as 'owner' | 'admin' | 'manager';
                          const status = perm[roleKey];
                          const statusConfig = {
                            full: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
                            partial: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
                            none: { bg: 'bg-slate-800/50', border: 'border-slate-700/30', text: 'text-slate-500' },
                          };
                          const sc = statusConfig[status];

                          return (
                            <div
                              key={perm.key}
                              className={`
                                flex items-center gap-3 p-3 rounded-xl
                                ${sc.bg} border ${sc.border}
                                ${status === 'none' ? 'opacity-50' : ''}
                              `}
                            >
                              <PermIcon className={`w-4 h-4 ${sc.text}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${sc.text}`}>{perm.label}</p>
                                {perm.description && status !== 'none' && (
                                  <p className="text-xs text-slate-500 truncate">{perm.description}</p>
                                )}
                              </div>
                              <div className={`
                                w-2 h-2 rounded-full
                                ${status === 'full' ? 'bg-emerald-400' : status === 'partial' ? 'bg-amber-400' : 'bg-slate-600'}
                              `} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          // ===== MATRIX VIEW =====
          <motion.div
            key="matrix"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="overflow-x-auto"
          >
            <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50 min-w-[800px]">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Database className="w-5 h-5 text-violet-400" />
                Full Permission Matrix
              </h2>

              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="py-4 px-4 text-left text-sm font-bold text-slate-400">Permission</th>
                    {(Object.keys(ROLES) as Array<keyof typeof ROLES>).map((role) => {
                      const config = ROLES[role];
                      const Icon = config.icon;
                      return (
                        <th key={role} className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient}`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <span className={`text-sm font-bold ${config.textColor}`}>{config.label}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_CATEGORIES.map((category) => (
                    <>
                      {/* Category Header */}
                      <tr key={`cat-${category.name}`} className="bg-slate-800/30">
                        <td colSpan={4} className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <category.icon className="w-4 h-4 text-violet-400" />
                            <span className="text-sm font-bold text-violet-300">{category.name}</span>
                          </div>
                        </td>
                      </tr>
                      {/* Permissions */}
                      {category.permissions.map((perm, permIndex) => (
                        <tr
                          key={perm.key}
                          className={`
                            border-b border-slate-700/30
                            ${permIndex % 2 === 0 ? 'bg-slate-800/10' : ''}
                          `}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <perm.icon className="w-4 h-4 text-slate-500" />
                              <span className="text-sm text-slate-300">{perm.label}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <PermissionBadge status={perm.owner} description={perm.description} />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <PermissionBadge status={perm.admin} description={perm.description} />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <PermissionBadge status={perm.manager} description={perm.description} />
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/30">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs text-emerald-400">Full Access</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/20 border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span className="text-xs text-amber-400">Limited</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
                    <X className="w-3 h-3 text-red-400/60" />
                    <span className="text-xs text-red-400/60">No Access</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.entries(ROLES) as Array<[keyof typeof ROLES, typeof ROLES[keyof typeof ROLES]]>).map(([key, config]) => {
          const Icon = config.icon;
          const roleKey = key.toLowerCase() as 'owner' | 'admin' | 'manager';
          const allPermissions = PERMISSION_CATEGORIES.flatMap((c) => c.permissions) as any[];
          const fullAccess = allPermissions.filter(
            (p) => p[roleKey] === 'full'
          ).length;
          const partialAccess = allPermissions.filter(
            (p) => p[roleKey] === 'partial'
          ).length;
          const noAccess = allPermissions.filter(
            (p) => p[roleKey] === 'none'
          ).length;

          return (
            <motion.div
              key={key}
              whileHover={{ y: -4 }}
              className={`
                p-5 rounded-xl border ${config.borderColor}
                bg-gradient-to-br from-slate-900/80 to-slate-800/60
              `}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className={`font-bold ${config.textColor}`}>{config.label}</h3>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-lg font-bold text-emerald-400">{fullAccess}</p>
                  <p className="text-xs text-slate-500">Full</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-lg font-bold text-amber-400">{partialAccess}</p>
                  <p className="text-xs text-slate-500">Limited</p>
                </div>
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-lg font-bold text-red-400/60">{noAccess}</p>
                  <p className="text-xs text-slate-500">None</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
