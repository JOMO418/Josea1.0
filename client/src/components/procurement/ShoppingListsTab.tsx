// ============================================
// SHOPPING LISTS TAB
// Two-method creation flow with supplier-grouped views
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  ShoppingCart,
  User,
  Package,
  Eye,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Building,
  ChevronDown,
  ChevronRight,
  MapPin,
  Loader2,
  DollarSign,
  MessageSquare,
  Receipt,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import {
  procurementOrderService,
  supplierProductService,
  supplierService,
  workerService,
} from '../../services/procurement.service';
import type {
  ProcurementOrder,
  OrderStatus,
  PaymentStatus,
  OrderPriority,
  Worker,
  CreateProcurementOrderData,
  CreateOrderItemData,
  ProductSearchResult,
  Supplier,
  SupplierProduct,
  ItemsBySupplier,
  Location,
} from '../../types/procurement.types';

const ORDER_STATUSES: OrderStatus[] = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
const PAYMENT_STATUSES: PaymentStatus[] = ['Unpaid', 'Partial', 'Paid'];
const PRIORITIES: OrderPriority[] = ['Normal', 'Urgent'];

// Designated workers for procurement
const DESIGNATED_WORKERS = [
  { name: 'Kiruri', color: 'emerald', icon: '👤' },
  { name: 'Thairo', color: 'blue', icon: '👤' },
] as const;

// ===== MARGIN STYLING HELPER =====
const getMarginStyle = (margin: number | null) => {
  if (margin === null) return { bg: 'bg-zinc-500/10', text: 'text-zinc-500', icon: Minus, label: 'N/A' };
  if (margin < 0) return { bg: 'bg-red-500/20', text: 'text-red-400', icon: TrendingDown, label: 'Loss' };
  if (margin < 15) return { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: TrendingDown, label: 'Low' };
  if (margin < 25) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Minus, label: 'OK' };
  if (margin < 40) return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: TrendingUp, label: 'Good' };
  return { bg: 'bg-green-500/20', text: 'text-green-400', icon: TrendingUp, label: 'Great' };
};

// ===== LOCATION COLORS =====
const LOCATION_COLORS: Record<Location, { bg: string; text: string }> = {
  'Nairobi CBD': { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  'Dubai': { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  'Uganda': { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  'Other': { bg: 'bg-zinc-500/10', text: 'text-zinc-400' },
};

// ===== HELPER: GROUP ITEMS BY SUPPLIER =====
interface GroupedItem extends CreateOrderItemData {
  productName?: string;
  supplierName?: string;
  supplierLocation?: Location;
}

interface SupplierGroup {
  supplierId: string;
  supplierName: string;
  supplierLocation: Location;
  items: GroupedItem[];
  subtotal: number;
}

const groupItemsBySupplier = (items: GroupedItem[]): SupplierGroup[] => {
  const groups: Record<string, SupplierGroup> = {};
  items.forEach(item => {
    if (!groups[item.supplier_id]) {
      groups[item.supplier_id] = {
        supplierId: item.supplier_id,
        supplierName: item.supplierName || 'Unknown Supplier',
        supplierLocation: item.supplierLocation || 'Other',
        items: [],
        subtotal: 0,
      };
    }
    groups[item.supplier_id].items.push(item);
    groups[item.supplier_id].subtotal += item.quantity * item.unit_price;
  });
  return Object.values(groups);
};

// ===== MAIN COMPONENT =====

export default function ShoppingListsTab() {
  // Orders state
  const [orders, setOrders] = useState<ProcurementOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'total_amount'>('created_at');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<ProcurementOrder | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Create order state
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [orderItems, setOrderItems] = useState<GroupedItem[]>([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [priority, setPriority] = useState<OrderPriority>('Normal');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Method selection for adding items
  const [addMethod, setAddMethod] = useState<'product' | 'supplier'>('product');

  // Product-first search
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<ProductSearchResult[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  // Supplier-first search
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierCatalog, setSupplierCatalog] = useState<SupplierProduct[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  // Details modal - expanded suppliers
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await procurementOrderService.getAll({
      search: searchQuery || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      payment_status: paymentFilter !== 'all' ? paymentFilter : undefined,
      sort_by: sortBy,
      sort_order: 'desc',
    });
    if (data) setOrders(data);
    setLoading(false);
  }, [searchQuery, statusFilter, paymentFilter, sortBy]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Debounced product search
  useEffect(() => {
    if (!productSearch.trim() || productSearch.length < 2) {
      setProductResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingProducts(true);
      const { data } = await supplierProductService.searchProducts(productSearch);
      if (data) setProductResults(data);
      setSearchingProducts(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  // Load suppliers for supplier-first method
  useEffect(() => {
    if (addMethod === 'supplier' && suppliers.length === 0) {
      supplierService.getAll().then(({ data }) => {
        if (data) setSuppliers(data);
      });
    }
  }, [addMethod, suppliers.length]);

  // Load supplier catalog when selected
  useEffect(() => {
    if (selectedSupplier) {
      setLoadingCatalog(true);
      supplierService.getCatalog(selectedSupplier.id, { available_only: true }).then(({ data }) => {
        if (data) setSupplierCatalog(data);
        setLoadingCatalog(false);
      });
    }
  }, [selectedSupplier]);

  // Open create modal
  const openCreateModal = async () => {
    const { data } = await workerService.getAll();
    if (data) setWorkers(data);
    setOrderItems([]);
    setSelectedWorker('');
    setPriority('Normal');
    setNotes('');
    setProductSearch('');
    setProductResults([]);
    setSelectedSupplier(null);
    setSupplierCatalog([]);
    setAddMethod('product');
    setShowCreateModal(true);
  };

  // Add item from product search (Method A)
  const addItemFromProduct = (result: ProductSearchResult, supplierIdx: number) => {
    const supplierInfo = result.suppliers[supplierIdx];
    setOrderItems(prev => [
      ...prev,
      {
        product_id: result.product.id,
        supplier_id: supplierInfo.supplier.id,
        quantity: 1,
        unit_price: supplierInfo.price,
        productName: result.product.name,
        supplierName: supplierInfo.supplier.name,
        supplierLocation: supplierInfo.supplier.location,
      },
    ]);
    setProductSearch('');
    setProductResults([]);
  };

  // Add item from supplier catalog (Method B)
  const addItemFromCatalog = (product: SupplierProduct) => {
    if (!selectedSupplier) return;
    setOrderItems(prev => [
      ...prev,
      {
        product_id: product.product_id,
        supplier_id: selectedSupplier.id,
        quantity: 1,
        unit_price: product.wholesale_price,
        productName: product.product?.name,
        supplierName: selectedSupplier.name,
        supplierLocation: selectedSupplier.location,
      },
    ]);
  };

  // Update item quantity
  const updateItemQuantity = (index: number, quantity: number) => {
    setOrderItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, quantity: Math.max(1, quantity) } : item))
    );
  };

  // Remove item
  const removeItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate totals
  const groupedItems = groupItemsBySupplier(orderItems);
  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = orderItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  // Create order
  const handleCreate = async () => {
    if (orderItems.length === 0) return;
    setCreating(true);

    const data: CreateProcurementOrderData = {
      assigned_to: selectedWorker || undefined,
      priority,
      notes,
      items: orderItems.map(item => ({
        product_id: item.product_id,
        supplier_id: item.supplier_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    };

    const { data: order } = await procurementOrderService.create(data);
    if (order) {
      setOrders(prev => [order, ...prev]);
      setShowCreateModal(false);
    }
    setCreating(false);
  };

  // Delete order
  const handleDelete = async (id: string) => {
    const { data } = await procurementOrderService.delete(id);
    if (data?.success) {
      setOrders(prev => prev.filter(o => o.id !== id));
    }
    setDeleteConfirm(null);
  };

  // View order details
  const viewOrderDetails = async (order: ProcurementOrder) => {
    // Fetch full order with items
    const { data } = await procurementOrderService.getById(order.id);
    if (data) {
      setShowDetailsModal(data);
      // Expand all suppliers
      if (data.items_by_supplier) {
        setExpandedSuppliers(new Set(data.items_by_supplier.map(g => g.supplier.id)));
      }
    }
  };

  // Toggle supplier expansion in details
  const toggleSupplierExpand = (supplierId: string) => {
    setExpandedSuppliers(prev => {
      const next = new Set(prev);
      if (next.has(supplierId)) next.delete(supplierId);
      else next.add(supplierId);
      return next;
    });
  };

  // Status colors
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'Pending': return 'bg-amber-500/20 text-amber-400';
      case 'In Progress': return 'bg-blue-500/20 text-blue-400';
      case 'Completed': return 'bg-emerald-500/20 text-emerald-400';
      case 'Cancelled': return 'bg-zinc-500/20 text-zinc-400';
      default: return 'bg-zinc-500/20 text-zinc-400';
    }
  };

  const getPaymentColor = (status: PaymentStatus) => {
    switch (status) {
      case 'Unpaid': return 'bg-red-500/20 text-red-400';
      case 'Partial': return 'bg-amber-500/20 text-amber-400';
      case 'Paid': return 'bg-emerald-500/20 text-emerald-400';
      default: return 'bg-zinc-500/20 text-zinc-400';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Filter catalog by search
  const filteredCatalog = supplierCatalog.filter(sp =>
    !catalogSearch ||
    sp.product?.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    sp.product?.part_number?.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-blue-500/50"
          >
            <option value="all">All Status</option>
            {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as PaymentStatus | 'all')}
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-blue-500/50"
          >
            <option value="all">All Payments</option>
            {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'created_at' | 'total_amount')}
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-blue-500/50"
          >
            <option value="created_at">Sort by Date</option>
            <option value="total_amount">Sort by Amount</option>
          </select>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create List
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 hover:border-zinc-700/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-zinc-100">{order.order_number}</h3>
                  {order.priority === 'Urgent' && (
                    <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
                      Urgent
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">{formatDate(order.created_at)}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => viewOrderDetails(order)}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(order.id)}
                  className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded ${getPaymentColor(order.payment_status)}`}>
                {order.payment_status}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              {order.assigned_worker && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <User className="w-4 h-4" />
                  {order.assigned_worker.name}
                </div>
              )}
              <div className="flex items-center gap-2 text-zinc-400">
                <Package className="w-4 h-4" />
                {order.items_count ?? order.items?.length ?? 0} items
              </div>
              <div className="flex items-center justify-between text-zinc-100 font-medium pt-2 border-t border-zinc-800/50">
                <span>Total</span>
                <span>KES {order.total_amount.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No shopping lists found</p>
          <button
            onClick={openCreateModal}
            className="mt-3 text-sm text-blue-400 hover:underline"
          >
            Create your first list
          </button>
        </div>
      )}

      {/* Create Order Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-100">Create Shopping List</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-zinc-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Worker Assignment - Quick Select Cards */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Assign to</label>
                  <div className="flex gap-3">
                    {DESIGNATED_WORKERS.map(worker => {
                      const workerId = workers.find(w => w.name.toLowerCase().includes(worker.name.toLowerCase()))?.id || '';
                      const isSelected = selectedWorker === workerId && workerId !== '';
                      const colorClasses = worker.color === 'emerald'
                        ? { active: 'bg-emerald-500/20 border-emerald-500/50 ring-2 ring-emerald-500/30', text: 'text-emerald-400', hover: 'hover:border-emerald-500/30' }
                        : { active: 'bg-blue-500/20 border-blue-500/50 ring-2 ring-blue-500/30', text: 'text-blue-400', hover: 'hover:border-blue-500/30' };

                      return (
                        <button
                          key={worker.name}
                          onClick={() => setSelectedWorker(isSelected ? '' : workerId)}
                          className={`flex-1 relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                            isSelected
                              ? colorClasses.active
                              : `bg-zinc-800/50 border-zinc-700 ${colorClasses.hover}`
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                            isSelected ? colorClasses.active : 'bg-zinc-700/50'
                          }`}>
                            {worker.name === 'Kiruri' ? '🛒' : '🚗'}
                          </div>
                          <span className={`font-semibold text-lg ${isSelected ? colorClasses.text : 'text-zinc-200'}`}>
                            {worker.name}
                          </span>
                          {isSelected && (
                            <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center ${
                              worker.color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}>
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                    {/* Unassigned option */}
                    <button
                      onClick={() => setSelectedWorker('')}
                      className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                        selectedWorker === ''
                          ? 'bg-zinc-500/20 border-zinc-500/50 ring-2 ring-zinc-500/30'
                          : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                        selectedWorker === '' ? 'bg-zinc-500/20' : 'bg-zinc-700/50'
                      }`}>
                        ⏸️
                      </div>
                      <span className={`font-semibold text-lg ${selectedWorker === '' ? 'text-zinc-300' : 'text-zinc-400'}`}>
                        Unassigned
                      </span>
                      {selectedWorker === '' && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-zinc-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Priority Selection */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Priority</label>
                  <div className="flex gap-2">
                    {PRIORITIES.map(p => (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                          priority === p
                            ? p === 'Urgent'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/50 ring-2 ring-red-500/20'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/50 ring-2 ring-blue-500/20'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        {p === 'Urgent' && <AlertTriangle className="w-4 h-4 inline mr-2" />}
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add Items Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-zinc-400">Add Items</label>
                    <div className="flex gap-1 p-0.5 bg-zinc-800 rounded-lg">
                      <button
                        onClick={() => setAddMethod('product')}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          addMethod === 'product'
                            ? 'bg-blue-500 text-white'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Search Product
                      </button>
                      <button
                        onClick={() => setAddMethod('supplier')}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          addMethod === 'supplier'
                            ? 'bg-blue-500 text-white'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Browse Supplier
                      </button>
                    </div>
                  </div>

                  {/* Method A: Product Search */}
                  {addMethod === 'product' && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Search products to add..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                      />
                      {searchingProducts && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 animate-spin" />
                      )}

                      {productResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
                          {productResults.map(result => (
                            <div key={result.product.id} className="p-3 border-b border-zinc-700/50 last:border-0">
                              <p className="text-sm font-medium text-zinc-200">{result.product.name}</p>
                              {result.product.part_number && (
                                <p className="text-xs text-zinc-500 mt-0.5">{result.product.part_number}</p>
                              )}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {result.suppliers.map((s, i) => (
                                  <button
                                    key={s.supplier.id}
                                    onClick={() => addItemFromProduct(result, i)}
                                    className={`text-xs px-2 py-1 rounded transition-colors ${
                                      s.is_best_price
                                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                    }`}
                                  >
                                    {s.supplier.name}: {s.currency} {s.price.toLocaleString()}
                                    {s.is_best_price && ' (Best)'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Method B: Supplier Browse - Optimized Dense Grid */}
                  {addMethod === 'supplier' && (
                    <div className="space-y-3">
                      {/* Supplier Select - Grouped by Location */}
                      <div className="flex gap-2 flex-wrap">
                        {['Nairobi CBD', 'Dubai', 'Uganda', 'Other'].map(location => {
                          const locationSuppliers = suppliers.filter(s => s.location === location);
                          if (locationSuppliers.length === 0) return null;
                          return (
                            <div key={location} className="flex-1 min-w-[200px]">
                              <p className={`text-xs font-medium mb-1 ${LOCATION_COLORS[location as Location].text}`}>
                                {location}
                              </p>
                              <select
                                value={selectedSupplier?.location === location ? selectedSupplier.id : ''}
                                onChange={(e) => {
                                  const supplier = suppliers.find(s => s.id === e.target.value);
                                  setSelectedSupplier(supplier || null);
                                  setCatalogSearch('');
                                }}
                                className={`w-full px-3 py-2 bg-zinc-800 border rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500 ${
                                  selectedSupplier?.location === location ? LOCATION_COLORS[location as Location].text + ' border-current' : 'border-zinc-700'
                                }`}
                              >
                                <option value="">Select...</option>
                                {locationSuppliers.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>

                      {/* Supplier Catalog - Dense Grid with Margin Indicators */}
                      {selectedSupplier && (
                        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
                          {/* Catalog Header */}
                          <div className="p-3 border-b border-zinc-700/50 flex items-center gap-3">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                              <input
                                type="text"
                                placeholder="Quick filter..."
                                value={catalogSearch}
                                onChange={(e) => setCatalogSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="flex items-center gap-1 text-xs text-zinc-500">
                              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">Good</span>
                              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">OK</span>
                              <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded">Avoid</span>
                            </div>
                          </div>

                          {/* Product Grid - Dense Layout */}
                          <div className="max-h-72 overflow-y-auto p-2">
                            {loadingCatalog ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                              </div>
                            ) : filteredCatalog.length === 0 ? (
                              <div className="text-center py-8 text-zinc-500">
                                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No products in catalog</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                {filteredCatalog.map(sp => {
                                  const marginStyle = getMarginStyle(sp.margin_percent);
                                  const MarginIcon = marginStyle.icon;
                                  const isLowMargin = sp.margin_percent !== null && sp.margin_percent < 15;

                                  return (
                                    <button
                                      key={sp.id}
                                      onClick={() => addItemFromCatalog(sp)}
                                      className={`relative p-3 rounded-lg border text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                        isLowMargin
                                          ? 'bg-red-500/5 border-red-500/30 hover:border-red-500/50'
                                          : `${marginStyle.bg} border-zinc-700/50 hover:border-zinc-600`
                                      }`}
                                    >
                                      {/* Margin Badge - Top Right */}
                                      <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full ${marginStyle.bg}`}>
                                        <MarginIcon className={`w-3 h-3 ${marginStyle.text}`} />
                                        <span className={`text-xs font-semibold ${marginStyle.text}`}>
                                          {sp.margin_percent !== null ? `${sp.margin_percent.toFixed(0)}%` : 'N/A'}
                                        </span>
                                      </div>

                                      {/* Product Name */}
                                      <p className="text-sm font-medium text-zinc-200 pr-16 truncate">
                                        {sp.product?.name}
                                      </p>

                                      {/* Part Number */}
                                      {sp.product?.part_number && (
                                        <p className="text-xs text-zinc-500 truncate">{sp.product.part_number}</p>
                                      )}

                                      {/* Prices Row */}
                                      <div className="flex items-center justify-between mt-2">
                                        <div className="text-xs">
                                          <span className="text-zinc-500">Buy: </span>
                                          <span className="text-zinc-300 font-medium">
                                            {sp.currency} {sp.wholesale_price.toLocaleString()}
                                          </span>
                                        </div>
                                        {sp.selling_price !== null && (
                                          <div className="text-xs">
                                            <span className="text-zinc-500">Sell: </span>
                                            <span className="text-emerald-400 font-medium">
                                              {sp.selling_price.toLocaleString()}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Warning for low margin */}
                                      {isLowMargin && (
                                        <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                                          <AlertTriangle className="w-3 h-3" />
                                          <span>Low profit margin</span>
                                        </div>
                                      )}

                                      {/* Quick Add Indicator */}
                                      <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Plus className="w-4 h-4 text-blue-400" />
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Catalog Footer - Stats */}
                          {!loadingCatalog && filteredCatalog.length > 0 && (
                            <div className="p-2 border-t border-zinc-700/50 flex items-center justify-between text-xs text-zinc-500">
                              <span>{filteredCatalog.length} products</span>
                              <span>
                                {filteredCatalog.filter(sp => sp.margin_percent !== null && sp.margin_percent >= 25).length} profitable |{' '}
                                <span className="text-amber-400">
                                  {filteredCatalog.filter(sp => sp.margin_percent !== null && sp.margin_percent < 15).length} low margin
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Items Preview - Grouped by Supplier */}
                {orderItems.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-sm text-zinc-400">Items by Supplier</label>
                    {groupedItems.map(group => (
                      <div key={group.supplierId} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg overflow-hidden">
                        <div className="p-3 bg-zinc-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-zinc-400" />
                            <span className="font-medium text-zinc-200">{group.supplierName}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${LOCATION_COLORS[group.supplierLocation].bg} ${LOCATION_COLORS[group.supplierLocation].text}`}>
                              {group.supplierLocation}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-zinc-200">
                            KES {group.subtotal.toLocaleString()}
                          </span>
                        </div>
                        <div className="divide-y divide-zinc-700/30">
                          {group.items.map((item, idx) => {
                            const globalIdx = orderItems.indexOf(item);
                            return (
                              <div key={idx} className="p-2 flex items-center gap-3">
                                <span className="flex-1 text-sm text-zinc-300">{item.productName}</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(globalIdx, Number(e.target.value))}
                                  className="w-16 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-center text-sm text-zinc-100"
                                />
                                <span className="text-xs text-zinc-400 w-24 text-right">
                                  KES {(item.quantity * item.unit_price).toLocaleString()}
                                </span>
                                <button
                                  onClick={() => removeItem(globalIdx)}
                                  className="p-1 text-zinc-500 hover:text-red-400"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Summary */}
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex justify-between text-sm text-zinc-400 mb-2">
                    <span>Total Items</span>
                    <span>{totalItems}</span>
                  </div>
                  <div className="flex justify-between text-sm text-zinc-400 mb-2">
                    <span>Suppliers</span>
                    <span>{groupedItems.length}</span>
                  </div>
                  <div className="flex justify-between text-lg font-medium text-zinc-100 pt-2 border-t border-zinc-700">
                    <span>Total Amount</span>
                    <span>KES {totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 resize-none focus:outline-none focus:border-blue-500"
                    placeholder="Any instructions for the worker..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={orderItems.length === 0 || creating}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create List
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Details Modal */}
      <AnimatePresence>
        {showDetailsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailsModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-800">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-zinc-100">{showDetailsModal.order_number}</h2>
                      {showDetailsModal.priority === 'Urgent' && (
                        <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">Urgent</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">{formatDate(showDetailsModal.created_at)}</p>
                  </div>
                  <button onClick={() => setShowDetailsModal(null)} className="text-zinc-500 hover:text-zinc-300">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`px-3 py-1 text-sm rounded ${getStatusColor(showDetailsModal.status)}`}>
                    {showDetailsModal.status}
                  </span>
                  <span className={`px-3 py-1 text-sm rounded ${getPaymentColor(showDetailsModal.payment_status)}`}>
                    {showDetailsModal.payment_status}
                  </span>
                  {showDetailsModal.assigned_worker && (
                    <span className="px-3 py-1 text-sm bg-zinc-800 text-zinc-300 rounded flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {showDetailsModal.assigned_worker.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Content - Items by Supplier */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {showDetailsModal.items_by_supplier?.map(group => (
                  <div key={group.supplier.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg overflow-hidden">
                    {/* Supplier Header */}
                    <button
                      onClick={() => toggleSupplierExpand(group.supplier.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedSuppliers.has(group.supplier.id) ? (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-400" />
                        )}
                        <Building className="w-5 h-5 text-zinc-400" />
                        <div className="text-left">
                          <p className="font-medium text-zinc-200">{group.supplier.name}</p>
                          <p className="text-xs text-zinc-500">{group.supplier.branch_name}</p>
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${LOCATION_COLORS[group.supplier.location].bg} ${LOCATION_COLORS[group.supplier.location].text}`}>
                          {group.supplier.location}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-zinc-200">
                          KES {group.expected_subtotal.toLocaleString()}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {group.items_purchased}/{group.items_total} purchased
                        </p>
                      </div>
                    </button>

                    {/* Items */}
                    <AnimatePresence>
                      {expandedSuppliers.has(group.supplier.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-zinc-700/50 divide-y divide-zinc-700/30">
                            {group.items.map(item => (
                              <div key={item.id} className="p-3 flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                  item.is_purchased ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-500'
                                }`}>
                                  {item.is_purchased ? <Check className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-zinc-200">{item.product?.name}</p>
                                  {item.worker_notes && (
                                    <p className="text-xs text-amber-400 mt-0.5 flex items-center gap-1">
                                      <MessageSquare className="w-3 h-3" />
                                      {item.worker_notes}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-zinc-200">
                                    {item.quantity} x KES {item.expected_price.toLocaleString()}
                                  </p>
                                  {item.actual_price && item.actual_price !== item.expected_price && (
                                    <p className={`text-xs ${item.actual_price > item.expected_price ? 'text-red-400' : 'text-emerald-400'}`}>
                                      Actual: KES {item.actual_price.toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Supplier Payment Status */}
                          {showDetailsModal.supplier_payments?.find(p => p.supplier_id === group.supplier.id) && (
                            <div className="p-3 bg-zinc-800/50 border-t border-zinc-700/50 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-zinc-400" />
                                <span className="text-sm text-zinc-400">Payment:</span>
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  getPaymentColor(showDetailsModal.supplier_payments.find(p => p.supplier_id === group.supplier.id)?.payment_status || 'Unpaid')
                                }`}>
                                  {showDetailsModal.supplier_payments.find(p => p.supplier_id === group.supplier.id)?.payment_status}
                                </span>
                              </div>
                              {showDetailsModal.supplier_payments.find(p => p.supplier_id === group.supplier.id)?.receipt_image_url && (
                                <a
                                  href={showDetailsModal.supplier_payments.find(p => p.supplier_id === group.supplier.id)?.receipt_image_url || ''}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
                                >
                                  <Receipt className="w-3 h-3" />
                                  View Receipt
                                </a>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                {/* Summary */}
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex justify-between text-lg font-medium text-zinc-100">
                    <span>Total</span>
                    <span>KES {showDetailsModal.total_amount.toLocaleString()}</span>
                  </div>
                </div>

                {showDetailsModal.notes && (
                  <div className="p-3 bg-zinc-800/30 rounded-lg">
                    <p className="text-xs text-zinc-500 mb-1">Notes</p>
                    <p className="text-sm text-zinc-300">{showDetailsModal.notes}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-zinc-800 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(null)}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Delete Shopping List</h3>
              <p className="text-zinc-400 mb-6">
                Are you sure you want to delete this list? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
