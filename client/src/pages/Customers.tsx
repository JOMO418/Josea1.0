import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Phone, Search, X, Edit2, MessageCircle, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, DollarSign, Banknote, Smartphone, Bell, FileText,
  Printer, Calendar, Clock, ShoppingBag, TrendingUp, Filter, Receipt,
  Package, CreditCard
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { api } from '../api/axios';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';

// ===== HELPER FUNCTIONS =====

const getNetBalance = (customer: Customer | CustomerDetails): number => {
  return Number(customer.totalDebt);
};

const getCustomerStatus = (customer: Customer | CustomerDetails) => {
  const netBalance = getNetBalance(customer);

  if (netBalance > 0) {
    return {
      type: 'DEBT' as const,
      label: 'Owes Debt',
      amount: netBalance,
      bgColor: 'bg-rose-100',
      textColor: 'text-rose-600',
      icon: AlertCircle,
    };
  } else {
    return {
      type: 'GOOD' as const,
      label: 'Good Standing',
      amount: 0,
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-600',
      icon: CheckCircle,
    };
  }
};

const formatPhoneForWhatsApp = (phone: string): string => {
  let cleaned = phone.replace(/\s+/g, '').replace(/[^\d]/g, '');

  if (cleaned.startsWith('07')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('01')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (!cleaned.startsWith('254')) {
    if (cleaned.length === 9) {
      cleaned = '254' + cleaned;
    }
  }

  return cleaned;
};

const getLastPayment = (customer: CustomerDetails) => {
  const paymentEvents = customer.timeline.filter(e => e.type === 'PAYMENT');
  if (paymentEvents.length === 0) return null;

  const lastPayment = paymentEvents[0];
  return {
    amount: lastPayment.amount,
    txId: lastPayment.receiptNumber || 'N/A',
  };
};

interface Customer {
  id: string;
  name: string;
  phone: string;
  totalSpent: number;
  totalDebt: number;
  lastVisitAt: string;
  createdAt: string;
}

interface FrequentItem {
  name: string;
  count: number;
}

interface TimelineEvent {
  type: 'CREDIT_SALE' | 'CASH_SALE' | 'PAYMENT';
  date: string;
  amount: number;
  receiptNumber?: string;
  saleId?: string;
  creditStatus?: string;
  branch?: string;
  method?: string;
  items?: Array<{ name: string; quantity: number; price: number; total: number }>;
  payments?: Array<{ method: string; amount: number }>;
  creditPayments?: any[];
}

interface DebtSale {
  id: string;
  receiptNumber: string;
  total: number;
  createdAt: string;
  creditStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  items: Array<{
    product: { name: string };
    quantity: number;
    unitPrice: number;
  }>;
  payments: Array<{ method: string; amount: number }>;
  creditPayments: Array<{ amount: number; createdAt: string; paymentMethod: string }>;
}

interface CustomerDetails extends Customer {
  creditScore: number;
  frequentItems: FrequentItem[];
  timeline: TimelineEvent[];
  activeDebts: DebtSale[];
  settledDebts: DebtSale[];
}

export default function Customers() {
  const branchName = useStore((state) => state.branchName);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'debts'>('history');
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());
  const [showSettled, setShowSettled] = useState(false);

  // History filter state
  const [historyFilter, setHistoryFilter] = useState<'all' | 'sales' | 'payments'>('all');

  // Receipt Reprint Modal
  const [reprintModal, setReprintModal] = useState<{
    open: boolean;
    transaction: TimelineEvent | null;
  }>({ open: false, transaction: null });

  // Payment Modal State
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    sale: DebtSale | null;
  }>({ open: false, sale: null });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA'>('CASH');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.customers.list({ search: searchTerm });
      setCustomers(response.data.customers);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerClick = async (customer: Customer) => {
    try {
      const response = await api.customers.get(customer.id);
      setSelectedCustomer(response.data);
      setEditName(response.data.name);
      setEditPhone(response.data.phone);
      setDrawerOpen(true);
      setActiveTab('history');
      setExpandedSales(new Set());
    } catch (error) {
      console.error('Failed to fetch customer details:', error);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      await api.customers.update(selectedCustomer.id, {
        name: editName,
        phone: editPhone,
      });
      setEditMode(false);
      fetchCustomers();
      const response = await api.customers.get(selectedCustomer.id);
      setSelectedCustomer(response.data);
      toast.success('Customer updated successfully');
    } catch (error) {
      console.error('Failed to update customer:', error);
      toast.error('Failed to update customer');
    }
  };

  const toggleSaleExpansion = (saleId: string) => {
    setExpandedSales(prev => {
      const newSet = new Set(prev);
      if (newSet.has(saleId)) {
        newSet.delete(saleId);
      } else {
        newSet.add(saleId);
      }
      return newSet;
    });
  };

  const openPaymentModal = (sale: DebtSale) => {
    // Calculate correct remaining: Original CREDIT amount - payments made
    const originalDebt = sale.payments
      .filter(p => p.method === 'CREDIT')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPaid = sale.creditPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = originalDebt - totalPaid;
    setPaymentAmount(remaining > 0 ? remaining.toString() : '');
    setPaymentModal({ open: true, sale });
  };

  const closePaymentModal = () => {
    setPaymentModal({ open: false, sale: null });
    setPaymentAmount('');
    setPaymentMethod('CASH');
  };

  const handleRecordPayment = async () => {
    if (!paymentModal.sale || !selectedCustomer) return;

    setPaymentLoading(true);
    try {
      await api.sales.recordCreditPayment(paymentModal.sale.id, {
        amount: parseFloat(paymentAmount),
        paymentMethod,
      });

      const audio = new Audio('/sounds/success.mp3');
      audio.play().catch(e => console.log('Audio play failed:', e));

      toast.success('Payment recorded successfully!');
      closePaymentModal();

      const response = await api.customers.get(selectedCustomer.id);
      setSelectedCustomer(response.data);
      fetchCustomers();
    } catch (error: any) {
      console.error('Failed to record payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const openReprintModal = (transaction: TimelineEvent) => {
    setReprintModal({ open: true, transaction });
  };

  const closeReprintModal = () => {
    setReprintModal({ open: false, transaction: null });
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy, HH:mm');
  };

  const getTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  // Filter timeline based on selected filter
  const getFilteredTimeline = () => {
    if (!selectedCustomer) return [];

    switch (historyFilter) {
      case 'sales':
        return selectedCustomer.timeline.filter(e => e.type === 'CREDIT_SALE' || e.type === 'CASH_SALE');
      case 'payments':
        return selectedCustomer.timeline.filter(e => e.type === 'PAYMENT');
      default:
        return selectedCustomer.timeline;
    }
  };

  // Calculate summary stats
  const getTransactionStats = () => {
    if (!selectedCustomer) return { totalTransactions: 0, avgTransaction: 0, cashSales: 0, creditSales: 0 };

    const sales = selectedCustomer.timeline.filter(e => e.type === 'CREDIT_SALE' || e.type === 'CASH_SALE');
    const totalTransactions = sales.length;
    const totalAmount = sales.reduce((sum, s) => sum + s.amount, 0);
    const avgTransaction = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
    const cashSales = sales.filter(s => s.type === 'CASH_SALE').length;
    const creditSales = sales.filter(s => s.type === 'CREDIT_SALE').length;

    return { totalTransactions, avgTransaction, cashSales, creditSales };
  };

  const stats = getTransactionStats();

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }

          body * {
            visibility: hidden;
          }

          #reprint-receipt, #reprint-receipt * {
            visibility: visible;
          }

          #reprint-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
              <Users className="text-zinc-900" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Customers</h1>
              <p className="text-zinc-500 text-sm font-medium">CRM & Customer Management</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>
      </div>

      {/* THE WHITE LEDGER */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-zinc-200 overflow-hidden">
          {/* Table Header */}
          <div className="bg-zinc-50 border-b border-zinc-100 px-8 py-6">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-4 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                Customer
              </div>
              <div className="col-span-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                Status
              </div>
              <div className="col-span-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                Total Spent
              </div>
              <div className="col-span-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                Debt
              </div>
              <div className="col-span-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                Last Visit
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-zinc-100">
            {loading ? (
              <div className="py-20 text-center text-zinc-400">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-zinc-300 border-t-zinc-900"></div>
              </div>
            ) : customers.length === 0 ? (
              <div className="py-20 text-center text-zinc-400">
                <Users className="mx-auto mb-4" size={48} />
                <p className="font-bold">No customers found</p>
              </div>
            ) : (
              customers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => handleCustomerClick(customer)}
                  className="grid grid-cols-12 gap-4 items-center px-8 h-20 hover:bg-blue-50/50 cursor-pointer transition-all group"
                >
                  {/* Customer Info */}
                  <div className="col-span-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-zinc-900 font-black text-sm">
                        {getInitials(customer.name)}
                      </span>
                    </div>
                    <div>
                      <p className="font-black text-lg text-zinc-900 tracking-tight group-hover:text-blue-600 transition-colors">
                        {customer.name}
                      </p>
                      <p className="text-sm text-zinc-500 font-mono">{customer.phone}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="col-span-2">
                    {(() => {
                      const status = getCustomerStatus(customer);
                      const Icon = status.icon;
                      return (
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bgColor} ${status.textColor} text-xs font-black uppercase`}
                        >
                          <Icon size={12} />
                          {status.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Total Spent */}
                  <div className="col-span-2">
                    <p className="font-black text-zinc-900">
                      KES {Number(customer.totalSpent).toLocaleString()}
                    </p>
                  </div>

                  {/* Debt */}
                  <div className="col-span-2">
                    {Number(customer.totalDebt) > 0 ? (
                      <p className="font-medium text-rose-600">
                        KES {Number(customer.totalDebt).toLocaleString()}
                      </p>
                    ) : (
                      <p className="font-medium text-zinc-300">—</p>
                    )}
                  </div>

                  {/* Last Visit */}
                  <div className="col-span-2">
                    <p className="text-sm text-zinc-600">{getTimeAgo(customer.lastVisitAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ENHANCED SLIDE-OVER DRAWER */}
      <AnimatePresence>
        {drawerOpen && selectedCustomer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Drawer - Made wider for better UX */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-[700px] bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800 p-6 z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    {editMode ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white font-bold"
                        />
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white font-mono"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleUpdateCustomer}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditMode(false);
                              setEditName(selectedCustomer.name);
                              setEditPhone(selectedCustomer.phone);
                            }}
                            className="px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-2xl font-black text-white">{selectedCustomer.name}</h2>
                          <button
                            onClick={() => setEditMode(true)}
                            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} className="text-zinc-500" />
                          </button>
                        </div>
                        <p className="text-zinc-400 font-mono flex items-center gap-2 mb-4">
                          <Phone size={14} />
                          {selectedCustomer.phone}
                        </p>

                        {/* Frequent Buyer Badges */}
                        {selectedCustomer.frequentItems.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {selectedCustomer.frequentItems.map((item, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold"
                              >
                                {item.name} <span className="text-blue-300">×{item.count}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* ACTION CENTER */}
                        <div className="space-y-2">
                          <p className="text-xs font-black uppercase text-zinc-500 tracking-wider">Quick Actions</p>
                          <div className="grid grid-cols-3 gap-2">
                            {getCustomerStatus(selectedCustomer).type === 'DEBT' && (
                              <a
                                href={`https://wa.me/${formatPhoneForWhatsApp(selectedCustomer.phone)}?text=${encodeURIComponent(
                                  `Hello ${selectedCustomer.name}, kindly note an outstanding balance of KES ${getNetBalance(
                                    selectedCustomer
                                  ).toLocaleString()} at Pram Auto Spares.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center justify-center gap-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all min-h-[44px]"
                              >
                                <Bell size={16} />
                                <span className="text-[10px] font-black uppercase">Remind</span>
                              </a>
                            )}

                            <a
                              href={`https://wa.me/${formatPhoneForWhatsApp(selectedCustomer.phone)}?text=${encodeURIComponent(
                                (() => {
                                  const lastPayment = getLastPayment(selectedCustomer);
                                  if (lastPayment) {
                                    return `Hello ${selectedCustomer.name}, here is your receipt for the recent payment of KES ${lastPayment.amount.toLocaleString()}. Transaction ID: ${
                                      lastPayment.txId
                                    }.`;
                                  } else {
                                    return `Hello ${selectedCustomer.name}, thank you for your business at Pram Auto Spares.`;
                                  }
                                })()
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-col items-center justify-center gap-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all min-h-[44px]"
                            >
                              <FileText size={16} />
                              <span className="text-[10px] font-black uppercase">Receipt</span>
                            </a>

                            <a
                              href={`https://wa.me/${formatPhoneForWhatsApp(selectedCustomer.phone)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-col items-center justify-center gap-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all min-h-[44px]"
                            >
                              <MessageCircle size={16} />
                              <span className="text-[10px] font-black uppercase">Chat</span>
                            </a>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors ml-4"
                  >
                    <X size={20} className="text-zinc-500" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-6">
                  {(['history', 'debts'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-black uppercase transition-all ${
                        activeTab === tab
                          ? 'bg-white text-zinc-900'
                          : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
                      }`}
                    >
                      {tab === 'history' ? 'Transaction History' : 'Debt Sales'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {activeTab === 'history' && (
                    <motion.div
                      key="history"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-6"
                    >
                      {/* SUMMARY STATS CARDS */}
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                          <div className="flex items-center gap-2 mb-2">
                            <ShoppingBag size={14} className="text-blue-400" />
                            <p className="text-[10px] font-black uppercase text-zinc-500">Total Orders</p>
                          </div>
                          <p className="text-2xl font-black text-white">{stats.totalTransactions}</p>
                        </div>
                        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp size={14} className="text-emerald-400" />
                            <p className="text-[10px] font-black uppercase text-zinc-500">Avg. Order</p>
                          </div>
                          <p className="text-2xl font-black text-white">KES {Math.round(stats.avgTransaction).toLocaleString()}</p>
                        </div>
                        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                          <div className="flex items-center gap-2 mb-2">
                            <Banknote size={14} className="text-green-400" />
                            <p className="text-[10px] font-black uppercase text-zinc-500">Cash Sales</p>
                          </div>
                          <p className="text-2xl font-black text-white">{stats.cashSales}</p>
                        </div>
                        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                          <div className="flex items-center gap-2 mb-2">
                            <CreditCard size={14} className="text-rose-400" />
                            <p className="text-[10px] font-black uppercase text-zinc-500">Credit Sales</p>
                          </div>
                          <p className="text-2xl font-black text-white">{stats.creditSales}</p>
                        </div>
                      </div>

                      {/* FILTER BAR */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black uppercase text-zinc-500">Transaction Timeline</p>
                        <div className="flex items-center gap-2">
                          <Filter size={14} className="text-zinc-500" />
                          <select
                            value={historyFilter}
                            onChange={(e) => setHistoryFilter(e.target.value as any)}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-zinc-700"
                          >
                            <option value="all">All Transactions</option>
                            <option value="sales">Sales Only</option>
                            <option value="payments">Payments Only</option>
                          </select>
                        </div>
                      </div>

                      {/* ENHANCED TIMELINE */}
                      <div className="space-y-4">
                        {getFilteredTimeline().length === 0 ? (
                          <div className="bg-zinc-900 rounded-xl p-8 text-center border border-zinc-800">
                            <Receipt className="mx-auto mb-3 text-zinc-600" size={48} />
                            <p className="text-white font-bold">No transactions found</p>
                            <p className="text-zinc-500 text-sm mt-1">This customer hasn't made any purchases yet</p>
                          </div>
                        ) : (
                          getFilteredTimeline().map((event, index) => {
                            const isSale = event.type === 'CREDIT_SALE' || event.type === 'CASH_SALE';
                            const isExpanded = event.saleId && expandedSales.has(event.saleId);

                            return (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors"
                              >
                                {/* Transaction Header */}
                                <div
                                  className={`p-4 ${isSale ? 'cursor-pointer' : ''}`}
                                  onClick={() => isSale && event.saleId && toggleSaleExpansion(event.saleId)}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                      {/* Icon */}
                                      <div
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                          event.type === 'PAYMENT'
                                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                                            : event.type === 'CREDIT_SALE'
                                            ? 'bg-rose-500/10 border border-rose-500/20'
                                            : 'bg-blue-500/10 border border-blue-500/20'
                                        }`}
                                      >
                                        {event.type === 'PAYMENT' ? (
                                          <DollarSign className="text-emerald-400" size={20} />
                                        ) : event.type === 'CREDIT_SALE' ? (
                                          <CreditCard className="text-rose-400" size={20} />
                                        ) : (
                                          <ShoppingBag className="text-blue-400" size={20} />
                                        )}
                                      </div>

                                      {/* Details */}
                                      <div>
                                        <div className="flex items-center gap-2 mb-1">
                                          <p className="font-bold text-white">
                                            {event.type === 'PAYMENT'
                                              ? 'Payment Received'
                                              : event.type === 'CREDIT_SALE'
                                              ? 'Credit Sale'
                                              : 'Cash Sale'}
                                          </p>
                                          {event.type === 'CREDIT_SALE' && event.creditStatus && (
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                              event.creditStatus === 'PAID'
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : event.creditStatus === 'PARTIAL'
                                                ? 'bg-amber-500/20 text-amber-400'
                                                : 'bg-rose-500/20 text-rose-400'
                                            }`}>
                                              {event.creditStatus}
                                            </span>
                                          )}
                                        </div>

                                        {/* Receipt Number */}
                                        {event.receiptNumber && (
                                          <p className="text-sm font-mono text-zinc-400 mb-1">
                                            Receipt: <span className="text-white font-bold">#{event.receiptNumber}</span>
                                          </p>
                                        )}

                                        {/* Date & Time */}
                                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                                          <span className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            {formatDate(event.date)}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Clock size={12} />
                                            {formatTime(event.date)}
                                          </span>
                                          {event.branch && (
                                            <span className="text-zinc-600">• {event.branch}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Amount & Actions */}
                                    <div className="text-right flex flex-col items-end gap-2">
                                      <p
                                        className={`font-black text-xl ${
                                          event.type === 'PAYMENT' ? 'text-emerald-400' : 'text-white'
                                        }`}
                                      >
                                        KES {event.amount.toLocaleString()}
                                      </p>

                                      {isSale && (
                                        <div className="flex items-center gap-2">
                                          {/* Reprint Button */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openReprintModal(event);
                                            }}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold text-white transition-colors"
                                          >
                                            <Printer size={12} />
                                            Reprint
                                          </button>

                                          {/* Expand Toggle */}
                                          <button className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
                                            {isExpanded ? (
                                              <ChevronUp size={16} className="text-zinc-400" />
                                            ) : (
                                              <ChevronDown size={16} className="text-zinc-400" />
                                            )}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Expanded Items View */}
                                <AnimatePresence>
                                  {isSale && isExpanded && event.items && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="border-t border-zinc-800 bg-zinc-950/50 overflow-hidden"
                                    >
                                      <div className="p-4">
                                        {/* Items Table Header */}
                                        <div className="grid grid-cols-12 gap-2 text-[10px] font-black uppercase text-zinc-500 mb-3 px-2">
                                          <div className="col-span-6">Item</div>
                                          <div className="col-span-2 text-center">Qty</div>
                                          <div className="col-span-2 text-right">Price</div>
                                          <div className="col-span-2 text-right">Total</div>
                                        </div>

                                        {/* Items List */}
                                        <div className="space-y-2">
                                          {event.items.map((item, i) => (
                                            <div
                                              key={i}
                                              className="grid grid-cols-12 gap-2 bg-zinc-900 rounded-lg px-3 py-2 items-center"
                                            >
                                              <div className="col-span-6 flex items-center gap-2">
                                                <Package size={14} className="text-zinc-600" />
                                                <span className="text-sm text-white font-medium truncate">
                                                  {item.name}
                                                </span>
                                              </div>
                                              <div className="col-span-2 text-center">
                                                <span className="text-sm text-zinc-400">×{item.quantity}</span>
                                              </div>
                                              <div className="col-span-2 text-right">
                                                <span className="text-sm text-zinc-400">
                                                  {item.price.toLocaleString()}
                                                </span>
                                              </div>
                                              <div className="col-span-2 text-right">
                                                <span className="text-sm text-white font-bold">
                                                  {item.total.toLocaleString()}
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>

                                        {/* Payment Methods Used */}
                                        {event.payments && event.payments.length > 0 && (
                                          <div className="mt-4 pt-3 border-t border-zinc-800">
                                            <p className="text-[10px] font-black uppercase text-zinc-500 mb-2">Payment Breakdown</p>
                                            <div className="flex flex-wrap gap-2">
                                              {event.payments.map((payment, i) => (
                                                <span
                                                  key={i}
                                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                                                    payment.method === 'CASH'
                                                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                      : payment.method === 'MPESA'
                                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                  }`}
                                                >
                                                  {payment.method === 'CASH' ? <Banknote size={12} /> :
                                                   payment.method === 'MPESA' ? <Smartphone size={12} /> :
                                                   <CreditCard size={12} />}
                                                  {payment.method}: KES {payment.amount.toLocaleString()}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'debts' && (
                    <motion.div
                      key="debts"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-6"
                    >
                      {/* DEBT SUMMARY HEADER */}
                      {selectedCustomer.activeDebts.length > 0 && (
                        <div className="bg-gradient-to-r from-rose-500/10 to-rose-600/5 border border-rose-500/20 rounded-2xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-rose-500/20 rounded-xl flex items-center justify-center">
                                <AlertCircle className="text-rose-400" size={24} />
                              </div>
                              <div>
                                <p className="text-xs text-rose-400 font-bold uppercase">Total Outstanding</p>
                                <p className="text-2xl font-black text-rose-400">
                                  KES {selectedCustomer.activeDebts.reduce((sum, d) => {
                                    const originalDebt = d.payments
                                      .filter(p => p.method === 'CREDIT')
                                      .reduce((s, p) => s + Number(p.amount), 0);
                                    const paid = d.creditPayments.reduce((s, p) => s + Number(p.amount), 0);
                                    return sum + (originalDebt - paid);
                                  }, 0).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-zinc-500">{selectedCustomer.activeDebts.length} Active Debt(s)</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SECTION 1: ACTIVE DEBTS - ENHANCED */}
                      <div>
                        <p className="text-xs font-black uppercase text-zinc-500 mb-4">Active Debts</p>

                        {selectedCustomer.activeDebts.length === 0 ? (
                          <div className="bg-zinc-900 rounded-xl p-8 text-center border border-zinc-800">
                            <CheckCircle className="mx-auto mb-3 text-emerald-500" size={48} />
                            <p className="text-white font-bold">No Active Debts</p>
                            <p className="text-zinc-500 text-sm mt-1">All debts have been settled</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {selectedCustomer.activeDebts.map((debt) => {
                              const creditPaymentTotal = debt.creditPayments.reduce(
                                (sum, p) => sum + Number(p.amount),
                                0
                              );
                              const originalDebt = debt.payments
                                .filter(p => p.method === 'CREDIT')
                                .reduce((sum, p) => sum + Number(p.amount), 0);
                              const remaining = originalDebt - creditPaymentTotal;
                              const progress = originalDebt > 0 ? (creditPaymentTotal / originalDebt) * 100 : 0;
                              const isExpanded = expandedSales.has(debt.id);

                              return (
                                <div
                                  key={debt.id}
                                  className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden"
                                >
                                  {/* DEBT HEADER - Click to expand */}
                                  <div
                                    className="p-4 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                                    onClick={() => toggleSaleExpansion(debt.id)}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                          debt.creditStatus === 'PARTIAL'
                                            ? 'bg-amber-500/10 border border-amber-500/20'
                                            : 'bg-rose-500/10 border border-rose-500/20'
                                        }`}>
                                          <CreditCard className={debt.creditStatus === 'PARTIAL' ? 'text-amber-400' : 'text-rose-400'} size={18} />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <p className="font-bold text-white">Receipt #{debt.receiptNumber}</p>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                              debt.creditStatus === 'PARTIAL'
                                                ? 'bg-amber-500/20 text-amber-400'
                                                : 'bg-rose-500/20 text-rose-400'
                                            }`}>
                                              {debt.creditStatus}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                                            <span className="flex items-center gap-1">
                                              <Calendar size={12} />
                                              {formatDate(debt.createdAt)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                              <Clock size={12} />
                                              {formatTime(debt.createdAt)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right flex items-start gap-2">
                                        <div>
                                          <p className="text-rose-400 font-black text-xl">
                                            KES {remaining.toLocaleString()}
                                          </p>
                                          <p className="text-[10px] text-zinc-500 uppercase">Remaining Debt</p>
                                        </div>
                                        <button className="p-1 hover:bg-zinc-800 rounded transition-colors mt-1">
                                          {isExpanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-4">
                                      <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                                        <span>Paid: KES {creditPaymentTotal.toLocaleString()} of KES {originalDebt.toLocaleString()}</span>
                                        <span>{Math.round(progress)}%</span>
                                      </div>
                                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full transition-all ${
                                            progress >= 100 ? 'bg-emerald-500' :
                                            progress >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                          }`}
                                          style={{ width: `${Math.min(progress, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* EXPANDED DETAILS */}
                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-zinc-800 overflow-hidden"
                                      >
                                        {/* ITEMS PURCHASED */}
                                        <div className="p-4 bg-zinc-950/50">
                                          <p className="text-[10px] font-black uppercase text-zinc-500 mb-3 flex items-center gap-2">
                                            <Package size={12} />
                                            Items Purchased
                                          </p>
                                          <div className="space-y-2">
                                            {debt.items.map((item, i) => (
                                              <div key={i} className="flex justify-between items-center bg-zinc-900 rounded-lg px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs text-zinc-500 font-mono">{item.quantity}x</span>
                                                  <span className="text-sm text-white">{item.product.name}</span>
                                                </div>
                                                <span className="text-sm text-white font-bold">
                                                  KES {(Number(item.unitPrice) * item.quantity).toLocaleString()}
                                                </span>
                                              </div>
                                            ))}
                                          </div>

                                          {/* Transaction Total */}
                                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-800">
                                            <span className="text-xs text-zinc-400 font-bold uppercase">Transaction Total</span>
                                            <span className="text-lg text-white font-black">KES {Number(debt.total).toLocaleString()}</span>
                                          </div>
                                        </div>

                                        {/* ORIGINAL PAYMENT AT CHECKOUT */}
                                        <div className="p-4 border-t border-zinc-800">
                                          <p className="text-[10px] font-black uppercase text-zinc-500 mb-3 flex items-center gap-2">
                                            <Banknote size={12} />
                                            Payment at Checkout
                                          </p>
                                          <div className="flex flex-wrap gap-2">
                                            {debt.payments.map((payment, i) => (
                                              <span
                                                key={i}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                                                  payment.method === 'CASH'
                                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                    : payment.method === 'MPESA'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                }`}
                                              >
                                                {payment.method === 'CASH' ? <Banknote size={12} /> :
                                                 payment.method === 'MPESA' ? <Smartphone size={12} /> :
                                                 <CreditCard size={12} />}
                                                {payment.method}: KES {Number(payment.amount).toLocaleString()}
                                              </span>
                                            ))}
                                          </div>
                                        </div>

                                        {/* PAYMENT HISTORY TIMELINE */}
                                        {debt.creditPayments.length > 0 && (
                                          <div className="p-4 border-t border-zinc-800 bg-emerald-500/5">
                                            <p className="text-[10px] font-black uppercase text-emerald-400 mb-3 flex items-center gap-2">
                                              <Clock size={12} />
                                              Payment History ({debt.creditPayments.length} payment{debt.creditPayments.length > 1 ? 's' : ''})
                                            </p>
                                            <div className="space-y-2">
                                              {debt.creditPayments
                                                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                .map((payment, i) => (
                                                <div key={i} className="flex items-center justify-between bg-zinc-900 rounded-lg px-3 py-2">
                                                  <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                                      <DollarSign size={14} className="text-emerald-400" />
                                                    </div>
                                                    <div>
                                                      <p className="text-sm text-white font-bold">KES {Number(payment.amount).toLocaleString()}</p>
                                                      <p className="text-[10px] text-zinc-500">
                                                        {formatDate(payment.createdAt)} at {formatTime(payment.createdAt)}
                                                      </p>
                                                    </div>
                                                  </div>
                                                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                    payment.paymentMethod === 'CASH'
                                                      ? 'bg-green-500/10 text-green-400'
                                                      : 'bg-emerald-500/10 text-emerald-400'
                                                  }`}>
                                                    {payment.paymentMethod}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* REMAINING DEBT HIGHLIGHT + PAY BUTTON */}
                                        <div className="p-4 border-t border-zinc-800 bg-rose-500/5">
                                          <div className="flex items-center justify-between mb-4">
                                            <div>
                                              <p className="text-[10px] font-black uppercase text-rose-400">Outstanding Balance</p>
                                              <p className="text-3xl font-black text-rose-400">KES {remaining.toLocaleString()}</p>
                                            </div>
                                            <div className="text-right text-xs text-zinc-500">
                                              <p>Original Debt: KES {originalDebt.toLocaleString()}</p>
                                              <p>Total Paid: KES {creditPaymentTotal.toLocaleString()}</p>
                                            </div>
                                          </div>

                                          {/* Record Payment Button */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openPaymentModal(debt);
                                            }}
                                            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black rounded-xl uppercase text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                                          >
                                            <DollarSign size={20} />
                                            RECORD PAYMENT
                                          </button>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>

                                  {/* Quick Pay Button when collapsed */}
                                  {!isExpanded && (
                                    <div className="px-4 pb-4">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openPaymentModal(debt);
                                        }}
                                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black rounded-xl uppercase text-sm flex items-center justify-center gap-2 transition-all"
                                      >
                                        <DollarSign size={16} />
                                        RECORD PAYMENT
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* SECTION 2: SETTLED DEBTS - ENHANCED WITH HISTORY */}
                      {selectedCustomer.settledDebts.length > 0 && (
                        <div>
                          <button
                            onClick={() => setShowSettled(!showSettled)}
                            className="w-full flex items-center justify-between text-xs font-black uppercase text-zinc-500 hover:text-zinc-400 transition-colors mb-3 py-2"
                          >
                            <span className="flex items-center gap-2">
                              <CheckCircle size={14} className="text-emerald-500" />
                              Settled Debts ({selectedCustomer.settledDebts.length})
                            </span>
                            {showSettled ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>

                          <AnimatePresence>
                            {showSettled && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="space-y-3 overflow-hidden"
                              >
                                {selectedCustomer.settledDebts.map((debt) => {
                                  const isExpanded = expandedSales.has(`settled-${debt.id}`);
                                  return (
                                    <div
                                      key={debt.id}
                                      className="bg-zinc-900/50 rounded-xl border border-emerald-500/20 overflow-hidden"
                                    >
                                      <div
                                        className="p-4 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                                        onClick={() => toggleSaleExpansion(`settled-${debt.id}`)}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                              <CheckCircle size={16} className="text-emerald-400" />
                                            </div>
                                            <div>
                                              <p className="text-sm font-bold text-white">
                                                Receipt #{debt.receiptNumber}
                                              </p>
                                              <p className="text-xs text-zinc-500">{formatDate(debt.createdAt)}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <div className="text-right">
                                              <p className="text-emerald-400 font-bold">
                                                KES {Number(debt.total).toLocaleString()}
                                              </p>
                                              <p className="text-[10px] text-emerald-500 uppercase font-bold">FULLY PAID</p>
                                            </div>
                                            {isExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Expanded settled debt details */}
                                      <AnimatePresence>
                                        {isExpanded && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-zinc-800 overflow-hidden"
                                          >
                                            {/* Items */}
                                            <div className="p-4 bg-zinc-950/50">
                                              <p className="text-[10px] font-black uppercase text-zinc-500 mb-2">Items</p>
                                              {debt.items.map((item, i) => (
                                                <p key={i} className="text-xs text-zinc-400">
                                                  {item.quantity}x {item.product.name} @ KES {Number(item.unitPrice).toLocaleString()}
                                                </p>
                                              ))}
                                            </div>

                                            {/* Payment History */}
                                            {debt.creditPayments.length > 0 && (
                                              <div className="p-4 border-t border-zinc-800">
                                                <p className="text-[10px] font-black uppercase text-emerald-400 mb-2">Payment History</p>
                                                <div className="space-y-1">
                                                  {debt.creditPayments
                                                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                                    .map((payment, i) => (
                                                    <div key={i} className="flex justify-between text-xs">
                                                      <span className="text-zinc-500">{formatDate(payment.createdAt)}</span>
                                                      <span className="text-emerald-400 font-bold">+KES {Number(payment.amount).toLocaleString()} ({payment.paymentMethod})</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* RECEIPT REPRINT MODAL */}
      <AnimatePresence>
        {reprintModal.open && reprintModal.transaction && selectedCustomer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeReprintModal}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center"
            />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg"
            >
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                      <Printer className="text-zinc-900" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">Reprint Receipt</h3>
                      <p className="text-xs text-zinc-500">Receipt #{reprintModal.transaction.receiptNumber}</p>
                    </div>
                  </div>
                  <button
                    onClick={closeReprintModal}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-zinc-500" />
                  </button>
                </div>

                {/* Receipt Preview */}
                <div className="p-4 max-h-[60vh] overflow-y-auto bg-zinc-950">
                  <div
                    id="reprint-receipt"
                    ref={receiptRef}
                    className="bg-white text-black p-6 rounded-xl font-mono text-sm"
                  >
                    {/* Business Header */}
                    <div className="text-center border-b-2 border-dashed border-black pb-4 mb-4">
                      <h1 className="text-xl font-black uppercase tracking-wide">PRAM AUTO SPARES</h1>
                      <p className="text-xs mt-1">{branchName || 'Branch'}</p>
                      <p className="text-xs">Tel: 0712 345 678</p>
                    </div>

                    {/* Receipt Type */}
                    <div className="text-center mb-4">
                      <h2 className="text-lg font-black uppercase">
                        {reprintModal.transaction.type === 'CREDIT_SALE' ? 'CREDIT INVOICE' : 'OFFICIAL RECEIPT'}
                      </h2>
                      <p className="text-xs mt-1">Receipt: {reprintModal.transaction.receiptNumber}</p>
                      <p className="text-xs">{formatDateTime(reprintModal.transaction.date)}</p>
                      <p className="text-[10px] text-gray-500 mt-1 italic">** REPRINT **</p>
                    </div>

                    {/* Customer Info */}
                    <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
                      <p className="text-xs font-bold">Customer: {selectedCustomer.name}</p>
                      <p className="text-xs">Phone: {selectedCustomer.phone}</p>
                    </div>

                    {/* Items */}
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase border-b border-black pb-1 mb-2">Items Purchased</p>
                      {reprintModal.transaction.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-1 border-b border-dashed border-gray-300 text-xs">
                          <div className="flex-1">
                            <p className="font-bold">{item.name}</p>
                            <p className="text-gray-600">Qty: {item.quantity} @ KES {item.price.toLocaleString()}</p>
                          </div>
                          <p className="font-bold ml-2">KES {item.total.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="border-t-2 border-black pt-3 mb-4">
                      <div className="flex justify-between text-base font-black">
                        <span>TOTAL:</span>
                        <span>KES {reprintModal.transaction.amount.toLocaleString()}</span>
                      </div>

                      {/* Payment Methods */}
                      {reprintModal.transaction.payments && reprintModal.transaction.payments.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-dashed border-gray-400">
                          {reprintModal.transaction.payments.map((payment, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span>{payment.method}:</span>
                              <span>KES {payment.amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="text-center border-t-2 border-dashed border-black pt-4 mt-4">
                      <p className="text-[9px] font-black uppercase tracking-widest">
                        SYSTEM BY JOSEA SOFTWARE SOLUTIONS
                      </p>
                      <p className="text-[8px] mt-1">Thank you for your business!</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-t border-zinc-800 flex gap-3">
                  <button
                    onClick={closeReprintModal}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePrintReceipt}
                    className="flex-1 py-3 bg-white hover:bg-zinc-200 text-black font-black rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Printer size={18} />
                    PRINT
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ENHANCED PAYMENT MODAL */}
      <AnimatePresence>
        {paymentModal.open && paymentModal.sale && (() => {
          const originalDebt = paymentModal.sale.payments
            .filter(p => p.method === 'CREDIT')
            .reduce((sum, p) => sum + Number(p.amount), 0);
          const totalPaid = paymentModal.sale.creditPayments.reduce((sum, p) => sum + Number(p.amount), 0);
          const remainingDebt = originalDebt - totalPaid;

          return (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closePaymentModal}
                className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center"
              />

              {/* Modal */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md"
              >
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
                  {/* Header */}
                  <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                        <DollarSign className="text-emerald-400" size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white">Record Payment</h3>
                        <p className="text-xs text-zinc-500">Receipt #{paymentModal.sale.receiptNumber}</p>
                      </div>
                    </div>
                    <button
                      onClick={closePaymentModal}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <X size={20} className="text-zinc-500" />
                    </button>
                  </div>

                  {/* Debt Summary */}
                  <div className="p-4 bg-zinc-950 border-b border-zinc-800">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Original Debt</p>
                        <p className="text-lg font-black text-white">KES {originalDebt.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Paid So Far</p>
                        <p className="text-lg font-black text-emerald-400">KES {totalPaid.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Remaining</p>
                        <p className="text-lg font-black text-rose-400">KES {remainingDebt.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Items (collapsed view) */}
                  <div className="p-4 border-b border-zinc-800">
                    <p className="text-[10px] font-black uppercase text-zinc-500 mb-2">Items on this Transaction</p>
                    <div className="flex flex-wrap gap-1">
                      {paymentModal.sale.items.slice(0, 3).map((item, i) => (
                        <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
                          {item.quantity}x {item.product.name}
                        </span>
                      ))}
                      {paymentModal.sale.items.length > 3 && (
                        <span className="text-xs text-zinc-500 px-2 py-1">
                          +{paymentModal.sale.items.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Amount Input with Quick Fill */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-black uppercase text-zinc-500">
                          Payment Amount
                        </label>
                        <button
                          onClick={() => setPaymentAmount(remainingDebt.toString())}
                          className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase"
                        >
                          Fill Full Amount
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">KES</span>
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className={`w-full bg-zinc-950 border rounded-xl pl-14 pr-4 py-4 text-white font-black text-2xl focus:outline-none transition-colors ${
                            parseFloat(paymentAmount) > remainingDebt
                              ? 'border-amber-500 focus:border-amber-400'
                              : 'border-zinc-800 focus:border-emerald-500'
                          }`}
                          placeholder="0"
                        />
                      </div>

                      {/* Quick amount buttons */}
                      {remainingDebt > 500 && (
                        <div className="flex gap-2 mt-2">
                          {[500, 1000, Math.round(remainingDebt / 2)].filter((v, i, a) => a.indexOf(v) === i && v <= remainingDebt).map((amount) => (
                            <button
                              key={amount}
                              onClick={() => setPaymentAmount(amount.toString())}
                              className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-colors"
                            >
                              KES {amount.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Partial payment info */}
                      {parseFloat(paymentAmount) > 0 && parseFloat(paymentAmount) < remainingDebt && (
                        <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <p className="text-xs text-blue-400">
                            <span className="font-bold">Partial Payment:</span> After this payment,
                            <span className="font-black"> KES {(remainingDebt - parseFloat(paymentAmount)).toLocaleString()}</span> will remain.
                          </p>
                        </div>
                      )}

                      {/* Full payment confirmation */}
                      {parseFloat(paymentAmount) >= remainingDebt && parseFloat(paymentAmount) > 0 && (
                        <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                          <p className="text-xs text-emerald-400 flex items-center gap-2">
                            <CheckCircle size={14} />
                            <span className="font-bold">Full Settlement:</span> This will clear the entire debt!
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Method Toggle */}
                    <div>
                      <label className="text-xs font-black uppercase text-zinc-500 mb-2 block">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setPaymentMethod('CASH')}
                          className={`py-4 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border-2 ${
                            paymentMethod === 'CASH'
                              ? 'bg-white text-zinc-900 border-white'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border-transparent'
                          }`}
                        >
                          <Banknote size={20} />
                          CASH
                        </button>
                        <button
                          onClick={() => setPaymentMethod('MPESA')}
                          className={`py-4 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border-2 ${
                            paymentMethod === 'MPESA'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border-transparent'
                          }`}
                        >
                          <Smartphone size={20} />
                          M-PESA
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={handleRecordPayment}
                      disabled={paymentLoading || !paymentAmount || parseFloat(paymentAmount) <= 0}
                      className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-white font-black rounded-xl uppercase transition-all flex items-center justify-center gap-2"
                    >
                      {paymentLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={20} />
                          Confirm Payment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
