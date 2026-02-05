import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  Crown,
  Medal,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  CircleDot,
  Receipt,
  CreditCard,
  RefreshCw,
  Zap,
  Target,
  X,
  ExternalLink,
  Package,
  User,
  Clock,
  Hash,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from 'recharts';
import { formatKES, shortenNumber } from '../../utils/formatter';
import { format } from 'date-fns';
import axios from '../../api/axios';

// ============================================
// BRANCH COLOR SYSTEM - 4 BRANCHES ONLY
// ============================================
const BRANCH_COLORS: Record<string, { primary: string; bg: string; text: string; border: string; gradient: string }> = {
  'Main Branch': {
    primary: '#3b82f6',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    gradient: 'from-blue-500/20 to-blue-500/5'
  },
  'Kiserian Branch': {
    primary: '#10b981',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    gradient: 'from-emerald-500/20 to-emerald-500/5'
  },
  'Kisumu Branch': {
    primary: '#f59e0b',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    gradient: 'from-amber-500/20 to-amber-500/5'
  },
  'Kakamega Branch': {
    primary: '#8b5cf6',
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    border: 'border-violet-500/30',
    gradient: 'from-violet-500/20 to-violet-500/5'
  },
};

const VALID_BRANCH_NAMES = ['Main Branch', 'Kiserian Branch', 'Kisumu Branch', 'Kakamega Branch'];

const DEFAULT_BRANCH_COLOR = {
  primary: '#71717a',
  bg: 'bg-zinc-500/10',
  text: 'text-zinc-400',
  border: 'border-zinc-500/30',
  gradient: 'from-zinc-500/20 to-zinc-500/5'
};

const getBranchColor = (branchName: string) => {
  return BRANCH_COLORS[branchName] || DEFAULT_BRANCH_COLOR;
};

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

interface BranchRanking {
  rank: number;
  name: string;
  todayRevenue: number;
  yesterdayRevenue: number;
  transactions: number;
  trend: number;
  contribution: number;
}

interface WeekComparison {
  thisWeek: number;
  lastWeek: number;
  trend: number;
}

interface RecentActivityItem {
  id: string;
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
  chartData: { name: string; value: number }[];
  branchPerformance: { name: string; revenue: number; transactions: number }[];
  recentActivity: RecentActivityItem[];
  weeklyBranchChart: Record<string, any>[];
  branchRankings: BranchRanking[];
  weekComparison: WeekComparison;
  branchNames: string[];
  error?: boolean;
  errorMessage?: string;
}

// ============================================
// ANIMATED COUNTER COMPONENT
// ============================================

const AnimatedNumber = ({ value, format: formatType = 'currency' }: { value: number; format?: 'currency' | 'number' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const stepDuration = duration / steps;
    const increment = value / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const current = Math.min(value, increment * step);
      setDisplayValue(current);

      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className="font-mono tabular-nums">
      {formatType === 'currency' ? formatKES(displayValue) : Math.round(displayValue).toLocaleString()}
    </span>
  );
};

// ============================================
// LIVE STATUS INDICATOR
// ============================================

const LiveIndicator = () => (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
    </span>
    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Live</span>
  </div>
);

// ============================================
// WEEK COMPARISON BADGE
// ============================================

const WeekComparisonBadge = ({ data }: { data: WeekComparison }) => {
  const isPositive = data.trend >= 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">This Week</p>
        <p className="text-lg font-bold text-white font-mono">{formatKES(data.thisWeek)}</p>
      </div>
      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${
        isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
      }`}>
        <TrendIcon className="w-4 h-4" />
        <span className="text-sm font-bold">{isPositive ? '+' : ''}{data.trend.toFixed(1)}%</span>
      </div>
      <div className="text-right opacity-60">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Last Week</p>
        <p className="text-sm text-zinc-400 font-mono">{formatKES(data.lastWeek)}</p>
      </div>
    </div>
  );
};

// ============================================
// VITAL STAT CARD
// ============================================

interface VitalCardProps {
  label: string;
  value: number;
  trend?: number;
  icon: React.ElementType;
  format?: 'currency' | 'number';
  accentColor?: string;
  link?: string;
  isAlert?: boolean;
}

const VitalCard = ({ label, value, trend, icon: Icon, format: formatType = 'currency', accentColor = '#10b981', link, isAlert }: VitalCardProps) => {
  const hasTrend = trend !== undefined && trend !== null;
  const isPositive = hasTrend && trend >= 0;

  const CardContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={link ? { scale: 1.02, y: -2 } : {}}
      transition={{ duration: 0.3 }}
      className={`relative overflow-hidden bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-5 ${
        link ? 'cursor-pointer hover:border-zinc-700/50' : ''
      }`}
      style={{ boxShadow: `0 0 40px -10px ${accentColor}20` }}
    >
      <div
        className="absolute top-0 right-0 w-32 h-32 opacity-10 blur-2xl"
        style={{ background: `radial-gradient(circle, ${accentColor}, transparent)` }}
      />

      {isAlert && value > 0 && (
        <div className="absolute top-4 right-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div
            className="p-2.5 rounded-xl"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <Icon className="w-5 h-5" style={{ color: accentColor }} />
          </div>

          {hasTrend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
              isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? '+' : ''}{trend.toFixed(1)}%
            </div>
          )}
        </div>

        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">
          <AnimatedNumber value={value} format={formatType} />
        </p>
      </div>
    </motion.div>
  );

  if (link) {
    return <a href={link} className="block">{CardContent}</a>;
  }

  return CardContent;
};

// ============================================
// BRANCH RANKING CARD (COMPACT)
// ============================================

const BranchRankingCard = ({ branch, index }: { branch: BranchRanking; index: number }) => {
  const colors = getBranchColor(branch.name);
  const isPositive = branch.trend >= 0;

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/20' };
    if (rank === 2) return { icon: Medal, color: 'text-zinc-300', bg: 'bg-zinc-500/20' };
    if (rank === 3) return { icon: Medal, color: 'text-orange-400', bg: 'bg-orange-500/20' };
    return { icon: Building2, color: 'text-zinc-500', bg: 'bg-zinc-800' };
  };

  const rankBadge = getRankBadge(branch.rank);
  const RankIcon = rankBadge.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative overflow-hidden bg-zinc-900/60 backdrop-blur-sm border ${colors.border} rounded-2xl p-4`}
    >
      <div className={`absolute top-3 left-3 flex items-center justify-center w-7 h-7 rounded-lg ${rankBadge.bg}`}>
        <RankIcon className={`w-3.5 h-3.5 ${rankBadge.color}`} />
      </div>

      <div
        className="absolute top-0 right-0 w-20 h-20 opacity-20 blur-3xl"
        style={{ background: colors.primary }}
      />

      <div className="ml-10">
        <div className="flex items-center gap-2 mb-2">
          <h3 className={`text-sm font-bold ${colors.text}`}>{branch.name.replace(' Branch', '')}</h3>
          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {isPositive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
            {isPositive ? '+' : ''}{branch.trend.toFixed(0)}%
          </div>
        </div>

        <p className="text-xl font-bold text-white font-mono mb-2">
          {formatKES(branch.todayRevenue)}
        </p>

        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1 text-zinc-400">
            <Receipt className="w-3 h-3" />
            <span>{branch.transactions} sales</span>
          </div>
          <div className="flex items-center gap-1 text-zinc-500">
            <CircleDot className="w-3 h-3" />
            <span>{branch.contribution.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// BRANCH RACE CHART (HORIZONTAL BAR)
// ============================================

const BranchRaceChart = ({ data }: { data: { name: string; revenue: number; transactions: number }[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-5 h-[200px] flex items-center justify-center">
        <p className="text-zinc-600 text-sm">No race data available</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map(b => b.revenue));
  const totalRevenue = data.reduce((sum, b) => sum + b.revenue, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const item = payload[0].payload;
    const colors = getBranchColor(item.name);
    const percentage = totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : '0';

    return (
      <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-xl p-3 shadow-2xl">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.primary }} />
          <span className={`text-sm font-bold ${colors.text}`}>{item.name}</span>
        </div>
        <p className="text-white font-bold font-mono text-lg">{formatKES(item.revenue)}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
          <span>{item.transactions} transactions</span>
          <span>{percentage}% of total</span>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Today's Race</h3>
            <p className="text-xs text-zinc-500">Real-time branch competition</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Total Revenue</p>
          <p className="text-sm font-bold text-white font-mono">{formatKES(totalRevenue)}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
          <XAxis
            type="number"
            stroke="#52525b"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => shortenNumber(value)}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#52525b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={90}
            tickFormatter={(value) => value.replace(' Branch', '')}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="revenue" radius={[0, 8, 8, 0]} barSize={24}>
            {data.map((entry) => {
              const isWinner = entry.revenue === maxRevenue && maxRevenue > 0;
              const colors = getBranchColor(entry.name);
              return (
                <Cell
                  key={entry.name}
                  fill={colors.primary}
                  opacity={isWinner ? 1 : 0.7}
                  stroke={isWinner ? '#fbbf24' : 'transparent'}
                  strokeWidth={isWinner ? 2 : 0}
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
// WEEKLY BRANCH PERFORMANCE CHART
// ============================================

const WeeklyBranchChart = ({ data, branchNames }: { data: Record<string, any>[]; branchNames: string[] }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-xl p-4 shadow-2xl">
        <p className="text-sm font-semibold text-white mb-3">{label}</p>
        <div className="space-y-2">
          {payload
            .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
            .map((entry: any) => {
              const colors = getBranchColor(entry.name);
              return (
                <div key={entry.name} className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className={`text-sm ${colors.text}`}>{entry.name.replace(' Branch', '')}</span>
                  </div>
                  <span className="text-sm font-bold text-white font-mono">
                    {formatKES(entry.value || 0)}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-6 h-[320px] flex items-center justify-center">
        <p className="text-zinc-600">No weekly data available</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">7-Day Trend</h3>
            <p className="text-xs text-zinc-500">Branch revenue comparison</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {branchNames.map(name => {
            const colors = getBranchColor(name);
            return (
              <div key={name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} />
                <span className={`text-[10px] ${colors.text}`}>{name.replace(' Branch', '')}</span>
              </div>
            );
          })}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#52525b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#52525b"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => shortenNumber(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          {branchNames.map(name => {
            const colors = getBranchColor(name);
            return (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={colors.primary}
                strokeWidth={2}
                dot={{ fill: colors.primary, strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// ============================================
// BRANCH SHARE PIE CHART
// ============================================

const BranchShareChart = ({ data }: { data: { name: string; revenue: number }[] }) => {
  const totalRevenue = data.reduce((sum, b) => sum + b.revenue, 0);

  const chartData = [...data]
    .map(b => ({
      name: b.name,
      value: b.revenue,
      percentage: totalRevenue > 0 ? ((b.revenue / totalRevenue) * 100).toFixed(1) : '0',
    }))
    .sort((a, b) => b.value - a.value);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const item = payload[0].payload;
    const colors = getBranchColor(item.name);

    return (
      <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-xl p-3 shadow-2xl">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.primary }} />
          <span className={`text-sm font-bold ${colors.text}`}>{item.name}</span>
        </div>
        <p className="text-white font-bold font-mono">{formatKES(item.value)}</p>
        <p className="text-xs text-zinc-400">{item.percentage}% share</p>
      </div>
    );
  };

  if (!data || data.length === 0 || totalRevenue === 0) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-5 h-full flex items-center justify-center">
        <p className="text-zinc-600 text-sm">No data available</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-5 h-full"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-violet-500/10">
          <Target className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Branch Share</h3>
          <p className="text-xs text-zinc-500">Today's contribution</p>
        </div>
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={55}
              paddingAngle={4}
              dataKey="value"
              stroke="#09090b"
              strokeWidth={2}
            >
              {chartData.map((entry) => {
                const colors = getBranchColor(entry.name);
                return <Cell key={entry.name} fill={colors.primary} />;
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-[9px] text-zinc-500 uppercase">Total</p>
            <p className="text-xs font-bold text-white font-mono">{shortenNumber(totalRevenue)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 mt-3">
        {chartData.map((item, index) => {
          const colors = getBranchColor(item.name);
          const isLeader = index === 0;

          return (
            <div
              key={item.name}
              className={`flex items-center justify-between py-1 px-2 rounded-lg ${
                isLeader ? 'bg-amber-500/10' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: colors.primary }} />
                <span className={`text-[11px] font-medium ${colors.text}`}>
                  {item.name.replace(' Branch', '')}
                </span>
                {isLeader && <Crown className="w-2.5 h-2.5 text-amber-400" />}
              </div>
              <span className="text-[10px] font-bold text-zinc-400">{item.percentage}%</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// ============================================
// WEEKLY REVENUE TREND (AREA)
// ============================================

const WeeklyRevenueTrend = ({ data }: { data: { name: string; value: number }[] }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-xl p-3 shadow-2xl">
        <p className="text-xs text-zinc-400 mb-1">{label}</p>
        <p className="text-white font-bold font-mono">{formatKES(payload[0]?.value || 0)}</p>
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-5 h-full flex items-center justify-center">
        <p className="text-zinc-600 text-sm">No trend data</p>
      </div>
    );
  }

  const totalWeek = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-5 h-full"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Weekly Total</h3>
            <p className="text-xs text-zinc-500">7-day revenue</p>
          </div>
        </div>
        <p className="text-sm font-bold text-emerald-400 font-mono">{formatKES(totalWeek)}</p>
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="name"
            stroke="#52525b"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide />
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
// SYSTEM ACTIVITY TICKER (ENHANCED WITH MODAL)
// ============================================

interface SystemActivity {
  id: string;
  type: 'sale' | 'reversal' | 'transfer' | 'stock' | 'login' | 'system';
  message: string;
  branch?: string;
  amount?: number;
  timestamp: string;
  user?: string;
  receiptNumber?: string;
  itemSummary?: string;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'sale': return { icon: Receipt, color: '#10b981', bg: 'bg-emerald-500/10' };
    case 'reversal': return { icon: RefreshCw, color: '#ef4444', bg: 'bg-red-500/10' };
    case 'transfer': return { icon: ArrowUpRight, color: '#3b82f6', bg: 'bg-blue-500/10' };
    case 'stock': return { icon: AlertTriangle, color: '#f59e0b', bg: 'bg-amber-500/10' };
    case 'login': return { icon: Activity, color: '#8b5cf6', bg: 'bg-violet-500/10' };
    default: return { icon: CircleDot, color: '#71717a', bg: 'bg-zinc-500/10' };
  }
};

// Get deep link URL based on activity type
const getContextLink = (type: string) => {
  switch (type) {
    case 'sale': return '/admin/audit';
    case 'reversal': return '/admin/audit';
    case 'transfer': return '/admin/allocation';
    case 'stock': return '/admin/inventory';
    case 'login': return '/admin/audit';
    default: return '/admin/command-center';
  }
};

// Get context link label
const getContextLabel = (type: string) => {
  switch (type) {
    case 'sale': return 'View in Sales Audit';
    case 'reversal': return 'View in Sales Audit';
    case 'transfer': return 'View Transfers';
    case 'stock': return 'View Inventory';
    case 'login': return 'View Audit Log';
    default: return 'View Details';
  }
};

// Activity Detail Modal Component
interface ActivityDetailModalProps {
  activity: SystemActivity | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

const ActivityDetailModal = ({ activity, isOpen, onClose, onNavigate }: ActivityDetailModalProps) => {
  if (!isOpen || !activity) return null;

  const iconData = getActivityIcon(activity.type);
  const IconComponent = iconData.icon;
  const branchColors = activity.branch ? getBranchColor(activity.branch) : null;
  const contextLink = getContextLink(activity.type);
  const contextLabel = getContextLabel(activity.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Glassmorphic Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Content - Glassmorphic Design */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden"
        style={{ boxShadow: `0 0 60px -15px ${iconData.color}30` }}
      >
        {/* Gradient Overlay */}
        <div
          className="absolute top-0 left-0 right-0 h-32 opacity-20"
          style={{ background: `linear-gradient(180deg, ${iconData.color}, transparent)` }}
        />

        {/* Header */}
        <div className="relative px-6 py-5 border-b border-zinc-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${iconData.bg} flex items-center justify-center`}>
              <IconComponent className="w-5 h-5" style={{ color: iconData.color }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white capitalize">{activity.type}</h3>
              <p className="text-xs text-zinc-500 font-mono">Transaction Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500 hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="relative px-6 py-5 space-y-4">
          {/* Receipt/Reference */}
          {activity.receiptNumber && (
            <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
              <Hash className="w-4 h-4 text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Receipt Number</p>
                <p className="text-sm font-mono text-white">{activity.receiptNumber}</p>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-xl">
            <Package className="w-4 h-4 text-zinc-500 mt-0.5" />
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Description</p>
              <p className="text-sm text-white">{activity.message}</p>
            </div>
          </div>

          {/* Amount */}
          {activity.amount !== undefined && (
            <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
              <Wallet className="w-4 h-4 text-zinc-500" />
              <div className="flex-1">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Amount</p>
                <p className={`text-xl font-bold font-mono ${
                  activity.type === 'reversal' ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {activity.type === 'reversal' ? '-' : ''}{formatKES(activity.amount)}
                </p>
              </div>
            </div>
          )}

          {/* Branch & User Row */}
          <div className="grid grid-cols-2 gap-3">
            {activity.branch && (
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
                <Building2 className="w-4 h-4 text-zinc-500" />
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Branch</p>
                  <p className={`text-sm font-medium ${branchColors?.text || 'text-white'}`}>
                    {activity.branch.replace(' Branch', '')}
                  </p>
                </div>
              </div>
            )}

            {activity.user && (
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
                <User className="w-4 h-4 text-zinc-500" />
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Processed By</p>
                  <p className="text-sm font-medium text-white">{activity.user}</p>
                </div>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
            <Clock className="w-4 h-4 text-zinc-500" />
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Timestamp</p>
              <p className="text-sm text-white font-mono">
                {format(new Date(activity.timestamp), 'MMM d, yyyy HH:mm:ss')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer with Deep Link */}
        <div className="relative px-6 py-4 border-t border-zinc-700/50 bg-zinc-900/50">
          <button
            onClick={() => onNavigate(contextLink)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 text-white font-semibold rounded-xl transition-all group"
          >
            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            {contextLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const SystemActivityTicker = ({ data }: { data: RecentActivityItem[] }) => {
  const navigate = useNavigate();
  const [selectedActivity, setSelectedActivity] = useState<SystemActivity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Transform sales data into system activities
  const activities: SystemActivity[] = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((item) => ({
      id: item.id,
      type: item.isReversed ? 'reversal' : 'sale',
      message: item.isReversed
        ? `Sale #${item.receiptNumber} reversed`
        : `${item.itemSummary}`,
      branch: item.branch,
      amount: item.total,
      timestamp: item.createdAt,
      user: item.user,
      receiptNumber: item.receiptNumber,
      itemSummary: item.itemSummary,
    }));
  }, [data]);

  const visibleCount = 4;
  const hasMore = activities.length > visibleCount;

  const handleActivityClick = (activity: SystemActivity) => {
    setSelectedActivity(activity);
    setIsModalOpen(true);
  };

  const handleNavigate = (path: string) => {
    setIsModalOpen(false);
    navigate(path);
  };

  if (!data || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-zinc-600" />
            <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">System Pulse</span>
          </div>
        </div>
        <div className="p-8 text-center">
          <p className="text-zinc-600 text-sm font-mono">No activity recorded today</p>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden"
      >
        {/* Classic Header Bar */}
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Live Activity</span>
            <span className="text-xs text-zinc-600 font-mono">— {format(new Date(), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-mono">{activities.length} events today</span>
          </div>
        </div>

        {/* Activity List - First few visible items */}
        <div className="divide-y divide-zinc-800/50">
          {activities.slice(0, visibleCount).map((activity, index) => {
            const iconData = getActivityIcon(activity.type);
            const IconComponent = iconData.icon;
            const branchColors = activity.branch ? getBranchColor(activity.branch) : null;

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleActivityClick(activity)}
                className="px-4 py-3 flex items-center gap-4 hover:bg-zinc-900/50 transition-colors cursor-pointer group"
              >
                {/* Timestamp */}
                <div className="w-16 flex-shrink-0">
                  <span className="text-xs font-mono text-zinc-500">
                    {format(new Date(activity.timestamp), 'HH:mm')}
                  </span>
                </div>

                {/* Icon */}
                <div className={`w-7 h-7 rounded-lg ${iconData.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <IconComponent className="w-3.5 h-3.5" style={{ color: iconData.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 truncate group-hover:text-white transition-colors">{activity.message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {activity.branch && branchColors && (
                      <span className={`text-[10px] ${branchColors.text}`}>
                        {activity.branch.replace(' Branch', '')}
                      </span>
                    )}
                    {activity.user && (
                      <span className="text-[10px] text-zinc-600">by {activity.user}</span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                {activity.amount !== undefined && (
                  <div className="flex-shrink-0 text-right">
                    <span className={`text-sm font-mono font-semibold ${
                      activity.type === 'reversal' ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {activity.type === 'reversal' ? '-' : '+'}{formatKES(activity.amount)}
                    </span>
                  </div>
                )}

                {/* Click indicator */}
                <ExternalLink className="w-3.5 h-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </motion.div>
            );
          })}
        </div>

        {/* Scrollable History Section */}
        {hasMore && (
          <div className="border-t border-zinc-800">
            <div className="px-4 py-2 bg-zinc-900/30">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Earlier Activity</span>
            </div>
            <div className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-zinc-800/30">
              {activities.slice(visibleCount).map((activity) => {
                const iconData = getActivityIcon(activity.type);
                const IconComponent = iconData.icon;
                const branchColors = activity.branch ? getBranchColor(activity.branch) : null;

                return (
                  <div
                    key={activity.id}
                    onClick={() => handleActivityClick(activity)}
                    className="px-4 py-2.5 flex items-center gap-4 hover:bg-zinc-900/50 transition-colors opacity-70 hover:opacity-100 cursor-pointer group"
                  >
                    {/* Timestamp */}
                    <div className="w-16 flex-shrink-0">
                      <span className="text-[11px] font-mono text-zinc-600">
                        {format(new Date(activity.timestamp), 'HH:mm')}
                      </span>
                    </div>

                    {/* Icon */}
                    <div className={`w-6 h-6 rounded ${iconData.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <IconComponent className="w-3 h-3" style={{ color: iconData.color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-400 truncate group-hover:text-zinc-200 transition-colors">{activity.message}</p>
                      {activity.branch && branchColors && (
                        <span className={`text-[10px] ${branchColors.text} opacity-70`}>
                          {activity.branch.replace(' Branch', '')}
                        </span>
                      )}
                    </div>

                    {/* Amount */}
                    {activity.amount !== undefined && (
                      <div className="flex-shrink-0">
                        <span className={`text-xs font-mono ${
                          activity.type === 'reversal' ? 'text-red-400/70' : 'text-emerald-400/70'
                        }`}>
                          {formatKES(activity.amount)}
                        </span>
                      </div>
                    )}

                    {/* Click indicator */}
                    <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Status Bar */}
        <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
          <span className="text-[10px] text-zinc-600 font-mono">
            Last update: {format(new Date(), 'HH:mm:ss')}
          </span>
          <span className="text-[10px] text-zinc-600">
            Click any item for details
          </span>
        </div>
      </motion.div>

      {/* Activity Detail Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <ActivityDetailModal
            activity={selectedActivity}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onNavigate={handleNavigate}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// ============================================
// LOADING SKELETON
// ============================================

const LoadingSkeleton = () => (
  <div className="p-6 space-y-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-8 bg-zinc-800 rounded-lg w-48" />
        <div className="h-4 bg-zinc-800/50 rounded w-64" />
      </div>
      <div className="h-10 bg-zinc-800 rounded-full w-32" />
    </div>
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-zinc-900 rounded-2xl p-5 h-28" />
      ))}
    </div>
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-zinc-900 rounded-2xl p-4 h-32" />
      ))}
    </div>
    <div className="bg-zinc-900 rounded-2xl h-[200px]" />
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-6 bg-zinc-900 rounded-2xl h-[300px]" />
      <div className="col-span-3 bg-zinc-900 rounded-2xl h-[300px]" />
      <div className="col-span-3 bg-zinc-900 rounded-2xl h-[300px]" />
    </div>
  </div>
);

// ============================================
// MAIN COMMAND CENTER
// ============================================

export default function CommandCenter() {
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/admin/mission-control');

      if (response.data?.error) {
        setError(response.data?.errorMessage || 'System temporarily unavailable');
        setData(null);
      } else {
        setData(response.data || null);
        setError(null);
        setLastUpdated(new Date());
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load Command Center data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Deduplicate and filter to only valid 4 branches
  const processedData = useMemo(() => {
    if (!data) return null;

    // Filter and deduplicate branchRankings to only include valid branches
    const seenBranches = new Set<string>();
    const uniqueBranchRankings = (data.branchRankings || [])
      .filter(branch => {
        if (!VALID_BRANCH_NAMES.includes(branch.name)) return false;
        if (seenBranches.has(branch.name)) return false;
        seenBranches.add(branch.name);
        return true;
      })
      .slice(0, 4);

    // Recalculate ranks after deduplication
    const rankedBranches = uniqueBranchRankings
      .sort((a, b) => b.todayRevenue - a.todayRevenue)
      .map((branch, index) => ({ ...branch, rank: index + 1 }));

    // Filter branchPerformance
    const seenPerf = new Set<string>();
    const uniqueBranchPerformance = (data.branchPerformance || [])
      .filter(branch => {
        if (!VALID_BRANCH_NAMES.includes(branch.name)) return false;
        if (seenPerf.has(branch.name)) return false;
        seenPerf.add(branch.name);
        return true;
      })
      .slice(0, 4);

    // Filter branchNames
    const uniqueBranchNames = VALID_BRANCH_NAMES.filter(name =>
      (data.branchNames || []).includes(name)
    );

    return {
      ...data,
      branchRankings: rankedBranches,
      branchPerformance: uniqueBranchPerformance,
      branchNames: uniqueBranchNames.length > 0 ? uniqueBranchNames : VALID_BRANCH_NAMES,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !processedData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">System Error</h2>
          <p className="text-zinc-500 mb-6">{error || 'Failed to load data'}</p>
          <button
            onClick={fetchStats}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors font-semibold flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    vitals,
    chartData,
    branchPerformance,
    recentActivity,
    weeklyBranchChart = [],
    branchRankings = [],
    weekComparison = { thisWeek: 0, lastWeek: 0, trend: 0 },
    branchNames = [],
  } = processedData;

  return (
    <div className="min-h-screen bg-black">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Command Center</h1>
              <p className="text-sm text-zinc-500">
                Multi-branch performance monitoring
                {lastUpdated && (
                  <span className="ml-2 text-zinc-600">
                    • Updated {format(lastUpdated, 'HH:mm:ss')}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <WeekComparisonBadge data={weekComparison} />
              <LiveIndicator />
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="p-6 space-y-5">
        {/* ROW 1: Vital Stats */}
        <div className="grid grid-cols-4 gap-4">
          <VitalCard
            label="Today's Revenue"
            value={vitals.todayRevenue || 0}
            trend={vitals.revenueTrend}
            icon={Wallet}
            accentColor="#10b981"
            link="/admin/audit"
          />
          <VitalCard
            label="Net Profit"
            value={vitals.todayProfit || 0}
            trend={vitals.profitTrend}
            icon={TrendingUp}
            accentColor="#3b82f6"
            link="/admin/audit"
          />
          <VitalCard
            label="Outstanding Debt"
            value={vitals.totalDebt || 0}
            icon={CreditCard}
            accentColor="#f59e0b"
            link="/admin/debts"
          />
          <VitalCard
            label="Low Stock Alerts"
            value={vitals.lowStockCount || 0}
            icon={AlertTriangle}
            format="number"
            accentColor="#ef4444"
            link="/admin/inventory"
            isAlert={true}
          />
        </div>

        {/* ROW 2: Branch Performance Cards - 4 branches only */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Crown className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Branch Leaderboard</h2>
            <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-full">Today</span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {branchRankings.map((branch, index) => (
              <BranchRankingCard key={branch.name} branch={branch} index={index} />
            ))}
          </div>
        </div>

        {/* ROW 3: Branch Race Chart */}
        <BranchRaceChart data={branchPerformance} />

        {/* ROW 4: System Activity Ticker */}
        <SystemActivityTicker data={recentActivity} />

        {/* ROW 5: Analytics Grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Weekly Branch Trend - Large */}
          <div className="col-span-6">
            <WeeklyBranchChart data={weeklyBranchChart} branchNames={branchNames} />
          </div>

          {/* Branch Share Pie */}
          <div className="col-span-3">
            <BranchShareChart data={branchPerformance} />
          </div>

          {/* Weekly Revenue Trend */}
          <div className="col-span-3">
            <WeeklyRevenueTrend data={chartData} />
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
      `}</style>
    </div>
  );
}
