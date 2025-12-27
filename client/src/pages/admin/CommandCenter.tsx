import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  Package,
  Activity,
  DollarSign,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatKES, shortenNumber } from '../../utils/formatter';
import { formatDistanceToNow } from 'date-fns';
import axios from '../../api/axios';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface Vitals {
  todayRevenue: number;
  monthRevenue: number;
  todayProfit: number;
  monthProfit: number;
  totalDebt: number;
  inventoryValue: number;
}

interface DailyStats {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

interface BranchSalesByHour {
  hour: number;
  branch: string;
  revenue: number;
}

interface RecentActivity {
  type: string;
  timestamp: string;
  branch: string;
  userName: string;
  amount: number;
  reference: string;
}

interface DangerZone {
  lowStockCount: number;
  pendingReversals: number;
}

interface SystemStatus {
  dbLatency: string;
  activeUsers: number;
}

interface CommandCenterData {
  vitals: Vitals;
  dailyStats: DailyStats[];
  branchSalesByHour: BranchSalesByHour[];
  recentActivity: RecentActivity[];
  dangerZone: DangerZone;
  systemStatus: SystemStatus;
  error?: boolean;
  errorMessage?: string;
}

// ============================================
// HOLOGRAPHIC VITALS CARD
// ============================================

interface VitalCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  format?: 'currency' | 'number';
  trend?: number[];
  accentColor?: string;
  danger?: boolean;
}

const VitalCard = ({
  icon: Icon,
  label,
  value,
  format = 'currency',
  accentColor = 'violet',
  danger = false,
}: VitalCardProps) => {
  const formattedValue = format === 'currency' ? formatKES(value, false) : value.toLocaleString();
  const borderColor = danger
    ? 'border-rose-500/50'
    : accentColor === 'emerald'
    ? 'border-emerald-500/50'
    : accentColor === 'amber'
    ? 'border-amber-500/50'
    : 'border-violet-500/50';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden group hover:${borderColor} transition-colors`}
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Icon Circle */}
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
          danger
            ? 'from-rose-500/20 to-rose-600/10'
            : accentColor === 'emerald'
            ? 'from-emerald-500/20 to-emerald-600/10'
            : accentColor === 'amber'
            ? 'from-amber-500/20 to-amber-600/10'
            : 'from-violet-500/20 to-violet-600/10'
        } flex items-center justify-center mb-4`}
      >
        <Icon
          className={`w-6 h-6 ${
            danger
              ? 'text-rose-400'
              : accentColor === 'emerald'
              ? 'text-emerald-400'
              : accentColor === 'amber'
              ? 'text-amber-400'
              : 'text-violet-400'
          }`}
        />
      </div>

      {/* Label */}
      <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">{label}</p>

      {/* Value */}
      <p className="text-3xl font-bold text-white font-mono">{formattedValue}</p>
    </motion.div>
  );
};

// ============================================
// PROFIT WEDGE CHART
// ============================================

interface ProfitWedgeProps {
  data: DailyStats[];
}

const ProfitWedge = ({ data }: ProfitWedgeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">The Profit Wedge</h3>
          <p className="text-sm text-slate-400">Last 7 Days Revenue vs Cost</p>
        </div>
        <Activity className="w-6 h-6 text-emerald-400" />
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => shortenNumber(value || 0)} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#fff',
            }}
            formatter={(value: number | undefined) => formatKES(value || 0)}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#34d399"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            name="Revenue"
          />
          <Area
            type="monotone"
            dataKey="cost"
            stroke="#f43f5e"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCost)"
            name="Cost"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// ============================================
// LIVE TRANSACTION STREAM
// ============================================

interface LiveStreamProps {
  activities: RecentActivity[];
}

const LiveStream = ({ activities }: LiveStreamProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 h-full"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <h3 className="text-xl font-bold text-white">Live Feed</h3>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[600px]">
        <AnimatePresence>
          {activities.map((activity, index) => (
            <motion.div
              key={activity.reference}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-3 hover:border-violet-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 mb-1">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                  <p className="text-sm text-white">
                    <span className="font-semibold text-violet-400">{activity.branch}</span> •{' '}
                    {activity.userName}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{activity.reference}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-bold text-emerald-400">
                    {shortenNumber(activity.amount)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ============================================
// BRANCH PERFORMANCE RACE CHART
// ============================================

interface BranchRaceProps {
  data: BranchSalesByHour[];
}

const BranchRace = ({ data }: BranchRaceProps) => {
  // Transform data from [ { hour: 9, branch: 'Nairobi', revenue: 5000 }, ... ]
  // to [ { time: '09:00', Nairobi: 5000, Kiserian: 2000 }, ... ]
  const transformedData = (() => {
    const hourMap = new Map<number, Record<string, any>>();

    data.forEach(({ hour, branch, revenue }) => {
      if (!hourMap.has(hour)) {
        hourMap.set(hour, { time: `${hour.toString().padStart(2, '0')}:00` });
      }
      const hourData = hourMap.get(hour)!;
      hourData[branch] = Number(revenue);
    });

    return Array.from(hourMap.values()).sort((a, b) => {
      return parseInt(a.time) - parseInt(b.time);
    });
  })();

  // Get unique branches for lines
  const branches = Array.from(new Set(data.map((d) => d.branch)));

  // Color palette for branches
  const branchColors: Record<string, string> = {
    Nairobi: '#8b5cf6',
    Kiserian: '#06b6d4',
    Headquarters: '#f59e0b',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Branch Performance Race</h3>
          <p className="text-sm text-slate-400">Hourly sales by branch (Today)</p>
        </div>
        <TrendingUp className="w-6 h-6 text-violet-400" />
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={transformedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => shortenNumber(value || 0)} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#fff',
            }}
            formatter={(value: number | undefined) => formatKES(value || 0)}
          />
          <Legend />
          {branches.map((branch, index) => (
            <Line
              key={branch}
              type="monotone"
              dataKey={branch}
              stroke={branchColors[branch] || `hsl(${index * 60}, 70%, 60%)`}
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// ============================================
// SYSTEM HUD
// ============================================

interface SystemHUDProps {
  systemStatus: SystemStatus;
}

const SystemHUD = ({ systemStatus }: SystemHUDProps) => {
  return (
    <div className="mt-6 text-xs font-mono text-slate-500 flex items-center gap-6">
      <span className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        System Status: ONLINE
      </span>
      <span>DB Latency: {systemStatus.dbLatency}</span>
      <span>Active Users: {systemStatus.activeUsers}</span>
      <span>DB: Connected</span>
    </div>
  );
};

// ============================================
// LOADING SKELETON
// ============================================

const LoadingSkeleton = () => {
  return (
    <div className="grid grid-cols-12 gap-6 p-6">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="col-span-3 bg-slate-800/50 rounded-2xl p-6 animate-pulse"
        >
          <div className="w-12 h-12 bg-slate-700 rounded-xl mb-4" />
          <div className="h-3 bg-slate-700 rounded w-20 mb-2" />
          <div className="h-8 bg-slate-700 rounded w-32" />
        </div>
      ))}
      <div className="col-span-8 bg-slate-800/50 rounded-2xl h-96 animate-pulse" />
      <div className="col-span-4 bg-slate-800/50 rounded-2xl h-96 animate-pulse" />
      <div className="col-span-12 bg-slate-800/50 rounded-2xl h-80 animate-pulse" />
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
      setLoading(true);
      const response = await axios.get('/admin/stats');

      // Check if backend returned error flag (safe fallback)
      if (response.data?.error) {
        setError(response.data?.errorMessage || 'System temporarily unavailable');
        setData(null);
      } else {
        setData(response.data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
      setData(null);
      console.error('Command Center error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Refresh every minute
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">System Error</h2>
          <p className="text-slate-400">{error || 'Failed to load data'}</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-950/50 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Command Center</h1>
            <p className="text-sm text-slate-400">Real-time business intelligence</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-xs font-mono text-emerald-400">LIVE</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6 p-6">
        {/* Top Row: Vitals */}
        <div className="col-span-3">
          <VitalCard
            icon={DollarSign}
            label="Today's Revenue"
            value={data?.vitals?.todayRevenue || 0}
            accentColor="emerald"
          />
        </div>
        <div className="col-span-3">
          <VitalCard
            icon={TrendingUp}
            label="Today's Profit"
            value={data?.vitals?.todayProfit || 0}
            accentColor="emerald"
          />
        </div>
        <div className="col-span-3">
          <VitalCard
            icon={Wallet}
            label="Total Debt"
            value={data?.vitals?.totalDebt || 0}
            accentColor="amber"
          />
        </div>
        <div className="col-span-3">
          <VitalCard
            icon={Package}
            label="Inventory Value"
            value={data?.vitals?.inventoryValue || 0}
          />
        </div>

        {/* Danger Zone Alert Cards */}
        {((data?.dangerZone?.lowStockCount || 0) > 0 || (data?.dangerZone?.pendingReversals || 0) > 0) && (
          <>
            {(data?.dangerZone?.lowStockCount || 0) > 0 && (
              <div className="col-span-3">
                <VitalCard
                  icon={AlertTriangle}
                  label="Low Stock Items"
                  value={data?.dangerZone?.lowStockCount || 0}
                  format="number"
                  danger
                />
              </div>
            )}
            {(data?.dangerZone?.pendingReversals || 0) > 0 && (
              <div className="col-span-3">
                <VitalCard
                  icon={AlertTriangle}
                  label="Pending Reversals"
                  value={data?.dangerZone?.pendingReversals || 0}
                  format="number"
                  danger
                />
              </div>
            )}
          </>
        )}

        {/* Middle Section */}
        <div className="col-span-8">
          <ProfitWedge data={data?.dailyStats || []} />
        </div>
        <div className="col-span-4">
          <LiveStream activities={data?.recentActivity || []} />
        </div>

        {/* Bottom Section */}
        <div className="col-span-12">
          <BranchRace data={data?.branchSalesByHour || []} />
        </div>

        {/* System HUD */}
        <div className="col-span-12">
          <SystemHUD systemStatus={data?.systemStatus || { dbLatency: 'N/A', activeUsers: 0 }} />
        </div>
      </div>
    </div>
  );
}
