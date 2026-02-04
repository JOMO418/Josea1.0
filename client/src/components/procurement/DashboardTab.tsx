// ============================================
// PROCUREMENT DASHBOARD TAB
// Overview stats, search, and quick actions
// ============================================

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Users,
  ShoppingCart,
  AlertTriangle,
  Package,
  Plus,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
  MapPin,
  DollarSign,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { procurementApi } from '../../services/procurement.service';
import type { ProcurementStats, RecentActivity, ProductSearchResult } from '../../types/procurement.types';

interface DashboardTabProps {
  onTabChange?: (tab: string) => void;
}

export default function DashboardTab({ onTabChange }: DashboardTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [stats, setStats] = useState<ProcurementStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [statsRes, activityRes] = await Promise.all([
          procurementApi.dashboard.getStats(),
          procurementApi.dashboard.getRecentActivity(10),
        ]);

        if (statsRes.data) setStats(statsRes.data);
        if (activityRes.data) setRecentActivity(activityRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const result = await procurementApi.products.searchProducts(searchQuery);
        if (result.data) {
          setSearchResults(result.data);
          setShowSearchResults(true);
        }
      } catch (error) {
        console.error('Search error:', error);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search results on click outside
  useEffect(() => {
    const handleClickOutside = () => setShowSearchResults(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Stat cards data
  const statCards = [
    {
      label: 'Total Suppliers',
      value: stats?.total_suppliers ?? 0,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      trend: '+2 this month',
      onClick: () => onTabChange?.('suppliers'),
    },
    {
      label: 'Active Orders',
      value: stats?.active_orders ?? 0,
      icon: ShoppingCart,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      trend: 'In progress',
      onClick: () => onTabChange?.('shopping-lists'),
    },
    {
      label: 'Unpaid Orders',
      value: stats?.unpaid_orders ?? 0,
      icon: AlertTriangle,
      color: stats?.unpaid_orders ? 'text-red-400' : 'text-zinc-400',
      bgColor: stats?.unpaid_orders ? 'bg-red-500/10' : 'bg-zinc-500/10',
      borderColor: stats?.unpaid_orders ? 'border-red-500/20' : 'border-zinc-500/20',
      trend: stats?.unpaid_orders ? 'Needs attention' : 'All clear',
      onClick: () => onTabChange?.('shopping-lists'),
    },
    {
      label: 'Products Listed',
      value: stats?.total_products ?? 0,
      icon: Package,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
      borderColor: 'border-violet-500/20',
      trend: 'With pricing',
      onClick: () => onTabChange?.('products'),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm text-zinc-500">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar - Hero Section */}
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Product Search</h2>
              <p className="text-xs text-zinc-500">Find products and compare prices across all suppliers</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search for brake pads, oil filters, spark plugs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
              className="w-full pl-12 pr-4 py-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl
                         text-zinc-100 placeholder-zinc-500 text-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                         transition-all duration-200"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 max-h-[400px] overflow-y-auto"
            >
              {searchResults.map((result) => (
                <div
                  key={result.product.id}
                  className="p-4 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-zinc-100">{result.product.name}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {result.product.category} {result.product.part_number && `• ${result.product.part_number}`}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded-lg">
                      {result.suppliers.length} supplier{result.suppliers.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {result.suppliers.map((s) => (
                      <div
                        key={s.supplier.id}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          s.is_best_price
                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                            : 'bg-zinc-800/50 border border-zinc-700/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                          <span className="text-xs text-zinc-300 truncate">{s.supplier.name}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`text-sm font-semibold ${s.is_best_price ? 'text-emerald-400' : 'text-zinc-200'}`}>
                            {s.currency} {s.price.toLocaleString()}
                          </span>
                          {s.is_best_price && (
                            <span className="text-[10px] text-emerald-400 font-medium">BEST</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* No results message */}
          {showSearchResults && searchQuery && searchResults.length === 0 && !isSearching && (
            <div className="mt-4 p-4 bg-zinc-800/30 rounded-lg text-center">
              <p className="text-zinc-500">No products found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.button
              key={stat.label}
              onClick={stat.onClick}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`${stat.bgColor} border ${stat.borderColor} rounded-xl p-5 text-left
                         transition-all hover:shadow-lg hover:shadow-black/20 group`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all" />
              </div>
              <p className={`text-3xl font-bold ${stat.color}`}>
                {stat.value.toLocaleString()}
              </p>
              <p className="text-sm text-zinc-400 mt-1">{stat.label}</p>
              <p className="text-xs text-zinc-600 mt-2">{stat.trend}</p>
            </motion.button>
          );
        })}
      </div>

      {/* Quick Actions & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => onTabChange?.('suppliers')}
              className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="font-medium block">New Supplier</span>
                <span className="text-xs text-blue-400/60">Add to your network</span>
              </div>
            </button>

            <button
              onClick={() => onTabChange?.('shopping-lists')}
              className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="font-medium block">New Shopping List</span>
                <span className="text-xs text-emerald-400/60">Create procurement order</span>
              </div>
            </button>

            <button
              onClick={() => onTabChange?.('products')}
              className="flex items-center gap-3 px-4 py-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl hover:bg-violet-500/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="font-medium block">Update Pricing</span>
                <span className="text-xs text-violet-400/60">Manage product prices</span>
              </div>
            </button>

            <button
              onClick={() => onTabChange?.('products')}
              className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="font-medium block">Compare Prices</span>
                <span className="text-xs text-amber-400/60">Find best deals</span>
              </div>
            </button>
          </div>
        </div>

        {/* Alerts Card */}
        {stats?.unpaid_orders ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 rounded-xl p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <span className="font-semibold text-red-400 block">Payment Required</span>
                <span className="text-xs text-red-400/60">Action needed</span>
              </div>
            </div>
            <p className="text-sm text-zinc-300 mb-4">
              You have <span className="font-bold text-red-400">{stats.unpaid_orders}</span> unpaid procurement order{stats.unpaid_orders > 1 ? 's' : ''} pending payment.
            </p>
            <button
              onClick={() => onTabChange?.('shopping-lists')}
              className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
            >
              View Orders
            </button>
          </motion.div>
        ) : (
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="font-semibold text-emerald-400 block">All Caught Up!</span>
                <span className="text-xs text-emerald-400/60">Great job</span>
              </div>
            </div>
            <p className="text-sm text-zinc-300">
              All procurement orders are paid. Your supplier relationships are in good standing.
            </p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-500" />
          Recent Activity
        </h3>
        {recentActivity.length > 0 ? (
          <div className="space-y-1">
            {recentActivity.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-zinc-800/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm text-zinc-300">{activity.description}</span>
                </div>
                <span className="text-xs text-zinc-600 group-hover:text-zinc-500">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </span>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No recent activity</p>
            <p className="text-xs text-zinc-600 mt-1">Activity will appear here as you use procurement</p>
          </div>
        )}
      </div>
    </div>
  );
}
