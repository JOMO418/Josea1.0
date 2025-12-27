// ============================================
// RESTOCK HUB V2 - MARKETPLACE STYLE
// Robust API Handling + History Tracking
// ============================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  Plus,
  TrendingDown,
  ShoppingCart,
  X,
  MessageCircle,
  Package,
  Minus,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { axiosInstance } from '../api/axios';

// ===== TYPE DEFINITIONS =====

interface InventoryItem {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    partNumber: string | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    lowStockThreshold: number;
  };
}

interface ManifestItem {
  id: string;
  name: string;
  fitment?: string;
  partNumber?: string;
  currentStock: number;
  threshold: number;
  orderQuantity: number;
  isSpecialRequest?: boolean;
}

interface HistoryOrder {
  id: string;
  items: ManifestItem[];
  timestamp: string;
  branch: string;
}

// LocalStorage Key
const HISTORY_KEY = 'pram-restock-history';

// ===== UTILITY FUNCTIONS =====

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

// ===== MAIN COMPONENT =====

export default function Restock() {
  const branchName = useStore((state) => state.branchName);

  // Tab State
  const [activeTab, setActiveTab] = useState<'action' | 'history'>('action');

  // Inventory Data
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Manifest State (Cart)
  const [manifest, setManifest] = useState<ManifestItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [newPartCar, setNewPartCar] = useState('');
  const [newPartQuantity, setNewPartQuantity] = useState(1);

  // Order History (Persisted)
  const [orderHistory, setOrderHistory] = useState<HistoryOrder[]>([]);

  // ===== FETCH INVENTORY (ROBUST) =====
  useEffect(() => {
    fetchInventory();
    loadHistory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.get('/inventory');

      // Client-side filter for low stock items
      const critical = res.data.filter(
        (i: InventoryItem) => i.quantity <= i.product.lowStockThreshold
      );

      // Sort by priority: Out of stock (0) first, then by quantity ascending
      const sorted = critical.sort((a: InventoryItem, b: InventoryItem) => {
        // Out of stock items first
        if (a.quantity === 0 && b.quantity !== 0) return -1;
        if (a.quantity !== 0 && b.quantity === 0) return 1;
        // Then sort by quantity (lowest first)
        return a.quantity - b.quantity;
      });

      setLowStockItems(sorted);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError('Failed to load inventory. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  // ===== LOAD HISTORY FROM LOCALSTORAGE =====
  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setOrderHistory(parsed);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  // ===== SAVE HISTORY TO LOCALSTORAGE =====
  const saveHistory = (newOrder: HistoryOrder) => {
    try {
      const updated = [newOrder, ...orderHistory];
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      setOrderHistory(updated);
    } catch (err) {
      console.error('Failed to save history:', err);
    }
  };

  // ===== HANDLERS =====

  const addToManifest = (item: InventoryItem) => {
    // Check if already in manifest
    const exists = manifest.find((m) => m.id === item.productId);
    if (exists) return;

    const fitment = item.product.vehicleMake
      ? `${item.product.vehicleMake} ${item.product.vehicleModel || ''}`.trim()
      : undefined;

    const suggestedQty = Math.max(
      item.product.lowStockThreshold * 2 - item.quantity,
      item.product.lowStockThreshold
    );

    const manifestItem: ManifestItem = {
      id: item.productId,
      name: item.product.name,
      fitment,
      partNumber: item.product.partNumber || undefined,
      currentStock: item.quantity,
      threshold: item.product.lowStockThreshold,
      orderQuantity: suggestedQty,
    };

    setManifest([...manifest, manifestItem]);
  };

  const removeFromManifest = (id: string) => {
    setManifest(manifest.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setManifest(
      manifest.map((item) =>
        item.id === id ? { ...item, orderQuantity: quantity } : item
      )
    );
  };

  const handleRequestSpecialPart = () => {
    if (!newPartName || !newPartCar) return;

    const specialItem: ManifestItem = {
      id: `special-${Date.now()}`,
      name: newPartName,
      fitment: newPartCar,
      currentStock: 0,
      threshold: 0,
      orderQuantity: newPartQuantity,
      isSpecialRequest: true,
    };

    setManifest([...manifest, specialItem]);

    // Reset form
    setNewPartName('');
    setNewPartCar('');
    setNewPartQuantity(1);
    setIsModalOpen(false);

    // Open drawer
    setIsDrawerOpen(true);
  };

  const handleCopyWhatsApp = () => {
    let text = `*RESTOCK ORDER*\n*Branch:* ${branchName}\n*Date:* ${new Date().toLocaleString()}\n\n`;

    manifest.forEach((item, index) => {
      text += `${index + 1}. *${item.name}*\n`;
      if (item.partNumber) text += `   Part #: ${item.partNumber}\n`;
      if (item.fitment) text += `   Fitment: ${item.fitment}\n`;
      text += `   Quantity: *${item.orderQuantity}* units\n`;
      if (item.isSpecialRequest) text += `   ⚠️ Special Request\n`;
      text += `\n`;
    });

    text += `---\nTotal Items: ${manifest.length}`;

    navigator.clipboard.writeText(text);

    // Show success toast
    toast.success('Order copied to clipboard! Ready to paste in WhatsApp.', {
      duration: 3000,
    });
  };

  const handleSubmitAndSave = () => {
    if (manifest.length === 0) return;

    const newOrder: HistoryOrder = {
      id: `order-${Date.now()}`,
      items: [...manifest],
      timestamp: new Date().toISOString(),
      branch: branchName,
    };

    // Save to history
    saveHistory(newOrder);

    // Play success sound
    playSuccessSound();

    // Show success toast
    toast.success('Items have been ordered successfully to be restocked soon...', {
      duration: 4000,
    });

    // Clear manifest
    setManifest([]);
    setIsDrawerOpen(false);
  };

  // ===== UTILITY FUNCTIONS =====

  const calculateProgress = (current: number, threshold: number) => {
    if (threshold === 0) return 0;
    return Math.min((current / (threshold * 2)) * 100, 100);
  };

  const getProgressColor = (current: number, threshold: number) => {
    if (current === 0) return 'bg-red-600';
    if (current <= threshold) return 'bg-red-500';
    if (current <= threshold * 1.5) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusLabel = (current: number, threshold: number) => {
    if (current === 0) return 'OUT OF STOCK';
    if (current <= threshold) return 'CRITICAL';
    if (current <= threshold * 1.5) return 'LOW';
    return 'ADEQUATE';
  };

  // ===== RENDER =====

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* ===== HEADER ===== */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Restock Hub</h1>
            <p className="text-slate-400 text-sm">{branchName} - Inventory Management System</p>
          </div>

          {/* Request Special Part Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all shadow-2xl"
          >
            <Plus className="w-6 h-6" />
            Request Special Part
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('action')}
            className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-base transition-all ${
              activeTab === 'action'
                ? 'bg-red-600 text-white shadow-xl scale-105'
                : 'bg-zinc-900 text-slate-400 hover:bg-zinc-800'
            }`}
          >
            <TrendingDown className="w-6 h-6" />
            📉 Action Needed
            {lowStockItems.length > 0 && (
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold">
                {lowStockItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-base transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-xl scale-105'
                : 'bg-zinc-900 text-slate-400 hover:bg-zinc-800'
            }`}
          >
            <ClipboardCheck className="w-6 h-6" />
            📋 History
            {orderHistory.length > 0 && (
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold">
                {orderHistory.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ===== CONTENT AREA ===== */}
      <div className="px-8 py-8">
        {activeTab === 'action' ? (
          // TAB A: THE FEED (ACTION NEEDED)
          <div className="space-y-5">
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 mt-6 text-lg font-medium">Loading inventory...</p>
              </div>
            ) : error ? (
              <div className="text-center py-20 bg-zinc-900 rounded-2xl border-2 border-red-500/20">
                <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white mb-3">Error Loading Inventory</h3>
                <p className="text-red-400 mb-6">{error}</p>
                <button
                  onClick={fetchInventory}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  Retry
                </button>
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900 rounded-2xl border border-zinc-800">
                <Package className="w-20 h-20 text-green-500 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white mb-3">All Stock Levels Good!</h3>
                <p className="text-slate-400">No items need restocking at the moment.</p>
              </div>
            ) : (
              lowStockItems.map((item) => {
                const isInManifest = manifest.some((m) => m.id === item.productId);
                const progress = calculateProgress(item.quantity, item.product.lowStockThreshold);
                const progressColor = getProgressColor(item.quantity, item.product.lowStockThreshold);
                const statusLabel = getStatusLabel(item.quantity, item.product.lowStockThreshold);

                const fitment = item.product.vehicleMake
                  ? `${item.product.vehicleMake} ${item.product.vehicleModel || ''}`.trim()
                  : 'Universal';

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-8 hover:border-blue-500/30 transition-all shadow-xl"
                  >
                    <div className="flex items-center gap-8">
                      {/* LEFT: Part Info */}
                      <div className="flex-shrink-0 w-80">
                        <h3 className="text-2xl font-bold text-white mb-2">{item.product.name}</h3>
                        <p className="text-base text-slate-400 mb-1">{fitment}</p>
                        {item.product.partNumber && (
                          <p className="text-sm text-slate-500 font-mono">Part #: {item.product.partNumber}</p>
                        )}
                      </div>

                      {/* CENTER: Health Bar */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-bold text-white">
                            {item.quantity} / {item.product.lowStockThreshold} Units
                          </span>
                          <span
                            className={`text-sm font-black px-4 py-2 rounded-lg ${
                              statusLabel === 'OUT OF STOCK'
                                ? 'bg-red-600 text-white'
                                : statusLabel === 'CRITICAL'
                                ? 'bg-red-500 text-white'
                                : statusLabel === 'LOW'
                                ? 'bg-yellow-500 text-black'
                                : 'bg-green-500 text-white'
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <div className="w-full h-4 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                          <div
                            className={`h-full ${progressColor} transition-all duration-700`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* RIGHT: Action Button */}
                      <div className="flex-shrink-0">
                        {isInManifest ? (
                          <button
                            disabled
                            className="px-8 py-4 bg-zinc-800 text-slate-500 rounded-xl font-bold cursor-not-allowed flex items-center gap-3 text-lg"
                          >
                            <ShoppingCart className="w-6 h-6" />
                            Added
                          </button>
                        ) : (
                          <button
                            onClick={() => addToManifest(item)}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-2xl hover:scale-105 flex items-center gap-3 text-lg"
                          >
                            <Plus className="w-6 h-6" />
                            Add to Order
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        ) : (
          // TAB B: HISTORY
          <div className="space-y-5">
            {orderHistory.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900 rounded-2xl border border-zinc-800">
                <Calendar className="w-20 h-20 text-slate-600 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white mb-3">No Order History</h3>
                <p className="text-slate-400">Your submitted orders will appear here.</p>
              </div>
            ) : (
              orderHistory.map((order) => (
                <div
                  key={order.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        Order #{order.id.slice(-8).toUpperCase()}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {new Date(order.timestamp).toLocaleString()} • {order.branch}
                      </p>
                    </div>
                    <div className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                      <span className="text-blue-400 font-bold text-sm">
                        {order.items.length} Items
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-3 px-4 bg-zinc-800/50 rounded-lg border border-zinc-700"
                      >
                        <div className="flex-1">
                          <span className="text-white font-semibold text-base">{item.name}</span>
                          {item.fitment && (
                            <span className="text-slate-400 text-sm ml-3">({item.fitment})</span>
                          )}
                          {item.isSpecialRequest && (
                            <span className="ml-3 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded font-bold">
                              SPECIAL
                            </span>
                          )}
                        </div>
                        <span className="text-white font-bold text-lg">
                          {item.orderQuantity} units
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ===== FLOATING ACTION BUTTON (ORDER CART) ===== */}
      {manifest.length > 0 && !isDrawerOpen && (
        <motion.button
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          onClick={() => setIsDrawerOpen(true)}
          className="fixed bottom-10 right-10 px-8 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl font-black text-xl flex items-center gap-4 z-40 hover:scale-110 transition-transform"
        >
          <ShoppingCart className="w-7 h-7" />
          🛒 Review Order ({manifest.length})
        </motion.button>
      )}

      {/* ===== ORDER DRAWER ===== */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-screen w-96 bg-zinc-900 border-l-2 border-zinc-700 z-50 flex flex-col shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b-2 border-zinc-800 flex items-center justify-between bg-zinc-950">
                <h2 className="text-2xl font-black text-white">Current Order</h2>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {manifest.map((item) => (
                  <div
                    key={item.id}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-base">{item.name}</h3>
                        {item.fitment && (
                          <p className="text-sm text-slate-400 mt-1">{item.fitment}</p>
                        )}
                        {item.partNumber && (
                          <p className="text-xs text-slate-500 mt-1 font-mono">Part #: {item.partNumber}</p>
                        )}
                        {item.isSpecialRequest && (
                          <span className="inline-block mt-2 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded font-bold">
                            SPECIAL REQUEST
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromManifest(item.id)}
                        className="p-1 hover:bg-red-500/20 rounded text-red-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Quantity Control */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-400 font-medium">Qty:</span>
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.orderQuantity - 1)}
                          className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded text-white transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.orderQuantity}
                          onChange={(e) =>
                            updateQuantity(item.id, parseInt(e.target.value) || 1)
                          }
                          className="flex-1 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => updateQuantity(item.id, item.orderQuantity + 1)}
                          className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded text-white transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Drawer Footer */}
              <div className="px-6 py-5 border-t-2 border-zinc-800 space-y-4 bg-zinc-950">
                <div className="flex items-center justify-between text-white">
                  <span className="font-bold text-lg">Total Items:</span>
                  <span className="text-3xl font-black text-blue-500">{manifest.length}</span>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={handleCopyWhatsApp}
                    className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all text-base"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Copy for WhatsApp
                  </button>
                  <button
                    onClick={handleSubmitAndSave}
                    className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-base shadow-lg"
                  >
                    <ClipboardCheck className="w-5 h-5" />
                    Submit & Save
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== CUSTOM ITEM MODAL ===== */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center"
            />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-zinc-900 border-2 border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg">
                {/* Modal Header */}
                <div className="px-8 py-6 border-b-2 border-zinc-800 flex items-center justify-between bg-zinc-950">
                  <h2 className="text-2xl font-black text-white">Request Special Part</h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="px-8 py-6 space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">
                      Part Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newPartName}
                      onChange={(e) => setNewPartName(e.target.value)}
                      placeholder="e.g., Brake Pads"
                      className="w-full px-4 py-3 bg-zinc-800 border-2 border-zinc-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">
                      Car Model <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newPartCar}
                      onChange={(e) => setNewPartCar(e.target.value)}
                      placeholder="e.g., Toyota Corolla 2015"
                      className="w-full px-4 py-3 bg-zinc-800 border-2 border-zinc-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newPartQuantity}
                      onChange={(e) => setNewPartQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-3 bg-zinc-800 border-2 border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-8 py-6 border-t-2 border-zinc-800 flex gap-4 bg-zinc-950">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestSpecialPart}
                    disabled={!newPartName || !newPartCar}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-slate-500 text-white rounded-xl font-bold transition-all disabled:cursor-not-allowed shadow-lg"
                  >
                    Add to Order
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
