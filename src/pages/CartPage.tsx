import { Link, useNavigate } from "react-router";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  ShoppingBag,
  Heart,
  Pencil,
  RotateCcw,
  LogIn,
  ShieldCheck, Sparkles, Tag, Zap, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { calculatePriceDetails } from "@/lib/priceUtils";
import { PriceDisplay } from "@/components/PriceDisplay";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { calculateCartTotalsAndAllocations, getVolumeDiscount } from "@/lib/discountUtils";


// ------------------------------------------------------------------
// 💀 SKELETON COMPONENTS
// ------------------------------------------------------------------
const CartItemSkeleton = () => (
  <div className="w-full bg-slate-800/40 border border-white/5 rounded-xl overflow-hidden p-4 sm:p-6 flex gap-4 sm:gap-6 items-start animate-pulse">
    {/* Image Skeleton */}
    <div className="h-24 w-24 sm:h-32 sm:w-32 bg-slate-700/50 rounded-xl shrink-0" />

    <div className="flex-1 space-y-4 py-1">
      {/* Title & Price */}
      <div className="flex justify-between items-start gap-4">
        <div className="h-6 w-1/2 bg-slate-700/50 rounded" />
        <div className="h-6 w-20 bg-slate-700/50 rounded" />
      </div>

      {/* Variants */}
      <div className="flex gap-2">
        <div className="h-5 w-12 bg-slate-700/30 rounded" />
        <div className="h-5 w-16 bg-slate-700/30 rounded" />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-auto pt-2">
        <div className="h-8 w-24 bg-slate-700/30 rounded-lg" />
        <div className="flex gap-4">
          <div className="h-4 w-12 bg-slate-700/30 rounded" />
          <div className="h-4 w-12 bg-slate-700/30 rounded" />
        </div>
      </div>
    </div>
  </div>
);

const SummarySkeleton = () => (
  <div className="bg-slate-800/40 border border-white/5 rounded-xl p-6 space-y-6 animate-pulse">
    <div className="h-6 w-32 bg-slate-700/50 rounded mb-4" />
    <div className="space-y-3">
      <div className="flex justify-between"><div className="h-4 w-20 bg-slate-700/30 rounded" /><div className="h-4 w-16 bg-slate-700/30 rounded" /></div>
      <div className="flex justify-between"><div className="h-4 w-20 bg-slate-700/30 rounded" /><div className="h-4 w-16 bg-slate-700/30 rounded" /></div>
      <div className="flex justify-between"><div className="h-4 w-24 bg-slate-700/30 rounded" /><div className="h-4 w-16 bg-slate-700/30 rounded" /></div>
    </div>
    <div className="h-[1px] bg-slate-700/30 my-4" />
    <div className="flex justify-between"><div className="h-6 w-16 bg-slate-700/50 rounded" /><div className="h-6 w-24 bg-slate-700/50 rounded" /></div>
    <div className="h-12 w-full bg-slate-700/50 rounded-lg mt-4" />
  </div>
);

// ------------------------------------------------------------------
// 🛒 MAIN PAGE
// ------------------------------------------------------------------
export default function CartPage() {
  const {
    items,
    savedItems,
    removeItem,
    updateQuantity,
    saveForLater,
    moveToCart,
    removeSavedItem,
    cartTotal,
    isLoading
  } = useCart();
  const [hasActiveReward, setHasActiveReward] = useState(false);
  const [applyReward, setApplyReward] = useState(false);

  const { user } = useAuth();
  // Fetch reward status
  useEffect(() => {
    async function fetchRewardStatus() {
      if (!user) return;
      const docRef = doc(db, "users", user.uid);
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data().hasActiveReward) {
        setHasActiveReward(true);
      }
    }
    fetchRewardStatus();
  }, [user]);

  const navigate = useNavigate();
  const cartAnalysis = items.reduce((acc, item) => {
    const { originalPrice, savings } = calculatePriceDetails(item.price, item.productId);
    acc.totalMRP += (originalPrice * item.quantity);
    acc.totalSavings += (savings * item.quantity);
    return acc;
  }, { totalMRP: 0, totalSavings: 0 });
  // 🟢 NEW: Calculate macro-totals and gamification

  const { summary } = calculateCartTotalsAndAllocations(items, applyReward);
  const { discountPct, message, progress, color, bgProgress } = getVolumeDiscount(summary.totalItems);

  // 1. Loading State (Now using Skeletons)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white p-4 md:p-8 pt-24 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="h-10 w-48 bg-slate-700/50 rounded mb-8 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <CartItemSkeleton />
              <CartItemSkeleton />
              <CartItemSkeleton />
            </div>
            <div className="lg:col-span-1">
              <SummarySkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Guest State
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white p-4">
        <div className="max-w-md text-center space-y-6">
          <div className="h-24 w-24 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto border border-white/10">
            <LogIn className="h-10 w-10 text-slate-400" />
          </div>
          <h1 className="text-3xl font-bold">Sign in to view your cart</h1>
          <p className="text-slate-400">
            Your designs and cart items are saved to your account. Please sign in to continue your purchase.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="rounded-full px-4 md:px-6 h-9 md:h-10 text-sm md:text-base bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg shadow-orange-900/40 hover:shadow-orange-700/50 hover:scale-105 active:scale-95 transition-all duration-300 group border-0 relative overflow-hidden">
                <span className="relative z-10 flex items-center gap-2">Sign In</span>
              </Button>
            </Link>
            <Link to="/design">
              <Button variant="outline" size="lg" className="rounded-full px-4 md:px-6 h-9 md:h-10 text-sm md:text-base border-white/10 hover:bg-white/5">
                Continue Designing
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCartEmpty = items.length === 0;
  const isSavedEmpty = savedItems.length === 0;

  // 3. Edit Handler
  const handleEdit = (cartItemId: string) => {
    window.open(`/design?editCartId=${cartItemId}`);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 md:p-8 pt-24 pb-24 selection:bg-orange-500/30">

      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10 w-full h-full pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] rounded-full bg-orange-600/5 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <ShoppingBag className="text-orange-500" /> Your Shopping Cart
        </h1>

        {isCartEmpty && isSavedEmpty ? (
          // === EMPTY STATE ===
          <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 text-center border border-dashed border-white/10 rounded-2xl bg-slate-900/30">
            <div className="h-24 w-24 rounded-full bg-slate-800 flex items-center justify-center mb-2">
              <ShoppingBag className="h-10 w-10 text-slate-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-300">Your cart is empty</h2>
            <p className="text-slate-500 max-w-sm">Looks like you haven't added any custom tees yet. Start designing!</p>
            <Link to="/design">
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700 mt-4 rounded-full px-8 shadow-lg shadow-orange-900/20">
                Start Designing
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* === LEFT COLUMN: ITEMS === */}
            <div className="lg:col-span-2 space-y-8">
              {items.length > 0 && (
                <div className="mb-6 flex flex-col gap-3 p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 shadow-inner">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className={`flex items-center gap-1.5 ${color}`}>
                        {discountPct > 0 ? <Sparkles size={16} /> : <Tag size={16} />}
                        {message}
                      </span>
                      {discountPct > 0 && (
                        <span className="text-green-400 font-bold animate-pulse">-{discountPct * 100}% Off!</span>
                      )}
                    </div>

                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ease-out ${bgProgress}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 1. ACTIVE CART ITEMS */}
              {!isCartEmpty && (
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                      >
                        <Card className="bg-slate-800/50 border-white/10 overflow-hidden group hover:border-white/20 transition-all">
                          <CardContent className="p-3 sm:p-6 flex flex-row gap-4 sm:gap-6 items-start">

                            {/* Thumbnail */}
                            <div className="h-24 w-24 sm:h-32 sm:w-32 bg-white rounded-xl p-2 flex-shrink-0 border border-white/10 shadow-inner">
                              <img src={item.thumbnail} alt={item.title} className="h-full w-full object-contain" />
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between min-h-[96px] sm:min-h-[120px]">
                              <div>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                  <h3 className="font-bold text-base sm:text-lg text-slate-200 truncate pr-0 sm:pr-4">
                                    {item.title}
                                  </h3>
                                  <div className="flex flex-col items-end">
                                    <PriceDisplay
                                      price={item.price * item.quantity}
                                      currency={item.currency?.symbol || "₹"}
                                      productId={item.productId}
                                      size="md"
                                      align="right"
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1.5 text-sm text-slate-400">
                                  <span className="px-2 py-0.5 bg-slate-900 rounded border border-white/5 text-xs sm:text-sm">
                                    {item.variant.size}
                                  </span>
                                  <span className="px-2 py-0.5 bg-slate-900 rounded border border-white/5 text-xs sm:text-sm flex items-center gap-1">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full border border-white/10"
                                      style={{ backgroundColor: item.variant.color }}
                                    />
                                    {item.variant.color}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-4 mt-3 sm:mt-4">
                                {/* Quantity Controls */}
                                <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-1 border border-white/10">
                                  <button
                                    onClick={() => updateQuantity(item.id, -1)}
                                    className="p-1.5 hover:text-white text-slate-400 disabled:opacity-30 transition-colors"
                                    disabled={item.quantity <= 1}
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className="text-sm text-white font-medium w-6 text-center">{item.quantity}</span>
                                  <button
                                    onClick={() => updateQuantity(item.id, 1)}
                                    className="p-1.5 hover:text-white text-slate-400 transition-colors"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-3 sm:gap-4">
                                  <button
                                    onClick={() => handleEdit(item.id)}
                                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-blue-400 transition-colors"
                                  >
                                    <Pencil size={16} /> <span className="hidden sm:inline">Edit</span>
                                  </button>

                                  <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>

                                  <button
                                    onClick={() => saveForLater(item.id)}
                                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-orange-400 transition-colors"
                                  >
                                    <Heart size={16} /> <span className="hidden sm:inline">Save</span>
                                  </button>

                                  <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>

                                  <button
                                    onClick={() => removeItem(item.id)}
                                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 size={16} /> <span className="hidden sm:inline">Remove</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* 2. SAVED FOR LATER SECTION */}
              {!isSavedEmpty && (
                <div className="mt-12 pt-8 border-t border-white/10">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-300">
                    <Heart className="text-slate-500 fill-slate-500/20" /> Saved for Later ({savedItems.length})
                  </h3>

                  <div className="space-y-4">
                    {savedItems.map((item) => (
                      <div key={item.id} className="flex gap-4 p-4 rounded-xl border border-dashed border-white/10 bg-slate-900/20 hover:bg-slate-900/40 transition-colors relative group">
                        <div className="h-16 w-16 sm:h-20 sm:w-20 bg-white rounded-lg p-2 flex-shrink-0 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                          <img src={item.thumbnail} alt={item.title} className="h-full w-full object-contain" />
                        </div>

                        <div className="flex-1 flex flex-col justify-center">
                          <div>
                            <h4 className="font-medium text-slate-300 line-clamp-1">{item.title}</h4>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 mt-1">
                              <span className="bg-white/5 px-1.5 rounded">{item.variant.size}</span>
                              <span className="bg-white/5 px-1.5 rounded">{item.variant.color}</span>
                              <span>•</span>
                              <span className="text-slate-300">{item.currency.symbol} {item.price}</span>
                            </div>
                          </div>

                          <div className="flex gap-4 mt-3">
                            <button
                              onClick={() => moveToCart(item.id)}
                              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" /> Move to Cart
                            </button>
                            <button
                              onClick={() => removeSavedItem(item.id)}
                              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* === RIGHT COLUMN: SUMMARY === */}
            {!isCartEmpty && (
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <Card className="bg-slate-800/80 backdrop-blur-xl border-white/10 shadow-2xl">
                    <CardHeader className="border-b border-white/5 pb-4">
                      <CardTitle className="text-white text-lg">Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">

                      {/* 🟢 NEW: TRANSPARENT MACRO RECEIPT TOTALS */}
                      <div className="space-y-4 text-sm mb-6">
                        <div className="flex justify-between text-slate-400">
                          <span>Subtotal ({summary.totalItems} items)</span>
                          <span>₹{summary.mrpSubtotal.toFixed(2)}</span>
                        </div>

                        {summary.totalBulkDiscount > 0 && (
                          <div className="flex justify-between text-green-400 font-medium">
                            <span>Bulk Savings ({discountPct * 100}%)</span>
                            <span>-₹{summary.totalBulkDiscount.toFixed(2)}</span>
                          </div>
                        )}


                        {summary.totalReferralDiscount > 0 && (
                          <div className="flex justify-between text-green-400 font-medium">
                            <span>Referral Reward</span>
                            <span>-₹{summary.totalReferralDiscount.toFixed(2)}</span>
                          </div>
                        )}

                        <div className="flex justify-between text-slate-400">
                          <span>Shipping</span>
                          <span className="text-green-400 uppercase text-xs font-bold tracking-wider">Free</span>
                        </div>
                      </div>

                      <div className="h-px bg-white/10 my-4" />
                       {/* 🎁 THE REWARD TOGGLE */}
                        {hasActiveReward && (
                          <div className="flex items-center justify-between p-3 my-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl shadow-[0_0_15px_rgba(234,88,12,0.1)]">
                            <div className="flex items-center gap-3">
                              <div className="bg-orange-500/20 p-2 rounded-lg">
                                <Zap className="h-4 w-4 text-orange-400" />
                              </div>
                              <div>
                                <Label htmlFor="reward-toggle" className="text-white font-bold cursor-pointer text-sm">
                                  Apply ₹100 Credit
                                </Label>
                              </div>
                            </div>
                            <Switch
                              id="reward-toggle"
                              checked={applyReward}
                              onCheckedChange={setApplyReward}
                              className="data-[state=checked]:bg-orange-500"
                            />
                          </div>
                        )}
                        
                      <div className="h-px bg-white/10 my-4" />

                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xl font-bold text-white mb-2">
                          <span>Total</span>
                          {/* 🟢 NEW: Use the safe, calculated final total */}
                          <span className="text-orange-400">₹{summary.finalGrandTotal.toFixed(2)}</span>
                        </div>

                        {/* 🏆 THE SAVINGS BANNER */}
                        {(summary.totalBulkDiscount > 0 || summary.totalReferralDiscount > 0) && (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center text-xs font-bold text-green-400">
                            You are saving ₹{(summary.totalBulkDiscount + summary.totalReferralDiscount).toFixed(2)} on this order!
                          </div>
                        )}
                      </div>


                        <Button
                          onClick={() => navigate(`/checkout?mode=cart&reward=${applyReward}`)}
                          disabled={items.length === 0}
                          className="w-full h-12 text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-lg shadow-orange-900/20 transition-all hover:scale-[1.02]"
                        >
                          Proceed to Checkout <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>

                      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-4 bg-slate-900/50 py-2 rounded-lg border border-white/5">
                        <ShieldCheck className="h-3 w-3 text-green-500" /> Secure Online Payments
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}