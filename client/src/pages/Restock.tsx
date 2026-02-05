// ============================================
// RESTOCK HUB V2 - DATABASE-DRIVEN
// Real-time API Integration with Pending Order Tracking
// ============================================

import { useState, useEffect, useMemo } from 'react';
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
  Clock,
  Loader2,
  RefreshCw,
  CheckCircle2,
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

interface Branch {
  id: string;
  name: string;
  isActive: boolean;
  isHeadOffice?: boolean;
}

interface PendingTransferItem {
  productId: string;
  quantityRequested: number;
}

interface PendingTransfer {
  id: string;
  transferNumber: string;
  status: string;
  items: PendingTransferItem[];
  requestedAt: string;
}

interface OrderedProductInfo {
  quantity: number;
  transferId: string;
  transferNumber: string;
  requestedAt: string;
  status: string; // 'REQUESTED' | 'APPROVED' | 'RECEIVED' etc.
}

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
  const branchId = useStore((state) => state.branchId);

  // Tab State
  const [activeTab, setActiveTab] = useState<'action' | 'history'>('action');

  // Inventory Data
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Branches Data
  const [_branches, setBranches] = useState<Branch[]>([]);
  const [headOfficeId, setHeadOfficeId] = useState<string | null>(null);

  // Pending Transfers (for "ORDERED" badges)
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
  const [orderedProductsMap, setOrderedProductsMap] = useState<Map<string, OrderedProductInfo>>(new Map());

  // Manifest State (Cart)
  const [manifest, setManifest] = useState<ManifestItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [newPartCar, setNewPartCar] = useState('');
  const [newPartQuantity, setNewPartQuantity] = useState(1);

  // Submitting State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== FETCH ALL DATA ON MOUNT =====
  useEffect(() => {
    fetchBranches();
    fetchInventory();
    fetchPendingTransfers();
  }, []);

  // ===== FETCH BRANCHES =====
  const fetchBranches = async () => {
    try {
      const res = await axiosInstance.get('/admin/branches');
      const branchList: Branch[] = res.data.data || res.data || [];
      setBranches(branchList);

      // Find head office / main branch
      const hq = branchList.find(
        (b) => b.isHeadOffice || b.name.toLowerCase().includes('head') || b.name.toLowerCase().includes('main') || b.name.toLowerCase().includes('hq')
      );

      if (hq) {
        setHeadOfficeId(hq.id);
      } else if (branchList.length > 0) {
        // Fallback to first active branch if no HQ found
        const firstActive = branchList.find((b) => b.isActive);
        if (firstActive) {
          setHeadOfficeId(firstActive.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  // ===== FETCH INVENTORY =====
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

  // ===== FETCH PENDING TRANSFERS =====
  const fetchPendingTransfers = async () => {
    try {
      // Fetch transfers with REQUESTED or RECEIVED status from this branch
      // RECEIVED = auto-completed via closed-loop fulfillment (stock has arrived)
      const [pendingRes, receivedRes] = await Promise.all([
        axiosInstance.get('/transfers', { params: { status: 'REQUESTED' } }),
        axiosInstance.get('/transfers', { params: { status: 'RECEIVED' } }),
      ]);

      const pendingTransfersList: PendingTransfer[] = pendingRes.data.data || pendingRes.data || [];
      const receivedTransfersList: PendingTransfer[] = receivedRes.data.data || receivedRes.data || [];

      // Only show pending (not yet fulfilled) in the Pending Orders tab
      setPendingTransfers(pendingTransfersList);

      // Build a map of productId -> ordered info (includes both pending AND received)
      // Priority: RECEIVED status takes precedence (shows "RESTOCKED" instead of "ORDERED")
      const orderedMap = new Map<string, OrderedProductInfo>();

      // First, add REQUESTED transfers
      pendingTransfersList.forEach((transfer) => {
        transfer.items?.forEach((item) => {
          const existing = orderedMap.get(item.productId);
          if (existing) {
            // Sum up quantities if ordered in multiple transfers
            existing.quantity += item.quantityRequested;
          } else {
            orderedMap.set(item.productId, {
              quantity: item.quantityRequested,
              transferId: transfer.id,
              transferNumber: transfer.transferNumber,
              requestedAt: transfer.requestedAt,
              status: transfer.status,
            });
          }
        });
      });

      // Then, overlay RECEIVED transfers (takes precedence - shows RESTOCKED)
      receivedTransfersList.forEach((transfer) => {
        transfer.items?.forEach((item) => {
          const existing = orderedMap.get(item.productId);
          if (existing) {
            // Update to RECEIVED status and add quantity
            existing.status = 'RECEIVED';
            existing.quantity += item.quantityRequested;
          } else {
            orderedMap.set(item.productId, {
              quantity: item.quantityRequested,
              transferId: transfer.id,
              transferNumber: transfer.transferNumber,
              requestedAt: transfer.requestedAt,
              status: 'RECEIVED',
            });
          }
        });
      });

      setOrderedProductsMap(orderedMap);
    } catch (err) {
      console.error('Failed to fetch pending transfers:', err);
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
      if (item.isSpecialRequest) text += `   Special Request\n`;
      text += `\n`;
    });

    text += `---\nTotal Items: ${manifest.length}`;

    navigator.clipboard.writeText(text);

    // Show success toast
    toast.success('Order copied to clipboard! Ready to paste in WhatsApp.', {
      duration: 3000,
    });
  };

  const handleSubmitAndSave = async () => {
    if (manifest.length === 0) return;

    if (!headOfficeId) {
      toast.error('Unable to find Head Office. Please contact admin.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build the payload for the transfer request
      // CRITICAL: Controller expects 'quantity' not 'quantityRequested'
      const items = manifest
        .filter((item) => !item.isSpecialRequest) // Only include items with valid product IDs
        .map((item) => ({
          productId: item.id,
          quantity: item.orderQuantity,
        }));

      // Build notes for special requests
      const specialRequests = manifest.filter((item) => item.isSpecialRequest);
      let notes = '';
      if (specialRequests.length > 0) {
        notes = 'SPECIAL REQUESTS:\n' + specialRequests.map(
          (item) => `- ${item.name} (${item.fitment}) x${item.orderQuantity}`
        ).join('\n');
      }

      // Make API call to create transfer request
      await axiosInstance.post('/transfers/request', {
        items,
        toBranchId: headOfficeId,
        fromBranchId: branchId,
        notes: notes || undefined,
      });

      // Play success sound
      playSuccessSound();

      // Show success toast
      toast.success('Restock request submitted!', {
        description: 'Your order has been sent to Head Office for processing.',
        duration: 4000,
      });

      // Immediately update local ordered products map for instant visual feedback
      const now = new Date().toISOString();
      const tempTransferNumber = `TRF-PENDING-${Date.now()}`;
      setOrderedProductsMap((prevMap) => {
        const newMap = new Map(prevMap);
        manifest
          .filter((item) => !item.isSpecialRequest)
          .forEach((item) => {
            const existing = newMap.get(item.id);
            if (existing) {
              existing.quantity += item.orderQuantity;
              // Keep existing status (RECEIVED stays RECEIVED, REQUESTED stays REQUESTED)
            } else {
              newMap.set(item.id, {
                quantity: item.orderQuantity,
                transferId: tempTransferNumber,
                transferNumber: tempTransferNumber,
                requestedAt: now,
                status: 'REQUESTED', // New orders start as REQUESTED
              });
            }
          });
        return newMap;
      });

      // Clear manifest
      setManifest([]);
      setIsDrawerOpen(false);

      // Refresh pending transfers to sync with actual server data
      await fetchPendingTransfers();

    } catch (err: any) {
      // Log full error for debugging (developer only)
      console.error('Submit error:', err);
      // Show sanitized user-friendly message
      toast.error('Submission failed. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
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

  // Format relative time for pending orders
  const getRelativeTime = (dateString: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
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
            Action Needed
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
            Pending Orders
            {pendingTransfers.length > 0 && (
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold">
                {pendingTransfers.length}
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

                // Check if already ordered
                const orderedInfo = orderedProductsMap.get(item.productId);

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
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-white">
                              {item.quantity} / {item.product.lowStockThreshold} Units
                            </span>

                            {/* ORDERED / RESTOCKED Badge */}
                            {orderedInfo && (
                              orderedInfo.status === 'RECEIVED' ? (
                                // RESTOCKED Badge (Green) - Stock has arrived via closed-loop fulfillment
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg">
                                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                                  <span className="text-sm font-bold text-green-400">
                                    RESTOCKED: {orderedInfo.quantity}
                                  </span>
                                  <span className="text-xs text-green-500/70">
                                    ({getRelativeTime(orderedInfo.requestedAt)})
                                  </span>
                                </div>
                              ) : (
                                // ORDERED Badge (Amber) - Still pending
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                                  <Clock className="w-4 h-4 text-amber-400" />
                                  <span className="text-sm font-bold text-amber-400">
                                    ORDERED: {orderedInfo.quantity}
                                  </span>
                                  <span className="text-xs text-amber-500/70">
                                    ({getRelativeTime(orderedInfo.requestedAt)})
                                  </span>
                                </div>
                              )
                            )}
                          </div>

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
                        ) : orderedInfo?.status === 'RECEIVED' ? (
                          // Already restocked - can still order more if needed
                          <button
                            onClick={() => addToManifest(item)}
                            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-2xl hover:scale-105 flex items-center gap-3 text-lg"
                          >
                            <Plus className="w-6 h-6" />
                            Order More
                          </button>
                        ) : orderedInfo ? (
                          // Pending order - can update
                          <button
                            onClick={() => addToManifest(item)}
                            className="px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-2xl hover:scale-105 flex items-center gap-3 text-lg"
                          >
                            <RefreshCw className="w-6 h-6" />
                            Update Order
                          </button>
                        ) : (
                          // No existing order
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
          // TAB B: PENDING ORDERS (Real-time from Database)
          <div className="space-y-5">
            {/* Refresh Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={fetchPendingTransfers}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {pendingTransfers.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900 rounded-2xl border border-zinc-800">
                <Calendar className="w-20 h-20 text-slate-600 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white mb-3">No Pending Orders</h3>
                <p className="text-slate-400">Your submitted orders will appear here while awaiting approval.</p>
              </div>
            ) : (
              pendingTransfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {transfer.transferNumber}
                      </h3>
                      <p className="text-sm text-slate-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {new Date(transfer.requestedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                        <span className="text-amber-400 font-bold text-sm uppercase">
                          {transfer.status}
                        </span>
                      </div>
                      <div className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                        <span className="text-blue-400 font-bold text-sm">
                          {transfer.items?.length || 0} Items
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {transfer.items?.map((item, idx) => {
                      // Find product name from low stock items if available
                      const productInfo = lowStockItems.find((lsi) => lsi.productId === item.productId);
                      const productName = productInfo?.product.name || `Product ${item.productId.slice(-6)}`;

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-3 px-4 bg-zinc-800/50 rounded-lg border border-zinc-700"
                        >
                          <div className="flex-1">
                            <span className="text-white font-semibold text-base">{productName}</span>
                          </div>
                          <span className="text-white font-bold text-lg">
                            {item.quantityRequested} units
                          </span>
                        </div>
                      );
                    })}
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
          Review Order ({manifest.length})
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
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-slate-500 text-white rounded-xl font-bold transition-all text-base shadow-lg disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <ClipboardCheck className="w-5 h-5" />
                        Submit Order
                      </>
                    )}
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
