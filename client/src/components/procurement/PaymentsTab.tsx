// ============================================
// PAYMENTS TAB
// Track and manage pending supplier payments
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building,
  Receipt,
  Check,
  X,
  DollarSign,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { supplierPaymentService } from '../../services/procurement.service';
import type {
  PendingPaymentsResponse,
  SupplierPayment,
  PaymentMethod,
  Location,
} from '../../types/procurement.types';

// ===== LOCATION COLORS =====
const LOCATION_COLORS: Record<Location, { bg: string; text: string }> = {
  'Nairobi CBD': { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  'Dubai': { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  'Uganda': { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  'Other': { bg: 'bg-zinc-500/10', text: 'text-zinc-400' },
};

const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'M-Pesa', 'Bank Transfer'];

// ===== MAIN COMPONENT =====

export default function PaymentsTab() {
  // State
  const [pendingData, setPendingData] = useState<PendingPaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);

  // Modal state
  const [selectedPayment, setSelectedPayment] = useState<SupplierPayment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [_saving, setSaving] = useState(false);

  // Load pending payments
  const loadPendingPayments = useCallback(async () => {
    setLoading(true);
    const { data } = await supplierPaymentService.getPending();
    if (data) {
      setPendingData(data);
      // Auto-expand all suppliers
      setExpandedSuppliers(new Set(data.suppliers.map(s => s.supplier.id)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPendingPayments();
  }, [loadPendingPayments]);

  // Toggle supplier expansion
  const toggleSupplier = (supplierId: string) => {
    setExpandedSuppliers(prev => {
      const next = new Set(prev);
      if (next.has(supplierId)) {
        next.delete(supplierId);
      } else {
        next.add(supplierId);
      }
      return next;
    });
  };

  // Mark payment as paid
  const handleMarkAsPaid = async (payment: SupplierPayment) => {
    setUpdatingPayment(payment.id);
    const { data } = await supplierPaymentService.update(payment.id, {
      payment_status: 'Paid',
      payment_method: paymentMethod,
      notes: paymentNotes || undefined,
    });

    if (data) {
      loadPendingPayments();
      setSelectedPayment(null);
      setPaymentMethod('Cash');
      setPaymentNotes('');
    }
    setUpdatingPayment(null);
  };

  // Quick mark as paid (single click)
  const handleQuickPay = async (payment: SupplierPayment) => {
    setUpdatingPayment(payment.id);
    const { data } = await supplierPaymentService.update(payment.id, {
      payment_status: 'Paid',
    });
    if (data) {
      loadPendingPayments();
    }
    setUpdatingPayment(null);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (!pendingData || pendingData.suppliers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
          <Check className="w-10 h-10 text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold text-zinc-200 mb-2">All Caught Up!</h3>
        <p>No pending payments to suppliers</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Total Pending</p>
              <p className="text-2xl font-bold text-red-400">
                KES {pendingData.grand_total.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Suppliers Owed</p>
              <p className="text-2xl font-bold text-amber-400">{pendingData.total_suppliers}</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Open Orders</p>
              <p className="text-2xl font-bold text-blue-400">
                {pendingData.suppliers.reduce((sum, s) => sum + s.payments.length, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payments by Supplier */}
      <div className="space-y-4">
        {pendingData.suppliers.map((group) => (
          <div
            key={group.supplier.id}
            className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden"
          >
            {/* Supplier Header */}
            <button
              onClick={() => toggleSupplier(group.supplier.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                {expandedSuppliers.has(group.supplier.id) ? (
                  <ChevronDown className="w-5 h-5 text-zinc-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-zinc-400" />
                )}
                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                  <Building className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-zinc-100">{group.supplier.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${LOCATION_COLORS[group.supplier.location].bg} ${LOCATION_COLORS[group.supplier.location].text}`}>
                      {group.supplier.location}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">{group.supplier.branch_name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-red-400">
                  KES {group.total_pending.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-500">
                  {group.payments.length} {group.payments.length === 1 ? 'order' : 'orders'}
                </p>
              </div>
            </button>

            {/* Payment Details */}
            <AnimatePresence>
              {expandedSuppliers.has(group.supplier.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-zinc-800/50">
                    <table className="w-full">
                      <thead className="bg-zinc-800/30">
                        <tr className="text-left text-xs text-zinc-500 uppercase">
                          <th className="px-4 py-3 font-medium">Order</th>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Expected</th>
                          <th className="px-4 py-3 font-medium">Actual</th>
                          <th className="px-4 py-3 font-medium">Receipt</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {group.payments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-zinc-800/30">
                            <td className="px-4 py-3">
                              <p className="text-sm text-zinc-200">{payment.order?.order_number}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-zinc-400">{formatDate(payment.created_at)}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-zinc-200">
                                KES {payment.expected_amount.toLocaleString()}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              {payment.actual_amount ? (
                                <p className={`text-sm ${payment.actual_amount > payment.expected_amount ? 'text-red-400' : 'text-emerald-400'}`}>
                                  KES {payment.actual_amount.toLocaleString()}
                                  {payment.actual_amount !== payment.expected_amount && (
                                    <span className="text-xs ml-1">
                                      ({payment.actual_amount > payment.expected_amount ? '+' : ''}
                                      {(payment.actual_amount - payment.expected_amount).toLocaleString()})
                                    </span>
                                  )}
                                </p>
                              ) : (
                                <p className="text-sm text-zinc-500">-</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {payment.receipt_image_url ? (
                                <a
                                  href={payment.receipt_image_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-sm text-blue-400 hover:underline"
                                >
                                  <Receipt className="w-4 h-4" />
                                  View
                                </a>
                              ) : (
                                <span className="text-sm text-zinc-500">No receipt</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedPayment(payment)}
                                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  Mark Paid
                                </button>
                                <button
                                  onClick={() => handleQuickPay(payment)}
                                  disabled={updatingPayment === payment.id}
                                  className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                  title="Quick pay (no details)"
                                >
                                  {updatingPayment === payment.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <DollarSign className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Mark as Paid Modal */}
      <AnimatePresence>
        {selectedPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPayment(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-100">Mark Payment as Paid</h3>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Payment Summary */}
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Order</span>
                    <span className="text-sm text-zinc-200">{selectedPayment.order?.order_number}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-zinc-400">Amount</span>
                    <span className="text-lg font-bold text-emerald-400">
                      KES {(selectedPayment.actual_amount || selectedPayment.expected_amount).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Payment Method</label>
                  <div className="flex gap-2">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                          paymentMethod === method
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Notes (optional)</label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Any payment notes..."
                  />
                </div>
              </div>

              <div className="p-4 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleMarkAsPaid(selectedPayment)}
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Payment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
