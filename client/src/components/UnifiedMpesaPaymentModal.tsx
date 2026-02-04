// ============================================
// UNIFIED M-PESA PAYMENT MODAL — PROFESSIONAL EDITION
// Clean, fast, cashier-focused checkout
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Smartphone, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

type PaymentState =
  | 'AUTO_DETECTING'    // Default: waiting for payment
  | 'STK_SENDING'       // Sending STK Push
  | 'STK_WAITING'       // Waiting for customer PIN
  | 'MANUAL_ENTRY'      // Cashier entering receipt
  | 'VERIFYING'         // Checking receipt
  | 'SUCCESS'           // Payment confirmed
  | 'FAILED';           // Payment failed

interface UnifiedMpesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  phone: string;
  accountReference: string;
  onPaymentSuccess: (receiptNumber: string) => void;
  onPaymentFailed: (reason: string) => void;
  onStkPush: () => Promise<{
    success: boolean;
    receiptNumber?: string;
    reason?: string;
  }>;
}

export const UnifiedMpesaPaymentModal: React.FC<UnifiedMpesaPaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  phone,
  accountReference,
  onPaymentSuccess,
  onPaymentFailed,
  onStkPush,
}) => {
  const [state, setState] = useState<PaymentState>('AUTO_DETECTING');
  const [countdown, setCountdown] = useState(180); // 3 minutes
  const [manualReceipt, setManualReceipt] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successReceipt, setSuccessReceipt] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const displayPhone = phone.startsWith('254') ? '0' + phone.slice(3) : phone;

  // Reset and start when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setState('AUTO_DETECTING');
    setCountdown(180);
    setManualReceipt('');
    setErrorMessage('');
    setSuccessReceipt('');
    setShowManualEntry(false);

    // Start countdown
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Start auto-polling for C2B payment
    pollIntervalRef.current = setInterval(() => {
      checkForPayment();
    }, 3000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen]);

  // Auto-timeout after 3 minutes
  useEffect(() => {
    if (countdown === 0 && state === 'AUTO_DETECTING') {
      setState('FAILED');
      setErrorMessage('Payment timeout - No payment detected within 3 minutes');
    }
  }, [countdown, state]);

  // Check for C2B payment (infrastructure ready for Phase 3)
  const checkForPayment = async () => {
    // TODO: Replace with real C2B check when backend ready
    // const response = await api.get(`/api/mpesa/check-payment/${accountReference}`);
    // if (response.data.found) {
    //   handlePaymentDetected(response.data.receiptNumber);
    // }
    console.log('🔍 Auto-detecting payment...', accountReference);
  };

  // Handle auto-detected or manual payment
  const handlePaymentDetected = (receipt: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setSuccessReceipt(receipt);
    setState('SUCCESS');

    setTimeout(() => {
      onPaymentSuccess(receipt);
    }, 1500);
  };

  // Handle STK Push
  const handleSendSTK = async () => {
    setState('STK_SENDING');
    setErrorMessage('');

    try {
      const result = await onStkPush();

      if (result.success) {
        setState('STK_WAITING');
        // Will be detected by auto-polling or completed directly
        if (result.receiptNumber) {
          handlePaymentDetected(result.receiptNumber);
        }
      } else {
        setErrorMessage(result.reason || 'STK Push failed');
        setState('FAILED');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to send STK Push');
      setState('FAILED');
    }
  };

  // Handle manual receipt verification
  const handleManualVerify = async () => {
    if (!manualReceipt.trim()) {
      setErrorMessage('Please enter M-Pesa receipt code');
      return;
    }

    setState('VERIFYING');
    setErrorMessage('');

    // TODO: Add real receipt verification API
    // For now, accept any 10+ character code
    await new Promise(resolve => setTimeout(resolve, 800));

    if (manualReceipt.length >= 10) {
      handlePaymentDetected(manualReceipt.toUpperCase());
    } else {
      setErrorMessage('Receipt code too short (minimum 10 characters)');
      setState('MANUAL_ENTRY');
    }
  };

  // Handle cancel and restart
  const handleCancel = () => {
    onPaymentFailed('Payment cancelled by cashier');
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
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative z-10 w-full max-w-md mx-4 bg-[#09090b] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        <AnimatePresence mode="wait">

          {/* ============================================================
              SUCCESS STATE
          ============================================================ */}
          {state === 'SUCCESS' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-12 flex flex-col items-center text-center gap-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                className="w-24 h-24 rounded-full bg-emerald-500/10 border-4 border-emerald-500/30 flex items-center justify-center"
              >
                <CheckCircle className="w-12 h-12 text-emerald-400" strokeWidth={2.5} />
              </motion.div>

              <div>
                <h3 className="text-emerald-400 font-black text-2xl mb-2">Payment Confirmed!</h3>
                <p className="text-zinc-500 text-sm">M-Pesa Receipt: <span className="text-emerald-400 font-mono font-bold">{successReceipt}</span></p>
              </div>

              <div className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">Amount Paid</span>
                  <span className="text-emerald-400 font-black text-xl">KES {amount.toLocaleString()}</span>
                </div>
              </div>

              <p className="text-zinc-600 text-xs animate-pulse">Completing sale...</p>
            </motion.div>
          )}

          {/* ============================================================
              FAILED STATE
          ============================================================ */}
          {state === 'FAILED' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-10 flex flex-col items-center text-center gap-5"
            >
              <div className="w-20 h-20 rounded-full bg-rose-500/10 border-4 border-rose-500/30 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-rose-400" strokeWidth={2.5} />
              </div>

              <div>
                <h3 className="text-rose-400 font-black text-xl mb-2">Payment Failed</h3>
                <p className="text-zinc-500 text-sm max-w-xs mx-auto">{errorMessage || 'Payment could not be completed'}</p>
              </div>

              <div className="w-full flex gap-3 pt-2">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black rounded-xl transition-all"
                >
                  Cancel Sale
                </button>
                <button
                  onClick={() => {
                    setState('AUTO_DETECTING');
                    setErrorMessage('');
                    setCountdown(180);
                  }}
                  className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl transition-all"
                >
                  Try Again
                </button>
              </div>
            </motion.div>
          )}

          {/* ============================================================
              MAIN PAYMENT FLOW
          ============================================================ */}
          {(state === 'AUTO_DETECTING' || state === 'STK_SENDING' || state === 'STK_WAITING' || state === 'MANUAL_ENTRY' || state === 'VERIFYING') && (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8"
            >
              {/* Header - Amount to Pay */}
              <div className="text-center mb-8">
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Amount to Pay</p>
                <h2 className="text-white font-black text-5xl tracking-tight">
                  KES {amount.toLocaleString()}
                </h2>
                <p className="text-zinc-600 text-xs mt-2 font-mono">Ref: {accountReference}</p>
              </div>

              {/* Status Section */}
              <div className="space-y-6">

                {/* AUTO DETECTING */}
                {(state === 'AUTO_DETECTING' || state === 'STK_SENDING') && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                        <div className="relative w-16 h-16 rounded-full bg-blue-500/10 border-4 border-blue-500/40 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        </div>
                      </div>
                    </div>
                    <h4 className="text-blue-400 font-black text-base mb-1">
                      {state === 'STK_SENDING' ? 'Sending Payment Prompt...' : 'Auto-Detecting Payment'}
                    </h4>
                    <p className="text-blue-300/70 text-xs leading-relaxed">
                      {state === 'STK_SENDING'
                        ? 'Please wait while we send the prompt to customer\'s phone'
                        : 'System will automatically confirm when customer pays via M-Pesa'}
                    </p>
                  </div>
                )}

                {/* STK WAITING */}
                {state === 'STK_WAITING' && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" style={{ animationDuration: '1.5s' }} />
                        <div className="relative w-16 h-16 rounded-full bg-emerald-500/10 border-4 border-emerald-500/40 flex items-center justify-center">
                          <Smartphone className="w-8 h-8 text-emerald-400 animate-bounce" />
                        </div>
                      </div>
                    </div>
                    <h4 className="text-emerald-400 font-black text-base mb-1">Check Customer's Phone</h4>
                    <p className="text-emerald-300/70 text-xs mb-2">Payment prompt sent to</p>
                    <p className="text-emerald-400 font-mono font-black text-lg">{displayPhone}</p>
                    <p className="text-emerald-300/50 text-xs mt-3">Customer should enter M-Pesa PIN to complete</p>
                  </div>
                )}

                {/* MANUAL ENTRY */}
                {state === 'MANUAL_ENTRY' && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
                    <h4 className="text-amber-400 font-black text-sm mb-3 text-center">Manual Receipt Entry</h4>
                    <div className="flex gap-2">
                      <input
                        ref={receiptInputRef}
                        type="text"
                        value={manualReceipt}
                        onChange={(e) => setManualReceipt(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && manualReceipt.trim()) {
                            handleManualVerify();
                          }
                        }}
                        placeholder="Enter M-Pesa code"
                        autoFocus
                        className="flex-1 px-4 py-3 bg-zinc-950 border border-amber-500/50 rounded-xl text-white font-mono font-bold text-center text-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-zinc-600 uppercase"
                        maxLength={20}
                      />
                    </div>
                    {errorMessage && (
                      <div className="flex items-center gap-2 mt-3 text-rose-400 text-xs justify-center">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errorMessage}
                      </div>
                    )}
                    <p className="text-amber-300/50 text-[10px] mt-3 text-center">
                      Ask customer for M-Pesa SMS confirmation code
                    </p>
                  </div>
                )}

                {/* VERIFYING */}
                {state === 'VERIFYING' && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6 text-center">
                    <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-3" />
                    <h4 className="text-purple-400 font-black text-sm">Verifying Receipt...</h4>
                  </div>
                )}

                {/* Divider - Only show when not in manual entry or verifying */}
                {state !== 'MANUAL_ENTRY' && state !== 'VERIFYING' && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-zinc-800" />
                    <span className="text-zinc-600 text-xs font-bold">Options</span>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>
                )}

                {/* Action Buttons */}
                {state !== 'MANUAL_ENTRY' && state !== 'VERIFYING' && (
                  <div className="space-y-3">
                    {/* STK Push Button */}
                    <button
                      onClick={handleSendSTK}
                      disabled={state === 'STK_SENDING' || state === 'STK_WAITING'}
                      className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-white font-black rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg"
                    >
                      <Smartphone className="w-5 h-5" />
                      <div className="text-left">
                        <div className="text-sm">Send Payment Prompt</div>
                        <div className="text-[10px] font-normal opacity-80">Customer receives STK push on {displayPhone}</div>
                      </div>
                    </button>

                    {/* Manual Entry Button */}
                    {!showManualEntry ? (
                      <button
                        onClick={() => {
                          setShowManualEntry(true);
                          setState('MANUAL_ENTRY');
                          setTimeout(() => receiptInputRef.current?.focus(), 100);
                        }}
                        className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black rounded-xl transition-all flex items-center justify-center gap-3"
                      >
                        <div className="text-left">
                          <div className="text-sm">Enter M-Pesa Code Manually</div>
                          <div className="text-[10px] font-normal opacity-70">If customer already paid and has receipt code</div>
                        </div>
                      </button>
                    ) : null}
                  </div>
                )}

                {/* Manual Entry Actions */}
                {state === 'MANUAL_ENTRY' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowManualEntry(false);
                        setState('AUTO_DETECTING');
                        setManualReceipt('');
                        setErrorMessage('');
                      }}
                      className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black rounded-xl transition-all text-sm"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleManualVerify}
                      disabled={!manualReceipt.trim()}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-black rounded-xl transition-all text-sm"
                    >
                      Verify & Complete
                    </button>
                  </div>
                )}

                {/* Countdown Timer - Only when auto-detecting */}
                {(state === 'AUTO_DETECTING' || state === 'STK_WAITING') && (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-zinc-500 text-xs">Time remaining</span>
                      <span className="text-zinc-400 font-mono font-bold text-sm">{formatTime(countdown)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${(countdown / 180) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Cancel Button */}
                <button
                  onClick={handleCancel}
                  className="w-full py-3 text-zinc-600 hover:text-zinc-400 font-bold text-sm transition-colors mt-2"
                >
                  Cancel Sale
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default UnifiedMpesaPaymentModal;
