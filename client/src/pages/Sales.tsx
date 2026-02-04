// ============================================
// SALES MASTERPIECE - EXECUTIVE TABLE VIEW
// High-Contrast Design + Today-Only KPI Pulse
// ============================================

import { useState, useEffect } from 'react';
import { format, isToday } from 'date-fns';
import {
  Search, Calendar, Loader2, AlertCircle, ChevronDown,
  RotateCcw, DollarSign, Smartphone, Users,
  TrendingUp, X, Printer, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { axiosInstance } from '../api/axios';
import { useStore } from '../store/useStore';

interface SalePayment {
  id: string;
  method: 'CASH' | 'MPESA' | 'CREDIT';
  amount: number;
}

interface CreditPayment {
  id: string;
  amount: number;
  paymentMethod: 'CASH' | 'MPESA';
  createdAt: string;
}

interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  product: {
    id: string;
    name: string;
    partNumber: string;
  };
}

interface Sale {
  id: string;
  receiptNumber: string;
  customerName: string;
  customerPhone: string | null;
  total: number;
  isWalkIn: boolean;
  isCredit: boolean;
  creditStatus: 'PENDING' | 'PARTIAL' | 'PAID' | null;
  reversalStatus: 'NONE' | 'PENDING' | 'APPROVED';
  createdAt: string;
  payments: SalePayment[];
  creditPayments?: CreditPayment[];
  items?: SaleItem[];
  user: {
    name: string;
  };
  // M-Pesa Verification Fields
  flaggedForVerification?: boolean;
  mpesaVerificationStatus?: 'NOT_APPLICABLE' | 'PENDING' | 'VERIFIED' | 'FAILED';
  mpesaReceiptNumber?: string | null;
  flaggedAt?: string | null;
}

export default function Sales() {
  const branchId = useStore((state) => state.branchId);

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showReversalModal, setShowReversalModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [amountToReverse, setAmountToReverse] = useState('');
  const [submittingReversal, setSubmittingReversal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);

  // M-Pesa Verification Modal States
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [mpesaCode, setMpesaCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  // KPI Calculations (Today Only) - Clean Sum with Rounding
  const calculateKPIs = () => {
    let cashSum = 0;
    let mpesaSum = 0;
    let totalSum = 0;

    sales.forEach(sale => {
      sale.payments.forEach(payment => {
        const amount = Number(payment.amount);
        if (payment.method === 'CASH') {
          cashSum += amount;
        } else if (payment.method === 'MPESA') {
          mpesaSum += amount;
        }
      });
      totalSum += Number(sale.total);
    });

    return {
      cash: Math.round(cashSum),
      mpesa: Math.round(mpesaSum),
      total: Math.round(totalSum),
    };
  };

  const kpis = calculateKPIs();
  const todayCash = kpis.cash;
  const todayMpesa = kpis.mpesa;
  const dailyTotal = kpis.total;

  const fetchSales = async () => {
    setLoading(true);
    setError('');

    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await axiosInstance.get('/sales', {
        params: {
          branchId: branchId || undefined,
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
          limit: 1000,
        },
      });

      setSales(response.data.sales || []);
    } catch (err: any) {
      console.error('Error fetching sales:', err);
      setError(err.response?.data?.message || 'Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [selectedDate, branchId]);

  const filteredSales = sales.filter((sale) => {
    const search = searchTerm.toLowerCase();
    return (
      sale.receiptNumber.toLowerCase().includes(search) ||
      sale.customerName.toLowerCase().includes(search)
    );
  });

  const handleVerifyMpesa = async () => {
    if (!selectedSale || !mpesaCode.trim()) {
      toast.error('Please enter M-Pesa code');
      return;
    }

    if (mpesaCode.trim().length < 10) {
      toast.error('M-Pesa code must be at least 10 characters');
      return;
    }

    setVerifying(true);
    try {
      const response = await axiosInstance.post(`/sales/${selectedSale.id}/verify-mpesa`, {
        mpesaCode: mpesaCode.trim().toUpperCase(),
      });

      toast.success('✅ M-Pesa payment verified successfully!');
      setShowVerificationModal(false);
      setMpesaCode('');
      setSelectedSale(null);

      // Refresh sales list
      fetchSales();
    } catch (err: any) {
      console.error('Verification error:', err);
      const errorMsg = err.response?.data?.message || 'Failed to verify M-Pesa code';
      toast.error(errorMsg);
    } finally {
      setVerifying(false);
    }
  };

  const handleRequestReversal = async () => {
    if (!selectedSale || !reversalReason.trim()) {
      toast.error('Please provide a reversal reason');
      return;
    }

    // Validate amount to reverse
    const amount = parseFloat(amountToReverse);
    if (!amountToReverse || isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount to reverse');
      return;
    }

    if (amount > selectedSale.total) {
      toast.error('Amount to reverse cannot exceed sale total', {
        description: `Maximum: KES ${new Intl.NumberFormat('en-KE').format(selectedSale.total)}`,
      });
      return;
    }

    setSubmittingReversal(true);

    try {
      await axiosInstance.post(`/sales/${selectedSale.id}/request-reversal`, {
        reason: reversalReason.trim(),
        amount: amount,
      });

      toast.success('Reversal Request Submitted', {
        description: 'Admin will review your request',
      });

      setShowReversalModal(false);
      setReversalReason('');
      setAmountToReverse('');
      setSelectedSale(null);
      fetchSales();
    } catch (err: any) {
      toast.error('Failed to Submit Request', {
        description: err.response?.data?.message || 'Please try again',
      });
    } finally {
      setSubmittingReversal(false);
    }
  };

  const getStatusBadge = (sale: Sale) => {
    // 🚨 HIGHEST PRIORITY: M-Pesa Verification Pending (Flagged Sales)
    if (sale.flaggedForVerification && sale.mpesaVerificationStatus === 'PENDING') {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600"></span>
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-red-600 text-white uppercase tracking-wider animate-pulse">
              🚨 VERIFY M-PESA
            </span>
          </div>
          <span className="text-[10px] text-red-600 font-bold">Click to verify</span>
        </div>
      );
    }

    if (sale.reversalStatus === 'PENDING') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500 text-black">
          REVERSAL PENDING
        </span>
      );
    }

    if (sale.isCredit && sale.creditStatus === 'PENDING') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500 text-white">
          DENI
        </span>
      );
    }

    if (sale.isCredit && sale.creditStatus === 'PARTIAL') {
      const totalCreditPaid = sale.creditPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      return (
        <div className="flex flex-col gap-1">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500 text-white inline-block w-fit">
            PARTIAL
          </span>
          <span className="text-[10px] text-zinc-500">
            Paid: KES {new Intl.NumberFormat('en-KE').format(totalCreditPaid)}
          </span>
        </div>
      );
    }

    // Sale was on credit but is now fully paid - show history
    if (sale.isCredit && sale.creditStatus === 'PAID') {
      return (
        <div className="flex flex-col gap-1">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white inline-block w-fit">
            CLEARED
          </span>
          <span className="text-[10px] text-orange-500 font-medium">
            Was DENI
          </span>
        </div>
      );
    }

    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white">
        PAID
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white mb-2 uppercase italic tracking-tight">
          Sales Report
        </h1>
        <p className="text-zinc-500 text-sm">
          Track and manage all sales transactions for your branch
        </p>
      </div>

      {/* TODAY-ONLY KPI PULSE BAR */}
      {isToday(selectedDate) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-6 mb-8"
        >
          {/* Today's Cash */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Today's Cash
              </p>
            </div>
            <p className="text-3xl font-black text-white">
              KES {new Intl.NumberFormat('en-KE').format(todayCash)}
            </p>
          </div>

          {/* Today's M-Pesa */}
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Smartphone className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                Today's M-Pesa
              </p>
            </div>
            <p className="text-3xl font-black text-white">
              KES {new Intl.NumberFormat('en-KE').format(todayMpesa)}
            </p>
          </div>

          {/* Daily Total */}
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                Daily Total
              </p>
            </div>
            <p className="text-3xl font-black text-white">
              KES {new Intl.NumberFormat('en-KE').format(dailyTotal)}
            </p>
          </div>
        </motion.div>
      )}

      {/* Filters Bar */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by receipt or customer name..."
            className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          />
        </div>

        {/* Date Picker */}
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          />
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
        ) : filteredSales.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Search className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
              <p className="text-zinc-500 font-medium">No sales found</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-950 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-wider">
                    Receipt
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-black text-white uppercase tracking-wider">
                    Split Amounts
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-black text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className={`transition-all ${
                      sale.flaggedForVerification && sale.mpesaVerificationStatus === 'PENDING'
                        ? 'animate-pulse bg-red-50 border-l-4 border-l-red-600 hover:bg-red-100 cursor-pointer relative'
                        : 'hover:bg-zinc-50'
                    }`}
                    onClick={() => {
                      if (sale.flaggedForVerification && sale.mpesaVerificationStatus === 'PENDING') {
                        setSelectedSale(sale);
                        setShowVerificationModal(true);
                      }
                    }}
                    style={
                      sale.flaggedForVerification && sale.mpesaVerificationStatus === 'PENDING'
                        ? {
                            boxShadow: '0 0 20px rgba(220, 38, 38, 0.3)',
                            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                          }
                        : undefined
                    }
                  >
                    {/* Receipt Column - Monospaced */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {sale.flaggedForVerification && sale.mpesaVerificationStatus === 'PENDING' && (
                          <span className="relative flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600"></span>
                          </span>
                        )}
                        <span className={`font-mono font-bold text-sm ${
                          sale.flaggedForVerification && sale.mpesaVerificationStatus === 'PENDING'
                            ? 'text-red-700 font-black'
                            : 'text-zinc-900'
                        }`}>
                          #{sale.receiptNumber}
                        </span>
                      </div>
                    </td>

                    {/* Date & Time Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {format(new Date(sale.createdAt), 'dd MMM yyyy')}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {format(new Date(sale.createdAt), 'hh:mm a')}
                        </p>
                      </div>
                    </td>

                    {/* Customer Column */}
                    <td className="px-6 py-4">
                      {sale.isWalkIn ? (
                        <div className="flex items-center gap-2 text-zinc-500 italic">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">Walk-in Customer</span>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold text-sm text-zinc-900">
                            {sale.customerName}
                          </p>
                          {sale.customerPhone && (
                            <p className="text-xs text-zinc-500 font-mono">
                              {sale.customerPhone}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Payment Column - Vertical Rows */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {sale.payments.map((payment, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-xs"
                          >
                            {payment.method === 'CASH' && (
                              <>
                                <DollarSign className="w-3 h-3 text-emerald-600" />
                                <span className="font-semibold text-zinc-700">
                                  CASH
                                </span>
                              </>
                            )}
                            {payment.method === 'MPESA' && (
                              <>
                                <Smartphone className="w-3 h-3 text-blue-600" />
                                <span className="font-semibold text-zinc-700">
                                  MPESA
                                </span>
                              </>
                            )}
                            {payment.method === 'CREDIT' && (
                              <>
                                <span className="text-xs font-bold text-rose-600 uppercase">
                                  DENI
                                </span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Amount Column - Aligned with Payment */}
                    <td className="px-6 py-4 text-right">
                      <div className="space-y-1">
                        {sale.payments.map((payment, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-mono font-bold text-zinc-900">
                              {new Intl.NumberFormat('en-KE').format(payment.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(sale)}
                    </td>

                    {/* Actions Menu - The Rule of Three */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative group flex justify-center">
                        <button className="p-2 hover:bg-zinc-200 rounded-lg transition-colors">
                          <ChevronDown className="w-4 h-4 text-zinc-600" />
                        </button>

                        {/* Dropdown - Three Actions */}
                        <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 min-w-[200px]">
                          {/* 1. Request Reversal */}
                          {sale.reversalStatus === 'NONE' && (
                            <button
                              onClick={() => {
                                setSelectedSale(sale);
                                setAmountToReverse(sale.total.toString());
                                setShowReversalModal(true);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Request Reversal
                            </button>
                          )}

                          {/* 2. View Items */}
                          <button
                            onClick={() => {
                              setSelectedSale(sale);
                              setShowItemsModal(true);
                            }}
                            className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors ${
                              sale.reversalStatus === 'NONE' ? 'border-t border-zinc-100' : ''
                            }`}
                          >
                            <Package className="w-4 h-4" />
                            View Items
                          </button>

                          {/* 3. Print Receipt */}
                          <button
                            onClick={() => window.print()}
                            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors border-t border-zinc-100"
                          >
                            <Printer className="w-4 h-4" />
                            Print Receipt
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REVERSAL MODAL */}
      <AnimatePresence>
        {showReversalModal && selectedSale && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              setShowReversalModal(false);
              setReversalReason('');
              setAmountToReverse('');
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-black text-zinc-900">
                  Request Sale Reversal
                </h3>
                <button
                  onClick={() => {
                    setShowReversalModal(false);
                    setReversalReason('');
                    setAmountToReverse('');
                  }}
                  className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-600" />
                </button>
              </div>

              {/* Administrative Approval Notice */}
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-900">
                    Pending Administrative Approval
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    This request will be reviewed by an administrator before the reversal is processed.
                  </p>
                </div>
              </div>

              <div className="mb-6 p-4 bg-zinc-100 rounded-xl">
                <p className="text-xs text-zinc-600 mb-1">Receipt Number</p>
                <p className="font-mono font-bold text-zinc-900">
                  #{selectedSale.receiptNumber}
                </p>
                <p className="text-xs text-zinc-600 mt-2 mb-1">Total Amount</p>
                <p className="font-bold text-zinc-900">
                  KES {new Intl.NumberFormat('en-KE').format(selectedSale.total)}
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-zinc-900">
                    Amount to Reverse (KES) <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={() => setAmountToReverse(selectedSale.total.toString())}
                    className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Quick Fill (Full Amount)
                  </button>
                </div>
                <input
                  type="number"
                  value={amountToReverse}
                  onChange={(e) => setAmountToReverse(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  max={selectedSale.total}
                  step="0.01"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-lg"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Maximum: KES {new Intl.NumberFormat('en-KE').format(selectedSale.total)}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-zinc-900 mb-2">
                  Reversal Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Explain why this sale needs to be reversed..."
                  rows={4}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReversalModal(false);
                    setReversalReason('');
                    setAmountToReverse('');
                  }}
                  disabled={submittingReversal}
                  className="flex-1 px-6 py-3 bg-zinc-200 text-zinc-800 font-bold rounded-xl hover:bg-zinc-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestReversal}
                  disabled={submittingReversal || !reversalReason.trim() || !amountToReverse}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingReversal ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Submit Request
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIEW ITEMS MODAL */}
      <AnimatePresence>
        {showItemsModal && selectedSale && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              setShowItemsModal(false);
              setSelectedSale(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-zinc-900">
                  Sale Items
                </h3>
                <button
                  onClick={() => {
                    setShowItemsModal(false);
                    setSelectedSale(null);
                  }}
                  className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-600" />
                </button>
              </div>

              <div className="mb-6 p-4 bg-zinc-100 rounded-xl">
                <p className="text-xs text-zinc-600 mb-1">Receipt Number</p>
                <p className="font-mono font-bold text-zinc-900">
                  #{selectedSale.receiptNumber}
                </p>
                <p className="text-xs text-zinc-600 mt-2 mb-1">Customer</p>
                <p className="font-semibold text-zinc-900">
                  {selectedSale.isWalkIn ? 'Walk-in Customer' : selectedSale.customerName}
                </p>
              </div>

              {/* Items Table */}
              <div className="bg-zinc-50 rounded-xl overflow-hidden mb-6">
                <table className="w-full">
                  <thead className="bg-zinc-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-black text-white uppercase">
                        Part Number
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-black text-white uppercase">
                        Item Name
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-black text-white uppercase">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-black text-white uppercase">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-black text-white uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {selectedSale.items && selectedSale.items.length > 0 ? (
                      selectedSale.items.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-100 transition-colors">
                          <td className="px-4 py-3 text-sm font-mono text-zinc-700">
                            {item.product.partNumber}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-zinc-900">
                            {item.product.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-center font-bold text-zinc-900">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono text-zinc-700">
                            {new Intl.NumberFormat('en-KE').format(item.unitPrice)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono font-bold text-zinc-900">
                            {new Intl.NumberFormat('en-KE').format(item.total)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                          No items found for this sale
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-zinc-900">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right text-sm font-black text-white uppercase">
                        Grand Total:
                      </td>
                      <td className="px-4 py-3 text-right text-lg font-black text-emerald-400">
                        KES {new Intl.NumberFormat('en-KE').format(selectedSale.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <button
                onClick={() => {
                  setShowItemsModal(false);
                  setSelectedSale(null);
                }}
                className="w-full px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* M-PESA VERIFICATION MODAL - SECURITY CRITICAL */}
      <AnimatePresence>
        {showVerificationModal && selectedSale && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-4 border-red-600"
              style={{ boxShadow: '0 0 40px rgba(220, 38, 38, 0.5)' }}
            >
              {/* Dramatic Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 relative">
                <div className="absolute top-0 left-0 w-full h-full bg-red-900 opacity-50 animate-pulse"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <span className="flex h-12 w-12">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
                        <span className="relative inline-flex items-center justify-center rounded-full h-12 w-12 bg-white">
                          <AlertCircle className="w-6 h-6 text-red-600" />
                        </span>
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">
                        🚨 Verify M-Pesa
                      </h3>
                      <p className="text-red-100 text-xs font-bold">Security Check Required</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowVerificationModal(false);
                      setMpesaCode('');
                      setSelectedSale(null);
                    }}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Sale Info - Warning Style */}
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-red-900 uppercase tracking-wider mb-2">
                        Flagged Sale - Awaiting Payment
                      </p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-red-700 font-semibold">Receipt:</span>
                          <span className="font-mono font-black text-red-900">
                            #{selectedSale.receiptNumber}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-700 font-semibold">Amount:</span>
                          <span className="font-black text-red-900">
                            KES{' '}
                            {selectedSale.payments
                              .filter((p) => p.method === 'MPESA')
                              .reduce((sum, p) => sum + p.amount, 0)
                              .toLocaleString()}
                          </span>
                        </div>
                        {selectedSale.flaggedAt && (
                          <div className="flex justify-between">
                            <span className="text-red-700 font-semibold">Flagged:</span>
                            <span className="text-red-900 text-xs">
                              {Math.floor(
                                (Date.now() - new Date(selectedSale.flaggedAt).getTime()) /
                                  1000 /
                                  60
                              )}{' '}
                              min ago
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* M-Pesa Code Input */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-zinc-900 mb-2 uppercase tracking-wider">
                    Enter M-Pesa Receipt Code
                  </label>
                  <input
                    type="text"
                    value={mpesaCode}
                    onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && mpesaCode.trim().length >= 10 && !verifying) {
                        handleVerifyMpesa();
                      }
                    }}
                    placeholder="e.g., QH12ABC789"
                    className="w-full px-4 py-3 border-2 border-zinc-300 rounded-xl text-center font-mono text-lg font-bold uppercase focus:outline-none focus:ring-4 focus:ring-red-500/50 focus:border-red-500 transition-all"
                    autoFocus
                    maxLength={15}
                  />
                  <p className="text-xs text-zinc-500 mt-2 text-center">
                    Ask customer for their M-Pesa confirmation code
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setShowVerificationModal(false);
                      setMpesaCode('');
                      setSelectedSale(null);
                    }}
                    disabled={verifying}
                    className="px-6 py-3 bg-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-300 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyMpesa}
                    disabled={verifying || mpesaCode.trim().length < 10}
                    className="px-6 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider shadow-lg"
                  >
                    {verifying ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </div>
                    ) : (
                      '✓ Verify & Unflag'
                    )}
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
