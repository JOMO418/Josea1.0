import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Banknote, Smartphone, CreditCard, User,
  CheckCircle, Zap, Printer, PlusCircle, ArrowRight
} from 'lucide-react';
import { useStore, useCartTotal } from '../store/useStore';
import { axiosInstance } from '../api/axios';
import { notifySaleComplete, notifyApiError } from '../utils/notification';
import '../styles/print.css';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CheckoutModal({ isOpen, onClose, onSuccess }: CheckoutModalProps) {
  const cart = useStore((state) => state.cart);
  const clearCart = useStore((state) => state.clearCart);
  const cartTotal = useCartTotal();

  // Input States
  const [cashAmount, setCashAmount] = useState('');
  const [mpesaAmount, setMpesaAmount] = useState('');
  
  // Deni Overlay States
  const [showDeniPopup, setShowDeniPopup] = useState(false);
  const [deniAmount, setDeniAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Status States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{receiptNumber: string, change: number} | null>(null);

  const cashInputRef = useRef<HTMLInputElement>(null);

  // Math Logic
  const cash = parseFloat(cashAmount) || 0;
  const mpesa = parseFloat(mpesaAmount) || 0;
  const deni = parseFloat(deniAmount) || 0;

  const totalPaid = cash + mpesa + deni;
  const changeDue = Math.max(0, totalPaid - cartTotal);
  const remaining = Math.max(0, cartTotal - totalPaid);
  const isComplete = totalPaid >= (cartTotal - 0.01);

  // SURGERY: Input Focus Fix
  useEffect(() => {
    if (isOpen && !successData) {
      const timer = setTimeout(() => cashInputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]); 

  // SURGERY: Full Reset Logic
  const fullReset = () => {
    setCashAmount(''); setMpesaAmount(''); setDeniAmount('');
    setCustomerName(''); setCustomerPhone('');
    setSuccessData(null);
    setError('');
    setShowDeniPopup(false);
  };

  const handleNewSale = () => {
    clearCart();
    fullReset();
    onClose();
    onSuccess?.();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || !isComplete) return;

    // Phone Validation for Deni
    if (deni > 0 && (!customerName.trim() || !/^(?:254|\+254|0)?(7|1)\d{8}$/.test(customerPhone))) {
      setError(customerName.trim() ? 'Valid phone required for Deni' : 'Customer name required for Deni');
      setShowDeniPopup(true);
      return;
    }

    setLoading(true);
    try {
      const payments = [];
      const nonCashTotal = mpesa + deni;
      const reportedCash = Math.max(0, cartTotal - nonCashTotal);

      if (cash > 0) payments.push({ method: 'CASH', amount: reportedCash });
      if (mpesa > 0) payments.push({ method: 'MPESA', amount: mpesa });
      if (deni > 0) payments.push({ method: 'CREDIT', amount: deni });

      const response = await axiosInstance.post('/sales', {
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.price })),
        payments,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || null
      });

      setSuccessData({
        receiptNumber: response.data.receiptNumber,
        change: changeDue
      });
      
      notifySaleComplete(response.data.receiptNumber, cartTotal, () => {}, () => {});
    } catch (err: any) {
      setError(err.response?.data?.message || 'Transaction Failed');
      notifyApiError('Checkout Error', 'Backend payment mismatch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* FIXED PRINT CSS - Targets specific elements */}
          <style>{`
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              
              /* Hide the modal wrapper */
              .checkout-modal-wrapper {
                display: none !important;
              }
              
              /* Show only the thermal receipt */
              #thermal-receipt {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 80mm !important;
                background: white !important;
                color: black !important;
              }
            }
          `}</style>

          {/* THERMAL RECEIPT - Positioned at root level */}
          <div id="thermal-receipt" style={{ display: 'none' }}>
            <div style={{ width: '80mm', margin: '0 auto', padding: '16px', fontFamily: 'monospace', color: 'black', background: 'white' }}>
              {/* Business Header */}
              <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px dashed black', paddingBottom: '12px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0' }}>PRAM AUTO SPARES</h1>
                <p style={{ fontSize: '12px', marginTop: '4px', margin: '0' }}>Kiserian Branch</p>
                <p style={{ fontSize: '12px', margin: '0' }}>Tel: 0712 345 678</p>
              </div>

              {/* Receipt Type Header */}
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0' }}>
                  {deni > 0 ? 'DEBT INVOICE' : 'OFFICIAL RECEIPT'}
                </h2>
                {successData && (
                  <p style={{ fontSize: '12px', marginTop: '4px', margin: '0' }}>Receipt: {successData.receiptNumber}</p>
                )}
                <p style={{ fontSize: '12px', margin: '0' }}>{new Date().toLocaleString('en-KE')}</p>
              </div>

              {/* Debt Alert Section */}
              {deni > 0 && (
                <div style={{ marginBottom: '16px', border: '4px solid black', padding: '12px' }}>
                  <div style={{ background: 'black', color: 'white', textAlign: 'center', padding: '12px 0', marginBottom: '12px', fontWeight: '900' }}>
                    <p style={{ fontSize: '16px', margin: '0' }}>TO BE PAID</p>
                    <p style={{ fontSize: '24px', marginTop: '4px', margin: '0' }}>KES {deni.toLocaleString()}</p>
                  </div>
                  {customerName && (
                    <div style={{ fontSize: '12px' }}>
                      <p style={{ fontWeight: 'bold', marginBottom: '4px', margin: '0' }}>CUSTOMER:</p>
                      <p style={{ margin: '0' }}>Name: {customerName}</p>
                      <p style={{ margin: '0' }}>Phone: {customerPhone}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Items Table */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ borderBottom: '2px solid black', paddingBottom: '4px', marginBottom: '8px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', margin: '0' }}>ITEMS PURCHASED</p>
                </div>
                {cart.map((item, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #999', fontSize: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 'bold', margin: '0 0 2px 0' }}>{item.name}</p>
                        <p style={{ fontSize: '10px', color: '#666', margin: '0' }}>Qty: {item.quantity} @ KES {item.price.toLocaleString()}</p>
                      </div>
                      <div style={{ fontWeight: 'bold', textAlign: 'right', marginLeft: '8px' }}>
                        <p style={{ margin: '0' }}>KES {(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Summary */}
              <div style={{ borderTop: '2px solid black', paddingTop: '12px', marginBottom: '16px' }}>
                <div style={{ marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                    <span>TOTAL DUE:</span>
                    <span>KES {cartTotal.toLocaleString()}</span>
                  </div>
                </div>

                {cash > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                    <span>Cash Paid:</span>
                    <span>KES {cash.toLocaleString()}</span>
                  </div>
                )}

                {mpesa > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                    <span>M-Pesa Paid:</span>
                    <span>KES {mpesa.toLocaleString()}</span>
                  </div>
                )}

                {deni > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>
                    <span>Balance (Deni):</span>
                    <span>KES {deni.toLocaleString()}</span>
                  </div>
                )}

                {successData && successData.change > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', background: '#e5e5e5', padding: '4px' }}>
                      <span>CHANGE:</span>
                      <span>KES {successData.change.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Branding */}
              <div style={{ textAlign: 'center', borderTop: '2px dashed black', paddingTop: '12px', marginTop: '24px' }}>
                <p style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px 0' }}>
                  SYSTEM BY JOSEA SOFTWARE SOLUTIONS
                </p>
                <p style={{ fontSize: '8px', margin: '0' }}>Thank you for your business!</p>
              </div>
            </div>
          </div>

          {/* MODAL UI - Success/Checkout Screen */}
          <div className="checkout-modal-wrapper fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/95 backdrop-blur-2xl"
              onClick={() => !loading && !successData && (fullReset(), onClose())}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl bg-[#09090b] border border-zinc-800 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[85vh]"
            >
            {successData ? (
              <div className="receipt-container p-12 flex flex-col items-center text-center justify-between h-full">
                <div className="flex-1 flex flex-col items-center justify-center">
                  {/* Dynamic Header Based on Deni */}
                  {deni > 0 ? (
                    <>
                      <div className="w-24 h-24 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mb-6">
                        <CreditCard className="w-12 h-12 text-rose-500" />
                      </div>
                      <h2 className="text-4xl font-black text-rose-500 italic uppercase mb-1 receipt-header">TO BE PAID</h2>
                      <p className="text-zinc-500 font-mono mb-4 italic">RECEIPT: {successData.receiptNumber}</p>
                      <div className="w-full max-w-md bg-rose-500/5 border border-rose-500/20 rounded-3xl p-6 mb-8">
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1 italic">Outstanding Deni</p>
                        <h4 className="text-5xl font-black text-rose-400 receipt-amount">KES {deni.toLocaleString()}</h4>
                      </div>
                      {customerName && (
                        <div className="text-sm text-zinc-500 mb-4 receipt-customer">
                          <p className="font-bold">Customer: {customerName}</p>
                          <p className="font-mono">{customerPhone}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle className="w-12 h-12 text-emerald-500" />
                      </div>
                      <h2 className="text-4xl font-black text-emerald-500 italic uppercase mb-1 receipt-header">SALE COMPLETED</h2>
                      <p className="text-zinc-500 font-mono mb-8 italic">RECEIPT: {successData.receiptNumber}</p>
                    </>
                  )}

                  {/* Change Display */}
                  {successData.change > 0 && deni === 0 && (
                    <div className="w-full max-w-md bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 mb-10">
                      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1 italic">Give Change</p>
                      <h4 className="text-5xl font-black text-emerald-400 receipt-change">KES {successData.change.toLocaleString()}</h4>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-4 w-full max-w-lg no-print">
                    <button
                      onClick={() => {
                        if (successData) window.print();
                      }}
                      disabled={!successData}
                      className="flex items-center justify-center gap-3 py-5 bg-white text-black font-black rounded-2xl hover:bg-zinc-200 transition-all uppercase italic disabled:opacity-50"
                    >
                      <Printer size={20} /> PRINT
                    </button>
                    <button onClick={handleNewSale} className="flex items-center justify-center gap-3 py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all uppercase italic shadow-lg shadow-blue-600/20">
                      <PlusCircle size={20} /> NEW SALE
                    </button>
                  </div>
                </div>

                {/* Branding Footer */}
                <div className="mt-8 pt-6 border-t border-zinc-800/30 w-full receipt-footer">
                  <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] text-center">
                    SYSTEM BY JOSEA SOFTWARE SOLUTIONS
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/10">
                  <div className="flex items-center gap-3">
                    <Zap className="text-emerald-500" fill="currentColor" size={20} />
                    <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Terminal Checkout</h2>
                  </div>
                  <button onClick={() => {fullReset(); onClose();}} className="text-zinc-500 hover:text-white"><X /></button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden relative">
                  
                  {/* Deni Popup */}
                  <AnimatePresence>
                    {showDeniPopup && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8">
                        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] space-y-4">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Customer Deni</h3>
                            <button onClick={() => setShowDeniPopup(false)}><X size={20} className="text-zinc-500"/></button>
                          </div>
                          <input type="number" value={deniAmount} onChange={(e) => setDeniAmount(e.target.value)} placeholder="Deni Amount" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500" />
                          <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer Name" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500" />
                          <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone Number (07...)" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500" />
                          <button onClick={() => setShowDeniPopup(false)} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl uppercase italic mt-2 hover:bg-blue-500 transition-all">Confirm Details</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Summary Area */}
                  <div className="p-8 bg-zinc-900/20 border-r border-zinc-800/50 overflow-y-auto">
                    <div className="mb-8">
                      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1 italic">Amount Due</p>
                      <h3 className="text-6xl font-black text-white italic tracking-tighter">KES {cartTotal.toLocaleString()}</h3>
                    </div>
                    <div className="space-y-3 opacity-30">
                      {cart.map(item => (
                        <div key={item.productId} className="flex justify-between text-xs font-bold uppercase tracking-tight">
                          <span className="text-zinc-400">{item.name} x{item.quantity}</span>
                          <span className="text-white">{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Area */}
                  <div className="p-8 flex flex-col bg-zinc-950 overflow-y-auto">
                    <div className="flex-1 space-y-5">
                      <div className={`p-5 rounded-[2rem] border-2 transition-all ${isComplete ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-zinc-900 border-zinc-800'}`}>
                        <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1 italic">
                          {isComplete ? 'Balance Covered' : 'Remaining Balance'}
                        </p>
                        <p className={`text-3xl font-black italic tracking-tighter ${isComplete ? 'text-emerald-500' : 'text-white'}`}>
                          {isComplete ? `CHANGE: KES ${changeDue.toLocaleString()}` : `KES ${remaining.toLocaleString()}`}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="relative group">
                          <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-white transition-colors" size={20} />
                          <input 
                            ref={cashInputRef} type="number" value={cashAmount}
                            onChange={(e) => setCashAmount(e.target.value)}
                            placeholder="CASH PAYMENT"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-5 pl-14 pr-4 text-xl font-black text-white outline-none focus:border-white transition-all"
                          />
                        </div>
                        <div className="relative group">
                          <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-emerald-500 transition-colors" size={20} />
                          <input 
                            type="number" value={mpesaAmount}
                            onChange={(e) => setMpesaAmount(e.target.value)}
                            placeholder="M-PESA AMOUNT"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-5 pl-14 pr-4 text-xl font-black text-white outline-none focus:border-emerald-500 transition-all"
                          />
                        </div>
                        <button 
                          onClick={() => setShowDeniPopup(true)} 
                          className={`w-full py-4 border border-dashed rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${deni > 0 ? 'bg-blue-600/10 border-blue-500 text-blue-500' : 'border-zinc-800 text-zinc-600 hover:border-zinc-500'}`}
                        >
                          <User size={14}/> {deni > 0 ? `Deni Added: KES ${deni}` : 'Register Deni?'}
                        </button>
                      </div>
                    </div>

                    <div className="pt-6">
                      <button
                        onClick={handleSubmit}
                        disabled={!isComplete || loading}
                        className="w-full py-6 bg-white text-black font-black text-xl rounded-[2rem] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-10 flex items-center justify-center gap-3 italic uppercase shadow-2xl"
                      >
                        {loading ? 'PROCESSING...' : <>FINALIZE SALE <ArrowRight size={24} /></>}
                      </button>
                      {error && <p className="text-rose-500 text-[10px] font-black text-center mt-4 uppercase tracking-widest italic">{error}</p>}
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}