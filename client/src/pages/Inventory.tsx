// ============================================
// INVENTORY MASTER V2 - EXECUTIVE EDITION
// Complete Stock Monitoring with Dead Stock Detection
// ============================================

import { useState, useEffect } from 'react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import {
  Search,
  Loader2,
  AlertCircle,
  Package,
  AlertTriangle,
  RefreshCw,
  ShoppingCart,
  Printer,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { axiosInstance } from '../api/axios';
import { useStore } from '../store/useStore';

// LocalStorage Key (shared with Restock Hub)
const HISTORY_KEY = 'pram-restock-history';

interface InventoryItem {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  updatedAt: string;
  lastSoldAt: string | null;
  lastRestockAt: string | null;
  product: {
    id: string;
    name: string;
    partNumber: string | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    sellingPrice: number;
    lowStockThreshold: number;
  };
}

interface HistoryOrder {
  id: string;
  items: Array<{
    id: string;
    name: string;
    fitment?: string;
    partNumber?: string;
    currentStock: number;
    threshold: number;
    orderQuantity: number;
    isSpecialRequest?: boolean;
  }>;
  timestamp: string;
  branch: string;
}

// Play success sound
const playSuccessSound = () => {
  try {
    const audio = new Audio('/sounds/info.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Audio play failed:', err));
  } catch (err) {
    console.log('Audio load failed:', err);
  }
};

export default function Inventory() {
  const branchId = useStore((state) => state.branchId);
  const branchName = useStore((state) => state.branchName);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [reorderMode, setReorderMode] = useState(false);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [orderQuantity, setOrderQuantity] = useState('');

  // Fetch inventory data
  const fetchInventory = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axiosInstance.get('/inventory', {
        params: {
          branchId: branchId || undefined,
        },
      });

      setInventory(response.data || []);
    } catch (err: any) {
      console.error('Error fetching inventory:', err);
      setError(err.response?.data?.message || 'Failed to load inventory data');
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [branchId]);

  // KPI Calculations
  const totalItems = inventory.length;
  const lowStockAlerts = inventory.filter(
    (item) => item.quantity <= item.product.lowStockThreshold
  ).length;

  // Filtering Logic
  const filteredInventory = inventory.filter((item) => {
    // Search filter
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      (item.product.partNumber?.toLowerCase().includes(search) ?? false) ||
      item.product.name.toLowerCase().includes(search) ||
      (item.product.vehicleMake?.toLowerCase().includes(search) ?? false);

    if (!matchesSearch) return false;

    // Reorder mode filter
    if (reorderMode) {
      return item.quantity <= item.product.lowStockThreshold;
    }

    return true;
  });

  // Dead Stock Detection: > 90 days or null
  const isDeadStock = (lastSoldAt: string | null): boolean => {
    if (!lastSoldAt) return true;
    const daysSinceLastSale = differenceInDays(new Date(), new Date(lastSoldAt));
    return daysSinceLastSale > 90;
  };

  // Handle Order Submission
  const handleOrderSubmit = () => {
    if (!selectedItem || !orderQuantity) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const qty = parseInt(orderQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    // Create order item
    const fitment = selectedItem.product.vehicleMake
      ? `${selectedItem.product.vehicleMake} ${selectedItem.product.vehicleModel || ''}`.trim()
      : undefined;

    const orderItem = {
      id: selectedItem.productId,
      name: selectedItem.product.name,
      fitment,
      partNumber: selectedItem.product.partNumber || undefined,
      currentStock: selectedItem.quantity,
      threshold: selectedItem.product.lowStockThreshold,
      orderQuantity: qty,
    };

    // Create new order
    const newOrder: HistoryOrder = {
      id: `order-${Date.now()}`,
      items: [orderItem],
      timestamp: new Date().toISOString(),
      branch: branchName,
    };

    // Save to localStorage (same as Restock Hub)
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      const history = stored ? JSON.parse(stored) : [];
      const updated = [newOrder, ...history];
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save order history:', err);
    }

    // Play success sound
    playSuccessSound();

    // Show success toast
    toast.success('Items have been ordered successfully to be restocked soon...', {
      duration: 4000,
    });

    setShowOrderModal(false);
    setOrderQuantity('');
    setSelectedItem(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 uppercase italic tracking-tight">
            Inventory Master
          </h1>
          <p className="text-zinc-500 text-sm">Complete stock monitoring with dead stock detection</p>
        </div>
        <button
          onClick={fetchInventory}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI BAR */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-6 mb-8"
      >
        {/* Total Items */}
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Total Items</p>
          </div>
          <p className="text-3xl font-black text-white">
            {new Intl.NumberFormat('en-KE').format(totalItems)} Items
          </p>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider">
              Low Stock Alerts
            </p>
          </div>
          <p className="text-3xl font-black text-white">
            {new Intl.NumberFormat('en-KE').format(lowStockAlerts)} Alerts
          </p>
        </div>
      </motion.div>

      {/* Filters Bar */}
      <div className="flex items-center gap-4 mb-6">
        {/* Smart Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Name, Part Number or Vehicle Make..."
            className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          />
        </div>

        {/* Reorder Mode Toggle */}
        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-6 py-3">
          <label
            htmlFor="reorder-toggle"
            className="text-sm font-bold text-white cursor-pointer select-none"
          >
            Reorder Mode
          </label>
          <button
            id="reorder-toggle"
            onClick={() => setReorderMode(!reorderMode)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              reorderMode ? 'bg-red-500' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                reorderMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* EXECUTIVE TABLE CARD */}
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-semibold">{error}</p>
            </div>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Search className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
              <p className="text-zinc-500 font-medium">
                {reorderMode ? 'No items need reordering' : 'No inventory items found'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-950 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-wider">
                    Part Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-wider">
                    Fitment
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-wider">
                    Stock Level
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-black text-white uppercase tracking-wider">
                    Selling Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-wider">
                    Last Sold
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-wider">
                    Last Restock
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-black text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredInventory.map((item) => {
                  const isLowStock = item.quantity <= item.product.lowStockThreshold;
                  const isDead = isDeadStock(item.lastSoldAt);

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50 transition-colors">
                      {/* 1. PART DETAILS */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-mono font-bold text-sm text-zinc-900">
                            #{item.product.partNumber || 'N/A'}
                          </p>
                          <p className="text-sm text-zinc-600 mt-1">{item.product.name}</p>
                        </div>
                      </td>

                      {/* 2. FITMENT */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-sm text-zinc-900">
                            {item.product.vehicleMake || 'Universal'}
                          </p>
                          <p className="text-sm text-zinc-500 mt-1">
                            {item.product.vehicleModel || 'All Models'}
                          </p>
                        </div>
                      </td>

                      {/* 3. STOCK LEVEL */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <p
                            className={`font-bold text-sm ${
                              isLowStock ? 'text-red-600' : 'text-emerald-600'
                            }`}
                          >
                            {item.quantity} Units
                          </p>
                          {isLowStock && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
                              LOW
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                          Min: {item.product.lowStockThreshold}
                        </p>
                      </td>

                      {/* 4. SELLING PRICE */}
                      <td className="px-6 py-4 text-right">
                        <p className="font-mono font-bold text-sm text-zinc-900">
                          KES {new Intl.NumberFormat('en-KE').format(item.product.sellingPrice)}
                        </p>
                      </td>

                      {/* 5. LAST SOLD */}
                      <td className="px-6 py-4">
                        {isDead ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                            💤 DEAD STOCK
                          </span>
                        ) : item.lastSoldAt ? (
                          <div>
                            <p className="text-sm font-semibold text-zinc-700">
                              {format(new Date(item.lastSoldAt), 'd MMM')}
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">
                              {formatDistanceToNow(new Date(item.lastSoldAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-zinc-400">Never sold</span>
                        )}
                      </td>

                      {/* 6. LAST RESTOCK */}
                      <td className="px-6 py-4">
                        {item.lastRestockAt ? (
                          <div>
                            <p className="text-sm font-semibold text-zinc-700">
                              {format(new Date(item.lastRestockAt), 'd MMM')}
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">
                              {formatDistanceToNow(new Date(item.lastRestockAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-zinc-400">-</span>
                        )}
                      </td>

                      {/* 7. ACTIONS */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Order Button */}
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setShowOrderModal(true);
                            }}
                            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            title="Create Order"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>

                          {/* Print Button */}
                          <button
                            onClick={() => window.print()}
                            className="p-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors"
                            title="Print"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ORDER MODAL */}
      <AnimatePresence>
        {showOrderModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              setShowOrderModal(false);
              setOrderQuantity('');
              setSelectedItem(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
            >
              {/* Modal Header */}
              <div className="bg-zinc-950 p-6 rounded-t-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white">Create Order</h3>
                  <p className="text-zinc-400 text-sm mt-1">Request stock replenishment</p>
                </div>
                <button
                  onClick={() => {
                    setShowOrderModal(false);
                    setOrderQuantity('');
                    setSelectedItem(null);
                  }}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {/* Product Info */}
                <div className="mb-6 p-4 bg-zinc-100 rounded-xl">
                  <p className="text-xs text-zinc-600 mb-1">Product</p>
                  <p className="font-bold text-zinc-900">{selectedItem.product.name}</p>
                  <p className="text-xs text-zinc-600 mt-2 mb-1">Part Number</p>
                  <p className="font-mono text-sm text-zinc-900">
                    #{selectedItem.product.partNumber || 'N/A'}
                  </p>
                  <p className="text-xs text-zinc-600 mt-2 mb-1">Current Stock</p>
                  <p
                    className={`font-bold text-sm ${
                      selectedItem.quantity <= selectedItem.product.lowStockThreshold
                        ? 'text-red-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {selectedItem.quantity} Units
                  </p>
                </div>

                {/* Order Quantity Input */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-zinc-900 mb-2">
                    Quantity to Order <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(e.target.value)}
                    placeholder="Enter quantity..."
                    min="1"
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg"
                    autoFocus
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowOrderModal(false);
                      setOrderQuantity('');
                      setSelectedItem(null);
                    }}
                    className="flex-1 px-6 py-3 bg-zinc-200 text-zinc-800 font-bold rounded-xl hover:bg-zinc-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleOrderSubmit}
                    disabled={!orderQuantity}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Submit Order
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
