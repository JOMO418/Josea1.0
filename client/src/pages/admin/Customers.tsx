// ============================================
// ADMIN CUSTOMER INTELLIGENCE PAGE
// Comprehensive Customer Analytics & Management
// ============================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Diamond,
  Sparkles,
  ShieldAlert,
  Building2,
  Filter,
  Download,
  Phone,
  MessageSquare,
  Mail,
  Eye,
  Edit,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  CreditCard,
  ShoppingBag,
  Calendar,
  Receipt,
  Star,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
} from 'lucide-react';
import { api } from '../../api/axios';
import { toast, Toaster } from 'sonner';
import { formatKES } from '../../utils/formatter';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  totalDebt: number;
  vipCustomers: number;
  trends: {
    customersGrowth: number;
    activeGrowth: number;
    debtGrowth: number;
  };
  branchBreakdown: Array<{
    branchId: string;
    branchName: string;
    customerCount: number;
    activeCount: number;
  }>;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  totalSpent: number;
  totalDebt: number;
  lastVisitAt: string;
  createdAt: string;
  orderCount: number;
  primaryBranch: {
    id: string;
    name: string;
  } | null;
}

interface Branch {
  id: string;
  name: string;
  isActive: boolean;
}

interface CustomerDetails {
  id: string;
  name: string;
  phone: string;
  totalSpent: number;
  totalDebt: number;
  lastVisitAt: string;
  createdAt: string;
  creditScore: number;
  frequentItems: Array<{ name: string; count: number }>;
  timeline: Array<{
    type: string;
    date: string;
    amount: number;
    receiptNumber?: string;
    saleId?: string;
    creditStatus?: string;
    branch?: string;
    items?: Array<{ name: string; quantity: number; price: number; total: number }>;
    method?: string;
  }>;
  activeDebts: Array<{
    id: string;
    receiptNumber: string;
    total: number;
    creditStatus: string;
    createdAt: string;
    branch: { id: string; name: string };
    payments: Array<{ method: string; amount: number }>;
    creditPayments: Array<{ amount: number; paymentMethod: string; createdAt: string }>;
  }>;
  settledDebts: Array<{
    id: string;
    receiptNumber: string;
    total: number;
    createdAt: string;
  }>;
  sales: Array<{
    id: string;
    receiptNumber: string;
    total: number;
    isCredit: boolean;
    creditStatus: string | null;
    createdAt: string;
    branch: { id: string; name: string };
    items: Array<{
      quantity: number;
      unitPrice: number;
      total: number;
      product: { id: string; name: string; partNumber: string };
    }>;
  }>;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Debt Status Categories based on payment behavior
type DebtStatus = 'excellent' | 'good' | 'warning' | 'critical';

interface DebtStatusInfo {
  status: DebtStatus;
  label: string;
  description: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const getDebtStatus = (customer: Customer): DebtStatusInfo => {
  // No debt = Excellent
  if (customer.totalDebt === 0) {
    return {
      status: 'excellent',
      label: 'Excellent',
      description: 'No outstanding debt',
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-300',
      icon: <CheckCircle2 className="w-4 h-4" />,
    };
  }

  // Calculate days since last visit (approximation for debt age)
  const daysSinceLastVisit = Math.floor(
    (new Date().getTime() - new Date(customer.lastVisitAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // 30+ days = Critical (1 month without payment)
  if (daysSinceLastVisit >= 30) {
    return {
      status: 'critical',
      label: 'Critical',
      description: `${daysSinceLastVisit}+ days overdue`,
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      borderColor: 'border-red-300',
      icon: <XCircle className="w-4 h-4" />,
    };
  }

  // 20-29 days = Warning
  if (daysSinceLastVisit >= 20) {
    return {
      status: 'warning',
      label: 'At Risk',
      description: `${daysSinceLastVisit} days overdue`,
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-300',
      icon: <AlertTriangle className="w-4 h-4" />,
    };
  }

  // Less than 20 days with debt = Good (recently made purchase/payment)
  return {
    status: 'good',
    label: 'Good',
    description: 'Recent activity',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
    icon: <Clock className="w-4 h-4" />,
  };
};

const getCustomerBadge = (customer: Customer) => {
  const daysSinceCreated = Math.floor(
    (new Date().getTime() - new Date(customer.createdAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const daysSinceLastVisit = Math.floor(
    (new Date().getTime() - new Date(customer.lastVisitAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (customer.totalSpent > 100000) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
        <Diamond className="w-3 h-3" />
        VIP
      </span>
    );
  }

  if (daysSinceCreated <= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
        <Sparkles className="w-3 h-3" />
        New
      </span>
    );
  }

  if (daysSinceLastVisit > 60) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
        <ShieldAlert className="w-3 h-3" />
        At Risk
      </span>
    );
  }

  return null;
};

// Calculate remaining balance for a sale
const calculateSaleBalance = (sale: any): number => {
  const total = Number(sale.total);
  const paidInitial = (sale.payments || [])
    .filter((p: any) => p.method !== 'CREDIT')
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const creditPaid = (sale.creditPayments || [])
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  return Math.max(0, total - paidInitial - creditPaid);
};

const getRelativeTime = (date: string): string => {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  return `${Math.floor(diffInSeconds / 2592000)} months ago`;
};

const getBranchColor = (branchName: string): string => {
  const colors = {
    default: 'bg-amber-100 text-amber-700 border-amber-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
  };

  // Simple hash function to consistently assign colors
  const hash = branchName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorKeys = Object.keys(colors).filter(k => k !== 'default');
  const colorKey = colorKeys[hash % colorKeys.length];
  return colors[colorKey as keyof typeof colors] || colors.default;
};

// ============================================
// STATS CARD COMPONENT
// ============================================

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend: number;
  iconColor: string;
  delay: number;
}

const StatsCard: React.FC<StatsCardProps> = ({
  icon,
  label,
  value,
  trend,
  iconColor,
  delay,
}) => {
  const getTrendIcon = () => {
    if (trend > 0) return <TrendingUp className="w-3 h-3" />;
    if (trend < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (trend > 0) return 'text-emerald-600';
    if (trend < 0) return 'text-red-600';
    return 'text-zinc-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-12 h-12 ${iconColor} bg-opacity-10 rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
        <span className={`flex items-center gap-1 text-xs font-bold ${getTrendColor()}`}>
          {getTrendIcon()}
          {Math.abs(trend)}%
        </span>
      </div>
      <p className="text-3xl font-black text-white mb-1">{value}</p>
      <p className="text-sm text-zinc-500 font-medium">{label}</p>
    </motion.div>
  );
};

// ============================================
// RECORD PAYMENT MODAL COMPONENT
// ============================================

interface RecordPaymentModalProps {
  customer: Customer;
  activeDebts: CustomerDetails['activeDebts'];
  onClose: () => void;
  onPaymentRecorded: () => void;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  customer,
  activeDebts,
  onClose,
  onPaymentRecorded,
}) => {
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA'>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSale = activeDebts.find((d) => d.id === selectedSaleId);
  const remainingBalance = selectedSale ? calculateSaleBalance(selectedSale) : 0;

  const handleSubmit = async () => {
    if (!selectedSaleId) {
      toast.error('Please select a sale to pay');
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (paymentAmount > remainingBalance + 1) {
      toast.error(`Amount exceeds remaining balance of ${formatKES(remainingBalance)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.sales.recordCreditPayment(selectedSaleId, {
        amount: paymentAmount,
        paymentMethod,
      });
      toast.success(`Payment of ${formatKES(paymentAmount)} recorded successfully`);
      onPaymentRecorded();
      onClose();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-emerald-600 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Banknote className="w-6 h-6" />
              <div>
                <h2 className="text-lg font-bold">Record Payment</h2>
                <p className="text-emerald-100 text-sm">{customer.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Outstanding Summary */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-600 font-medium">Total Outstanding</p>
            <p className="text-2xl font-black text-red-700">{formatKES(customer.totalDebt)}</p>
          </div>

          {/* Select Sale */}
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">
              Select Sale to Pay
            </label>
            <select
              value={selectedSaleId}
              onChange={(e) => setSelectedSaleId(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="">-- Select a sale --</option>
              {activeDebts.map((debt) => {
                const balance = calculateSaleBalance(debt);
                return (
                  <option key={debt.id} value={debt.id}>
                    {debt.receiptNumber} - {formatKES(balance)} remaining ({debt.branch.name})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Remaining Balance Display */}
          {selectedSale && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-amber-700">Remaining Balance:</span>
                <span className="font-bold text-amber-800">{formatKES(remainingBalance)}</span>
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">
              Payment Amount (KES)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="0"
              max={remainingBalance}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            {selectedSale && (
              <button
                type="button"
                onClick={() => setAmount(remainingBalance.toString())}
                className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-bold"
              >
                Pay Full Balance ({formatKES(remainingBalance)})
              </button>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">
              Payment Method
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                <Banknote className="w-4 h-4" />
                Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('MPESA')}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'MPESA'
                    ? 'bg-green-600 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                <Phone className="w-4 h-4" />
                M-Pesa
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-700 rounded-xl hover:bg-zinc-200 transition-colors font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedSaleId || !amount}
            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Record Payment
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// FULL PROFILE MODAL COMPONENT
// ============================================

interface FullProfileModalProps {
  customer: CustomerDetails;
  onClose: () => void;
  onRecordPayment: () => void;
}

const FullProfileModal: React.FC<FullProfileModalProps> = ({
  customer,
  onClose,
  onRecordPayment,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'debts'>('overview');
  const debtStatus = getDebtStatus(customer as any);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-black">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold">{customer.name}</h2>
                <p className="text-indigo-200 text-sm font-mono">{customer.phone}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${debtStatus.bgColor} ${debtStatus.textColor}`}>
                    {debtStatus.icon}
                    {debtStatus.label}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-4 border-b border-zinc-200">
          <div className="p-4 text-center border-r border-zinc-200">
            <p className="text-xs text-zinc-500 uppercase font-bold">Total Spent</p>
            <p className="text-lg font-black text-emerald-600">{formatKES(customer.totalSpent)}</p>
          </div>
          <div className="p-4 text-center border-r border-zinc-200">
            <p className="text-xs text-zinc-500 uppercase font-bold">Outstanding Debt</p>
            <p className={`text-lg font-black ${customer.totalDebt > 0 ? 'text-red-600' : 'text-zinc-400'}`}>
              {formatKES(customer.totalDebt)}
            </p>
          </div>
          <div className="p-4 text-center border-r border-zinc-200">
            <p className="text-xs text-zinc-500 uppercase font-bold">Total Orders</p>
            <p className="text-lg font-black text-zinc-900">{customer.sales?.length || 0}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xs text-zinc-500 uppercase font-bold">Member Since</p>
            <p className="text-lg font-black text-zinc-900">
              {new Date(customer.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200">
          {[
            { id: 'overview', label: 'Overview', icon: <Eye className="w-4 h-4" /> },
            { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-4 h-4" /> },
            { id: 'debts', label: 'Debts', icon: <CreditCard className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Favorite Products */}
              <div>
                <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  Favorite Products
                </h3>
                {customer.frequentItems && customer.frequentItems.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {customer.frequentItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-amber-50 border border-amber-200 rounded-xl p-3"
                      >
                        <p className="font-bold text-zinc-900 text-sm truncate">{item.name}</p>
                        <p className="text-xs text-amber-600 font-bold">{item.count} purchases</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 italic">No purchase history yet</p>
                )}
              </div>

              {/* Recent Activity Timeline */}
              <div>
                <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Recent Activity
                </h3>
                {customer.timeline && customer.timeline.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {customer.timeline.slice(0, 10).map((event, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl"
                      >
                        <div className={`p-2 rounded-full ${
                          event.type === 'PAYMENT'
                            ? 'bg-emerald-100 text-emerald-600'
                            : event.type === 'CREDIT_SALE'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {event.type === 'PAYMENT' ? (
                            <ArrowDownCircle className="w-4 h-4" />
                          ) : (
                            <ArrowUpCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-sm text-zinc-900">
                              {event.type === 'PAYMENT'
                                ? 'Payment Received'
                                : event.type === 'CREDIT_SALE'
                                ? 'Credit Sale'
                                : 'Cash Sale'}
                            </p>
                            <p className={`font-bold text-sm ${
                              event.type === 'PAYMENT' ? 'text-emerald-600' : 'text-zinc-900'
                            }`}>
                              {event.type === 'PAYMENT' ? '+' : ''}{formatKES(event.amount)}
                            </p>
                          </div>
                          <p className="text-xs text-zinc-500">
                            {new Date(event.date).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {event.receiptNumber && ` - ${event.receiptNumber}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 italic">No activity yet</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider mb-3">
                All Transactions ({customer.sales?.length || 0})
              </h3>
              {customer.sales && customer.sales.length > 0 ? (
                <div className="space-y-2">
                  {customer.sales.map((sale) => (
                    <div
                      key={sale.id}
                      className="border border-zinc-200 rounded-xl p-4 hover:bg-zinc-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-zinc-900">
                            {sale.receiptNumber}
                          </span>
                          {sale.isCredit && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              sale.creditStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-700'
                                : sale.creditStatus === 'PARTIAL'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {sale.creditStatus}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-zinc-900">{formatKES(sale.total)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>{sale.branch.name}</span>
                        <span>
                          {new Date(sale.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {sale.items && sale.items.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-zinc-100">
                          <p className="text-xs text-zinc-500">
                            {sale.items.map((item) => `${item.quantity}x ${item.product.name}`).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 italic">No transactions yet</p>
              )}
            </div>
          )}

          {activeTab === 'debts' && (
            <div className="space-y-4">
              {/* Active Debts */}
              <div>
                <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Active Debts ({customer.activeDebts?.length || 0})
                </h3>
                {customer.activeDebts && customer.activeDebts.length > 0 ? (
                  <div className="space-y-3">
                    {customer.activeDebts.map((debt) => {
                      const balance = calculateSaleBalance(debt);
                      return (
                        <div
                          key={debt.id}
                          className="border border-red-200 bg-red-50 rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-sm font-bold text-zinc-900">
                              {debt.receiptNumber}
                            </span>
                            <span className="font-bold text-red-600">{formatKES(balance)} remaining</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-zinc-500 mb-3">
                            <span>{debt.branch.name}</span>
                            <span>
                              {new Date(debt.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              debt.creditStatus === 'PARTIAL'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {debt.creditStatus}
                            </span>
                            <span className="text-xs text-zinc-500">
                              Original: {formatKES(debt.total)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      onClick={onRecordPayment}
                      className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold flex items-center justify-center gap-2"
                    >
                      <Banknote className="w-4 h-4" />
                      Record Payment
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-emerald-600 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="font-bold">No outstanding debts</span>
                  </div>
                )}
              </div>

              {/* Settled Debts */}
              {customer.settledDebts && customer.settledDebts.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Settled Debts ({customer.settledDebts.length})
                  </h3>
                  <div className="space-y-2">
                    {customer.settledDebts.slice(0, 5).map((debt) => (
                      <div
                        key={debt.id}
                        className="border border-emerald-200 bg-emerald-50 rounded-xl p-3 opacity-75"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm text-zinc-700">
                            {debt.receiptNumber}
                          </span>
                          <span className="text-sm text-emerald-600 font-bold">{formatKES(debt.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-zinc-200 px-6 py-4 flex gap-3 bg-zinc-50">
          <a
            href={`tel:${customer.phone}`}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold text-sm flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" />
            Call
          </a>
          <a
            href={`sms:${customer.phone}`}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold text-sm flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            SMS
          </a>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-300 transition-colors font-bold text-sm"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// EXPANDABLE ROW COMPONENT
// ============================================

interface ExpandableRowProps {
  customer: Customer;
  onClose: () => void;
  onRecordPayment: () => void;
  onViewProfile: () => void;
}

const ExpandableRow: React.FC<ExpandableRowProps> = ({
  customer,
  onClose,
  onRecordPayment,
  onViewProfile,
}) => {
  const debtStatus = getDebtStatus(customer);

  // Action handlers
  const handleCall = () => {
    window.location.href = `tel:${customer.phone}`;
  };

  const handleSMS = () => {
    window.location.href = `sms:${customer.phone}`;
  };

  const handleEmail = () => {
    // No email field in customer model, so open default email with phone in subject
    window.location.href = `mailto:?subject=Regarding Customer ${customer.name}&body=Customer Phone: ${customer.phone}`;
  };

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <td colSpan={7} className="p-0 bg-zinc-50">
        <div className="p-6 border-t border-zinc-200">
          {/* Header with Close Button */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-zinc-900">Customer Details</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-600" />
            </button>
          </div>

          {/* 4 Section Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Section 1: Quick Stats with Debt Status */}
            <div className="bg-white p-4 rounded-xl border border-zinc-200">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                Status
              </h4>
              <div className="space-y-3">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${debtStatus.bgColor} ${debtStatus.textColor} border ${debtStatus.borderColor}`}>
                  {debtStatus.icon}
                  <div>
                    <p className="font-bold text-sm">{debtStatus.label}</p>
                    <p className="text-xs opacity-80">{debtStatus.description}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Total Orders</p>
                  <p className="text-lg font-bold text-zinc-900">{customer.orderCount}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Avg Order Value</p>
                  <p className="text-lg font-bold text-zinc-900">
                    {formatKES(customer.orderCount > 0 ? customer.totalSpent / customer.orderCount : 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Member Since</p>
                  <p className="text-sm font-medium text-zinc-700">
                    {new Date(customer.createdAt).toLocaleDateString('en-GB', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Contact Info */}
            <div className="bg-white p-4 rounded-xl border border-zinc-200">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                Contact
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 bg-zinc-50 rounded-lg">
                  <Phone className="w-4 h-4 text-zinc-400" />
                  <span className="font-mono text-sm text-zinc-700">{customer.phone}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCall}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    Call
                  </button>
                  <button
                    onClick={handleSMS}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    SMS
                  </button>
                </div>
              </div>
            </div>

            {/* Section 3: Active Debts */}
            <div className="bg-white p-4 rounded-xl border border-zinc-200">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                Outstanding Debt
              </h4>
              {customer.totalDebt > 0 ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Total Owed</p>
                    <p className="text-2xl font-black text-red-600">
                      {formatKES(customer.totalDebt)}
                    </p>
                  </div>
                  <button
                    onClick={onRecordPayment}
                    className="w-full px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Banknote className="w-3 h-3" />
                    Record Payment
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-8 h-8" />
                  <span className="text-sm font-bold">No outstanding debt</span>
                </div>
              )}
            </div>

            {/* Section 4: Spending */}
            <div className="bg-white p-4 rounded-xl border border-zinc-200">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                Total Spending
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Lifetime Value</p>
                  <p className="text-2xl font-black text-emerald-600">
                    {formatKES(customer.totalSpent)}
                  </p>
                </div>
                <button
                  onClick={onViewProfile}
                  className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-bold flex items-center justify-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  View Full Profile
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleCall}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold text-sm flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Call Customer
            </button>
            <button
              onClick={handleSMS}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold text-sm flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Send SMS
            </button>
            <button
              onClick={handleEmail}
              className="flex-1 px-4 py-3 bg-zinc-600 text-white rounded-xl hover:bg-zinc-700 transition-colors font-bold text-sm flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              onClick={onViewProfile}
              className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold text-sm flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Full Profile
            </button>
          </div>
        </div>
      </td>
    </motion.tr>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminCustomers() {
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    totalDebt: 0,
    vipCustomers: 0,
    trends: {
      customersGrowth: 0,
      activeGrowth: 0,
      debtGrowth: 0,
    },
    branchBreakdown: [],
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);

  // Expanded row
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Branch dropdown
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // ============================================
  // DEBOUNCED SEARCH
  // ============================================
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ============================================
  // FETCH DATA
  // ============================================
  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [branchFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [debouncedSearch, branchFilter, statusFilter, currentPage, itemsPerPage]);

  const fetchBranches = async () => {
    try {
      const response = await api.branches.list();
      setBranches(response.data || []);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
      toast.error('Failed to load branches');
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const params: any = {};
      if (branchFilter) params.branchId = branchFilter;

      const response = await api.customers.stats(params);
      setStats(response.data);
    } catch (err: any) {
      console.error('Failed to fetch customer stats:', err);
      toast.error('Failed to load customer statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (branchFilter) params.branchId = branchFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await api.customers.list(params);
      setCustomers(response.data.customers || []);
      setTotalPages(response.data.pagination.totalPages || 1);
      setTotalCustomers(response.data.pagination.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch customers:', err);
      toast.error('Failed to load customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetails = async (customerId: string) => {
    try {
      setLoadingDetails(true);
      const response = await api.customers.details(customerId);
      setCustomerDetails(response.data);
      return response.data;
    } catch (err: any) {
      console.error('Failed to fetch customer details:', err);
      toast.error('Failed to load customer details');
      return null;
    } finally {
      setLoadingDetails(false);
    }
  };

  // ============================================
  // MODAL HANDLERS
  // ============================================

  const handleRecordPayment = async (customer: Customer) => {
    setSelectedCustomer(customer);
    const details = await fetchCustomerDetails(customer.id);
    if (details) {
      setCustomerDetails(details);
      setShowPaymentModal(true);
    }
  };

  const handleViewProfile = async (customer: Customer) => {
    setSelectedCustomer(customer);
    const details = await fetchCustomerDetails(customer.id);
    if (details) {
      setCustomerDetails(details);
      setShowProfileModal(true);
    }
  };

  const handlePaymentRecorded = () => {
    // Refresh customers list and stats
    fetchCustomers();
    fetchStats();
  };

  // ============================================
  // EXPORT TO CSV
  // ============================================
  const handleExportCSV = () => {
    if (customers.length === 0) {
      toast.warning('No data to export');
      return;
    }

    const csvContent = [
      ['Name', 'Phone', 'Total Spent', 'Total Debt', 'Order Count', 'Last Visit', 'Created'],
      ...customers.map((c) => [
        c.name,
        c.phone,
        c.totalSpent,
        c.totalDebt,
        c.orderCount,
        new Date(c.lastVisitAt).toLocaleDateString(),
        new Date(c.createdAt).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Customer data exported successfully');
  };

  const getStatusFilterLabel = () => {
    switch (statusFilter) {
      case 'active':
        return 'Active Only';
      case 'hasDebt':
        return 'Has Debt';
      case 'vip':
        return 'VIP Customers';
      case 'inactive':
        return 'Inactive';
      default:
        return 'All Customers';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Customer Intelligence</h1>
            <p className="text-sm text-zinc-500">Comprehensive customer analytics across all branches</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          icon={<Users className="w-6 h-6 text-blue-500" />}
          label="Total Customers"
          value={statsLoading ? '...' : stats.totalCustomers.toLocaleString()}
          trend={stats.trends.customersGrowth}
          iconColor="text-blue-500"
          delay={0.1}
        />
        <StatsCard
          icon={<TrendingUp className="w-6 h-6 text-emerald-500" />}
          label="Active Customers"
          value={statsLoading ? '...' : stats.activeCustomers.toLocaleString()}
          trend={stats.trends.activeGrowth}
          iconColor="text-emerald-500"
          delay={0.2}
        />
        <StatsCard
          icon={<AlertCircle className="w-6 h-6 text-red-500" />}
          label="Total Outstanding Debt"
          value={statsLoading ? '...' : formatKES(stats.totalDebt)}
          trend={stats.trends.debtGrowth}
          iconColor="text-red-500"
          delay={0.3}
        />
        <StatsCard
          icon={<Diamond className="w-6 h-6 text-purple-500" />}
          label="VIP Customers"
          value={statsLoading ? '...' : stats.vipCustomers.toLocaleString()}
          trend={0}
          iconColor="text-purple-500"
          delay={0.4}
        />
      </div>

      {/* Filters & Actions Bar */}
      <div className="mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left: Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            {/* Center: Filters */}
            <div className="flex gap-3">
              {/* Branch Filter */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsBranchDropdownOpen(!isBranchDropdownOpen);
                    setIsStatusDropdownOpen(false);
                  }}
                  className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-medium hover:bg-zinc-800 transition-all flex items-center gap-2 min-w-[180px]"
                >
                  <Building2 className="w-4 h-4 text-zinc-500" />
                  <span className="flex-1 text-left text-sm">
                    {branchFilter
                      ? branches.find((b) => b.id === branchFilter)?.name || 'All Branches'
                      : 'All Branches'}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isBranchDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsBranchDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full mt-2 right-0 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-20"
                    >
                      <button
                        onClick={() => {
                          setBranchFilter('');
                          setIsBranchDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-zinc-800 transition-colors ${
                          !branchFilter ? 'bg-zinc-800 text-white' : 'text-zinc-400'
                        }`}
                      >
                        All Branches
                      </button>
                      {branches.filter(b => b.isActive).map((branch) => (
                        <button
                          key={branch.id}
                          onClick={() => {
                            setBranchFilter(branch.id);
                            setIsBranchDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-zinc-800 transition-colors ${
                            branchFilter === branch.id ? 'bg-zinc-800 text-white' : 'text-zinc-400'
                          }`}
                        >
                          {branch.name}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </div>

              {/* Quick Filters */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsStatusDropdownOpen(!isStatusDropdownOpen);
                    setIsBranchDropdownOpen(false);
                  }}
                  className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-medium hover:bg-zinc-800 transition-all flex items-center gap-2 min-w-[180px]"
                >
                  <Filter className="w-4 h-4 text-zinc-500" />
                  <span className="flex-1 text-left text-sm">{getStatusFilterLabel()}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isStatusDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsStatusDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full mt-2 right-0 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-20"
                    >
                      {[
                        { value: '', label: 'All Customers' },
                        { value: 'active', label: 'Active Only' },
                        { value: 'hasDebt', label: 'Has Debt' },
                        { value: 'vip', label: 'VIP Customers' },
                        { value: 'inactive', label: 'Inactive' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setStatusFilter(option.value);
                            setIsStatusDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-zinc-800 transition-colors ${
                            statusFilter === option.value ? 'bg-zinc-800 text-white' : 'text-zinc-400'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleExportCSV}
                className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* The White Elevated Table */}
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 mb-4"></div>
              <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest">
                Loading customers...
              </p>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="bg-zinc-100 p-6 rounded-full mb-6">
                <Users className="w-16 h-16 text-zinc-400" />
              </div>
              <p className="text-zinc-900 font-bold text-lg mb-2">No customers found</p>
              <p className="text-zinc-500 text-sm">Try adjusting your filters or search term</p>
              {(searchQuery || branchFilter || statusFilter) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setBranchFilter('');
                    setStatusFilter('');
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-zinc-700 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-zinc-700 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-zinc-700 uppercase tracking-wider">
                    Total Spent
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-zinc-700 uppercase tracking-wider">
                    Debt
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-zinc-700 uppercase tracking-wider">
                    Last Visit
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-zinc-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-black text-zinc-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer, index) => {
                  const debtStatus = getDebtStatus(customer);
                  const isExpanded = expandedRowId === customer.id;
                  const isActive =
                    Math.floor(
                      (new Date().getTime() - new Date(customer.lastVisitAt).getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) <= 30;

                  return (
                    <React.Fragment key={customer.id}>
                      <motion.tr
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`border-b border-zinc-100 hover:bg-amber-50/50 transition-all cursor-pointer ${
                          isExpanded ? 'bg-amber-50/30' : index % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30'
                        }`}
                        onClick={() => setExpandedRowId(isExpanded ? null : customer.id)}
                      >
                        {/* Customer Column */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900 text-base">
                                {customer.name}
                              </span>
                              {getCustomerBadge(customer)}
                            </div>
                            <span className="text-xs font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded w-fit">
                              {customer.phone}
                            </span>
                          </div>
                        </td>

                        {/* Branch Column */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            {customer.primaryBranch ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border w-fit ${getBranchColor(
                                  customer.primaryBranch.name
                                )}`}
                              >
                                <Building2 className="w-3 h-3" />
                                {customer.primaryBranch.name}
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-500">No branch</span>
                            )}
                            <span
                              className={`text-xs font-bold ${
                                isActive ? 'text-emerald-600' : 'text-zinc-400'
                              }`}
                            >
                              {isActive ? '● Active' : '○ Inactive'}
                            </span>
                          </div>
                        </td>

                        {/* Total Spent Column */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`text-base font-bold ${
                                customer.totalSpent > 50000 ? 'text-emerald-600' : 'text-zinc-900'
                              }`}
                            >
                              {formatKES(customer.totalSpent)}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {customer.orderCount} {customer.orderCount === 1 ? 'order' : 'orders'}
                            </span>
                          </div>
                        </td>

                        {/* Debt Column */}
                        <td className="px-6 py-4">
                          {customer.totalDebt > 0 ? (
                            <span className="text-base font-bold text-red-600">
                              {formatKES(customer.totalDebt)}
                            </span>
                          ) : (
                            <span className="text-sm text-zinc-400">—</span>
                          )}
                        </td>

                        {/* Last Visit Column */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-zinc-900">
                              {getRelativeTime(customer.lastVisitAt)}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {new Date(customer.lastVisitAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Debt Status Column */}
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${debtStatus.bgColor} ${debtStatus.textColor} border ${debtStatus.borderColor}`}>
                            {debtStatus.icon}
                            <span className="font-bold text-sm">{debtStatus.label}</span>
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setExpandedRowId(isExpanded ? null : customer.id)}
                              className="p-2 hover:bg-zinc-200 rounded-lg transition-colors group"
                              title="View Details"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-blue-600" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-zinc-600 group-hover:text-blue-600" />
                              )}
                            </button>
                            <button
                              onClick={() => toast.info('Edit customer functionality coming soon')}
                              className="p-2 hover:bg-zinc-200 rounded-lg transition-colors group"
                              title="Edit Customer"
                            >
                              <Edit className="w-4 h-4 text-zinc-600 group-hover:text-amber-600" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>

                      {/* Expandable Row */}
                      <AnimatePresence>
                        {isExpanded && (
                          <ExpandableRow
                            customer={customer}
                            onClose={() => setExpandedRowId(null)}
                            onRecordPayment={() => handleRecordPayment(customer)}
                            onViewProfile={() => handleViewProfile(customer)}
                          />
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && customers.length > 0 && (
          <div className="border-t border-zinc-200 px-6 py-4 bg-zinc-50">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Left: Showing info */}
              <div className="text-sm text-zinc-600">
                Showing{' '}
                <span className="font-bold text-zinc-900">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{' '}
                to{' '}
                <span className="font-bold text-zinc-900">
                  {Math.min(currentPage * itemsPerPage, totalCustomers)}
                </span>{' '}
                of{' '}
                <span className="font-bold text-zinc-900">
                  {totalCustomers}
                </span>{' '}
                customers
              </div>

              {/* Center: Page numbers */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                  Previous
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                        currentPage === pageNumber
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                  Next
                </button>
              </div>

              {/* Right: Items per page */}
              <div className="flex items-center gap-2">
                <label htmlFor="itemsPerPage" className="text-sm text-zinc-600 font-medium">
                  Per page:
                </label>
                <select
                  id="itemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-700 font-medium text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedCustomer && customerDetails && (
          <RecordPaymentModal
            customer={selectedCustomer}
            activeDebts={customerDetails.activeDebts}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedCustomer(null);
              setCustomerDetails(null);
            }}
            onPaymentRecorded={handlePaymentRecorded}
          />
        )}
      </AnimatePresence>

      {/* Full Profile Modal */}
      <AnimatePresence>
        {showProfileModal && customerDetails && (
          <FullProfileModal
            customer={customerDetails}
            onClose={() => {
              setShowProfileModal(false);
              setSelectedCustomer(null);
              setCustomerDetails(null);
            }}
            onRecordPayment={() => {
              setShowProfileModal(false);
              setShowPaymentModal(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Loading Overlay for Customer Details */}
      <AnimatePresence>
        {loadingDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-zinc-700 font-bold">Loading customer profile...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: '#18181b',
            border: '1px solid #27272a',
            color: '#fafafa',
          },
          className: 'font-sans',
        }}
      />
    </div>
  );
}
