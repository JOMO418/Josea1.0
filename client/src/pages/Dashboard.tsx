// ============================================
// DASHBOARD PAGE - KPI OVERVIEW
// 4 Key Performance Indicator Cards
// ============================================

import {
  DollarSign,
  CreditCard,
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react';

// ===== TYPE DEFINITIONS =====

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    direction: 'up' | 'down';
    value: string;
  };
  variant: 'success' | 'warning';
}

// ===== KPI CARD COMPONENT =====

function KPICard({ title, value, icon: Icon, trend, variant }: KPICardProps) {
  const variantStyles = {
    success: {
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      trendColor: 'text-emerald-400',
    },
    warning: {
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
      trendColor: 'text-amber-400',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-xl p-6 hover:border-[var(--color-accent)] transition-all duration-200">
      <div className="flex items-start justify-between">
        {/* Left: Title & Value */}
        <div className="flex-1">
          <p className="text-sm text-slate-400 font-medium mb-2">{title}</p>
          <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>

          {/* Trend Indicator */}
          {trend && (
            <div className={`flex items-center gap-1 ${styles.trendColor} text-sm`}>
              {trend.direction === 'up' ? (
                <TrendingUp size={16} />
              ) : (
                <TrendingDown size={16} />
              )}
              <span className="font-medium">{trend.value}</span>
            </div>
          )}
        </div>

        {/* Right: Icon */}
        <div className={`${styles.iconBg} p-3 rounded-lg`}>
          <Icon className={styles.iconColor} size={24} />
        </div>
      </div>
    </div>
  );
}

// ===== MAIN DASHBOARD COMPONENT =====

export default function Dashboard() {
  // Mock data - will be replaced with real API calls
  const kpiData = {
    todaysSales: {
      value: 'KSh 847,250',
      trend: { direction: 'up' as const, value: '+12.5% from yesterday' },
    },
    pendingCredits: {
      value: 'KSh 125,400',
      trend: { direction: 'down' as const, value: '3 pending invoices' },
    },
    lowStockItems: {
      value: '14',
      trend: { direction: 'up' as const, value: '5 critical' },
    },
    activeOrders: {
      value: '28',
      trend: { direction: 'up' as const, value: '8 pending pickup' },
    },
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Kiserian Branch Overview
        </h1>
        <p className="text-slate-400">
          Real-time performance metrics and key indicators
        </p>
      </div>

      {/* KPI Grid - 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPICard
          title="Today's Sales"
          value={kpiData.todaysSales.value}
          icon={DollarSign}
          trend={kpiData.todaysSales.trend}
          variant="success"
        />

        <KPICard
          title="Pending Credits"
          value={kpiData.pendingCredits.value}
          icon={CreditCard}
          trend={kpiData.pendingCredits.trend}
          variant="warning"
        />

        <KPICard
          title="Low Stock Items"
          value={kpiData.lowStockItems.value}
          icon={AlertTriangle}
          trend={kpiData.lowStockItems.trend}
          variant="warning"
        />

        <KPICard
          title="Active Orders"
          value={kpiData.activeOrders.value}
          icon={Package}
          trend={kpiData.activeOrders.trend}
          variant="success"
        />
      </div>

      {/* Placeholder for Future Sections */}
      <div className="bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-xl p-8">
        <div className="text-center text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">Additional Widgets Coming Soon</p>
          <p className="text-sm">
            Recent sales chart, top products, and branch comparison will appear here
          </p>
        </div>
      </div>
    </div>
  );
}
