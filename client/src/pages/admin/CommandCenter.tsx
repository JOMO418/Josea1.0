import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  Activity,
  Crown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { formatKES, shortenNumber } from '../../utils/formatter';
import { formatDistanceToNow } from 'date-fns';
import axios from '../../api/axios';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface Vitals {
  todayRevenue: number;
  yesterdayRevenue: number;
  todayProfit: number;
  yesterdayProfit: number;
  revenueTrend: number;
  profitTrend: number;
  totalDebt: number;
  inventoryValue: number;
  lowStockCount: number;
}

interface ChartDataPoint {
  name: string;
  value: number;
}

interface BranchPerformanceItem {
  name: string;
  revenue: number;
  transactions: number;
}

interface RecentActivityItem {
  id: number;
  receiptNumber: string;
  total: number;
  createdAt: string;
  isReversed: boolean;
  branch: string;
  user: string;
  itemSummary: string;
}

interface CommandCenterData {
  vitals: Vitals;
  chartData: ChartDataPoint[];
  branchPerformance: BranchPerformanceItem[];
  recentActivity: RecentActivityItem[];
  error?: boolean;
  errorMessage?: string;
}

// ============================================
// VITAL CARD WITH TREND PILL (Clickable)
// ============================================

interface VitalCardProps {
  label: string;
  value: number;
  trend: number;
  icon: React.ElementType;
  format?: 'currency' | 'number';
  link?: string;
  isAlert?: boolean;
}

const VitalCard = ({ label, value, trend, icon: Icon, format = 'currency', link, isAlert }: VitalCardProps) => {
  const formattedValue = format === 'currency' ? formatKES(value) : value.toLocaleString();
  const isPositive = trend >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  const CardContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={link ? { scale: 1.02 } : {}}
      className={`bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative ${
        link ? 'cursor-pointer hover:border-zinc-700 transition-all' : ''
      }`}
    >
      {/* Submarine Radar - Pulsing Alert Indicator */}
      {isAlert && value > 0 && (
        <div className="absolute top-4 right-4">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <Icon className="w-5 h-5 text-zinc-500" />
        <div
          className={`px-2 py-1 rounded-md flex items-center gap-1 ${
            isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
          }`}
        >
          <TrendIcon className="w-3 h-3" />
          <span className="text-xs font-bold">
            {isPositive ? '+' : ''}
            {trend.toFixed(1)}%
          </span>
        </div>
      </div>

      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold text-white font-mono">{formattedValue}</p>
    </motion.div>
  );

  if (link) {
    return (
      <a href={link} className="block">
        {CardContent}
      </a>
    );
  }

  return CardContent;
};

// ============================================
// DAILY PERFORMANCE CHART (Last 7 Days)
// ============================================

interface DailyPerformanceChartProps {
  data: ChartDataPoint[];
}

const DailyPerformanceChart = ({ data }: DailyPerformanceChartProps) => {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-black border border-zinc-700 rounded-lg p-3 shadow-xl">
        <p className="text-xs text-zinc-400 mb-2">{payload[0]?.payload?.name}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Revenue:</span>
          <span className="text-sm font-bold text-white font-mono">
            {formatKES(payload[0]?.value || 0)}
          </span>
        </div>
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-[400px] flex items-center justify-center"
      >
        <p className="text-zinc-600">No chart data available</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
      key={`chart-${data.length}-${data[0]?.value || 0}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">Daily Performance</h3>
          <p className="text-sm text-zinc-500">Revenue Trend (Last 7 Days)</p>
        </div>
        <Activity className="w-5 h-5 text-emerald-500" />
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} key={`area-${data.length}`}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#52525b"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            stroke="#52525b"
            fontSize={11}
            tickLine={false}
            tickFormatter={(value) => shortenNumber(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#revenueGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// ============================================
// LIVE TICKER (Gold Highlighting for > 5000)
// ============================================

interface LiveTickerProps {
  data: RecentActivityItem[];
}

const LiveTicker = ({ data }: LiveTickerProps) => {
  if (!data || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-[400px] flex items-center justify-center"
      >
        <p className="text-zinc-600">No recent activity</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
    >
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white">Live Ticker</h3>
        <p className="text-sm text-zinc-500">Recent transactions</p>
      </div>

      <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
        {data.map((sale, index) => {
          const isGold = sale.total > 5000;

          return (
            <motion.div
              key={sale.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-3 rounded-lg border transition-all ${
                isGold
                  ? 'border-l-4 border-amber-500 bg-amber-500/5'
                  : 'border-l-4 border-transparent bg-zinc-800/50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded font-mono">
                    {sale.branch}
                  </span>
                  {sale.isReversed && (
                    <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded font-mono">
                      REV
                    </span>
                  )}
                </div>
                <span
                  className={`text-sm font-bold font-mono ${
                    isGold ? 'text-amber-500' : 'text-emerald-500'
                  }`}
                >
                  {formatKES(sale.total)}
                </span>
              </div>

              <p className="text-xs text-zinc-500 truncate mb-1">{sale.itemSummary}</p>
              <p className="text-xs text-zinc-600">
                {formatDistanceToNow(new Date(sale.createdAt), { addSuffix: true })}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

// ============================================
// BRANCH PILLARS (Bar Chart with Leader Badge)
// ============================================

interface BranchPillarsProps {
  data: BranchPerformanceItem[];
}

const BranchPillars = ({ data }: BranchPillarsProps) => {
  if (!data || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-[300px] flex items-center justify-center"
      >
        <p className="text-zinc-600">No branch data available</p>
      </motion.div>
    );
  }

  // Gold & Steel Calculations
  const maxRevenue = Math.max(...data.map((b) => b.revenue));
  const totalRevenue = data.reduce((sum, b) => sum + b.revenue, 0);
  const avgRevenue = totalRevenue / data.length;

  // Custom label showing revenue numbers
  const CustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    const isWinner = value === maxRevenue && maxRevenue > 0;

    if (value === 0) return null;

    return (
      <g>
        {/* Crown for winner */}
        {isWinner && (
          <Crown
            x={x + width / 2 - 8}
            y={y - 28}
            className="w-4 h-4 fill-amber-500 stroke-amber-500"
          />
        )}
        {/* Revenue value */}
        <text
          x={x + width / 2}
          y={y - 8}
          fill={isWinner ? '#ffffff' : '#a1a1aa'}
          textAnchor="middle"
          fontSize={11}
          fontWeight={isWinner ? 'bold' : 'normal'}
          className="font-mono"
        >
          {shortenNumber(value)}
        </text>
      </g>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">Branch Performance</h3>
          <p className="text-sm text-zinc-500">Today's revenue by location</p>
        </div>
        <Package className="w-5 h-5 text-blue-500" />
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#52525b"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            stroke="#52525b"
            fontSize={11}
            tickLine={false}
            tickFormatter={(value) => shortenNumber(value)}
          />

          {/* Average Revenue Reference Line */}
          {avgRevenue > 0 && (
            <ReferenceLine
              y={avgRevenue}
              stroke="#71717a"
              strokeDasharray="3 3"
              label={{
                value: 'AVG',
                position: 'right',
                fill: '#71717a',
                fontSize: 10,
              }}
            />
          )}

          <Tooltip
            contentStyle={{
              backgroundColor: '#000',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
            }}
            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
            formatter={(value: any, name: string, props: any) => {
              const transactions = props.payload.transactions;
              return [
                <div key="tooltip" className="space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-zinc-400">Revenue:</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {formatKES(value)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-zinc-400">Transactions:</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {transactions}
                    </span>
                  </div>
                </div>,
                '',
              ];
            }}
          />

          {/* The Gold & Steel Bars */}
          <Bar dataKey="revenue" radius={[8, 8, 0, 0]} label={<CustomLabel />}>
            {data.map((entry, index) => {
              const isWinner = entry.revenue === maxRevenue && maxRevenue > 0;
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={isWinner ? '#f59e0b' : '#3f3f46'}
                  opacity={isWinner ? 1.0 : 0.8}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// ============================================
// LOADING SKELETON
// ============================================

const LoadingSkeleton = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-12 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="col-span-3 bg-zinc-900 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-zinc-800 rounded w-20 mb-4" />
            <div className="h-8 bg-zinc-800 rounded w-32" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-9 bg-zinc-900 rounded-xl h-[400px] animate-pulse" />
        <div className="col-span-3 bg-zinc-900 rounded-xl h-[400px] animate-pulse" />
      </div>

      <div className="bg-zinc-900 rounded-xl h-[300px] animate-pulse" />
    </div>
  );
};

// ============================================
// MAIN COMMAND CENTER
// ============================================

export default function CommandCenter() {
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      console.log('\nðŸŒ FETCHING COMMAND CENTER DATA...');
      console.log('URL:', '/admin/mission-control');

      setLoading(true);
      const response = await axios.get('/admin/mission-control');

      console.log('\nðŸ“¥ RAW RESPONSE:');
      console.log('Status:', response.status);
      console.log('Data:', response.data);
      console.log('Data Type:', typeof response.data);
      console.log('Is Object:', response.data !== null && typeof response.data === 'object');

      if (response.data?.error) {
        console.error('\nâŒ BACKEND ERROR:');
        console.error('Message:', response.data.errorMessage);
        setError(response.data?.errorMessage || 'System temporarily unavailable');
        setData(null);
      } else {
        console.log('\nâœ… DATA RECEIVED SUCCESSFULLY:');
        console.log('Vitals Object:', response.data?.vitals);
        console.log('  - todayRevenue:', response.data?.vitals?.todayRevenue);
        console.log('  - todayProfit:', response.data?.vitals?.todayProfit);
        console.log('  - lowStockCount:', response.data?.vitals?.lowStockCount);
        console.log('\nChart Data Array:', response.data?.chartData);
        console.log('  - Length:', response.data?.chartData?.length);
        console.log('  - First Item:', response.data?.chartData?.[0]);
        console.log('\nBranch Performance:', response.data?.branchPerformance?.length, 'branches');
        console.log('Recent Activity:', response.data?.recentActivity?.length, 'items');

        setData(response.data || null);
        setError(null);
      }
    } catch (err: any) {
      console.error('\nâŒ FETCH ERROR:');
      console.error('Error:', err);
      console.error('Response:', err.response);
      console.error('Message:', err.message);
      setError(err.response?.data?.message || 'Failed to load Command Center data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="bg-zinc-950 border-b border-zinc-800 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="text-sm text-zinc-500">Loading real-time data...</p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">System Error</h2>
          <p className="text-zinc-500 mb-6">{error || 'Failed to load data'}</p>
          <button
            onClick={fetchStats}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const vitals = data?.vitals || {
    todayRevenue: 0,
    yesterdayRevenue: 0,
    todayProfit: 0,
    yesterdayProfit: 0,
    revenueTrend: 0,
    profitTrend: 0,
    totalDebt: 0,
    inventoryValue: 0,
    lowStockCount: 0,
  };

  const chartData = data?.chartData || [];
  const branchPerformance = data?.branchPerformance || [];
  const recentActivity = data?.recentActivity || [];

  // Log what's being rendered
  console.log('ðŸŽ¨ Rendering Command Center with:', {
    vitalsKeys: Object.keys(vitals),
    chartPoints: chartData.length,
    branches: branchPerformance.length,
    activities: recentActivity.length,
  });

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Command Center</h1>
            <p className="text-sm text-zinc-500">Real-time business intelligence</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-mono text-emerald-500">LIVE</span>
          </div>
        </div>
      </div>

      {/* Main Content - 12 Column Grid */}
      <div className="p-6 space-y-6">
        {/* ROW 1: Vitals (4 Cards) */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <VitalCard
              label="Today's Revenue"
              value={vitals.todayRevenue || 0}
              trend={vitals.revenueTrend || 0}
              icon={Wallet}
              link="/admin/audit"
            />
          </div>
          <div className="col-span-3">
            <VitalCard
              label="Net Profit"
              value={vitals.todayProfit || 0}
              trend={vitals.profitTrend || 0}
              icon={TrendingUp}
              link="/admin/audit"
            />
          </div>
          <div className="col-span-3">
            <VitalCard
              label="Total Debt"
              value={vitals.totalDebt || 0}
              trend={0}
              icon={AlertTriangle}
              link="/admin/debts"
            />
          </div>
          <div className="col-span-3">
            <VitalCard
              label="Low Stock"
              value={vitals.lowStockCount || 0}
              trend={0}
              icon={Package}
              format="number"
              link="/admin/inventory"
              isAlert={true}
            />
          </div>
        </div>

        {/* ROW 2: Chart + Live Ticker */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-9">
            <DailyPerformanceChart data={chartData} />
          </div>
          <div className="col-span-3">
            <LiveTicker data={recentActivity} />
          </div>
        </div>

        {/* ROW 3: Branch Pillars */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            <BranchPillars data={branchPerformance} />
          </div>
        </div>
      </div>
    </div>
  );
}