// ============================================
// SUPERMARKET M-PESA MODAL - PROFESSIONAL CHECKOUT
// Wide modal with 3 payment methods + Complete Later option
// Arrow key navigation + Smooth UX
// ============================================

import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, XCircle, Loader2, Clock, Smartphone, CreditCard, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import mpesaService from '../services/mpesa.service';
import { axiosInstance } from '../api/axios';

interface SupermarketMpesaModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  phone: string;
  accountReference: string;
  onPaymentSuccess: (receiptNumber: string) => void;
  onPaymentFailed: (reason: string) => void;
  onCompleteLater: () => void;
  tillNumber?: string;
}

type PaymentMethod = 'auto' | 'stk' | 'manual';
type PaymentState = 'idle' | 'processing' | 'success' | 'failed';

export default function SupermarketMpesaModal({
  isOpen,
  onClose,
  amount,
  phone,
  accountReference,
  onPaymentSuccess,
  onPaymentFailed: _onPaymentFailed,
  onCompleteLater,
  tillNumber = import.meta.env.VITE_MPESA_TILL_NUMBER || '174379'
}: SupermarketMpesaModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('auto');
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0); // Track elapsed time instead of countdown
  const [autoDetectAttempts, setAutoDetectAttempts] = useState(0);

  const manualInputRef = useRef<HTMLInputElement>(null);
  const checkoutRequestIdRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keyboard navigation: Arrow keys to switch methods
  useEffect(() => {
    if (!isOpen || paymentState === 'success' || paymentState === 'failed') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent if user is typing in input
      if (e.target instanceof HTMLInputElement) return;

      const methods: PaymentMethod[] = ['auto', 'stk', 'manual'];
      const currentIndex = methods.indexOf(selectedMethod);

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : methods.length - 1;
        handleMethodChange(methods[prevIndex]);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < methods.length - 1 ? currentIndex + 1 : 0;
        handleMethodChange(methods[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedMethod, paymentState]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedMethod('auto'); // Default to Auto-Detect (C2B - customer pays themselves)
      setPaymentState('processing'); // Start detecting immediately
      setManualCode('');
      setErrorMessage('');
      setReceiptNumber('');
      setElapsedTime(0);
      setAutoDetectAttempts(0);
      checkoutRequestIdRef.current = null;

      // Start auto-detection immediately
      setTimeout(() => startAutoDetection(), 100);
    } else {
      // Cleanup on close
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, [isOpen]);

  // Elapsed timer (counts up instead of down)
  useEffect(() => {
    if (isOpen && paymentState === 'processing') {
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    }
  }, [isOpen, paymentState]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================
  // AUTO-DETECT (C2B) PAYMENT
  // ============================================
  const startAutoDetection = async () => {
    console.log('[Auto-Detect] Starting C2B detection...');
    setPaymentState('processing');
    setErrorMessage('');
    setAutoDetectAttempts(0);
    setElapsedTime(0);

    // Poll for C2B payment every 3 seconds INDEFINITELY
    // Only stops when: payment found, user switches method, user closes modal, or user clicks Complete Later
    let attempts = 0;

    pollingIntervalRef.current = setInterval(async () => {
      attempts++;
      setAutoDetectAttempts(attempts);

      try {
        // Check if payment received via C2B (match by amount + recency)
        const response = await axiosInstance.get(`/payment/check-payment/${accountReference}`, {
          params: { amount }
        });

        if (response.data.found) {
          console.log('[Auto-Detect] Payment found!', response.data);

          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }

          setReceiptNumber(response.data.receiptNumber);
          setPaymentState('success');

          // Wait 2 seconds to show success, then close
          setTimeout(() => {
            onPaymentSuccess(response.data.receiptNumber);
          }, 2000);
        }
      } catch (error) {
        console.error('[Auto-Detect] Polling error:', error);
        // Don't fail on errors, keep trying
      }

      // No timeout - keep polling indefinitely until user takes action
    }, 3000); // Poll every 3 seconds
  };

  // ============================================
  // STK PUSH PAYMENT
  // ============================================
  const startSTKPush = async () => {
    console.log('[STK Push] Initiating payment...');
    setPaymentState('processing');
    setErrorMessage('');
    setElapsedTime(0);

    try {
      // Validate phone
      const phoneValidation = mpesaService.validateKenyanPhone(phone);
      if (!phoneValidation.valid) {
        setPaymentState('failed');
        setErrorMessage(phoneValidation.error || 'Invalid phone number');
        return;
      }

      // Initiate STK Push
      const response = await mpesaService.initiateMpesaPayment(
        phoneValidation.formatted,
        amount,
        accountReference,
        `Payment for ${accountReference}`
      );

      if (!response.success || !response.data?.checkoutRequestId) {
        setPaymentState('failed');
        setErrorMessage(response.error || 'Failed to send STK Push');
        return;
      }

      checkoutRequestIdRef.current = response.data.checkoutRequestId;

      console.log('[STK Push] Prompt sent! Waiting for customer to enter PIN...');

      // Poll for status
      const finalStatus = await mpesaService.pollPaymentStatus(
        response.data.checkoutRequestId,
        (statusUpdate) => {
          console.log('[STK Push] Status update:', statusUpdate);
          // You can add more granular status updates here
        }
      );

      // Clear any remaining intervals
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      if (finalStatus.data?.status === 'completed' && finalStatus.data?.mpesaReceiptNumber) {
        setReceiptNumber(finalStatus.data.mpesaReceiptNumber);
        setPaymentState('success');

        setTimeout(() => {
          onPaymentSuccess(finalStatus.data?.mpesaReceiptNumber || '');
        }, 2000);
      } else {
        setPaymentState('failed');
        setErrorMessage(finalStatus.data?.resultDesc || 'Payment failed or was cancelled by customer');
      }
    } catch (error: any) {
      console.error('[STK Push] Error:', error);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setPaymentState('failed');
      setErrorMessage(error.message || 'Failed to process payment');
    }
  };

  // ============================================
  // MANUAL CODE ENTRY - Verify with M-Pesa API
  // ============================================
  const handleManualCodeSubmit = async () => {
    if (manualCode.trim().length < 10) {
      setErrorMessage('Please enter a valid M-Pesa receipt code (at least 10 characters)');
      return;
    }

    console.log('[Manual Entry] Verifying code with M-Pesa API:', manualCode);
    setPaymentState('processing');
    setErrorMessage('');

    try {
      // Verify receipt code with M-Pesa Transaction Status API
      const response = await mpesaService.verifyMpesaReceipt(manualCode.trim(), amount);

      if (response.success) {
        setReceiptNumber(manualCode.toUpperCase());
        setPaymentState('success');

        setTimeout(() => {
          onPaymentSuccess(manualCode.toUpperCase());
        }, 2000);
      } else {
        setPaymentState('failed');
        setErrorMessage(response.error || 'Invalid M-Pesa receipt code or amount mismatch');
      }
    } catch (error: any) {
      console.error('[Manual Entry] Verification error:', error);
      setPaymentState('failed');
      setErrorMessage(error.message || 'Failed to verify M-Pesa code');
    }
  };

  // ============================================
  // HANDLE METHOD CHANGE
  // ============================================
  const handleMethodChange = (method: PaymentMethod) => {
    // Stop any ongoing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setSelectedMethod(method);
    setPaymentState('idle');
    setErrorMessage('');
    setManualCode('');
    setElapsedTime(0);
    setAutoDetectAttempts(0);

    // Auto-start if switching to auto-detect
    if (method === 'auto') {
      setTimeout(() => startAutoDetection(), 100);
    }

    // Focus manual input if switching to manual
    if (method === 'manual') {
      setTimeout(() => manualInputRef.current?.focus(), 300);
    }
  };

  // ============================================
  // HANDLE COMPLETE LATER - Process sale and flag for verification
  // ============================================
  const handleCompleteLater = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Process sale without M-Pesa receipt - will be flagged for verification
    console.log('[Complete Later] Flagging sale for verification');
    onCompleteLater();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-950/95 backdrop-blur-2xl">
      {/* Modal Container */}
      <div className="relative w-full max-w-3xl bg-[#09090b] border border-zinc-800 rounded-[2rem] shadow-2xl overflow-hidden">

        {/* ===== HEADER ===== */}
        <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/10">
          <div className="flex items-center gap-3">
            <Smartphone className="text-emerald-500" size={20} />
            <div>
              <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">M-Pesa Payment</h2>
              {paymentState !== 'success' && paymentState !== 'failed' && (
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                    selectedMethod === 'auto' ? 'bg-emerald-500/20 text-emerald-400' :
                    selectedMethod === 'stk' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {selectedMethod === 'auto' ? 'Auto-Detect' :
                     selectedMethod === 'stk' ? 'STK Push' :
                     'Manual Entry'}
                  </span>
                  <span className="text-zinc-600 text-[10px] font-mono">← → to switch</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              // Clean up intervals before closing
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
              }
              onClose();
            }}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ===== CONTENT ===== */}
        <div className="p-6">

          {/* SUCCESS STATE */}
          {paymentState === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="text-emerald-500" size={32} />
              </div>
              <h3 className="text-2xl font-black text-emerald-500 italic uppercase mb-2">Payment Successful!</h3>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 inline-block mt-2">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Receipt Number</p>
                <p className="text-white font-mono font-bold text-lg">{receiptNumber}</p>
              </div>
            </div>
          )}

          {/* FAILED STATE */}
          {paymentState === 'failed' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <XCircle className="text-rose-500" size={32} />
              </div>
              <h3 className="text-xl font-black text-rose-500 italic uppercase mb-2">Payment Failed</h3>
              <p className="text-zinc-400 text-sm mb-4">{errorMessage}</p>

              <div className="flex justify-center gap-3 max-w-md mx-auto">
                <button
                  onClick={() => {
                    setPaymentState('idle');
                    setErrorMessage('');
                  }}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all text-sm uppercase"
                >
                  Try Again
                </button>
                <button
                  onClick={handleCompleteLater}
                  className="flex-1 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-xl transition-all text-sm uppercase"
                >
                  Complete Later
                </button>
              </div>
            </div>
          )}

          {/* IDLE/PROCESSING STATE */}
          {(paymentState === 'idle' || paymentState === 'processing') && (
            <>
              {/* Amount Display - Compact */}
              <div className="bg-zinc-900/20 border-b border-zinc-800/50 p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-500 text-[9px] font-black uppercase tracking-wider mb-1">Amount Due</p>
                    <h3 className="text-white font-black text-3xl tracking-tight">KES {amount.toLocaleString()}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-zinc-500 text-[9px] font-black uppercase tracking-wider mb-1">Till Number</p>
                    <p className="text-emerald-400 font-mono font-bold text-xl">{tillNumber}</p>
                  </div>
                </div>

                {/* Timer (when processing) - Show elapsed time */}
                {paymentState === 'processing' && selectedMethod === 'auto' && (
                  <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <Loader2 className="text-emerald-400 animate-spin" size={14} />
                      <span className="text-emerald-400 font-bold text-xs uppercase">Detecting Payment</span>
                    </div>
                    <span className="text-zinc-600">•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="text-zinc-500" size={12} />
                      <span className="text-zinc-500 font-mono text-xs">{formatTime(elapsedTime)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Methods - Compact */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

                {/* AUTO-DETECT (C2B) */}
                <button
                  onClick={() => handleMethodChange('auto')}
                  disabled={paymentState === 'processing' && selectedMethod !== 'auto'}
                  className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                    selectedMethod === 'auto'
                      ? 'bg-emerald-600/20 border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600'
                  } ${paymentState === 'processing' && selectedMethod !== 'auto' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {selectedMethod === 'auto' && paymentState === 'processing' && (
                    <div className="absolute top-3 right-3">
                      <Loader2 className="text-emerald-400 animate-spin" size={16} />
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative">
                      <CheckCircle className={selectedMethod === 'auto' ? 'text-emerald-400' : 'text-zinc-600'} size={18} />
                      {selectedMethod === 'auto' && paymentState === 'processing' && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">Auto-Detect</h4>
                      {selectedMethod === 'auto' ? (
                        <p className="text-emerald-400 text-[9px] font-bold uppercase tracking-wider">Active</p>
                      ) : (
                        <p className="text-emerald-400 text-[9px] font-bold uppercase tracking-wider">Recommended</p>
                      )}
                    </div>
                  </div>

                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Customer pays to Till <span className="text-white font-mono font-bold">{tillNumber}</span>
                  </p>

                  {selectedMethod === 'auto' && paymentState === 'processing' && (
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <div className="flex items-center justify-between">
                        <p className="text-emerald-400 text-xs font-bold">Waiting for payment...</p>
                        <span className="text-zinc-600 text-[10px] font-mono">{autoDetectAttempts} checks</span>
                      </div>
                    </div>
                  )}
                </button>

                {/* STK PUSH */}
                <button
                  onClick={() => handleMethodChange('stk')}
                  disabled={paymentState === 'processing' && selectedMethod !== 'stk'}
                  className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                    selectedMethod === 'stk'
                      ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/30'
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600'
                  } ${paymentState === 'processing' && selectedMethod !== 'stk' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className={selectedMethod === 'stk' ? 'text-blue-400' : 'text-zinc-600'} size={18} />
                    <div>
                      <h4 className="text-white font-bold text-sm">STK Push</h4>
                      {selectedMethod === 'stk' && (
                        <p className="text-blue-400 text-[9px] font-bold uppercase tracking-wider">Active</p>
                      )}
                    </div>
                  </div>

                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Send prompt to <span className="text-white font-mono">{phone}</span>
                  </p>

                  {selectedMethod === 'stk' && paymentState === 'idle' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startSTKPush();
                      }}
                      className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-all uppercase"
                    >
                      Send Now
                    </button>
                  )}

                  {selectedMethod === 'stk' && paymentState === 'processing' && (
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Loader2 className="text-blue-400 animate-spin" size={14} />
                          <p className="text-blue-400 text-xs font-bold">Waiting for PIN...</p>
                        </div>
                        <span className="text-zinc-600 text-[10px] font-mono">{formatTime(elapsedTime)}</span>
                      </div>
                      <p className="text-zinc-500 text-[10px] mt-2">Customer should check their phone and enter M-Pesa PIN</p>
                    </div>
                  )}
                </button>

                {/* MANUAL CODE ENTRY */}
                <button
                  onClick={() => handleMethodChange('manual')}
                  disabled={paymentState === 'processing' && selectedMethod !== 'manual'}
                  className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                    selectedMethod === 'manual'
                      ? 'bg-amber-600/20 border-amber-500 ring-2 ring-amber-500/30'
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600'
                  } ${paymentState === 'processing' && selectedMethod !== 'manual' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className={selectedMethod === 'manual' ? 'text-amber-400' : 'text-zinc-600'} size={18} />
                    <div>
                      <h4 className="text-white font-bold text-sm">Manual Entry</h4>
                      {selectedMethod === 'manual' && <p className="text-amber-400 text-[9px] font-bold uppercase tracking-wider">Active</p>}
                    </div>
                  </div>

                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Enter M-Pesa receipt code
                  </p>

                  {selectedMethod === 'manual' && paymentState === 'idle' && (
                    <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        ref={manualInputRef}
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (manualCode.trim().length >= 10) {
                              handleManualCodeSubmit();
                            }
                          }
                          e.stopPropagation(); // Prevent arrow key navigation while typing
                        }}
                        placeholder="QH12XYZ789"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        onClick={handleManualCodeSubmit}
                        disabled={manualCode.trim().length < 10}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                      >
                        Verify
                      </button>
                    </div>
                  )}
                </button>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-3 flex items-start gap-2">
                  <AlertCircle className="text-rose-400 flex-shrink-0 mt-0.5" size={16} />
                  <p className="text-rose-400 text-xs">{errorMessage}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ===== FOOTER ===== */}
        {(paymentState === 'idle' || paymentState === 'processing') && (
          <div className="bg-zinc-900/80 border-t border-zinc-800 p-4 flex justify-between items-center gap-3">
            {/* Navigation Hint */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  // Clean up intervals before closing
                  if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                  }
                  if (timerIntervalRef.current) {
                    clearInterval(timerIntervalRef.current);
                    timerIntervalRef.current = null;
                  }
                  onClose();
                }}
                className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm rounded-xl transition-all uppercase"
              >
                Cancel
              </button>

              {/* Keyboard hint */}
              <div className="flex items-center gap-2 text-zinc-600 text-xs">
                <ArrowLeft size={12} />
                <ArrowRight size={12} />
                <span className="font-mono">Use arrow keys to switch methods</span>
              </div>
            </div>

            <button
              onClick={handleCompleteLater}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2 uppercase shadow-lg"
            >
              <AlertCircle size={16} />
              Complete Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
