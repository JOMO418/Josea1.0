// ============================================
// PRODUCT CARD COMPONENT - THE "VISION" EDITION
// White-on-Dark Contrast + Sound Integration
// ============================================

import { Package, Plus, Car } from 'lucide-react';
import { useStore } from '../store/useStore';
import { notify } from '../utils/notification'; // Fixed import for sound utility

interface ProductCardProps {
  productId: string;
  name: string;
  partNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  price: number;
  stock: number;
  lowStockThreshold?: number;
  imageUrl?: string;
  isSelected?: boolean;
  dataIndex?: number;
  onSelect?: () => void;
  onMouseEnter?: () => void;
}

export default function ProductCard({
  productId,
  name,
  partNumber,
  vehicleMake,
  vehicleModel,
  price,
  stock,
  imageUrl,
  isSelected = false,
  dataIndex,
  onSelect: _onSelect,
  onMouseEnter,
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
        vehicleMake,
        vehicleModel,
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
      onMouseEnter={onMouseEnter}
      data-product-index={dataIndex}
      className={`
        group relative rounded-2xl overflow-hidden transition-all duration-200
        ${isSelected
          ? 'bg-gradient-to-br from-blue-50 to-white border-4 border-blue-500 ring-8 ring-blue-500/40 shadow-2xl shadow-blue-500/50 scale-110 z-20 -translate-y-2'
          : 'bg-white border border-zinc-200/80'}
        ${stock > 0
          ? 'cursor-pointer hover:shadow-2xl hover:shadow-white/10 hover:-translate-y-1.5'
          : 'opacity-70 grayscale-[0.5] cursor-not-allowed'}
      `}
      style={isSelected ? {
        animation: 'glow 1.5s ease-in-out infinite alternate'
      } : {}}
    >
      {/* Keyboard Selection Indicator */}
      {isSelected && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-center py-1.5 z-10">
          <p className="text-[10px] font-bold uppercase tracking-wider">Press ENTER to Add</p>
        </div>
      )}

      <style>{`
        @keyframes glow {
          from {
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.4), 0 0 30px rgba(59, 130, 246, 0.2);
          }
          to {
            box-shadow: 0 0 25px rgba(59, 130, 246, 0.6), 0 0 45px rgba(59, 130, 246, 0.3);
          }
        }
      `}</style>
      {/* Product Image Holder - Cleaner light background */}
      <div className={`relative bg-zinc-50 h-44 flex items-center justify-center border-b border-zinc-100 ${isSelected ? 'mt-10' : ''}`}>
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-16 h-16 text-zinc-300 transition-transform group-hover:scale-110 duration-500" />
        )}

        {/* Floating Stock Circle (Top Right) - Enhanced */}
        <div className="absolute top-3 right-3">
          <div className={`${getStockColor()} h-8 min-w-[32px] px-2.5 rounded-full flex items-center justify-center gap-1 shadow-lg border-2 border-white`}>
            <span className="text-sm font-black text-white">{stock}</span>
          </div>
        </div>

        {/* Add to Cart Icon (Center Hover) */}
        {stock > 0 && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
            <div className="bg-zinc-950 text-white rounded-full p-4 shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all">
              <Plus className="w-7 h-7 stroke-[3px]" />
            </div>
          </div>
        )}
      </div>

      {/* Product Info - Dark text on White Card */}
      <div className="p-5">
        {/* Product Name - Maximum Prominence */}
        <h3 className="text-zinc-950 font-black text-lg mb-2.5 line-clamp-2 leading-tight tracking-tight group-hover:text-blue-600 transition-colors">
          {name}
        </h3>

        {/* Vehicle Fitment - Compact Display */}
        {(vehicleMake || vehicleModel) && (
          <div className="flex items-center gap-1.5 mb-2 bg-blue-50/80 border border-blue-200/50 rounded-md px-2 py-1">
            <Car className="w-3 h-3 text-blue-600 flex-shrink-0" />
            <p className="text-blue-700 text-[11px] font-bold leading-tight truncate">
              {vehicleMake && vehicleModel ? (
                <>{vehicleMake} {vehicleModel}</>
              ) : (
                <>{vehicleMake || vehicleModel}</>
              )}
            </p>
          </div>
        )}

        {partNumber && (
          <p className="text-zinc-500 text-[11px] tracking-wide uppercase font-semibold mb-4">
            SKU: {partNumber}
          </p>
        )}

        {/* Price & Status Section - Enhanced Prominence */}
        <div className="flex items-end justify-between mt-auto pt-3 border-t border-zinc-100">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Price</span>
            <span className="text-zinc-950 font-black text-2xl leading-none tracking-tight">
              KES {price.toLocaleString()}
            </span>
          </div>

          <div className={`px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-tight ${getStockBadgeColor()}`}>
            {getStockText()}
          </div>
        </div>
      </div>
    </div>
  );
}