// ============================================
// MANUAL M-PESA PAYMENT MODAL
// Shows paybill/till details, waits for customer to pay
// ============================================

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, CheckCircle2, Clock } from 'lucide-react';

interface ManualMpesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  phone: string;
  accountReference: string;
  onPaymentSuccess: (receiptNumber: string) => void;
  onPaymentFailed: (reason: string) => void;
}

export const ManualMpesaPaymentModal: React.FC<ManualMpesaPaymentModalProps> = ({
  isOpen,
  onClose: _onClose,
  amount,
  phone: _phone,
  accountReference,
  onPaymentSuccess,
  onPaymentFailed,
}) => {
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [copied, setCopied] = useState<string | null>(null);

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;

    setCountdown(300);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Auto-timeout after 5 minutes
  useEffect(() => {
    if (countdown === 0) {
      onPaymentFailed('Payment timeout - customer did not pay within 5 minutes');
    }
  }, [countdown, onPaymentFailed]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/82 backdrop-blur-md" />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        className="relative z-10 w-full max-w-md mx-4 bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h3 className="text-white font-black text-xl">Manual M-Pesa Payment</h3>
          <p className="text-blue-100 text-sm mt-1">Customer pays via M-Pesa app</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Instructions */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-blue-400 text-sm font-bold mb-2">📱 Ask customer to:</p>
            <ol className="text-blue-300 text-xs space-y-1 ml-4">
              <li>1. Open M-Pesa on their phone</li>
              <li>2. Select "Lipa Na M-Pesa"</li>
              <li>3. Select "Paybill"</li>
              <li>4. Enter details below</li>
            </ol>
          </div>

          {/* Payment Details */}
          <div className="space-y-3">
            {/* Paybill Number */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-zinc-500 text-xs font-bold">Business Number</p>
                <button
                  onClick={() => copyToClipboard('174379', 'paybill')}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {copied === 'paybill' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-white font-black text-2xl font-mono">174379</p>
            </div>

            {/* Account Number */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-zinc-500 text-xs font-bold">Account Number</p>
                <button
                  onClick={() => copyToClipboard(accountReference, 'account')}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {copied === 'account' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-white font-black text-2xl font-mono">{accountReference}</p>
            </div>

            {/* Amount */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <p className="text-emerald-400 text-xs font-bold mb-2">Amount to Pay</p>
              <p className="text-emerald-400 font-black text-3xl">KES {amount.toLocaleString()}</p>
            </div>
          </div>

          {/* Countdown */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-500">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold">Waiting for payment</span>
              </div>
              <div className="text-white font-black text-lg font-mono">{formatTime(countdown)}</div>
            </div>
            <div className="mt-2 w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 300) * 100}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onPaymentFailed('Payment cancelled by cashier')}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black rounded-xl transition-all text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => onPaymentSuccess(`MANUAL${Date.now().toString().slice(-8)}`)}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition-all text-sm"
            >
              ✓ Confirm Paid
            </button>
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-zinc-600 text-xs">
              Click "Confirm Paid" once customer shows M-Pesa confirmation
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ManualMpesaPaymentModal;
