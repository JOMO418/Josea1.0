import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Banknote,
  Smartphone,
  BookOpen,
  Printer,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Calendar,
  Building2,
  User,
  Users,
  MapPin,
  Eye,
  Package,
} from 'lucide-react';
import axios from '../../api/axios';
import { toast, Toaster } from 'sonner';
import { formatKES } from '../../utils/formatter';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface Payment {
  id: string;
  method: 'CASH' | 'MPESA' | 'CREDIT';
  amount: number;
  reference?: string;
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
  customerPhone?: string;
  subtotal: number;
  discount: number;
  total: number;
  isCredit: boolean;
  creditStatus?: 'PENDING' | 'PARTIAL' | 'PAID';
  isReversed: boolean;
  reversalStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  reversalReason?: string;
  isWalkIn: boolean;
  createdAt: string;
  items: SaleItem[];
  payments: Payment[];
  branch: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string;
  };
}

interface KPIData {
  cash: number;
  mpesa: number;
  credit: number;
  revenue: number;
  volume: number;
}

interface BranchBreakdown {
  branch: string;
  amount: number;
}

interface KPIBreakdown {
  cash: {
    total: number;
    breakdown: BranchBreakdown[];
  };
  mpesa: {
    total: number;
    breakdown: BranchBreakdown[];
  };
  credit: {
    total: number;
    breakdown: BranchBreakdown[];
  };
}

// ============================================
// SOUND NOTIFICATION HELPER
// ============================================

const playSuccessSound = () => {
  try {
    const audio = new Audio('/sounds/success.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => {
      console.warn('Audio playback failed:', err);
    });
  } catch (error) {
    console.warn('Failed to play success sound:', error);
  }
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function SalesAudit() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [kpiData, setKpiData] = useState<KPIData>({
    cash: 0,
    mpesa: 0,
    credit: 0,
    revenue: 0,
    volume: 0,
  });
  const [kpiBreakdown, setKpiBreakdown] = useState<KPIBreakdown>({
    cash: { total: 0, breakdown: [] },
    mpesa: { total: 0, breakdown: [] },
    credit: { total: 0, breakdown: [] },
  });
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isReversalModalOpen, setIsReversalModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // ============================================
  // FETCH DATA
  // ============================================
  useEffect(() => {
    fetchBranches();
    fetchSales();
    fetchKPIs();
  }, [branchFilter, statusFilter, startDate, endDate]);

  const fetchBranches = async () => {
    try {
      const response = await axios.get('/admin/branches');
      setBranches(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params: any = {
        limit: 100,
      };

      if (branchFilter) params.branchId = branchFilter;

      // DATE FILTER FIX: Convert to precise timestamps (Start of Day 00:00:00, End of Day 23:59:59)
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        params.startDate = start.toISOString();
        console.log('📅 Start of Day:', params.startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        params.endDate = end.toISOString();
        console.log('📅 End of Day:', params.endDate);
      }

      // Status filtering
      if (statusFilter === 'DEBT') {
        params.isCredit = true;
        params.creditStatus = ['PENDING', 'PARTIAL'];
      } else if (statusFilter === 'REVERSED') {
        // Will need custom handling
      }

      const response = await axios.get('/sales', { params });
      let salesData = response.data.sales || [];

      // Filter reversed sales on client side if needed
      if (statusFilter === 'REVERSED') {
        salesData = salesData.filter((sale: Sale) => sale.isReversed);
      } else if (statusFilter !== 'ALL') {
        salesData = salesData.filter((sale: Sale) => !sale.isReversed);
      }

      setSales(salesData);
    } catch (err) {
      console.error('Failed to fetch sales:', err);
      toast.error('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIs = async () => {
    try {
      const params: any = {};
      if (branchFilter) params.branchId = branchFilter;

      // DATE FILTER FIX: Use same precise timestamps
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        params.startDate = start.toISOString();
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        params.endDate = end.toISOString();
      }

      const response = await axios.get('/sales/kpi-stats', { params });

      console.log('📊 KPI Response:', response.data);

      if (response.data.success && response.data.data) {
        const data = response.data.data;

        // Extract totals
        setKpiData({
          cash: data.cash.total || 0,
          mpesa: data.mpesa.total || 0,
          credit: data.credit.total || 0,
          revenue: data.totals.revenue || 0,
          volume: data.volume.total || 0,
        });

        // Store breakdown data for reconciliation view
        setKpiBreakdown({
          cash: data.cash || { total: 0, breakdown: [] },
          mpesa: data.mpesa || { total: 0, breakdown: [] },
          credit: data.credit || { total: 0, breakdown: [] },
        });

        console.log('✅ KPI Breakdown by Branch:', {
          cash: data.cash.breakdown,
          mpesa: data.mpesa.breakdown,
          credit: data.credit.breakdown,
        });
      }
    } catch (err) {
      console.error('Failed to fetch KPIs:', err);
    }
  };

  // ============================================
  // REVERSAL HANDLING
  // ============================================
  const handleOpenReversalModal = (sale: Sale) => {
    setSelectedSale(sale);
    setIsReversalModalOpen(true);
  };

  const handleProcessReversal = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedSale) return;

    const loadingToast = toast.loading(
      decision === 'APPROVED' ? 'Approving reversal...' : 'Rejecting reversal...',
      {
        description: `Processing reversal for ${selectedSale.receiptNumber}`,
      }
    );

    setSubmitting(true);

    try {
      await axios.post(`/sales/${selectedSale.id}/reversal-decision`, {
        decision,
        adminNotes: decision === 'APPROVED' ? 'Approved by admin' : 'Rejected by admin',
      });

      toast.dismiss(loadingToast);

      if (decision === 'APPROVED') {
        playSuccessSound();
        toast.success('Reversal approved successfully!', {
          description: 'Stock has been restored to the branch',
          duration: 4000,
        });
      } else {
        toast.success('Reversal rejected', {
          description: 'The sale remains unchanged',
          duration: 3000,
        });
      }

      setIsReversalModalOpen(false);
      setSelectedSale(null);
      fetchSales();
      fetchKPIs();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      console.error('Reversal processing error:', err);

      const errorMessage = err.response?.data?.message || 'Failed to process reversal';
      toast.error('Processing failed', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // STATUS BADGE HELPER
  // ============================================
  const getStatusBadge = (sale: Sale) => {
    if (sale.isReversed) {
      return (
        <span className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
          <XCircle className="w-3 h-3" />
          Reversed
        </span>
      );
    }

    if (sale.reversalStatus === 'PENDING') {
      return (
        <span className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
          <Clock className="w-3 h-3" />
          Pending Reversal
        </span>
      );
    }

    if (sale.isCredit) {
      if (sale.creditStatus === 'PAID') {
        return (
          <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" />
            Paid
          </span>
        );
      } else if (sale.creditStatus === 'PARTIAL') {
        return (
          <span className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Partial
          </span>
        );
      } else {
        return (
          <span className="px-3 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3 h-3" />
            Debt
          </span>
        );
      }
    }

    return (
      <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
        <CheckCircle2 className="w-3 h-3" />
        Paid
      </span>
    );
  };

  // ============================================
  // PAYMENT ICON HELPER
  // ============================================
  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'CASH':
        return <Banknote className="w-4 h-4 text-emerald-500" />;
      case 'MPESA':
        return <Smartphone className="w-4 h-4 text-green-500" />;
      case 'CREDIT':
        return <BookOpen className="w-4 h-4 text-orange-500" />;
      default:
        return <Banknote className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] py-8 px-6 font-sans">
      {/* Header */}
      <div className="max-w-[1600px] mx-auto mb-10">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-blue-500" />
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">
            Sales Audit
          </h1>
          <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400 uppercase tracking-widest">
            Financial Source of Truth
          </span>
        </div>
        <p className="text-zinc-500 font-medium">
          Complete sales tracking with reversal management and debt monitoring
        </p>
      </div>

      {/* KPI Cards - Reconciliation View with Branch Breakdowns */}
      <div className="max-w-[1600px] mx-auto mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Physical Cash */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden group hover:border-emerald-500/30 transition-all h-[280px] flex flex-col"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="relative z-10 p-6 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Physical</span>
            </div>
            <p className="text-xs text-zinc-500 font-medium mb-1">Cash Payments</p>
          </div>

          {/* Branch Breakdown - Scrollable */}
          <div className="relative z-10 px-6 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {kpiBreakdown.cash.breakdown.length > 0 ? (
              <div className="space-y-2 pb-3">
                {kpiBreakdown.cash.breakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <MapPin className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      <span className="text-zinc-400 font-medium truncate">{item.branch}</span>
                    </div>
                    <span className="text-white font-bold font-mono ml-2">{formatKES(item.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic pb-3">No data</p>
            )}
          </div>

          {/* Footer - Global Total */}
          <div className="relative z-10 px-6 py-3 border-t border-zinc-800 bg-zinc-950/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Total</span>
              <span className="text-2xl font-black text-white">{formatKES(kpiData.cash)}</span>
            </div>
          </div>
        </motion.div>

        {/* Digital M-Pesa */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden group hover:border-green-500/30 transition-all h-[280px] flex flex-col"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl" />
          <div className="relative z-10 p-6 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Digital</span>
            </div>
            <p className="text-xs text-zinc-500 font-medium mb-1">M-Pesa Payments</p>
          </div>

          {/* Branch Breakdown - Scrollable */}
          <div className="relative z-10 px-6 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {kpiBreakdown.mpesa.breakdown.length > 0 ? (
              <div className="space-y-2 pb-3">
                {kpiBreakdown.mpesa.breakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <MapPin className="w-3 h-3 text-green-500 flex-shrink-0" />
                      <span className="text-zinc-400 font-medium truncate">{item.branch}</span>
                    </div>
                    <span className="text-white font-bold font-mono ml-2">{formatKES(item.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic pb-3">No data</p>
            )}
          </div>

          {/* Footer - Global Total */}
          <div className="relative z-10 px-6 py-3 border-t border-zinc-800 bg-zinc-950/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-green-500 uppercase tracking-wider">Total</span>
              <span className="text-2xl font-black text-white">{formatKES(kpiData.mpesa)}</span>
            </div>
          </div>
        </motion.div>

        {/* Debt (Deni) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden group hover:border-orange-500/30 transition-all h-[280px] flex flex-col"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl" />
          <div className="relative z-10 p-6 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-orange-500" />
              </div>
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Credit</span>
            </div>
            <p className="text-xs text-zinc-500 font-medium mb-1">Debt (Deni)</p>
          </div>

          {/* Branch Breakdown - Scrollable */}
          <div className="relative z-10 px-6 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {kpiBreakdown.credit.breakdown.length > 0 ? (
              <div className="space-y-2 pb-3">
                {kpiBreakdown.credit.breakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <MapPin className="w-3 h-3 text-orange-500 flex-shrink-0" />
                      <span className="text-zinc-400 font-medium truncate">{item.branch}</span>
                    </div>
                    <span className="text-white font-bold font-mono ml-2">{formatKES(item.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic pb-3">No data</p>
            )}
          </div>

          {/* Footer - Global Total */}
          <div className="relative z-10 px-6 py-3 border-t border-zinc-800 bg-zinc-950/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">Total</span>
              <span className="text-2xl font-black text-white">{formatKES(kpiData.credit)}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="max-w-[1600px] mx-auto mb-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-zinc-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Branch Filter */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                <Building2 className="w-3 h-3 inline mr-1" />
                Branch
              </label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">All Branches</option>
                {branches.filter(b => b.isActive).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="ALL">All Sales</option>
                <option value="DEBT">Debt Only</option>
                <option value="REVERSED">Reversed Only</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                <Calendar className="w-3 h-3 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                <Calendar className="w-3 h-3 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="max-w-[1600px] mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Receipt
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3 h-3" />
                      Sold Items
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Payment Breakdown
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-zinc-500 font-medium">Loading sales data...</span>
                      </div>
                    </td>
                  </tr>
                ) : sales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <FileText className="w-12 h-12 text-zinc-300" />
                        <p className="text-zinc-500 font-medium">No sales found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <motion.tr
                      key={sale.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`hover:bg-zinc-50 transition-colors ${
                        sale.reversalStatus === 'PENDING' ? 'bg-amber-50/50 border-l-4 border-l-amber-500' : ''
                      }`}
                    >
                      {/* Date & Time */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-zinc-900 font-medium">
                          {new Date(sale.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                          })}
                          {', '}
                          {new Date(sale.createdAt).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Receipt */}
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-zinc-900 font-bold">
                          {sale.receiptNumber}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {sale.isWalkIn ? (
                            <User className="w-4 h-4 text-zinc-400" />
                          ) : (
                            <Users className="w-4 h-4 text-blue-500" />
                          )}
                          <span className="text-sm text-zinc-900 font-medium">
                            {sale.customerName}
                          </span>
                        </div>
                      </td>

                      {/* Branch */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-zinc-900">{sale.branch.name}</span>
                      </td>

                      {/* Payment Breakdown */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          {sale.payments.map((payment, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              {getPaymentIcon(payment.method)}
                              <span className="text-xs font-bold text-zinc-700">
                                {payment.method}:
                              </span>
                              <span className="text-xs font-mono text-zinc-900">
                                {formatKES(payment.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-zinc-900">
                          {formatKES(sale.total)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {getStatusBadge(sale)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => window.print()}
                            className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                            title="Print Receipt"
                          >
                            <Printer className="w-4 h-4 text-zinc-600" />
                          </button>
                          {sale.reversalStatus === 'PENDING' && (
                            <button
                              onClick={() => handleOpenReversalModal(sale)}
                              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-xs font-bold uppercase tracking-wide"
                            >
                              Review
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reversal Modal */}
      <AnimatePresence>
        {isReversalModalOpen && selectedSale && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !submitting && setIsReversalModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">Reversal Request</h2>
                    <p className="text-white/80 text-sm font-medium">
                      Receipt: {selectedSale.receiptNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Sale Details */}
                <div className="mb-6 p-4 bg-zinc-50 rounded-xl">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500 font-medium mb-1">Customer</p>
                      <p className="text-zinc-900 font-bold">{selectedSale.customerName}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 font-medium mb-1">Total Amount</p>
                      <p className="text-zinc-900 font-bold">{formatKES(selectedSale.total)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 font-medium mb-1">Branch</p>
                      <p className="text-zinc-900 font-bold">{selectedSale.branch.name}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 font-medium mb-1">Cashier</p>
                      <p className="text-zinc-900 font-bold">{selectedSale.user.name}</p>
                    </div>
                  </div>
                </div>

                {/* Reversal Reason */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider mb-3">
                    Manager's Reason
                  </h3>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-zinc-900 font-medium leading-relaxed">
                      {selectedSale.reversalReason || 'No reason provided'}
                    </p>
                  </div>
                </div>

                {/* Warning */}
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-900 mb-1">Warning</p>
                    <p className="text-xs text-red-700 leading-relaxed">
                      Approving this reversal will restore all items back to inventory and mark the sale as reversed.
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleProcessReversal('REJECTED')}
                    disabled={submitting}
                    className="flex-1 px-6 py-3 bg-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-300 transition-colors font-bold text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleProcessReversal('APPROVED')}
                    disabled={submitting}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Processing...' : 'Approve Reversal'}
                  </button>
                </div>
              </div>
            </motion.div>
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
