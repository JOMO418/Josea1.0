import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Package,
  MapPin,
  Filter,
  Calendar,
  Loader2,
  Printer,
  ArrowUpRight,
} from 'lucide-react';
import axios from '../../api/axios';
import { toast, Toaster } from 'sonner';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface TransferItem {
  id: string;
  productId: string;
  quantityRequested: number;
  product: {
    id: string;
    name: string;
    partNumber: string;
    vehicleMake: string | null;
    vehicleModel: string | null;
  };
}

interface TransferRequest {
  id: string;
  transferNumber: string;
  status: 'REQUESTED' | 'APPROVED' | 'PACKED' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED';
  fromBranch: {
    id: string;
    name: string;
  };
  toBranch: {
    id: string;
    name: string;
  };
  requestedBy: {
    id: string;
    name: string;
  };
  items: TransferItem[];
  notes?: string;
  requestedAt: string;
}

interface DateGroup {
  label: string;
  date: Date;
  requests: TransferRequest[];
  isRecent: boolean;
}

// Branch breakdown for consolidated items
interface BranchBreakdown {
  branchId: string;
  branchName: string;
  qty: number;
  transferId: string;
  itemId: string;
  flattenedId: string; // Unique key for picked state: `${transferId}-${itemId}`
  status: TransferRequest['status'];
}

// Consolidated item - groups same product across multiple branches
interface ConsolidatedItem {
  productId: string;
  productName: string;
  partNumber: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  totalQuantity: number;
  breakdown: BranchBreakdown[];
}

// ============================================
// BRANCH COLOR MAP (Updated for white background)
// ============================================

const BRANCH_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Ruai: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  Utawala: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  Embakasi: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  Pipeline: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  default: { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-300' },
};

const getBranchColors = (branchName: string) => {
  return BRANCH_COLORS[branchName] || BRANCH_COLORS.default;
};

// ============================================
// DATE HELPERS
// ============================================

const formatTime12Hour = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const getDateLabel = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getDateKey = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const isRecentDate = (dateLabel: string): boolean => {
  return dateLabel === 'Today' || dateLabel === 'Yesterday';
};

const formatDateForPrint = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// ============================================
// GROUP REQUESTS BY DATE
// ============================================

const groupRequestsByDate = (requests: TransferRequest[]): DateGroup[] => {
  const groups: Record<string, TransferRequest[]> = {};

  // Group by date key
  requests.forEach((request) => {
    const key = getDateKey(request.requestedAt);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(request);
  });

  // Convert to DateGroup array and sort
  const dateGroups: DateGroup[] = Object.entries(groups).map(([_, reqs]) => {
    const firstDate = new Date(reqs[0].requestedAt);
    const label = getDateLabel(firstDate);

    // Sort requests within group by time (newest first)
    const sortedRequests = [...reqs].sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );

    return {
      label,
      date: firstDate,
      requests: sortedRequests,
      isRecent: isRecentDate(label),
    };
  });

  // Sort groups by date (newest first)
  return dateGroups.sort((a, b) => b.date.getTime() - a.date.getTime());
};

// ============================================
// CONSOLIDATE ITEMS HELPER - Groups by productId
// ============================================

const consolidateGroupItems = (requests: TransferRequest[]): ConsolidatedItem[] => {
  const productMap = new Map<string, ConsolidatedItem>();

  // Iterate through all requests and group by productId
  requests.forEach((req) => {
    req.items.forEach((item) => {
      const existing = productMap.get(item.productId);

      const breakdownEntry: BranchBreakdown = {
        branchId: req.fromBranch?.id || '',
        branchName: req.fromBranch?.name || 'Unknown',
        qty: item.quantityRequested,
        transferId: req.id,
        itemId: item.id,
        flattenedId: `${req.id}-${item.id}`,
        status: req.status,
      };

      if (existing) {
        // Add to existing product's breakdown
        existing.totalQuantity += item.quantityRequested;
        existing.breakdown.push(breakdownEntry);
      } else {
        // Create new consolidated item
        productMap.set(item.productId, {
          productId: item.productId,
          productName: item.product.name,
          partNumber: item.product.partNumber,
          vehicleMake: item.product.vehicleMake,
          vehicleModel: item.product.vehicleModel,
          totalQuantity: item.quantityRequested,
          breakdown: [breakdownEntry],
        });
      }
    });
  });

  // Convert to array and sort by product name
  return Array.from(productMap.values()).sort((a, b) =>
    a.productName.localeCompare(b.productName)
  );
};

// ============================================
// DATE GROUP COMPONENT - CONSOLIDATED PICKING STREAM
// ============================================

interface DateGroupSectionProps {
  group: DateGroup;
  onPrintDay: (group: DateGroup, consolidatedItems: ConsolidatedItem[]) => void;
  pickedItems: Set<string>;
  onBatchTogglePicked: (itemIds: string[]) => void;
  onNavigateToAllocate: (productId: string, branchIds: string[]) => void;
}

function DateGroupSection({
  group,
  onPrintDay,
  pickedItems,
  onBatchTogglePicked,
  onNavigateToAllocate,
}: DateGroupSectionProps) {
  // Default to TRUE - stays open until user manually closes it
  const [isExpanded, setIsExpanded] = useState(true);

  // Consolidate all items from all orders, grouped by productId
  const consolidatedItems = useMemo(() => consolidateGroupItems(group.requests), [group.requests]);

  // Get all flattened IDs for counting
  const allFlattenedIds = useMemo(() =>
    consolidatedItems.flatMap(item => item.breakdown.map(b => b.flattenedId)),
    [consolidatedItems]
  );

  const pendingCount = group.requests.filter(
    (r) => r.status === 'REQUESTED' || r.status === 'APPROVED'
  ).length;

  const packedCount = group.requests.filter(
    (r) => r.status === 'PACKED' || r.status === 'DISPATCHED'
  ).length;

  const restockedCount = group.requests.filter(
    (r) => r.status === 'RECEIVED'
  ).length;

  const totalProducts = consolidatedItems.length;
  const totalLineItems = allFlattenedIds.length;
  const pickedCount = allFlattenedIds.filter((id) => pickedItems.has(id)).length;

  // Check if all items in a consolidated row are picked
  const isRowFullyPicked = (item: ConsolidatedItem) =>
    item.breakdown.every((b) => pickedItems.has(b.flattenedId));

  // Check if any items in a consolidated row are picked
  const isRowPartiallyPicked = (item: ConsolidatedItem) =>
    item.breakdown.some((b) => pickedItems.has(b.flattenedId)) && !isRowFullyPicked(item);

  // Handle batch toggle for a consolidated row
  const handleRowToggle = (item: ConsolidatedItem) => {
    const itemIds = item.breakdown.map((b) => b.flattenedId);
    onBatchTogglePicked(itemIds);
  };

  return (
    <div className="mb-6">
      {/* Sticky Date Header - Dark with light text */}
      <div
        className={`
          sticky top-0 z-20 flex items-center gap-3 px-4 py-3 mb-3
          backdrop-blur-xl rounded-xl border cursor-pointer
          ${group.isRecent
            ? 'bg-zinc-900/95 border-zinc-700'
            : 'bg-zinc-900/95 border-zinc-800'
          }
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Expand/Collapse Icon */}
        <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>

        {/* Date Icon */}
        <div
          className={`
            w-9 h-9 rounded-lg flex items-center justify-center
            ${group.isRecent ? 'bg-blue-500/20' : 'bg-zinc-800'}
          `}
        >
          <Calendar className={`w-4 h-4 ${group.isRecent ? 'text-blue-400' : 'text-zinc-500'}`} />
        </div>

        {/* Date Label */}
        <div className="flex-1">
          <h3
            className={`
              font-bold text-sm uppercase tracking-wider
              ${group.isRecent ? 'text-white' : 'text-zinc-400'}
            `}
          >
            {group.label}
          </h3>
          {group.label !== 'Today' && group.label !== 'Yesterday' && (
            <p className="text-xs text-zinc-500">
              {group.date.toLocaleDateString('en-US', { weekday: 'long' })}
            </p>
          )}
        </div>

        {/* Counts */}
        <div className="flex items-center gap-3">
          {pickedCount > 0 && pickedCount < totalLineItems && (
            <span className="px-2.5 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs font-bold text-blue-400">
              {pickedCount}/{totalLineItems} picked
            </span>
          )}
          {pickedCount === totalLineItems && totalLineItems > 0 && (
            <span className="px-2.5 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-xs font-bold text-green-400">
              All picked ✓
            </span>
          )}
          {pendingCount > 0 && (
            <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-bold text-amber-400">
              {pendingCount} orders pending
            </span>
          )}
          {packedCount > 0 && (
            <span className="px-2.5 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs font-bold text-blue-400">
              {packedCount} packed
            </span>
          )}
          {restockedCount > 0 && (
            <span className="px-2.5 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-xs font-bold text-green-400">
              {restockedCount} restocked ✓
            </span>
          )}
          <span className="text-xs text-zinc-500">
            {totalProducts} product{totalProducts !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Print Day Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrintDay(group, consolidatedItems);
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-all"
        >
          <Printer className="w-3.5 h-3.5" />
          Print Day
        </button>
      </div>

      {/* Consolidated Picking Stream - Master Table */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* White Ledger Table */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_100px_1fr_80px] gap-4 px-5 py-3 bg-zinc-50 border-b border-zinc-200">
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Product Details
                </div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">
                  Total Qty
                </div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Branch Breakdown
                </div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">
                  Picked
                </div>
              </div>

              {/* Table Body - Consolidated Rows */}
              <div className="divide-y divide-zinc-100">
                {consolidatedItems.map((item) => {
                  const isFullyPicked = isRowFullyPicked(item);
                  const isPartiallyPicked = isRowPartiallyPicked(item);
                  const allCancelled = item.breakdown.every(b => b.status === 'CANCELLED');

                  return (
                    <motion.div
                      key={item.productId}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`
                        grid grid-cols-[1fr_100px_1fr_80px] gap-4 px-5 py-4 items-center
                        transition-colors duration-150
                        ${isFullyPicked ? 'bg-green-50/50' : 'bg-white hover:bg-zinc-50'}
                        ${allCancelled ? 'opacity-40' : ''}
                      `}
                    >
                      {/* Product Details - Clickable to navigate to Stock Allocation */}
                      <button
                        onClick={() => {
                          const branchIds = item.breakdown.map(b => b.branchId);
                          onNavigateToAllocate(item.productId, branchIds);
                        }}
                        className={`text-left group cursor-pointer ${isFullyPicked ? 'opacity-60' : ''}`}
                        title="Go to Stock Allocation"
                      >
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors ${isFullyPicked ? 'line-through text-zinc-500' : ''}`}>
                            {item.productName}
                          </p>
                          <ArrowUpRight className="w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:text-blue-500 transition-all -translate-y-0.5" />
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-zinc-500">
                            {item.vehicleMake && item.vehicleModel
                              ? `${item.vehicleMake} ${item.vehicleModel}`
                              : 'Universal'}
                          </span>
                          <span className="font-mono text-xs text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                            {item.partNumber}
                          </span>
                        </div>
                      </button>

                      {/* Total Quantity - Large & Prominent */}
                      <div className="flex justify-center">
                        <span className={`
                          inline-flex items-center justify-center min-w-[3.5rem] px-4 py-2
                          rounded-xl text-2xl font-black
                          ${isFullyPicked
                            ? 'bg-green-100 text-green-700 border-2 border-green-300'
                            : isPartiallyPicked
                            ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                            : 'bg-zinc-100 text-zinc-800 border-2 border-zinc-200'
                          }
                        `}>
                          {item.totalQuantity}
                        </span>
                      </div>

                      {/* Branch Breakdown - Flex-wrap badges */}
                      <div className="flex flex-wrap gap-1.5">
                        {item.breakdown.map((b) => {
                          const branchColors = getBranchColors(b.branchName);
                          const isThisItemPicked = pickedItems.has(b.flattenedId);
                          const isRestocked = b.status === 'RECEIVED';

                          return (
                            <span
                              key={b.flattenedId}
                              className={`
                                inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold
                                border transition-all
                                ${isRestocked
                                  ? 'bg-green-100 text-green-700 border-green-300'
                                  : isThisItemPicked
                                  ? 'bg-green-100 text-green-700 border-green-300 line-through opacity-60'
                                  : `${branchColors.bg} ${branchColors.text} ${branchColors.border}`
                                }
                              `}
                            >
                              {isRestocked && (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              {b.branchName}: {b.qty}
                              {isRestocked && (
                                <span className="ml-1 text-[10px] uppercase tracking-wide">RESTOCKED</span>
                              )}
                            </span>
                          );
                        })}
                      </div>

                      {/* Batch Picked Checkbox */}
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleRowToggle(item)}
                          disabled={allCancelled}
                          className={`
                            w-10 h-10 rounded-xl flex items-center justify-center
                            transition-all duration-200 border-2
                            ${isFullyPicked
                              ? 'bg-green-500 border-green-500 text-white'
                              : isPartiallyPicked
                              ? 'bg-blue-100 border-blue-400 text-blue-600'
                              : allCancelled
                              ? 'bg-zinc-100 border-zinc-200 cursor-not-allowed'
                              : 'bg-white border-zinc-300 hover:border-green-400 hover:bg-green-50 cursor-pointer'
                            }
                          `}
                        >
                          {isFullyPicked ? (
                            <CheckCircle2 className="w-6 h-6" />
                          ) : isPartiallyPicked ? (
                            <div className="w-4 h-4 bg-blue-500 rounded" />
                          ) : allCancelled ? (
                            <span className="text-zinc-400 text-xs font-bold">X</span>
                          ) : (
                            <Circle className="w-5 h-5 text-zinc-400" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Table Footer - Summary */}
              {consolidatedItems.length > 0 && (
                <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
                  <div className="text-xs text-zinc-500">
                    {totalProducts} unique products &bull; {totalLineItems} line items from {group.requests.length} orders
                  </div>
                  <div className="flex items-center gap-2">
                    {pickedCount > 0 && (
                      <span className="text-xs font-medium text-green-600">
                        {pickedCount} of {totalLineItems} picked
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function BranchOrders() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [showOnlyPending, setShowOnlyPending] = useState(false); // Default to showing all now

  // Local "Picked" state - visual tracker for picking items (persisted in localStorage)
  const [pickedItems, setPickedItems] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('branchOrders_pickedItems');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Save picked items to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('branchOrders_pickedItems', JSON.stringify([...pickedItems]));
  }, [pickedItems]);

  // Batch toggle picked state for multiple items (consolidated row)
  const handleBatchTogglePicked = (itemIds: string[]) => {
    setPickedItems((prev) => {
      const next = new Set(prev);
      // Check if ALL items are already picked
      const allPicked = itemIds.every((id) => next.has(id));

      if (allPicked) {
        // Unpick all items in this batch
        itemIds.forEach((id) => next.delete(id));
      } else {
        // Pick all items in this batch
        itemIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };


  // ============================================
  // FETCH DATA
  // ============================================

  useEffect(() => {
    fetchBranches();
    fetchRequests(false); // Initial load shows spinner
  }, []);

  // Auto-refresh polling every 15 seconds for real-time sync (SILENT)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchRequests(true); // Silent background refresh - no spinner
    }, 15000); // 15 seconds

    return () => clearInterval(pollInterval);
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await axios.get('/admin/branches');
      setBranches(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  const fetchRequests = async (isBackgroundRequest: boolean = false) => {
    // Only show loading spinner on initial load, not background polls
    if (!isBackgroundRequest) {
      setLoading(true);
    }
    try {
      // Fetch transfer history (now returns last 100 with history)
      const response = await axios.get('/transfers/requests/pending');
      const data = response.data?.data || response.data || [];
      setRequests(data);
    } catch (err: any) {
      console.error('Failed to fetch transfer requests:', err.response?.data || err);
      // Only show error toast on user-initiated requests, not background polls
      if (!isBackgroundRequest) {
        toast.error('Connection failed. Please try again.');
      }
    } finally {
      if (!isBackgroundRequest) {
        setLoading(false);
      }
    }
  };

  // ============================================
  // FILTERED & GROUPED DATA
  // ============================================

  const filteredRequests = useMemo(() => {
    let filtered = requests;

    // Filter by branch (now filtering by fromBranch - who ordered)
    if (selectedBranch !== 'ALL') {
      filtered = filtered.filter((r) => r.fromBranch?.id === selectedBranch);
    }

    // Filter by status
    if (showOnlyPending) {
      filtered = filtered.filter(
        (r) => r.status === 'REQUESTED' || r.status === 'APPROVED'
      );
    }

    return filtered;
  }, [requests, selectedBranch, showOnlyPending]);

  const dateGroups = useMemo(() => {
    return groupRequestsByDate(filteredRequests);
  }, [filteredRequests]);

  // ============================================
  // NAVIGATE TO STOCK ALLOCATION
  // ============================================

  const handleNavigateToAllocate = (productId: string, branchIds: string[]) => {
    navigate('/admin/allocation', {
      state: {
        autoSelectProductId: productId,
        highlightBranchIds: branchIds,
      },
    });
  };

  // ============================================
  // PRINT HANDLER - Consolidated Picking List
  // ============================================

  const handlePrintDay = (group: DateGroup, consolidatedItems: ConsolidatedItem[]) => {
    const totalLineItems = consolidatedItems.reduce((sum, item) => sum + item.breakdown.length, 0);

    // Build print content - Consolidated Picking List format
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Picking List - ${group.label}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              color: #000;
              background: #fff;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #000;
            }
            .header h1 {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .header h2 {
              font-size: 16px;
              font-weight: normal;
              color: #333;
            }
            .header .stats {
              margin-top: 10px;
              font-size: 12px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th {
              padding: 10px 8px;
              text-align: left;
              border-bottom: 2px solid #333;
              font-weight: bold;
              font-size: 11px;
              text-transform: uppercase;
              color: #333;
              background: #f5f5f5;
            }
            th.qty {
              text-align: center;
              width: 80px;
            }
            th.picked {
              text-align: center;
              width: 60px;
            }
            td {
              padding: 12px 8px;
              border-bottom: 1px solid #ddd;
              vertical-align: middle;
            }
            td.qty {
              text-align: center;
              font-weight: bold;
              font-size: 22px;
              background: #f0f0f0;
            }
            td.picked {
              text-align: center;
            }
            .checkbox {
              display: inline-block;
              width: 24px;
              height: 24px;
              border: 2px solid #333;
              border-radius: 4px;
            }
            .product-name {
              font-weight: bold;
              font-size: 14px;
            }
            .product-meta {
              font-size: 11px;
              color: #666;
              margin-top: 3px;
            }
            .part-number {
              font-family: monospace;
              font-size: 10px;
              background: #eee;
              padding: 2px 5px;
              border-radius: 3px;
              display: inline-block;
              margin-left: 8px;
            }
            .breakdown {
              margin-top: 6px;
            }
            .branch-badge {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: bold;
              margin-right: 4px;
              margin-bottom: 4px;
              background: #f0f0f0;
              border: 1px solid #ccc;
            }
            .branch-Ruai { background: #dbeafe; border-color: #93c5fd; color: #1d4ed8; }
            .branch-Utawala { background: #f3e8ff; border-color: #d8b4fe; color: #7c3aed; }
            .branch-Embakasi { background: #d1fae5; border-color: #6ee7b7; color: #059669; }
            .branch-Pipeline { background: #fef3c7; border-color: #fcd34d; color: #b45309; }
            .branch-Kisumu { background: #fce7f3; border-color: #f9a8d4; color: #be185d; }
            .branch-Kiserian { background: #e0e7ff; border-color: #a5b4fc; color: #4338ca; }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #ccc;
              text-align: center;
              font-size: 10px;
              color: #666;
            }
            tr:nth-child(even) {
              background: #fafafa;
            }
            @media print {
              body { padding: 10px; }
              tr { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PRAM AUTO SPARES</h1>
            <h2>Picking List - ${formatDateForPrint(group.date)}</h2>
            <div class="stats">
              ${consolidatedItems.length} unique products &bull; ${totalLineItems} line items from ${group.requests.length} orders &bull; Sorted by Product Name
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Product Details</th>
                <th class="qty">Total Qty</th>
                <th>Branch Breakdown</th>
                <th class="picked">Picked</th>
              </tr>
            </thead>
            <tbody>
              ${consolidatedItems.map((item) => `
                <tr>
                  <td>
                    <div class="product-name">${item.productName}</div>
                    <div class="product-meta">
                      ${item.vehicleMake && item.vehicleModel
                        ? `${item.vehicleMake} ${item.vehicleModel}`
                        : 'Universal'}
                      <span class="part-number">${item.partNumber}</span>
                    </div>
                  </td>
                  <td class="qty">${item.totalQuantity}</td>
                  <td>
                    <div class="breakdown">
                      ${item.breakdown.map((b) => `
                        <span class="branch-badge branch-${b.branchName}">${b.branchName}: ${b.qty}</span>
                      `).join('')}
                    </div>
                  </td>
                  <td class="picked">
                    <span class="checkbox"></span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Printed on ${new Date().toLocaleString()} &bull; PRAM Auto Spares Inventory System
          </div>
        </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  // ============================================
  // STATS
  // ============================================

  const totalPending = requests.filter(
    (r) => r.status === 'REQUESTED' || r.status === 'APPROVED'
  ).length;

  const todayCount = dateGroups.find((g) => g.label === 'Today')?.requests.length || 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-8 px-6 font-sans">
      {/* Header */}
      <div className="max-w-[1400px] mx-auto mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
              <ClipboardList className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Branch Orders
              </h1>
              <p className="text-zinc-400 text-sm font-medium">
                Order ledger &middot; Review and process restock requests
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4">
            {totalPending > 0 && (
              <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center gap-2"
              >
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                <span className="text-sm font-bold text-amber-400">
                  {totalPending} to clear
                </span>
              </motion.div>
            )}
            <div className="px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700">
              <span className="text-sm text-zinc-400">
                Today: <span className="font-bold text-white">{todayCount}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="max-w-[1400px] mx-auto mb-8">
        <div className="flex items-center gap-4 flex-wrap bg-zinc-900 rounded-xl border border-zinc-800 px-5 py-4">
          {/* Filter Icon */}
          <div className="flex items-center gap-2 text-zinc-500">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          {/* Branch Filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm font-medium text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
          >
            <option value="ALL">All Branches</option>
            {branches
              .filter((b) => b.isActive)
              .map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
          </select>

          {/* Status Toggle */}
          <div className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-xl p-1">
            <button
              onClick={() => setShowOnlyPending(false)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                !showOnlyPending
                  ? 'bg-zinc-700 text-white shadow-sm border border-zinc-600'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All Orders
            </button>
            <button
              onClick={() => setShowOnlyPending(true)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                showOnlyPending
                  ? 'bg-zinc-700 text-white shadow-sm border border-zinc-600'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Pending Only
            </button>
          </div>
        </div>
      </div>

      {/* The Order Stream */}
      <div className="max-w-[1400px] mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-900 rounded-2xl border border-zinc-800">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-4" />
            <p className="text-zinc-400 font-medium">Loading orders...</p>
          </div>
        ) : dateGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-900 rounded-2xl border border-zinc-800">
            <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-zinc-500" />
            </div>
            <p className="text-zinc-400 font-medium text-lg">All caught up!</p>
            <p className="text-zinc-500 text-sm mt-1">No orders to display</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dateGroups.map((group) => (
              <DateGroupSection
                key={group.label}
                group={group}
                onPrintDay={handlePrintDay}
                pickedItems={pickedItems}
                onBatchTogglePicked={handleBatchTogglePicked}
                onNavigateToAllocate={handleNavigateToAllocate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: '#fff',
            border: '1px solid #e4e4e7',
            color: '#18181b',
          },
          className: 'font-sans',
        }}
      />
    </div>
  );
}
