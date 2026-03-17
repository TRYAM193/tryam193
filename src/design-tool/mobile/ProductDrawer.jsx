import React from 'react';
import { X, ShoppingBag, CreditCard, Minus, Plus, Check, Sparkles, Tag } from 'lucide-react';
import { COLOR_MAP } from '@/lib/colorMaps';
import { Button } from '@/components/ui/button';
import { PriceDisplay } from "@/components/PriceDisplay";
import { getVolumeDiscount } from '@/lib/discountUtils';

export default function ProductDrawer({
    product,
    selectedColor,
    setColor,
    selectedSize,
    setSize,
    quantity,
    setQuantity,
    onAddToCart,
    onBuyNow,
    isAddingToCart,
    isSaving,
    currencySymbol = '$',
    totalPrice,
    onClose,
    colors,
    sizes
}) {
    if (!product) return null;
    const currentPrice = typeof product.price === 'object' ? (product.price.IN || 0) : (product.price || 0);
    const totalOriginal = currentPrice * quantity;
    const { discountPct, message, progress, color, bgProgress } = getVolumeDiscount(quantity);
    const discountAmount = totalOriginal * discountPct;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />

            {/* Drawer Content */}
            <div className="relative w-full bg-[#1e293b] rounded-t-2xl p-6 pointer-events-auto animate-in slide-in-from-bottom duration-300 border-t border-white/10 max-w-md mx-auto">

                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-white">{product.title || "Custom Product"}</h2>
                        <div>
                            <p className="text-xs text-slate-400 mb-1">Total Price</p>
                            <PriceDisplay
                                // We pass unit price * quantity = totalPrice
                                price={parseFloat(totalPrice)}
                                currency={currencySymbol}
                                productId={product.id}
                                size="md"
                            />
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Colors */}
                <div className="mb-6">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Select Color</label>
                    <div className="flex gap-3 p-1 h-14 items-center overflow-x-auto pb-2 no-scrollbar">
                        {colors?.map((color) => {
                            const hex = COLOR_MAP[color] || color;
                            const isActive = selectedColor === hex;
                            return (
                                <button
                                    key={color}
                                    onClick={() => setColor(color)}
                                    className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center relative shrink-0 ${isActive ? 'border-orange-500 scale-110' : 'border-slate-600'}`}
                                    style={{ backgroundColor: hex }}
                                >
                                    {isActive && <Check size={14} className={['#ffffff', '#fff', 'white'].includes(hex.toLowerCase()) ? "text-black" : "text-white"} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Sizes */}
                <div className="mb-6">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Select Size</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {sizes?.map((size) => (
                            <button
                                key={size}
                                onClick={() => setSize(size)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all shrink-0 ${selectedSize === size ? 'border-orange-500 bg-orange-500/10 text-orange-400 shadow-[0_0_15px_-3px_rgba(249,115,22,0.3)]' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quantity & Actions */}
                <div className="space-y-4">

                    <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-white/5">
                        <span className="text-sm text-slate-300 font-medium">Quantity</span>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg text-white"><Minus size={16} /></button>
                            <span className="text-white font-bold w-4 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg text-white"><Plus size={16} /></button>
                        </div>
                    </div>

                    {/* 🟢 1. GAMIFICATION PROGRESS BAR */}
                    <div className="mt-4 mb-3 flex flex-col gap-3 p-3 rounded-xl border border-white/10 bg-slate-900/40 shadow-inner">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-medium">
                                <span className={`flex items-center gap-1.5 ${color}`}>
                                    {discountPct > 0 ? <Sparkles size={14} /> : <Tag size={14} />}
                                    {message}
                                </span>
                                {discountPct > 0 && (
                                    <span className="text-green-400 font-bold animate-pulse">-{discountPct * 100}%</span>
                                )}
                            </div>
                            
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 ease-out ${bgProgress}`} 
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 🟢 2. RESTORED PRICING COMPONENT + SAVINGS BADGE */}
                    <div className="flex justify-between items-end mb-4 pt-3 border-t border-slate-700">
                        {/* Extra push: The physical Rupee amount saved */}
                        {discountPct > 0 && (
                            <div className="text-xs text-green-400 font-bold bg-green-500/10 px-2 py-1 rounded-md border border-green-500/20 shadow-sm mb-1">
                                Bulk Savings: -{currencySymbol}{discountAmount.toFixed(2)}
                            </div>
                        )}
                    </div>
                    

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <Button
                            onClick={onAddToCart}
                            disabled={isAddingToCart}
                            className="h-12 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl border border-white/10"
                        >
                            {isAddingToCart ? "Adding..." : <><ShoppingBag className="mr-2 h-4 w-4" /> Add to Cart</>}
                        </Button>
                        <Button
                            onClick={onBuyNow}
                            disabled={isSaving}
                            className="h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg shadow-orange-900/40 border-0"
                        >
                            {isSaving ? "Processing..." : <><CreditCard className="mr-2 h-4 w-4" /> Buy Now</>}
                        </Button>
                    </div>
                </div>

                {/* Safe Area Spacer for iPhones */}
                <div className="h-6 w-full" />
            </div>
        </div>
    );
}