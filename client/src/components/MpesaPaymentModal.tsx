// ============================================
// M-PESA PAYMENT MODAL — VISION EDITION
// Full-screen STK Push lifecycle overlay.
// Matches the dark [#09090b] POS design system.
//
// DEV / SANDBOX MODE:
//   When VITE_MPESA_ENV !== 'production',
//   each stage is held for a visible duration
//   so you can SEE every transition even though
//   Safaricom sandbox auto-resolves in < 3 s.
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone, CheckCircle2, XCircle, Clock, Loader2
} from 'lucide-react';

// ---------------------------------------------------------------------------
// PROPS
// ---------------------------------------------------------------------------
interface MpesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  phone: string;                       // 254XXXXXXXXX
  accountReference: string;
  onPaymentSuccess: (mpesaReceiptNumber: string) => void;
  onPaymentFailed:  (reason: string)  => void;
  /** Fires the real backend initiate + poll. Returns outcome. */
  runPayment: () => Promise<{
    success:       boolean;
    receiptNumber?: string;
    reason?:       string;
  }>;
}

// ---------------------------------------------------------------------------
// SANDBOX TIMING HOLDS
//   Sandbox resolves in ~2 s.  These hold each
//   visual stage long enough for you to see it.
//   All become 0 in production automatically.
// ---------------------------------------------------------------------------
const IS_SANDBOX    = typeof import.meta !== 'undefined'
  ? (import.meta.env?.VITE_MPESA_ENV !== 'production')
  : true;

const IS_DEMO_MODE = typeof import.meta !== 'undefined'
  ? (import.meta.env?.VITE_MPESA_DEMO_MODE === 'true')
  : false;

const HOLD_INITIATING = IS_SANDBOX ? 1800 : 0;  // "Connecting…"
const HOLD_PENDING    = IS_SANDBOX ? 3500 : 0;  // "Check phone…"
const HOLD_RESULT     = IS_SANDBOX ? 1200 : 0;  // success before callback

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------
export const MpesaPaymentModal: React.FC<MpesaPaymentModalProps> = ({
  isOpen, onClose, amount, phone, accountReference,
  onPaymentSuccess, onPaymentFailed, runPayment,
}) => {
  const [step, setStep]             = useState<'initiating'|'pending'|'completed'|'failed'>('initiating');
  const [countdown, setCountdown]   = useState(60);
  const [reason, setReason]         = useState('');
  const [receipt, setReceipt]       = useState('');

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdRef      = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const abortedRef   = useRef(false);

  const displayPhone = phone.startsWith('254') ? '0' + phone.slice(3) : phone;

  // ---------------------------------------------------------------------------
  // FLOW ORCHESTRATOR
  // ---------------------------------------------------------------------------
  const runFlow = useCallback(async () => {
    abortedRef.current = false;
    setStep('initiating');
    setCountdown(60);
    setReason('');
    setReceipt('');

    // --- hold INITIATING so user sees it --------------------------------
    if (HOLD_INITIATING > 0) {
      await new Promise<void>(r => { holdRef.current = setTimeout(() => { if (!abortedRef.current) r(); }, HOLD_INITIATING); });
      if (abortedRef.current) return;
    }

    // --- move to PENDING ------------------------------------------------
    setStep('pending');

    // start 60-s countdown tick
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(p => {
        if (p <= 1) { clearInterval(countdownRef.current!); return 0; }
        return p - 1;
      });
    }, 1000);

    // hold PENDING so user reads "check your phone"
    if (HOLD_PENDING > 0) {
      await new Promise<void>(r => { holdRef.current = setTimeout(() => { if (!abortedRef.current) r(); }, HOLD_PENDING); });
      if (abortedRef.current) return;
    }

    // --- FIRE THE REAL CALL ---------------------------------------------
    const result = await runPayment();

    // stop countdown
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (abortedRef.current) return;

    // --- hold RESULT so user reads it -----------------------------------
    if (result.success) {
      setReceipt(result.receiptNumber || 'MPesa-OK');
      setStep('completed');

      if (HOLD_RESULT > 0) {
        await new Promise<void>(r => { holdRef.current = setTimeout(() => { if (!abortedRef.current) r(); }, HOLD_RESULT); });
        if (abortedRef.current) return;
      }
      onPaymentSuccess(result.receiptNumber || 'MPesa-OK');
    } else {
      setReason(result.reason || 'Payment was declined or timed out.');
      setStep('failed');
      // don't auto-close — let user retry or cancel
    }
  }, [runPayment, onPaymentSuccess]);

  // kick off whenever modal opens
  useEffect(() => {
    if (isOpen) runFlow();
    return () => {
      abortedRef.current = true;
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (holdRef.current)      clearTimeout(holdRef.current);
    };
  }, [isOpen]);                         // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/82 backdrop-blur-md" />

      {/* card */}
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 16 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        className="relative z-10 w-full max-w-sm mx-4 bg-[#09090b] border border-zinc-800 rounded-[2rem] shadow-2xl overflow-hidden"
      >
        <AnimatePresence mode="wait">

          {/* ============================================================
              INITIATING
          ============================================================ */}
          {step === 'initiating' && (
            <motion.div key="initiating"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-10 flex flex-col items-center text-center gap-6"
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute w-28 h-28 rounded-full border-2 border-emerald-500/15 animate-ping" style={{ animationDuration: '1.8s' }} />
                <div className="relative z-10 w-22 h-22 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                  <Loader2 className="w-11 h-11 text-emerald-400 animate-spin" />
                </div>
              </div>

              <div>
                <h3 className="text-white font-black text-xl tracking-tight">Connecting to M-Pesa</h3>
                <p className="text-zinc-500 text-sm mt-1">Sending STK push request…</p>
              </div>

              <div className="flex gap-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 flex flex-col items-center">
                  <span className="text-zinc-600 text-[10px] uppercase tracking-wider">Amount</span>
                  <span className="text-white font-black text-lg">KES {amount.toLocaleString()}</span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 flex flex-col items-center">
                  <span className="text-zinc-600 text-[10px] uppercase tracking-wider">Ref</span>
                  <span className="text-zinc-400 font-mono text-sm">{accountReference}</span>
                </div>
              </div>

              {IS_DEMO_MODE ? (
                <div className="bg-purple-500/10 border border-purple-500/25 rounded-lg px-3 py-1.5">
                  <p className="text-purple-400 text-[10px] font-black uppercase tracking-wider">🎭 DEMO MODE — UI Preview</p>
                </div>
              ) : IS_SANDBOX && (
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-1.5">
                  <p className="text-amber-400 text-[10px] font-black uppercase tracking-wider">⚡ Sandbox — simulated pacing</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ============================================================
              PENDING — "check your phone"
          ============================================================ */}
          {step === 'pending' && (
            <motion.div key="pending"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-10 flex flex-col items-center text-center gap-5"
            >
              <style>{`
                @keyframes nudge {
                  0%,100% { transform: translateY(0); }
                  50%     { transform: translateY(-4px); }
                }
              `}</style>

              <div className="relative flex items-center justify-center">
                <div className="absolute w-28 h-28 rounded-full border border-emerald-500/10 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute w-36 h-36 rounded-full border border-emerald-500/5  animate-ping" style={{ animationDuration: '2.6s', animationDelay: '0.6s' }} />
                <div className="relative z-10 w-22 h-22 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center">
                  <Smartphone className="w-11 h-11 text-emerald-400" style={{ animation: 'nudge 1.4s ease-in-out infinite' }} />
                </div>
              </div>

              <div>
                <h3 className="text-white font-black text-xl tracking-tight">Check Your Phone</h3>
                <p className="text-zinc-500 text-sm mt-0.5">M-Pesa prompt sent to</p>
                <p className="text-emerald-400 font-black text-lg font-mono mt-1">{displayPhone}</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-2.5">
                <span className="text-zinc-500 text-sm">KES </span>
                <span className="text-white font-black text-lg">{amount.toLocaleString()}</span>
              </div>

              {/* what-to-do */}
              <div className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-wider mb-2.5">What to do</p>
                {[
                  'Wait for the M-Pesa popup on your phone',
                  'Enter your M-Pesa PIN when prompted',
                  'This screen updates automatically',
                ].map((txt, i) => (
                  <div key={i} className="flex items-start gap-2.5 mb-1.5">
                    <span className="text-emerald-500 font-black text-xs mt-0.5">{i + 1}</span>
                    <span className="text-zinc-400 text-xs">{txt}</span>
                  </div>
                ))}
              </div>

              {/* countdown bar */}
              <div className="w-full">
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-mono">{countdown}s remaining</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-[10px] font-mono">polling…</span>
                  </div>
                </div>
                <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(countdown / 60) * 100}%` }}
                  />
                </div>
              </div>

              {IS_DEMO_MODE ? (
                <div className="bg-purple-500/10 border border-purple-500/25 rounded-lg px-3 py-1.5">
                  <p className="text-purple-400 text-[10px] font-black uppercase tracking-wider">🎭 DEMO MODE — Auto-completing in 3s...</p>
                </div>
              ) : IS_SANDBOX && (
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-1.5">
                  <p className="text-amber-400 text-[10px] font-black uppercase tracking-wider">⚡ Sandbox — real call firing now…</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ============================================================
              COMPLETED
          ============================================================ */}
          {step === 'completed' && (
            <motion.div key="completed"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-10 flex flex-col items-center text-center gap-5"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                className="w-22 h-22 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center"
              >
                <CheckCircle2 className="w-11 h-11 text-emerald-400" />
              </motion.div>

              <div>
                <h3 className="text-emerald-400 font-black text-2xl">Payment Confirmed</h3>
                <p className="text-zinc-500 text-sm mt-1">M-Pesa confirmed the transfer</p>
              </div>

              <div className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-2.5">
                {([
                  ['Amount',  `KES ${amount.toLocaleString()}`],
                  ['Receipt', receipt],
                  ['Phone',   displayPhone],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-zinc-500 text-sm">{label}</span>
                    <span className={`font-black text-sm font-mono ${label === 'Receipt' ? 'text-emerald-400' : 'text-zinc-300'}`}>{val}</span>
                  </div>
                ))}
              </div>

              <p className="text-zinc-600 text-xs animate-pulse">Completing sale…</p>
            </motion.div>
          )}

          {/* ============================================================
              FAILED
          ============================================================ */}
          {step === 'failed' && (
            <motion.div key="failed"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-10 flex flex-col items-center text-center gap-5"
            >
              <div className="w-22 h-22 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center">
                <XCircle className="w-11 h-11 text-rose-400" />
              </div>

              <div>
                <h3 className="text-rose-400 font-black text-xl">Payment Failed</h3>
                <p className="text-zinc-500 text-sm mt-1 max-w-[240px] mx-auto">{reason}</p>
              </div>

              <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-wider mb-2">Common reasons</p>
                <ul className="text-zinc-500 text-xs space-y-1 text-left">
                  <li>• Insufficient M-Pesa balance</li>
                  <li>• Wrong PIN entered</li>
                  <li>• Request cancelled on phone</li>
                  <li>• Session timed out (60 s)</li>
                </ul>
              </div>

              <div className="flex gap-3 w-full">
                <button onClick={onClose}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black rounded-xl transition-all text-sm"
                >Cancel</button>
                <button onClick={runFlow}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl transition-all text-sm"
                >Retry</button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default MpesaPaymentModal;