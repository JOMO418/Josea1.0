// ============================================
// DASHBOARD PAGE - MANAGER COMMAND CENTER
// High-performance KPI Overview with Real-time Data
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Banknote,
  Smartphone,
  Receipt,
  AlertTriangle,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../api/axios';
import { formatKES, formatNumber } from '../utils/formatter';
import { notifyApiError } from '../utils/notification';

// ===== TYPE DEFINITIONS =====

interface DashboardData {
  branch: {
    id: string;
    name: string;
    location: string;
  };
  todaySales: number;
  todaySalesCount: number;
  totalStock: number;
  lowStockCount: number;
  lowStockItems: any[];
  outstandingCredit: number;
  creditSalesCount: number;
  pendingTransfers: number;
  recentSales: any[];
}

interface PaymentBreakdown {
  cash: number;
  mpesa: number;
}

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  variant: 'success' | 'primary' | 'warning';
  isLoading?: boolean;
}

// ===== SKELETON LOADER =====

function SkeletonCard() {
  return (
    <div className="bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-xl p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-slate-700 rounded w-24 mb-3"></div>
          <div className="h-8 bg-slate-700 rounded w-32 mb-2"></div>
        </div>
        <div className="w-12 h-12 bg-slate-700 rounded-lg"></div>
      </div>
    </div>
  );
}

// ===== KPI CARD COMPONENT =====

function KPICard({ title, value, icon: Icon, variant, isLoading }: KPICardProps) {
  if (isLoading) {
    return <SkeletonCard />;
  }

  const variantStyles = {
    success: {
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      borderHover: 'hover:border-emerald-500/30',
    },
    primary: {
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      borderHover: 'hover:border-blue-500/30',
    },
    warning: {
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
      borderHover: 'hover:border-amber-500/30',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={`bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-xl p-6 transition-all duration-200 ${styles.borderHover}`}
    >
      <div className="flex items-start justify-between">
        {/* Left: Title & Value */}
        <div className="flex-1">
          <p className="text-sm text-slate-400 font-medium mb-2">{title}</p>
          <h3 className="text-3xl font-bold text-white font-money">{value}</h3>
        </div>

        {/* Right: Icon */}
        <div className={`${styles.iconBg} p-3 rounded-lg`}>
          <Icon className={styles.iconColor} size={24} />
        </div>
      </div>
    </div>
  );
}

// ===== STOCK HEALTH GAUGE COMPONENT =====

interface StockGaugeProps {
  lowStockCount: number;
  isLoading?: boolean;
}

function StockHealthGauge({ lowStockCount, isLoading }: StockGaugeProps) {
  const navigate = useNavigate();
  const isClickable = lowStockCount > 0;

  if (isLoading) {
    return <SkeletonCard />;
  }

  const handleClick = () => {
    if (isClickable) {
      navigate('/restock');
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-xl p-6
        transition-all duration-200
        ${
          isClickable
            ? 'hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer'
            : 'opacity-75'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-400 font-medium mb-2">Stock Health</p>
          <div className="flex items-baseline gap-2">
            <h3
              className={`text-3xl font-bold font-money ${
                lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {lowStockCount}
            </h3>
            <span className="text-sm text-slate-500">low stock items</span>
          </div>
          {isClickable && (
            <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
              <AlertTriangle size={12} />
              Click to restock
            </p>
          )}
        </div>

        {/* Gauge Visual */}
        <div className="relative w-16 h-16">
          <div
            className={`w-full h-full rounded-full flex items-center justify-center ${
              lowStockCount > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'
            }`}
          >
            <AlertTriangle
              className={lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'}
              size={28}
            />
          </div>
          {lowStockCount > 0 && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {lowStockCount > 99 ? '99+' : lowStockCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== ERROR STATE =====

function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
      <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-red-400 mb-2">Failed to Load Dashboard</h3>
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}

// ===== MAIN DASHBOARD COMPONENT =====

export default function Dashboard() {
  const branchId = useStore((state) => state.branchId);
  const branchName = useStore((state) => state.branchName);

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown>({
    cash: 0,
    mpesa: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===== FETCH DASHBOARD DATA =====
  useEffect(() => {
    const fetchDashboardData = async () => {
      // Handle missing branchId
      if (!branchId) {
        setError('Branch ID not found. Please log in again.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch main dashboard data
        const response = await api.dashboard.branch(branchId);
        const data = response.data as DashboardData;
        setDashboardData(data);

        // Fetch today's sales to calculate payment breakdown
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const salesResponse = await api.sales.list({
          branchId,
          startDate: today.toISOString(),
        });

        // Calculate payment method breakdown
        let cashTotal = 0;
        let mpesaTotal = 0;

        if (salesResponse.data.sales) {
          salesResponse.data.sales.forEach((sale: any) => {
            if (sale.payments && Array.isArray(sale.payments)) {
              sale.payments.forEach((payment: any) => {
                if (payment.method === 'CASH') {
                  cashTotal += parseFloat(payment.amount);
                } else if (payment.method === 'MPESA') {
                  mpesaTotal += parseFloat(payment.amount);
                }
              });
            }
          });
        }

        setPaymentBreakdown({ cash: cashTotal, mpesa: mpesaTotal });
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Unable to fetch dashboard data';
        setError(errorMessage);
        notifyApiError('Dashboard Error', errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchDashboardData, 60000);

    return () => clearInterval(interval);
  }, [branchId]);

  // ===== RENDER =====

  return (
    <div className="space-y-8 relative">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {branchName} Command Center
        </h1>
        <p className="text-slate-400">
          Real-time performance metrics and key indicators
        </p>
      </div>

      {/* Error State */}
      {error && !isLoading && <ErrorState message={error} />}

      {/* KPI Grid - 3 Columns on Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Today's Total Sales */}
        <KPICard
          title="Today's Total Sales"
          value={formatKES(dashboardData?.todaySales || 0)}
          icon={Banknote}
          variant="success"
          isLoading={isLoading}
        />

        {/* Cash Sales */}
        <KPICard
          title="Cash Sales"
          value={formatKES(paymentBreakdown.cash)}
          icon={Banknote}
          variant="primary"
          isLoading={isLoading}
        />

        {/* M-Pesa Sales */}
        <KPICard
          title="M-Pesa Sales"
          value={formatKES(paymentBreakdown.mpesa)}
          icon={Smartphone}
          variant="primary"
          isLoading={isLoading}
        />

        {/* Transaction Volume */}
        <KPICard
          title="Transaction Volume"
          value={formatNumber(dashboardData?.todaySalesCount || 0)}
          icon={Receipt}
          variant="success"
          isLoading={isLoading}
        />

        {/* Stock Health Gauge */}
        <StockHealthGauge
          lowStockCount={dashboardData?.lowStockCount || 0}
          isLoading={isLoading}
        />

        {/* Outstanding Credit */}
        <KPICard
          title="Outstanding Credit"
          value={formatKES(dashboardData?.outstandingCredit || 0)}
          icon={TrendingUp}
          variant="warning"
          isLoading={isLoading}
        />
      </div>

      {/* Watermark - Fixed Bottom Center */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-none z-10">
        <p className="text-xs text-gray-400/50 font-mono uppercase tracking-wider text-center">
          Powered by Josea Software Solutions
        </p>
      </div>
    </div>
  );
}
