// ============================================
// PROCUREMENT MANAGEMENT PAGE
// Supplier-centric procurement workflow
// ============================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Users,
  ShoppingCart,
  CreditCard,
  RefreshCw,
} from 'lucide-react';

// Tab Components
import SuppliersProductsTab from '../../components/procurement/SuppliersProductsTab';
import ShoppingListsTab from '../../components/procurement/ShoppingListsTab';
import PaymentsTab from '../../components/procurement/PaymentsTab';

// ===== TAB CONFIGURATION =====

interface Tab {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  description: string;
}

const TABS: Tab[] = [
  {
    id: 'suppliers-products',
    label: 'Suppliers & Products',
    shortLabel: 'Suppliers',
    icon: Users,
    description: 'Manage suppliers and their product catalogs'
  },
  {
    id: 'shopping-lists',
    label: 'Shopping Lists',
    shortLabel: 'Lists',
    icon: ShoppingCart,
    description: 'Create and track procurement orders'
  },
  {
    id: 'payments',
    label: 'Payments',
    shortLabel: 'Pay',
    icon: CreditCard,
    description: 'Track and manage supplier payments'
  },
];

// ===== MAIN COMPONENT =====

export default function Procurement() {
  const [activeTab, setActiveTab] = useState('suppliers-products');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'suppliers-products':
        return <SuppliersProductsTab key={refreshKey} />;
      case 'shopping-lists':
        return <ShoppingListsTab key={refreshKey} />;
      case 'payments':
        return <PaymentsTab key={refreshKey} />;
      default:
        return <SuppliersProductsTab key={refreshKey} />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800/50 bg-gradient-to-b from-zinc-900/80 to-zinc-950 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title Row */}
          <div className="py-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-zinc-100">Procurement</h1>
                  <p className="text-xs text-zinc-500">
                    Manage suppliers, create shopping lists, and track payments
                  </p>
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide pb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center gap-2 px-4 py-3 text-sm font-medium
                    transition-all duration-200 whitespace-nowrap rounded-t-lg
                    ${
                      isActive
                        ? 'text-blue-400 bg-zinc-900/50'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>

                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-violet-500"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
