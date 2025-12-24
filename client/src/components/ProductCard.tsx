// ============================================
// PRODUCT CARD COMPONENT - THE "VISION" EDITION
// White-on-Dark Contrast + Sound Integration
// ============================================

import { Package, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { notify } from '../utils/notification'; // Fixed import for sound utility

interface ProductCardProps {
  productId: string;
  name: string;
  partNumber?: string;
  price: number;
  stock: number;
  lowStockThreshold?: number;
  imageUrl?: string;
}

export default function ProductCard({
  productId,
  name,
  partNumber,
  price,
  stock,
  imageUrl,
}: ProductCardProps) {
  const addToCart = useStore((state) => state.addToCart);

  // ===== DYNAMIC STOCK COLOR LOGIC =====
  const getStockColor = () => {
    if (stock === 0) return 'bg-rose-500';
    if (stock >= 1 && stock <= 10) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStockBadgeColor = () => {
    if (stock === 0) return 'bg-rose-50/50 border-rose-200 text-rose-600';
    if (stock >= 1 && stock <= 10) return 'bg-amber-50/50 border-amber-200 text-amber-600';
    return 'bg-emerald-50/50 border-emerald-200 text-emerald-600';
  };

  const getStockText = () => {
    if (stock === 0) return 'Out of Stock';
    if (stock >= 1 && stock <= 10) return `Low Stock`;
    return `In Stock`;
  };

  const handleAddToCart = () => {
    if (stock > 0) {
      addToCart({
        productId,
        name,
        price,
        stock,
        oemNumber: partNumber,
      });
      
      // Trigger Sound & Interactive Toast
      notify('info', `${name} added to cart`);
    } else {
      notify('error', 'Item is currently out of stock');
    }
  };

  return (
    <div
      onClick={handleAddToCart}
      className={`
        group relative bg-white border border-zinc-200/80
        rounded-2xl overflow-hidden transition-all duration-300
        ${stock > 0 
          ? 'cursor-pointer hover:shadow-2xl hover:shadow-white/10 hover:-translate-y-1.5' 
          : 'opacity-70 grayscale-[0.5] cursor-not-allowed'}
      `}
    >
      {/* Product Image Holder - Cleaner light background */}
      <div className="relative bg-zinc-50 h-40 flex items-center justify-center border-b border-zinc-100">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-14 h-14 text-zinc-300 transition-transform group-hover:scale-110 duration-500" />
        )}

        {/* Floating Stock Circle (Top Right) */}
        <div className="absolute top-3 right-3">
          <div className={`${getStockColor()} h-7 min-w-[28px] px-2 rounded-full flex items-center justify-center gap-1 shadow-md border-2 border-white`}>
            <span className="text-xs font-black text-white">{stock}</span>
          </div>
        </div>

        {/* Add to Cart Icon (Center Hover) */}
        {stock > 0 && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
            <div className="bg-zinc-950 text-white rounded-full p-3.5 shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all">
              <Plus className="w-6 h-6 stroke-[3px]" />
            </div>
          </div>
        )}
      </div>

      {/* Product Info - Dark text on White Card */}
      <div className="p-4">
        <h3 className="text-zinc-900 font-bold text-sm mb-1 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
          {name}
        </h3>

        {partNumber && (
          <p className="text-zinc-400 text-[10px] tracking-widest uppercase font-bold mb-3">
            {partNumber}
          </p>
        )}

        {/* Price & Status Section */}
        <div className="flex items-end justify-between mt-auto">
          <div className="flex flex-col">
            <span className="text-zinc-400 text-[10px] font-bold uppercase">Price</span>
            <span className="text-zinc-950 font-black text-lg leading-none">
              KES {price.toLocaleString()}
            </span>
          </div>

          <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tighter ${getStockBadgeColor()}`}>
            {getStockText()}
          </div>
        </div>
      </div>
    </div>
  );
}