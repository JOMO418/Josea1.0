// ============================================
// TRANSACTION TRAY - VISION EDITION
// High-Contrast Stacked Card Architecture
// ============================================

import { ShoppingCart, Trash2, Plus, Minus, CreditCard, ReceiptText } from 'lucide-react';
import { useStore, useCartTotal } from '../store/useStore';
import { notify } from '../utils/notification';

interface TransactionTrayProps {
  onCheckout: () => void;
}

export default function TransactionTray({ onCheckout }: TransactionTrayProps) {
  const cart = useStore((state) => state.cart);
  const updateQuantity = useStore((state) => state.updateCartItemQuantity);
  const removeItem = useStore((state) => state.removeFromCart);
  const cartTotal = useCartTotal();

  const handleQuantityChange = (productId: string, delta: number) => {
    const item = cart.find((i) => i.productId === productId);
    if (item) {
      updateQuantity(productId, item.quantity + delta);
    }
  };

  const handleRemove = (productId: string, name: string) => {
    removeItem(productId);
    notify('info', `${name} removed from tray`);
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b]">
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
          cart.map((item) => (
            <div
              key={item.productId}
              className="bg-white rounded-[2rem] p-5 shadow-xl border border-zinc-200 transition-all hover:scale-[1.02]"
            >
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
              disabled={cart.length === 0}
              className="py-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black rounded-3xl transition-all uppercase tracking-widest text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onCheckout}
              disabled={cart.length === 0}
              className="py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-3xl transition-all shadow-xl shadow-blue-600/20 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              Checkout
            </button>
        </div>
      </div>
    </div>
  );
}