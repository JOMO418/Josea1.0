import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Banknote, Smartphone, CreditCard, User,
  CheckCircle, Zap, Printer, PlusCircle, ArrowRight, Phone, Clock, Eye, Car
} from 'lucide-react';
import { useStore, useCartTotal } from '../store/useStore';
import { api } from '../api/axios';
import { axiosInstance } from '../api/axios';
import { notifySaleComplete, notifyApiError } from '../utils/notification';
import mpesaService from '../services/mpesa.service';
import SupermarketMpesaModal from './SupermarketMpesaModal';
import '../styles/print.css';

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CheckoutModal({ isOpen, onClose, onSuccess }: CheckoutModalProps) {
  const navigate = useNavigate();
  const cart = useStore((state) => state.cart);
  const clearCart = useStore((state) => state.clearCart);
  const cartTotal = useCartTotal();

  // Input States
  const [cashAmount, setCashAmount] = useState('');
  const [mpesaAmount, setMpesaAmount] = useState('');
  const [deniActive, setDeniActive] = useState(false);

  // Customer Search States (CRM)
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [_isSearching, setIsSearching] = useState(false);
  const [_selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // M-Pesa Payment States (using unified customer phone)
  const [mpesaReceiptNumber, setMpesaReceiptNumber] = useState<string | null>(null);

  // Controls whether the full-screen MpesaPaymentModal overlay is visible
  const [showMpesaModal, setShowMpesaModal] = useState(false);

  // Status States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{
    receiptNumber: string;
    change: number;
    total: number;
    subtotal: number;
    cashPaid: number;
    mpesaPaid: number;
    creditAmount: number;
    customerName: string;
    customerPhone: string;
    mpesaReceiptNumber: string | null;
    isFlagged: boolean;
    items: Array<{name: string; quantity: number; price: number; total: number; vehicleMake?: string; vehicleModel?: string}>;
    servedBy: string;
    branchName: string;
    branchPhone: string;
    timestamp: Date;
  } | null>(null);

  const cashInputRef = useRef<HTMLInputElement>(null);
  const mpesaInputRef = useRef<HTMLInputElement>(null);
  const customerNameRef = useRef<HTMLInputElement>(null);
  const customerPhoneRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Array of refs for keyboard navigation (order: Cash -> M-Pesa -> Phone -> Name -> Submit)
  const inputRefs = [cashInputRef, mpesaInputRef, customerPhoneRef, customerNameRef];

  // Keyboard navigation handler
  const handleKeyNavigation = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
    if (e.key === 'ArrowDown' || (e.key === 'Enter' && currentIndex < inputRefs.length - 1)) {
      e.preventDefault();
      const nextRef = inputRefs[currentIndex + 1];
      nextRef?.current?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentIndex > 0) {
        const prevRef = inputRefs[currentIndex - 1];
        prevRef?.current?.focus();
      }
    } else if (e.key === 'Enter' && currentIndex === inputRefs.length - 1) {
      // Last input, focus submit button
      e.preventDefault();
      submitButtonRef.current?.focus();
    }
  };

  // Debounced search term
  const debouncedSearch = useDebounce(customerSearch, 300);

  // Math Logic
  const cash = parseFloat(cashAmount) || 0;
  const mpesa = parseFloat(mpesaAmount) || 0;
  const deni = deniActive ? Math.max(0, cartTotal - cash - mpesa) : 0;

  const totalPaid = cash + mpesa + deni;
  const changeDue = Math.max(0, totalPaid - cartTotal);
  const remaining = Math.max(0, cartTotal - totalPaid);
  const isComplete = totalPaid >= (cartTotal - 0.01);

  // Smart Customer Search (Auto-Suggest)
  useEffect(() => {
    const searchCustomers = async () => {
      if (debouncedSearch.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await api.sales.searchCustomers(debouncedSearch.trim());
        setSuggestions(response.data);
        setShowSuggestions(response.data.length > 0);
      } catch (err) {
        console.error('Customer search error:', err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    searchCustomers();
  }, [debouncedSearch]);

  // Auto-Fill Handler
  const handleSelectCustomer = (customer: any) => {
    setCustomerSearch(customer.name);
    setCustomerPhone(customer.phone);
    setSelectedCustomerId(customer.id);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // SURGERY: Input Focus Fix
  useEffect(() => {
    if (isOpen && !successData) {
      const timer = setTimeout(() => cashInputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard shortcuts for success screen
  useEffect(() => {
    if (!isOpen || !successData) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'p':
          e.preventDefault();
          window.print();
          break;
        case 'n':
          e.preventDefault();
          handleNewSale();
          break;
        case 'escape':
          e.preventDefault();
          handleNewSale();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, successData]); 

  // SURGERY: Full Reset Logic
  const fullReset = () => {
    setCashAmount('');
    setMpesaAmount('');
    setDeniActive(false);
    setCustomerSearch('');
    setCustomerPhone('');
    setSelectedCustomerId(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setSuccessData(null);
    setError('');
    // Reset M-Pesa state
    setMpesaReceiptNumber(null);
  };

  const handleNewSale = () => {
    clearCart();
    fullReset();
    onClose();
    onSuccess?.();
  };

  // Phone field is now unified - no need for auto-populate

  // Reset M-Pesa state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMpesaReceiptNumber(null);
    }
  }, [isOpen]);

  // ---------------------------------------------------------------------------
  // _runPayment — this is the function MpesaPaymentModal calls AFTER its
  // visual hold stages. It does the real initiate + poll via mpesaService.
  // @ts-expect-error - Function reserved for future MpesaPaymentModal integration
  // ---------------------------------------------------------------------------
  const _runPayment = async (): Promise<{ success: boolean; receiptNumber?: string; reason?: string }> => {
    try {
      // Use unified customer phone for M-Pesa
      const phoneValidation = mpesaService.validateKenyanPhone(customerPhone);
      if (!phoneValidation.valid) {
        return { success: false, reason: phoneValidation.error || 'Invalid phone number' };
      }

      // 🎭 DEMO MODE - Simulate successful payment for UI testing
      const isDemoMode = import.meta.env.VITE_MPESA_DEMO_MODE === 'true';
      if (isDemoMode && phoneValidation.formatted === '254708374149') {
        console.log('🎭 [DEMO MODE] Simulating successful M-Pesa payment...');
        // Wait 3 seconds to simulate processing
        await new Promise(resolve => setTimeout(resolve, 3000));
        return {
          success: true,
          receiptNumber: `DEMO${Date.now().toString().slice(-8)}`
        };
      }

      // Short account ref for sandbox compatibility (max 12 chars)
      const accountRef = `TEST${Date.now().toString().slice(-6)}`;

      const response = await mpesaService.initiateMpesaPayment(
        phoneValidation.formatted,
        mpesa,
        accountRef,
        'Test Payment'
      );

      if (!response.success || !response.data) {
        return { success: false, reason: response.error || 'Failed to initiate M-Pesa payment' };
      }

      // Poll until terminal state
      const finalStatus = await mpesaService.pollPaymentStatus(
        response.data.checkoutRequestId,
        () => {} // status updates are visual inside the modal already
      );

      if (finalStatus.data?.status === 'completed') {
        return { success: true, receiptNumber: finalStatus.data.mpesaReceiptNumber };
      } else {
        return { success: false, reason: finalStatus.data?.resultDesc || 'Payment failed or timed out.' };
      }
    } catch (err: any) {
      console.error('M-Pesa runPayment error:', err);
      return { success: false, reason: err.message || 'M-Pesa payment failed' };
    }
  };

  // ---------------------------------------------------------------------------
  // handleMpesaPayment — opens the modal and returns a promise that resolves
  // once the modal tells us the outcome (success or failure).
  // Returns: { success: boolean, flagged: boolean }
  // ---------------------------------------------------------------------------
  const handleMpesaPayment = (): Promise<{ success: boolean; flagged: boolean }> => {
    return new Promise((resolve) => {
      // store resolve so the modal callbacks can call it
      mpesaResolveRef.current = resolve;
      setShowMpesaModal(true);
    });
  };

  // ref to hold the resolve function across renders
  const mpesaResolveRef = useRef<((value: { success: boolean; flagged: boolean }) => void) | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || !isComplete) return;

    // Smart validation based on payment type
    const needsPhone = mpesa > 0 || deniActive;

    if (needsPhone && !customerPhone.trim()) {
      setError(`Phone number required for ${mpesa > 0 ? 'M-Pesa' : 'DENI'} payment`);
      return;
    }

    if (needsPhone && !/^(?:254|\+254|0)?(7|1)\d{8}$/.test(customerPhone)) {
      setError('Invalid phone number format (use 07XX or 01XX)');
      return;
    }

    // Validation for DENI (Credit) - Name is required
    if (deniActive && !customerSearch.trim()) {
      setError('Customer name required for DENI/Credit sales');
      return;
    }

    setLoading(true);
    try {
      // STEP 1: Process M-Pesa payment if needed
      const mpesa = parseFloat(mpesaAmount) || 0;
      let shouldFlagSale = false; // Track if sale should be flagged for verification

      if (mpesa > 0) {
        // Phone validation already done above
        const mpesaResult = await handleMpesaPayment();
        if (!mpesaResult.success) {
          setLoading(false);
          return;
        }
        // If user clicked "Complete Later", flag this sale for verification
        shouldFlagSale = mpesaResult.flagged;
      }

      // STEP 2: Create sale with payment details
      const payments = [];
      const nonCashTotal = mpesa + deni;
      const reportedCash = Math.max(0, cartTotal - nonCashTotal);

      if (cash > 0) payments.push({ method: 'CASH', amount: reportedCash });
      if (mpesa > 0) payments.push({
        method: 'MPESA',
        amount: mpesa,
        reference: mpesaReceiptNumber || undefined
      });
      if (deni > 0) payments.push({ method: 'CREDIT', amount: deni });

      // SMART CUSTOMER HANDLING
      // Only save to customer DB if name is provided
      const hasCustomerName = customerSearch.trim().length > 0;
      const customerData = {
        customerName: hasCustomerName ? customerSearch.trim() : 'Walk-in Customer',
        customerPhone: customerPhone.trim() || null,
        saveToCustomerDB: hasCustomerName // Flag to save in customer database
      };

      // Log the request payload for debugging
      const salePayload = {
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.price })),
        payments,
        discount: 0, // Explicitly set discount to 0
        ...customerData,
        // M-Pesa verification flags - use shouldFlagSale instead of state
        flagForVerification: shouldFlagSale && mpesa > 0,
        mpesaReceiptNumber: mpesaReceiptNumber || null
      };

      console.log('🔍 [Complete Later] Sale payload:', {
        total: cartTotal,
        payments: salePayload.payments,
        flagForVerification: salePayload.flagForVerification,
        shouldFlagSale,
        mpesaAmount: mpesa
      });

      const response = await axiosInstance.post('/sales', salePayload);

      const saleData = response.data;
      setSuccessData({
        receiptNumber: saleData.receiptNumber,
        change: changeDue,
        total: Number(saleData.total),
        subtotal: Number(saleData.subtotal),
        cashPaid: cash > 0 ? Math.max(0, cartTotal - mpesa - deni) : 0,
        mpesaPaid: mpesa,
        creditAmount: deni,
        customerName: saleData.customerName || 'Walk-in Customer',
        customerPhone: saleData.customerPhone || '',
        mpesaReceiptNumber: saleData.mpesaReceiptNumber || mpesaReceiptNumber || null,
        isFlagged: shouldFlagSale && mpesa > 0,
        items: cart.map(i => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          total: i.price * i.quantity,
          vehicleMake: i.vehicleMake,
          vehicleModel: i.vehicleModel
        })),
        servedBy: saleData.user?.name || 'Staff',
        branchName: saleData.branch?.name || 'Branch',
        branchPhone: saleData.branch?.phone || '',
        timestamp: new Date()
      });

      notifySaleComplete(saleData.receiptNumber, cartTotal, () => {}, () => {});
    } catch (err: any) {
      console.error('❌ [Sale Creation Error]:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || 'Transaction Failed';
      setError(errorMessage);
      notifyApiError('Checkout Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* PROFESSIONAL PRINT CSS */}
          <style>{`
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }

              html, body {
                width: 80mm;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }

              body * {
                visibility: hidden;
              }

              #print-receipt, #print-receipt * {
                visibility: visible;
              }

              #print-receipt {
                position: fixed;
                left: 0;
                top: 0;
                width: 80mm;
                background: white !important;
                color: black !important;
                font-family: 'Courier New', monospace !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              .no-print {
                display: none !important;
              }
            }

            @media screen {
              #print-receipt {
                display: none;
              }
            }
          `}</style>

          {/* PROFESSIONAL THERMAL RECEIPT FOR PRINTING */}
          {successData && (
            <div id="print-receipt">
              <div style={{
                width: '80mm',
                padding: '4mm',
                fontFamily: "'Courier New', monospace",
                fontSize: '12px',
                lineHeight: '1.4',
                color: '#000',
                background: '#fff'
              }}>
                {/* === HEADER === */}
                <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>
                    PRAM AUTO SPARES
                  </div>
                  <div style={{ fontSize: '11px', marginTop: '1mm' }}>
                    {successData.branchName}
                  </div>
                  {successData.branchPhone && (
                    <div style={{ fontSize: '10px' }}>Tel: {successData.branchPhone}</div>
                  )}
                </div>

                {/* === DIVIDER === */}
                <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }}></div>

                {/* === RECEIPT INFO === */}
                <div style={{ textAlign: 'center', marginBottom: '2mm' }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    padding: '2mm',
                    background: successData.creditAmount > 0 ? '#000' : 'transparent',
                    color: successData.creditAmount > 0 ? '#fff' : '#000'
                  }}>
                    {successData.creditAmount > 0 ? 'CREDIT INVOICE' : 'SALES RECEIPT'}
                  </div>
                </div>

                <div style={{ fontSize: '10px', marginBottom: '3mm' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Receipt #:</span>
                    <span style={{ fontWeight: 'bold' }}>{successData.receiptNumber}</span>
                  </div>
                  {successData.mpesaReceiptNumber && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dotted #ddd', paddingTop: '1mm', marginTop: '1mm' }}>
                      <span>M-Pesa Code:</span>
                      <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{successData.mpesaReceiptNumber}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1mm' }}>
                    <span>Date:</span>
                    <span>{successData.timestamp.toLocaleDateString('en-GB')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Time:</span>
                    <span>{successData.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Served by:</span>
                    <span>{successData.servedBy}</span>
                  </div>
                </div>

                {/* === CUSTOMER INFO (if not walk-in) === */}
                {successData.customerName !== 'Walk-in Customer' && (
                  <>
                    <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }}></div>
                    <div style={{ fontSize: '10px', marginBottom: '2mm' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>CUSTOMER:</div>
                      <div>{successData.customerName}</div>
                      {successData.customerPhone && <div>Tel: {successData.customerPhone}</div>}
                    </div>
                  </>
                )}

                {/* === DIVIDER === */}
                <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }}></div>

                {/* === ITEMS HEADER === */}
                <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '1mm' }}>
                  <div style={{ display: 'flex' }}>
                    <span style={{ flex: 1 }}>ITEM</span>
                    <span style={{ width: '50px', textAlign: 'right' }}>TOTAL</span>
                  </div>
                </div>

                {/* === ITEMS LIST === */}
                <div style={{ fontSize: '10px', marginBottom: '2mm' }}>
                  {successData.items.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: '2mm', paddingBottom: '1mm', borderBottom: '1px dotted #ccc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ flex: 1, fontWeight: 'bold' }}>{item.name}</span>
                        <span style={{ fontWeight: 'bold' }}>{item.total.toLocaleString()}</span>
                      </div>
                      {(item.vehicleMake || item.vehicleModel) && (
                        <div style={{ fontSize: '8px', color: '#0066cc', marginTop: '0.5mm' }}>
                          Fits: {item.vehicleMake && item.vehicleModel ? `${item.vehicleMake} ${item.vehicleModel}` : (item.vehicleMake || item.vehicleModel)}
                        </div>
                      )}
                      <div style={{ fontSize: '9px', color: '#555' }}>
                        {item.quantity} x {item.price.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* === DIVIDER === */}
                <div style={{ borderTop: '2px solid #000', margin: '2mm 0' }}></div>

                {/* === TOTALS === */}
                <div style={{ fontSize: '11px', marginBottom: '2mm' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm' }}>
                    <span>Subtotal:</span>
                    <span>KES {successData.subtotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', padding: '1mm 0', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <span>TOTAL:</span>
                    <span>KES {successData.total.toLocaleString()}</span>
                  </div>
                </div>

                {/* === PAYMENT BREAKDOWN === */}
                <div style={{ fontSize: '10px', marginBottom: '2mm' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>PAYMENT:</div>
                  {successData.cashPaid > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Cash:</span>
                      <span>KES {successData.cashPaid.toLocaleString()}</span>
                    </div>
                  )}
                  {successData.mpesaPaid > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>M-Pesa:</span>
                      <span>KES {successData.mpesaPaid.toLocaleString()}</span>
                    </div>
                  )}
                  {successData.creditAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#000' }}>
                      <span>Credit (DENI):</span>
                      <span>KES {successData.creditAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* === CHANGE DUE === */}
                {successData.change > 0 && (
                  <div style={{
                    background: '#f0f0f0',
                    padding: '2mm',
                    marginBottom: '2mm',
                    border: '1px solid #000'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
                      <span>CHANGE:</span>
                      <span>KES {successData.change.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* === OUTSTANDING BALANCE ALERT === */}
                {successData.creditAmount > 0 && (
                  <div style={{
                    border: '2px solid #000',
                    padding: '3mm',
                    marginBottom: '3mm',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '1mm' }}>
                      BALANCE DUE
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      KES {successData.creditAmount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '9px', marginTop: '1mm' }}>
                      Please settle this amount at your earliest convenience
                    </div>
                  </div>
                )}

                {/* === DIVIDER === */}
                <div style={{ borderTop: '1px dashed #000', margin: '3mm 0' }}></div>

                {/* === FOOTER MESSAGE === */}
                <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '2mm' }}>
                  <div style={{ marginBottom: '1mm' }}>Thank you for your business!</div>
                  <div style={{ fontSize: '9px' }}>Goods once sold cannot be returned</div>
                  <div style={{ fontSize: '9px' }}>Please keep this receipt for reference</div>
                </div>

                {/* === eTIMS PLACEHOLDER === */}
                <div style={{
                  borderTop: '1px dashed #000',
                  borderBottom: '1px dashed #000',
                  padding: '2mm 0',
                  margin: '2mm 0',
                  textAlign: 'center',
                  fontSize: '9px'
                }}>
                  <div>eTIMS: Pending Integration</div>
                  <div style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>----------------</div>
                </div>

                {/* === POWERED BY FOOTER === */}
                <div style={{
                  textAlign: 'center',
                  paddingTop: '2mm',
                  fontSize: '8px',
                  borderTop: '1px solid #000'
                }}>
                  <div style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
                    Powered by Josea Software Solutions
                  </div>
                  <div style={{ marginTop: '1mm', fontSize: '7px' }}>
                    www.joseasoftware.com
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL UI - Success/Checkout Screen */}
          <div className="checkout-modal-wrapper fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/95 backdrop-blur-2xl"
              onClick={() => !loading && !successData && (fullReset(), onClose())}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl bg-[#09090b] border border-zinc-800 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
            {successData ? (
              <div className="receipt-container flex flex-col h-full">
                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center text-center">
                  {/* FLAGGED SALE - Waiting for M-Pesa Confirmation */}
                  {successData.isFlagged ? (
                    <>
                      <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center mb-4 relative">
                        <Clock className="w-10 h-10 text-orange-500" />
                        <span className="absolute -top-1 -right-1 flex h-6 w-6">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-6 w-6 bg-orange-500"></span>
                        </span>
                      </div>
                      <h2 className="text-3xl font-black text-orange-500 italic uppercase mb-1 receipt-header">
                        WAITING FOR M-PESA
                      </h2>
                      <p className="text-zinc-500 font-mono mb-4 italic text-sm">RECEIPT: {successData.receiptNumber}</p>

                      {/* Warning Message */}
                      <div className="w-full max-w-md bg-orange-500/10 border-2 border-orange-500/30 rounded-2xl p-6 mb-4">
                        <p className="text-orange-300 text-sm font-bold mb-3">Sale Created - Awaiting Payment Confirmation</p>
                        <div className="text-left space-y-2 text-xs text-zinc-400">
                          <p>✓ Sale has been recorded in the system</p>
                          <p>✓ Stock has been deducted</p>
                          <p>⏳ Waiting for M-Pesa payment confirmation</p>
                          <p className="text-orange-400 font-bold mt-3">
                            Verify this sale in the Sales page
                          </p>
                        </div>
                      </div>

                      {/* Amount Info - Single Card */}
                      <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-zinc-500">M-Pesa Expected:</div>
                          <div className="text-orange-400 font-bold text-right">KES {successData.mpesaPaid.toLocaleString()}</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Dynamic Header Based on Credit */
                    successData.creditAmount > 0 ? (
                      <>
                        <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mb-4">
                          <CreditCard className="w-10 h-10 text-rose-500" />
                        </div>
                        <h2 className="text-3xl font-black text-rose-500 italic uppercase mb-1 receipt-header">CREDIT SALE</h2>
                        <p className="text-zinc-500 font-mono mb-3 italic text-sm">RECEIPT: {successData.receiptNumber}</p>

                        {/* Outstanding Balance - Prominent Display */}
                        <div className="w-full max-w-md bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl p-5 mb-4">
                          <p className="text-rose-300 text-[10px] font-black uppercase tracking-widest mb-1">Outstanding Balance</p>
                          <h4 className="text-4xl font-black text-rose-400 receipt-amount">KES {successData.creditAmount.toLocaleString()}</h4>
                          <p className="text-rose-300/60 text-xs mt-2">To be collected from customer</p>
                        </div>

                        {/* Customer Info */}
                        <div className="bg-zinc-800/50 rounded-xl px-4 py-3 mb-4">
                          <p className="text-white font-bold">{successData.customerName}</p>
                          {successData.customerPhone && <p className="text-zinc-400 font-mono text-sm">{successData.customerPhone}</p>}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                          <CheckCircle className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h2 className="text-3xl font-black text-emerald-500 italic uppercase mb-1 receipt-header">SALE COMPLETED</h2>
                        <p className="text-zinc-500 font-mono mb-1 italic text-sm">RECEIPT: {successData.receiptNumber}</p>
                        {successData.mpesaReceiptNumber && (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-3">
                            <p className="text-emerald-400 text-[9px] font-bold uppercase tracking-wider mb-0.5">M-Pesa Code</p>
                            <p className="text-white font-mono font-bold text-sm">{successData.mpesaReceiptNumber}</p>
                          </div>
                        )}
                      </>
                    )
                  )}

                  {/* Change Display */}
                  {successData.change > 0 && successData.creditAmount === 0 && (
                    <div className="w-full max-w-md bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-5 mb-4">
                      <p className="text-emerald-300 text-[10px] font-black uppercase tracking-widest mb-1">Give Change</p>
                      <h4 className="text-4xl font-black text-emerald-400 receipt-change">KES {successData.change.toLocaleString()}</h4>
                    </div>
                  )}

                  {/* Sale Summary - Only show for non-flagged sales */}
                  {!successData.isFlagged && (
                    <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-zinc-500">Total:</div>
                        <div className="text-white font-bold text-right">KES {successData.total.toLocaleString()}</div>
                        {successData.cashPaid > 0 && (
                          <>
                            <div className="text-zinc-500">Cash:</div>
                            <div className="text-emerald-400 text-right">KES {successData.cashPaid.toLocaleString()}</div>
                          </>
                        )}
                        {successData.mpesaPaid > 0 && (
                          <>
                            <div className="text-zinc-500">M-Pesa:</div>
                            <div className="text-blue-400 text-right">KES {successData.mpesaPaid.toLocaleString()}</div>
                          </>
                        )}
                        {successData.creditAmount > 0 && (
                          <>
                            <div className="text-zinc-500">Credit (DENI):</div>
                            <div className="text-rose-400 font-bold text-right">KES {successData.creditAmount.toLocaleString()}</div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Fixed Bottom Section - Always Visible */}
                <div className="flex-shrink-0 p-6 bg-zinc-900/80 border-t border-zinc-800">
                  {/* Action Buttons */}
                  {successData.isFlagged ? (
                    /* Flagged Sale Buttons - Two buttons side by side */
                    <div className="grid grid-cols-2 gap-4 w-full max-w-lg mx-auto mb-4 no-print">
                      <button
                        onClick={() => {
                          handleNewSale();
                          navigate('/sales');
                        }}
                        className="flex items-center justify-center gap-2 py-4 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-500 transition-all uppercase italic shadow-lg shadow-orange-600/20"
                      >
                        <Eye size={18} /> VERIFY PAYMENT
                      </button>
                      <button
                        onClick={handleNewSale}
                        className="flex items-center justify-center gap-2 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all uppercase italic shadow-lg shadow-blue-600/20"
                      >
                        <PlusCircle size={18} /> NEW SALE
                      </button>
                    </div>
                  ) : (
                    /* Normal Sale Buttons */
                    <div className="grid grid-cols-2 gap-4 w-full max-w-lg mx-auto mb-4 no-print">
                      <button
                        onClick={() => window.print()}
                        className="flex items-center justify-center gap-3 py-4 bg-white text-black font-black rounded-2xl hover:bg-zinc-200 transition-all uppercase italic"
                      >
                        <Printer size={20} /> PRINT
                      </button>
                      <button
                        onClick={handleNewSale}
                        className="flex items-center justify-center gap-3 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all uppercase italic shadow-lg shadow-blue-600/20"
                      >
                        <PlusCircle size={20} /> NEW SALE
                      </button>
                    </div>
                  )}

                  {/* Keyboard Hints - Only for non-flagged sales */}
                  {!successData.isFlagged && (
                    <div className="flex justify-center gap-6 text-zinc-600 text-[10px] font-mono mb-3">
                      <span>P = Print</span>
                      <span>N = New Sale</span>
                      <span>ESC = Close</span>
                    </div>
                  )}

                  {/* Branding Footer */}
                  <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] text-center">
                    Powered by Josea Software Solutions
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

                  {/* Summary Area - Compact */}
                  <div className="p-6 bg-zinc-900/20 border-r border-zinc-800/50 flex flex-col justify-between">
                    <div>
                      <div className="mb-6">
                        <p className="text-zinc-500 text-[9px] font-black uppercase tracking-wider mb-1">Amount Due</p>
                        <h3 className="text-5xl font-black text-white tracking-tight">KES {cartTotal.toLocaleString()}</h3>
                      </div>
                      <div className="space-y-3 opacity-40 max-h-64 overflow-y-auto">
                        {cart.map(item => (
                          <div key={item.productId} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-zinc-400 truncate">{item.name} x{item.quantity}</span>
                              <span className="text-white ml-2">{(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                            {/* Vehicle Fitment */}
                            {(item.vehicleMake || item.vehicleModel) && (
                              <div className="flex items-center gap-1 text-[10px]">
                                <Car className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" />
                                <span className="text-blue-400 font-medium">
                                  {item.vehicleMake && item.vehicleModel ? (
                                    <>{item.vehicleMake} {item.vehicleModel}</>
                                  ) : (
                                    <>{item.vehicleMake || item.vehicleModel}</>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* DENI TOGGLE BUTTON */}
                    <div className="mt-4">
                      <button
                        onClick={() => setDeniActive(!deniActive)}
                        className={`w-full py-3 rounded-xl font-black uppercase text-sm transition-all ${
                          deniActive
                            ? 'bg-rose-600 text-white border-2 border-rose-500'
                            : 'bg-zinc-800 text-zinc-400 border-2 border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        {deniActive ? '🔴 DENI' : 'DENI OFF'}
                      </button>
                      {deniActive && deni > 0 && (
                        <div className="mt-2 text-center">
                          <p className="text-rose-400 font-black text-lg">KES {deni.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Area */}
                  <div className="p-6 flex flex-col bg-zinc-950 h-full">
                    {/* Balance/Change Section - Always Green for Visibility */}
                    <div className={`px-4 py-3 rounded-xl border transition-all mb-4 ${isComplete ? 'bg-blue-500/10 border-blue-500/40' : 'bg-emerald-500/10 border-emerald-500/40'}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">
                          {isComplete ? 'Change Due' : 'Balance Remaining'}
                        </p>
                        <p className={`text-xl font-black ${isComplete ? 'text-blue-400' : 'text-emerald-400'}`}>
                          KES {isComplete ? changeDue.toLocaleString() : remaining.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Payment Inputs - Compact */}
                    <div className="flex-1">
                      <div className="space-y-3">
                        {/* Cash Input */}
                        <div className="relative group">
                          <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-white transition-colors" size={18} />
                          <input
                            ref={cashInputRef}
                            type="number"
                            value={cashAmount}
                            onChange={(e) => setCashAmount(e.target.value)}
                            onKeyDown={(e) => handleKeyNavigation(e, 0)}
                            placeholder="Cash Amount"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-lg font-bold text-white placeholder:text-zinc-600 outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all"
                          />
                        </div>

                        {/* M-Pesa Input */}
                        <div className="relative group">
                          <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-emerald-500 transition-colors" size={18} />
                          <input
                            ref={mpesaInputRef}
                            type="number"
                            value={mpesaAmount}
                            onChange={(e) => setMpesaAmount(e.target.value)}
                            onKeyDown={(e) => handleKeyNavigation(e, 1)}
                            placeholder="M-Pesa Amount"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-lg font-bold text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                          />
                        </div>

                        {/* Phone Input - Now 3rd main field */}
                        <div className="relative group">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-blue-500 transition-colors" size={18} />
                          <input
                            ref={customerPhoneRef}
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            onKeyDown={(e) => handleKeyNavigation(e, 2)}
                            placeholder={(mpesa > 0 || deniActive) ? "Phone Number (Required)" : "Phone Number (Optional)"}
                            className={`w-full bg-zinc-900 border rounded-xl py-3.5 pl-12 pr-4 text-lg font-bold text-white placeholder:text-zinc-600 outline-none transition-all ${
                              (mpesa > 0 || deniActive) && !customerPhone.trim()
                                ? 'border-rose-500 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20'
                                : 'border-zinc-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                            }`}
                          />
                        </div>

                        {/* Customer Name - Single field, no header */}
                        <div className="relative" ref={suggestionsRef}>
                          <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-zinc-400 transition-colors" size={18} />
                            <input
                              ref={customerNameRef}
                              type="text"
                              value={customerSearch}
                              onChange={(e) => {
                                setCustomerSearch(e.target.value);
                                setShowSuggestions(true);
                              }}
                              onFocus={() => setShowSuggestions(suggestions.length > 0)}
                              onKeyDown={(e) => {
                                // Handle suggestion navigation
                                if (showSuggestions && suggestions.length > 0 && e.key === 'ArrowDown') {
                                  return; // Let default behavior handle suggestion navigation
                                }
                                handleKeyNavigation(e, 3);
                              }}
                              placeholder={deniActive ? "Customer Name (Required)" : "Customer Name (Optional)"}
                              className={`w-full bg-zinc-900 border rounded-xl py-3.5 pl-12 pr-4 text-lg font-bold text-white placeholder:text-zinc-600 outline-none transition-all ${
                                deniActive && !customerSearch.trim()
                                  ? 'border-rose-500 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20'
                                  : 'border-zinc-800 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-500/20'
                              }`}
                            />
                          </div>

                          {/* Suggestions Dropdown */}
                          {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                              {suggestions.map((customer) => (
                                <button
                                  key={customer.id}
                                  onClick={() => handleSelectCustomer(customer)}
                                  className="w-full px-3 py-2 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
                                >
                                  <p className="text-white font-bold text-sm">{customer.name}</p>
                                  <p className="text-zinc-500 text-xs font-mono">{customer.phone}</p>
                                  {customer.totalDebt > 0 && (
                                    <p className="text-rose-400 text-xs font-black mt-0.5">
                                      DEBT: KES {customer.totalDebt.toLocaleString()}
                                    </p>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Finalize Button - Compact */}
                    <div className="pt-4">
                      <button
                        ref={submitButtonRef}
                        onClick={handleSubmit}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            customerNameRef.current?.focus();
                          }
                        }}
                        disabled={!isComplete || loading}
                        className="w-full py-4 bg-white text-black font-black text-lg rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-10 flex items-center justify-center gap-2 uppercase shadow-xl focus:ring-2 focus:ring-white/30 focus:outline-none"
                      >
                        {loading ? 'PROCESSING...' : <>FINALIZE SALE <ArrowRight size={20} /></>}
                      </button>
                      {error && <p className="text-rose-500 text-[9px] font-black text-center mt-2 uppercase tracking-wider">{error}</p>}
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

    {/* ============================================================
        SUPERMARKET M-PESA MODAL - STEP 1: Testing minimal version
    ============================================================ */}
    <SupermarketMpesaModal
      isOpen={showMpesaModal}
      onClose={() => {
        setShowMpesaModal(false);
        setLoading(false);
        mpesaResolveRef.current?.({ success: false, flagged: false });
        mpesaResolveRef.current = null;
      }}
      amount={mpesa}
      phone={customerPhone}
      accountReference={`SALE${Date.now().toString().slice(-8)}`}
      tillNumber={import.meta.env.VITE_MPESA_TILL_NUMBER || '174379'}
      onPaymentSuccess={(receiptNum) => {
        setMpesaReceiptNumber(receiptNum);
        setShowMpesaModal(false);
        mpesaResolveRef.current?.({ success: true, flagged: false });
        mpesaResolveRef.current = null;
      }}
      onPaymentFailed={(reason) => {
        setError(reason);
        setShowMpesaModal(false);
        setLoading(false);
        mpesaResolveRef.current?.({ success: false, flagged: false });
        mpesaResolveRef.current = null;
      }}
      onCompleteLater={async () => {
        // Complete Later: Flag the sale for verification and proceed with sale creation
        setShowMpesaModal(false);
        setLoading(false);
        mpesaResolveRef.current?.({ success: true, flagged: true });
        mpesaResolveRef.current = null;
      }}
    />
    </>
  );
}