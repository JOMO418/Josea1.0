// ============================================
// TRANSACTION TRAY - VISION EDITION
// High-Contrast Stacked Card Architecture
// ENHANCED: Full Keyboard Navigation Support
// ============================================

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, ReceiptText } from 'lucide-react';
import { useStore, useCartTotal } from '../store/useStore';
import { notify } from '../utils/notification';

interface TransactionTrayProps {
  onCheckout: () => void;
  isFocused?: boolean;
  onFocusSearch?: () => void;
  onFocusProducts?: () => void;
}

export interface TransactionTrayRef {
  focusFirstItem: () => void;
  focusCheckoutButton: () => void;
}

const TransactionTray = forwardRef<TransactionTrayRef, TransactionTrayProps>(
  ({ onCheckout, isFocused = false, onFocusSearch, onFocusProducts }, ref) => {
    const cart = useStore((state) => state.cart);
    const updateQuantity = useStore((state) => state.updateCartItemQuantity);
    const removeItem = useStore((state) => state.removeFromCart);
    const cartTotal = useCartTotal();

    const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
    const [buttonFocus, setButtonFocus] = useState<'none' | 'clear' | 'checkout'>('none');
    const trayRef = useRef<HTMLDivElement>(null);
    const checkoutButtonRef = useRef<HTMLButtonElement>(null);
    const clearButtonRef = useRef<HTMLButtonElement>(null);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      focusFirstItem: () => {
        if (cart.length > 0) {
          setSelectedItemIndex(0);
          setButtonFocus('none');
          trayRef.current?.focus();
        } else {
          // If no items, focus checkout button
          setButtonFocus('checkout');
          checkoutButtonRef.current?.focus();
        }
      },
      focusCheckoutButton: () => {
        setButtonFocus('checkout');
        checkoutButtonRef.current?.focus();
      }
    }));

  const handleQuantityChange = (productId: string, delta: number) => {
    const item = cart.find((i) => i.productId === productId);
    if (item) {
      updateQuantity(productId, item.quantity + delta);
    }
  };

  const handleRemove = (productId: string, name: string) => {
    removeItem(productId);
    notify('info', `${name} removed from tray`);
    // Adjust selection if needed
    if (selectedItemIndex >= cart.length - 1) {
      setSelectedItemIndex(Math.max(0, cart.length - 2));
    }
  };

  // Auto-focus tray when it becomes focused
  useEffect(() => {
    if (isFocused) {
      if (buttonFocus !== 'none') {
        // Focus appropriate button
        if (buttonFocus === 'checkout') {
          checkoutButtonRef.current?.focus();
        } else if (buttonFocus === 'clear') {
          clearButtonRef.current?.focus();
        }
      } else if (cart.length > 0) {
        trayRef.current?.focus();
        setSelectedItemIndex(0);
      } else {
        // No items, focus checkout button
        setButtonFocus('checkout');
        checkoutButtonRef.current?.focus();
      }
    }
  }, [isFocused, buttonFocus]);

  // Reset selection when cart changes
  useEffect(() => {
    if (selectedItemIndex >= cart.length && cart.length > 0) {
      setSelectedItemIndex(cart.length - 1);
    }
    // Reset button focus when cart becomes empty
    if (cart.length === 0 && buttonFocus === 'none') {
      setButtonFocus('checkout');
    }
  }, [cart.length]);

  // Handle keyboard navigation in transaction tray (cart items)
  const handleTrayKeyDown = (e: React.KeyboardEvent) => {
    if (!isFocused || cart.length === 0 || buttonFocus !== 'none') return;

    const currentItem = cart[selectedItemIndex];

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (selectedItemIndex > 0) {
          setSelectedItemIndex(selectedItemIndex - 1);
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (selectedItemIndex < cart.length - 1) {
          setSelectedItemIndex(selectedItemIndex + 1);
        } else {
          // Move to checkout button
          setButtonFocus('checkout');
          checkoutButtonRef.current?.focus();
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        // Go back to products
        onFocusProducts?.();
        break;

      case 'ArrowRight':
        // Stay in tray (could cycle through items or do nothing)
        e.preventDefault();
        break;

      case '+':
      case '=':
        e.preventDefault();
        if (currentItem && currentItem.quantity < currentItem.stock) {
          handleQuantityChange(currentItem.productId, 1);
        }
        break;

      case '-':
      case '_':
        e.preventDefault();
        if (currentItem && currentItem.quantity > 1) {
          handleQuantityChange(currentItem.productId, -1);
        }
        break;

      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        if (currentItem) {
          handleRemove(currentItem.productId, currentItem.name);
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (cart.length > 0) {
          onCheckout();
        }
        break;

      case 'Escape':
        e.preventDefault();
        onFocusSearch?.();
        break;

      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          onFocusProducts?.();
        } else {
          setButtonFocus('checkout');
          checkoutButtonRef.current?.focus();
        }
        break;
    }
  };

  // Handle keyboard navigation for buttons
  const handleButtonKeyDown = (e: React.KeyboardEvent, currentButton: 'clear' | 'checkout') => {
    if (!isFocused) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (cart.length > 0) {
          // Move to last cart item
          setButtonFocus('none');
          setSelectedItemIndex(cart.length - 1);
          trayRef.current?.focus();
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        // Stay on buttons (or could wrap to top)
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (currentButton === 'checkout') {
          setButtonFocus('clear');
          clearButtonRef.current?.focus();
        } else {
          // From clear button, go back to products
          onFocusProducts?.();
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (currentButton === 'clear') {
          setButtonFocus('checkout');
          checkoutButtonRef.current?.focus();
        }
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (currentButton === 'checkout' && cart.length > 0) {
          onCheckout();
        } else if (currentButton === 'clear' && cart.length > 0) {
          useStore.getState().clearCart();
          notify('info', 'Cart cleared');
          setButtonFocus('none');
          onFocusSearch?.();
        }
        break;

      case 'Escape':
        e.preventDefault();
        onFocusSearch?.();
        break;

      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          if (currentButton === 'checkout') {
            setButtonFocus('clear');
            clearButtonRef.current?.focus();
          } else {
            // From clear, go to cart items or products
            if (cart.length > 0) {
              setButtonFocus('none');
              setSelectedItemIndex(cart.length - 1);
              trayRef.current?.focus();
            } else {
              onFocusProducts?.();
            }
          }
        } else {
          if (currentButton === 'clear') {
            setButtonFocus('checkout');
            checkoutButtonRef.current?.focus();
          } else {
            // From checkout, could wrap or go somewhere else
            onFocusSearch?.();
          }
        }
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemIndex >= 0 && trayRef.current && buttonFocus === 'none') {
      const items = trayRef.current.querySelectorAll('[data-cart-item-index]');
      const selectedItem = items[selectedItemIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedItemIndex, buttonFocus]);


  return (
    <div
      ref={trayRef}
      className="flex flex-col h-full bg-[#09090b] focus:outline-none"
      onKeyDown={handleTrayKeyDown}
      tabIndex={isFocused && buttonFocus === 'none' ? 0 : -1}
      style={{ scrollBehavior: 'smooth' }}
    >
      {/* Vision Header - High Contrast */}
      <div className="p-8 border-b border-zinc-800/50 bg-zinc-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-600/20">
              <ReceiptText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight italic">CURRENT SALE</h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  {cart.length} Parts in Tray
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cart Items - The "Stacked Card" Look from Vision */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-950/40">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
            <ShoppingCart className="w-20 h-20 text-white mb-4 stroke-[1px]" />
            <p className="text-white font-bold uppercase tracking-widest">Tray is Empty</p>
          </div>
        ) : (
          cart.map((item, index) => (
            <div
              key={item.productId}
              data-cart-item-index={index}
              className={`relative bg-white rounded-[2rem] p-5 shadow-xl transition-all hover:scale-[1.02] ${
                isFocused && buttonFocus === 'none' && selectedItemIndex === index
                  ? 'border-4 border-blue-500 ring-8 ring-blue-500/40 scale-110 shadow-2xl shadow-blue-500/50 z-10'
                  : 'border border-zinc-200'
              }`}
            >
              {/* Keyboard Selection Indicator */}
              {isFocused && buttonFocus === 'none' && selectedItemIndex === index && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-0.5 rounded-full shadow-md z-20">
                  <p className="text-[9px] font-bold uppercase tracking-wide">Selected</p>
                </div>
              )}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-zinc-950 font-black text-lg leading-tight mb-1">
                    {item.name}
                  </h3>
                  {item.oemNumber && (
                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[10px] font-black rounded-md uppercase">
                      OEM: {item.oemNumber}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(item.productId, item.name)}
                  className="text-zinc-300 hover:text-rose-500 transition-colors p-2"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-6">
                {/* Vision Style Quantity Controls */}
                <div className="flex items-center bg-zinc-100 rounded-2xl p-1 border border-zinc-200">
                  <button
                    onClick={() => handleQuantityChange(item.productId, -1)}
                    className="w-10 h-10 flex items-center justify-center bg-white text-zinc-900 rounded-xl shadow-sm hover:bg-zinc-50 transition-all disabled:opacity-30"
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="w-5 h-5 stroke-[3px]" />
                  </button>

                  <span className="text-zinc-900 font-black text-xl w-14 text-center">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => handleQuantityChange(item.productId, 1)}
                    className="w-10 h-10 flex items-center justify-center bg-white text-zinc-900 rounded-xl shadow-sm hover:bg-zinc-50 transition-all disabled:opacity-30"
                    disabled={item.quantity >= item.stock}
                  >
                    <Plus className="w-5 h-5 stroke-[3px]" />
                  </button>
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Subtotal</p>
                  <p className="text-zinc-950 font-black text-xl tracking-tighter">
                    KES {(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer - Exactly as the Picture */}
      <div className="p-8 bg-zinc-900/40 border-t border-zinc-800/50 space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 font-black text-lg uppercase tracking-widest">Grand Total</span>
          <div className="text-right">
            <span className="text-emerald-500 font-black text-5xl tracking-tighter drop-shadow-2xl">
              {cartTotal.toLocaleString()}
            </span>
            <span className="text-emerald-500/50 font-bold ml-2 text-sm uppercase">KES</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <button
              ref={clearButtonRef}
              disabled={cart.length === 0}
              onClick={() => {
                useStore.getState().clearCart();
                notify('info', 'Cart cleared');
                setButtonFocus('none');
                onFocusSearch?.();
              }}
              onKeyDown={(e) => handleButtonKeyDown(e, 'clear')}
              className={`
                relative py-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black rounded-3xl
                transition-all uppercase tracking-widest text-sm focus:outline-none
                disabled:opacity-30 disabled:cursor-not-allowed
                ${buttonFocus === 'clear'
                  ? 'ring-4 ring-zinc-500/60 scale-105 bg-zinc-700 shadow-xl shadow-zinc-500/30'
                  : 'focus:ring-4 focus:ring-zinc-600/50'}
              `}
            >
              {buttonFocus === 'clear' && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-zinc-600 text-white px-3 py-0.5 rounded-full shadow-md whitespace-nowrap">
                  <p className="text-[9px] font-bold uppercase tracking-wide">← Products | Checkout →</p>
                </div>
              )}
              Clear
            </button>
            <button
              ref={checkoutButtonRef}
              onClick={onCheckout}
              onKeyDown={(e) => handleButtonKeyDown(e, 'checkout')}
              disabled={cart.length === 0}
              className={`
                relative py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-3xl
                transition-all shadow-xl shadow-blue-600/20 uppercase tracking-widest text-sm
                flex items-center justify-center gap-2 focus:outline-none
                disabled:opacity-30 disabled:cursor-not-allowed
                ${buttonFocus === 'checkout'
                  ? 'ring-4 ring-blue-400/80 scale-105 bg-blue-500 shadow-2xl shadow-blue-500/50'
                  : 'focus:ring-4 focus:ring-blue-500/50'}
              `}
            >
              {buttonFocus === 'checkout' && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-400 text-white px-3 py-0.5 rounded-full shadow-md whitespace-nowrap">
                  <p className="text-[9px] font-bold uppercase tracking-wide">← Clear | ↑ Items | ↵ Checkout</p>
                </div>
              )}
              <CreditCard className="w-5 h-5" />
              Checkout
            </button>
        </div>
      </div>
    </div>
  );
});

TransactionTray.displayName = 'TransactionTray';

export default TransactionTray;