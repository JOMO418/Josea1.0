// ============================================
// DEBT TRACKING & SETTLEMENT PAGE
// Complete debt management with payment recording
// ============================================

import { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  Phone,
  MessageSquareText,
  CreditCard,
  Eye,
  Package,
  X,
  Loader2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { axiosInstance } from '../api/axios';
import { formatKES } from '../utils/formatter';
import { notifySuccess, notifyApiError, notifyError } from '../utils/notification';

// ===== TYPE DEFINITIONS =====

interface Sale {
  id: string;
  receiptNumber: string;
  customerName: string;
  customerPhone: string | null;
  total: number;
  creditStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  createdAt: string;
  branch?: {
    id: string;
    name: string;
    phone: string | null;
  };
  payments?: Array<{
    id: string;
    method: 'CASH' | 'MPESA' | 'CREDIT';
    amount: number;
  }>;
  creditPayments?: Array<{
    id: string;
    amount: number;
    paymentMethod: string;
    receivedBy: string;
    createdAt: string;
    notes?: string;
  }>;
}

type TabType = 'ACTIVE' | 'SETTLED';

// ===== SEGMENTED CONTROL (TAB SYSTEM) =====

interface SegmentedControlProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  activeCount: number;
  settledCount: number;
}

function SegmentedControl({
  activeTab,
  onTabChange,
  activeCount,
  settledCount,
}: SegmentedControlProps) {
  return (
    <div className="flex gap-2 p-1 bg-slate-900/50 rounded-lg border border-slate-800">
      <button
        onClick={() => onTabChange('ACTIVE')}
        className={`
          flex-1 px-6 py-3 rounded-md font-medium transition-all duration-200
          ${
            activeTab === 'ACTIVE'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }
        `}
      >
        Active Debts
        {activeCount > 0 && (
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white/20">
            {activeCount}
          </span>
        )}
      </button>
      <button
        onClick={() => onTabChange('SETTLED')}
        className={`
          flex-1 px-6 py-3 rounded-md font-medium transition-all duration-200
          ${
            activeTab === 'SETTLED'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }
        `}
      >
        Settled History
        {settledCount > 0 && (
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white/20">
            {settledCount}
          </span>
        )}
      </button>
    </div>
  );
}

// ===== HELPER FUNCTION: CALCULATE ACTUAL BALANCE =====

/**
 * Calculates the actual remaining balance for a credit sale
 * CRITICAL: Excludes 'CREDIT' method from initial payments (only counts CASH/MPESA)
 */
function calculateBalance(sale: Sale): number {
  // Get initial payments (filter out CREDIT method - that's the debt itself)
  const payments = sale.payments || [];
  const totalPaidInitial = payments
    .filter(p => p.method !== 'CREDIT')
    .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);

  // Get credit payments (actual money received for the debt)
  const creditPayments = sale.creditPayments || [];
  const totalCreditPaid = creditPayments.reduce(
    (sum, payment) => sum + parseFloat(payment.amount.toString()),
    0
  );

  // Calculate remaining balance
  const saleTotal = parseFloat(sale.total.toString());
  const balance = saleTotal - totalPaidInitial - totalCreditPaid;

  return balance;
}

// ===== RECORD PAYMENT MODAL =====

interface RecordPaymentModalProps {
  sale: Sale;
  onClose: () => void;
  onSuccess: () => void;
}

function RecordPaymentModal({ sale, onClose, onSuccess }: RecordPaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate remaining balance using the helper function
  const remainingBalance = calculateBalance(sale);

  const [amount, setAmount] = useState(remainingBalance.toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA'>('CASH');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const paymentAmount = parseFloat(amount);

    console.log('=== PAYMENT MODAL SUBMIT ===');
    console.log('Sale ID:', sale.id);
    console.log('Payment Amount:', paymentAmount);
    console.log('Payment Method:', paymentMethod);
    console.log('Remaining Balance:', remainingBalance);

    // Validation
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      console.error('Validation failed: Invalid amount');
      notifyError('Invalid amount', {
        description: 'Please enter a valid payment amount',
      });
      return;
    }

    if (paymentAmount > remainingBalance) {
      console.error('Validation failed: Amount exceeds balance');
      notifyError('Amount exceeds balance', {
        description: `Maximum payable amount is ${formatKES(remainingBalance)}`,
      });
      return;
    }

    try {
      setIsSubmitting(true);

      console.log('Sending payment request to API...');
      console.log('URL:', `/sales/${sale.id}/payment`);
      console.log('Payload:', { amount: paymentAmount, paymentMethod, notes: notes.trim() || undefined });

      const response = await axiosInstance.post(`/sales/${sale.id}/payment`, {
        amount: paymentAmount,
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      console.log('Payment recorded successfully!');
      console.log('Response:', response.data);

      notifySuccess('Payment Recorded!', {
        description: `${formatKES(paymentAmount)} received from ${sale.customerName}`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('=== PAYMENT ERROR ===');
      console.error('Full error:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      console.error('Error response headers:', error.response?.headers);

      const errorMessage = error.response?.data?.message || error.message || 'Failed to record payment';
      notifyApiError('Payment Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-white">Record Payment</h3>
            <p className="text-sm text-slate-400 mt-1">
              {sale.customerName} • {sale.receiptNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Balance Info */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <p className="text-sm text-amber-400 mb-1">Outstanding Balance</p>
            <p className="text-2xl font-bold text-white font-money">
              {formatKES(remainingBalance)}
            </p>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Payment Amount (KES)
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none font-money"
              placeholder="Enter amount"
              required
              max={remainingBalance}
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`
                  px-4 py-3 rounded-lg border-2 font-medium transition-all
                  ${
                    paymentMethod === 'CASH'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-slate-700 text-slate-400 hover:border-slate-600'
                  }
                `}
              >
                Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('MPESA')}
                className={`
                  px-4 py-3 rounded-lg border-2 font-medium transition-all
                  ${
                    paymentMethod === 'MPESA'
                      ? 'border-green-500 bg-green-500/10 text-green-400'
                      : 'border-slate-700 text-slate-400 hover:border-slate-600'
                  }
                `}
              >
                M-Pesa
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none resize-none"
              rows={3}
              placeholder="Add payment notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Record Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== VIEW VOUCHER MODAL =====

interface ViewVoucherModalProps {
  sale: Sale;
  onClose: () => void;
}

function ViewVoucherModal({ sale, onClose }: ViewVoucherModalProps) {
  // Get initial payments (excluding CREDIT method)
  const payments = sale.payments || [];
  const totalPaidInitial = payments
    .filter(p => p.method !== 'CREDIT')
    .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);

  // Get credit payments
  const creditPayments = sale.creditPayments || [];
  const totalCreditPaid = creditPayments.reduce(
    (sum, payment) => sum + parseFloat(payment.amount.toString()),
    0
  );

  // Total paid = initial payments (CASH/MPESA) + credit payments
  const totalPaid = totalPaidInitial + totalCreditPaid;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-white">Payment Voucher</h3>
            <p className="text-sm text-slate-400 mt-1">{sale.receiptNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Customer Info */}
          <div className="bg-slate-900/50 rounded-lg p-4">
            <p className="text-sm text-slate-400">Customer</p>
            <p className="text-lg font-bold text-white">{sale.customerName}</p>
            {sale.customerPhone && (
              <p className="text-sm text-slate-400 mt-1">{sale.customerPhone}</p>
            )}
          </div>

          {/* Amount Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-1">Total Amount</p>
              <p className="text-xl font-bold text-white font-money">
                {formatKES(parseFloat(sale.total.toString()))}
              </p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <p className="text-sm text-emerald-400 mb-1">Total Paid</p>
              <p className="text-xl font-bold text-white font-money">
                {formatKES(totalPaid)}
              </p>
            </div>
          </div>

          {/* Payment History */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3">Payment History</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {creditPayments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No payments recorded
                </p>
              ) : (
                creditPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="bg-slate-900/50 rounded-lg p-3 border border-slate-800"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {formatKES(parseFloat(payment.amount.toString()))}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {payment.paymentMethod} • Received by {payment.receivedBy}
                        </p>
                        {payment.notes && (
                          <p className="text-xs text-slate-500 mt-1">{payment.notes}</p>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(payment.createdAt).toLocaleDateString('en-KE', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== EMPTY STATE =====

function EmptyState({ type }: { type: TabType }) {
  return (
    <div className="bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-xl p-12 text-center">
      <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-white mb-2">
        {type === 'ACTIVE' ? 'No Active Debts' : 'No Settled Debts'}
      </h3>
      <p className="text-slate-400 text-sm">
        {type === 'ACTIVE'
          ? 'All credit sales are fully paid. Great work!'
          : 'No payment history available yet.'}
      </p>
    </div>
  );
}

// ===== MAIN COMPONENT =====

export default function DebtTracking() {
  const branchName = useStore((state) => state.branchName);
  const branchPhone = '0712345678'; // This should come from branch data

  const [activeTab, setActiveTab] = useState<TabType>('ACTIVE');
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<Sale | null>(null);
  const [selectedSaleForVoucher, setSelectedSaleForVoucher] = useState<Sale | null>(null);

  // Fetch credit sales with useCallback to avoid dependency issues
  const fetchCreditSales = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await axiosInstance.get('/sales', {
        params: {
          isCredit: 'true',
          limit: 1000,
        },
      });

      // Safely handle response data
      const salesData = response?.data?.sales || [];
      setSales(salesData);
    } catch (error: any) {
      console.error('Fetch debts error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch debts';
      notifyApiError('Fetch Error', errorMessage);
      // Set empty array on error to prevent crashes
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreditSales();
  }, [fetchCreditSales]);

  // Filter sales based on active tab with null safety
  const activeSales = sales.filter(
    (sale) => sale?.creditStatus === 'PENDING' || sale?.creditStatus === 'PARTIAL'
  );
  const settledSales = sales.filter((sale) => sale?.creditStatus === 'PAID');

  const displayedSales = activeTab === 'ACTIVE' ? activeSales : settledSales;

  // Generate message template for WhatsApp/SMS
  const generateMessage = (sale: Sale, balance: number) => {
    return `Hello ${sale.customerName}, this is PRAM Auto Spares (${branchName}). ` +
      `Reminder of pending balance ${formatKES(balance)}. Call ${branchPhone}.`;
  };

  // WhatsApp message template with null safety
  const getWhatsAppLink = (sale: Sale) => {
    if (!sale.customerPhone) return '#';

    // Use the helper function for accurate balance
    const balance = calculateBalance(sale);
    const message = encodeURIComponent(generateMessage(sale, balance));
    const phone = sale.customerPhone.replace(/\D/g, ''); // Remove non-digits
    return `https://wa.me/${phone}?text=${message}`;
  };

  // SMS link with null safety
  const getSmsLink = (sale: Sale) => {
    if (!sale.customerPhone) return '#';

    // Use the helper function for accurate balance
    const balance = calculateBalance(sale);
    const message = encodeURIComponent(generateMessage(sale, balance));
    return `sms:${sale.customerPhone}?body=${message}`;
  };

  return (
    <div className="space-y-6 relative pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Debt Management</h1>
        <p className="text-slate-400">Track and settle credit sales</p>
      </div>

      {/* Segmented Control */}
      <SegmentedControl
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeCount={activeSales.length}
        settledCount={settledSales.length}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && displayedSales.length === 0 && <EmptyState type={activeTab} />}

      {/* Active Debts View - Card Row Style */}
      {!isLoading && activeTab === 'ACTIVE' && displayedSales.length > 0 && (
        <div className="space-y-3">
          {displayedSales.map((sale) => {
            // Use the helper function to calculate actual remaining balance
            const balance = calculateBalance(sale);

            return (
              <div
                key={sale.id}
                className="bg-white text-slate-800 rounded-lg shadow-sm mb-3 border border-slate-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  {/* Customer Info */}
                  <div className="lg:col-span-3">
                    <p className="text-xs text-slate-500 uppercase font-medium mb-1">Customer</p>
                    <p className="text-sm font-bold text-slate-900">{sale.customerName}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{sale.customerPhone || 'N/A'}</p>
                  </div>

                  {/* Receipt & Date */}
                  <div className="lg:col-span-2">
                    <p className="text-xs text-slate-500 uppercase font-medium mb-1">Receipt</p>
                    <p className="text-sm font-mono text-slate-800">{sale.receiptNumber}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {new Date(sale.createdAt).toLocaleDateString('en-KE', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  {/* Balance */}
                  <div className="lg:col-span-2">
                    <p className="text-xs text-slate-500 uppercase font-medium mb-1">Balance Due</p>
                    <p className="text-lg font-bold text-red-600 font-money">
                      {formatKES(balance)}
                    </p>
                  </div>

                  {/* Contact Actions */}
                  <div className="lg:col-span-2">
                    <p className="text-xs text-slate-500 uppercase font-medium mb-2">Contact</p>
                    <div className="flex items-center gap-2">
                      {/* WhatsApp */}
                      {sale.customerPhone && (
                        <a
                          href={getWhatsAppLink(sale)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}

                      {/* SMS */}
                      {sale.customerPhone && (
                        <a
                          href={getSmsLink(sale)}
                          className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                          title="Send SMS"
                        >
                          <MessageSquareText className="w-4 h-4" />
                        </a>
                      )}

                      {/* Call */}
                      {sale.customerPhone && (
                        <a
                          href={`tel:${sale.customerPhone}`}
                          className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Call"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Settlement Action */}
                  <div className="lg:col-span-3">
                    <p className="text-xs text-slate-500 uppercase font-medium mb-2">Settlement</p>
                    <button
                      onClick={() => setSelectedSaleForPayment(sale)}
                      className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm flex items-center justify-center gap-2 shadow-sm"
                    >
                      <CreditCard className="w-4 h-4" />
                      RECORD PAYMENT
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Settled History View */}
      {!isLoading && activeTab === 'SETTLED' && displayedSales.length > 0 && (
        <div className="bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Receipt
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Date Settled
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {displayedSales.map((sale) => {
                  const creditPayments = sale.creditPayments || [];
                  const lastPayment = creditPayments[creditPayments.length - 1];

                  return (
                    <tr key={sale.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 text-sm text-white font-medium">
                        {sale.customerName}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 font-mono">
                        {sale.receiptNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {lastPayment
                          ? new Date(lastPayment.createdAt).toLocaleDateString('en-KE', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-400 font-money">
                        {formatKES(parseFloat(sale.total.toString()))}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedSaleForVoucher(sale)}
                          className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
                          title="View Voucher"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedSaleForPayment && (
        <RecordPaymentModal
          sale={selectedSaleForPayment}
          onClose={() => setSelectedSaleForPayment(null)}
          onSuccess={fetchCreditSales}
        />
      )}

      {selectedSaleForVoucher && (
        <ViewVoucherModal
          sale={selectedSaleForVoucher}
          onClose={() => setSelectedSaleForVoucher(null)}
        />
      )}

      {/* Watermark - Fixed Bottom Center */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-none z-10">
        <p className="text-xs text-gray-400/50 font-mono uppercase tracking-wider text-center">
          Powered by Josea Software Solutions
        </p>
      </div>
    </div>
  );
}
