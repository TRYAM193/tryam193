import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@/hooks/use-auth';
import { doc, setDoc, serverTimestamp, updateDoc, collection, getDocs, getDoc, query, writeBatch, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/firebase';
// Add this import
import { INITIAL_PRODUCTS } from '@/data/initialProducts';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // For Stripe Modal
import { PhoneVerificationModal } from "@/components/PhoneVerificationModal";
// Data Library
import { Country, State, City } from 'country-state-city';

// UI Imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { OrderSuccessOverlay } from "@/components/OrderSuccessOverlay"; // Adjust path
import { AnimatePresence, motion } from "framer-motion"; // Ensure this is imported
import { toast } from 'sonner';
import { Switch } from "@/components/ui/switch";
// 🟢 NEW MATH IMPORTS
import { calculateCartTotalsAndAllocations, getVolumeDiscount } from "@/lib/discountUtils";

// Icons
import {
  ChevronLeft,
  Loader2,
  ShoppingBag,
  CreditCard,
  Truck,
  Globe,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  MapPin,
  AlertCircle,
  Sparkles, Zap, XCircle, Tag
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { PriceDisplay } from "@/components/PriceDisplay";

const StripeCheckoutForm = ({ clientSecret, shippingInfo, onSuccess, onError }: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: any) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        payment_method_data: {
          billing_details: {
            name: shippingInfo.fullName,
            email: shippingInfo.email,
          }
        }
      },
      redirect: 'if_required'
    });

    if (error) {
      setProcessing(false);
      onError(error.message || "Your card was declined. Please try again.");
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setProcessing(false);
      onSuccess(paymentIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || processing} className="w-full bg-orange-600 hover:bg-orange-500 text-white">
        {processing ? <Loader2 className="animate-spin" /> : "Pay Now"}
      </Button>
    </form>
  );
};

export default function OrderCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [showSuccess, setShowSuccess] = useState(false);
  const { items: cartItems, cartTotal, clearCart } = useCart();

  const mode = searchParams.get('mode') || 'cart';
  const legacyOrderData = location.state?.orderData;
  const initialReward = searchParams.get('reward') === 'true';
  const [applyReward, setApplyReward] = useState(initialReward);
  const [hasActiveReward, setHasActiveReward] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online'); // Restore online as default

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [failureReason, setFailureReason] = useState("");
  const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const [gstError, setGstError] = useState("");

  const stripeCurrencyMap: Record<string, string> = {
    US: 'usd', GB: 'gbp', DE: 'eur', FR: 'eur', IT: 'eur', ES: 'eur', NL: 'eur', CA: 'cad'
  }

  // 🟢 NEW: MASTER MATH ENGINE (Calculates Ledger and UI Gamification)
  const isRewardValid = applyReward && hasActiveReward;
  const { summary, allocatedItems } = useMemo(() => {
    return calculateCartTotalsAndAllocations(items, isRewardValid);
  }, [items, isRewardValid]);

  const { discountPct, message, progress, color, bgProgress } = getVolumeDiscount(summary.totalItems || 0);

  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState('');
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState('');
  const email = user?.email;

  const [shippingInfo, setShippingInfo] = useState({
    fullName: user?.displayName || '',
    email: user?.email ? user.email : email,
    line1: '',
    countryCode: 'IN',
    country: 'India',
    state: '',
    stateCode: '',
    city: '',
    zip: '',
    phone: '',
    gstNumber: ''
  });

  useEffect(() => {
    if (email) setShippingInfo(prev => ({ ...prev, email: user.email }));
  }, [user]);

  // 1. Fetch Items & User Profile
  useEffect(() => {
    const initData = async () => {
      setLoadingItems(true);

      if (mode === 'direct') {
        const directItem = localStorage.getItem('directBuyItem');
        if (directItem) setItems([JSON.parse(directItem)]);
        else if (legacyOrderData) setItems([legacyOrderData]);
      } else if (mode === 'cart' && user?.uid) {
        try {
          const cartRef = collection(db, `users/${user.uid}/cart`);
          const snapshot = await getDocs(cartRef);
          setItems(snapshot.docs.map(doc => ({ ...doc.data(), firestoreId: doc.id })));
        } catch (err) { console.error(err); }
      }

      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setHasActiveReward(data.hasActiveReward || false);
            const addr = data.addressObject || {};
            const resolvedCountry = Country.getCountryByCode(addr.countryCode || 'IN')?.name;
            const resolvedState = State.getStateByCodeAndCountry(addr.stateCode || '', addr.countryCode || 'IN')?.name;
            setShippingInfo(prev => ({
              ...prev,
              fullName: data.name || prev.fullName,
              line1: addr.line1 || '',
              countryCode: addr.countryCode || 'IN',
              country: addr.country || resolvedCountry || 'India',
              stateCode: addr.stateCode || '',
              state: addr.state || resolvedState || '',
              city: addr.city || '',
              zip: addr.zip || '',
              phone: data.phoneNumber
            }));
          }
        } catch (err) { console.error(err); }
      }
      setLoadingItems(false);
    };
    initData();
  }, [mode, user, legacyOrderData]);

  useEffect(() => {
    async function checkVerification() {
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists() && snap.data().phoneVerified) {
        setIsPhoneVerified(true);
      }
    }
    checkVerification();
  }, [user]);

  const handlePaymentSuccess = async (txnId: string) => {
    setIsProcessing(true);
    try {
      console.log(`Payment authorized (Txn: ${txnId}). Awaiting backend webhook verification.`);
      setShowStripeModal(false);
      clearCart();
      setShowSuccess(true);
    } catch (error) {
      console.error("Success handling failed:", error);
      navigate('/dashboard/orders');
    } finally {
      setIsProcessing(false);
    }
  };

  const countries = useMemo(() => {
    const allowedCodes = ['IN'];
    return Country.getAllCountries().filter(c => allowedCodes.includes(c.isoCode));
  }, []);

  const states = useMemo(() => {
    return shippingInfo.countryCode ? State.getStatesOfCountry(shippingInfo.countryCode) : [];
  }, [shippingInfo.countryCode]);

  const cities = useMemo(() => {
    return shippingInfo.stateCode ? City.getCitiesOfState(shippingInfo.countryCode, shippingInfo.stateCode) : [];
  }, [shippingInfo.countryCode, shippingInfo.stateCode]);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const currencySymbol = shippingInfo.countryCode === 'US' ? "$" : (shippingInfo.countryCode === 'GB' ? "£" : (['DE', 'FR', 'IT', 'ES', 'NL'].includes(shippingInfo.countryCode) ? "€" : (shippingInfo.countryCode === 'CA') ? "C$" : "₹"));

  // 🟢 Use the secure Math summary for the final checkouts
  const COD_FEE = 50;
  const totalPayAmount = paymentMethod === 'cod' ? summary.finalGrandTotal + COD_FEE : summary.finalGrandTotal;
  const basePayAmount = summary.mrpSubtotal;

  // ✅ FIX: Derive COD availability instantly without causing a re-render loop
  const isCODAvailable = summary.finalGrandTotal < 800;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShippingInfo({ ...shippingInfo, [e.target.name]: e.target.value });
  };

  const handleCountryChange = (value: string) => {
    const countryData = Country.getCountryByCode(value);
    setShippingInfo({
      ...shippingInfo,
      countryCode: value,
      country: countryData?.name || value,
      stateCode: '', state: '', city: ''
    });
  }
  const handleStateChange = (value: string) => {
    const stateData = State.getStateByCodeAndCountry(value, shippingInfo.countryCode);
    setShippingInfo({
      ...shippingInfo,
      stateCode: value,
      state: stateData?.name || value,
      city: ''
    });
  };
  const handleCityChange = (value: string) => setShippingInfo({ ...shippingInfo, city: value });

  const handlePlaceOrder = async () => {
    if (allocatedItems.length === 0) return;
    if (!shippingInfo.line1 || !shippingInfo.city || !shippingInfo.stateCode) {
      alert("Address incomplete."); return;
    }

    if (!isPhoneVerified) {
      toast.error("Please verify your phone number before placing the order.");
      return;
    }

    if (shippingInfo.countryCode === 'IN' && shippingInfo.gstNumber) {
      if (!GST_REGEX.test(shippingInfo.gstNumber)) {
        setGstError("Invalid Format. Ex: 22AAAAA0000A1Z5");
        toast.error("Please fix the GST Number");
        return;
      }
    }

    setIsProcessing(true);

    try {
      const generateCompactId = () => {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        return `ORD${timestamp}${random}`;
      };

      const checkoutGroupId = pendingOrderId || generateCompactId();
      if (!pendingOrderId) {
        setPendingOrderId(checkoutGroupId);
      }

      const createdOrderIds: string[] = [];
      const orderDocsPayload: any[] = [];

      // 🟢 CRITICAL: We now loop over the ALLOCATED ITEMS array
      const promises = allocatedItems.map(async (cartItem, index) => {

        const masterProduct = INITIAL_PRODUCTS.find(p => p.id === cartItem.productId);
        const enrichedItem = {
          ...cartItem,
          vendor_maps: masterProduct?.vendor_maps || {},
          print_areas: masterProduct?.print_areas || { front: { width: 4500, height: 5400 } }
        };

        const orderId = `${checkoutGroupId}${index + 1}`;
        createdOrderIds.push(orderId);

        let provider = 'gelato';
        if (shippingInfo.countryCode === 'IN') provider = 'qikink';
        if (shippingInfo.countryCode === 'US' || shippingInfo.countryCode === 'CA') provider = 'printful';

        // 🟢 NEW: Pull the perfectly calculated immutable ledger for this specific item
        const ledger = cartItem.ledger;

        const orderPayload = {
          orderId: orderId,
          groupId: checkoutGroupId,
          userId: user?.uid || 'guest',
          status: paymentMethod === 'cod' ? 'processing' : 'pending_payment',
          createdAt: serverTimestamp(),
          provider,
          shippingAddress: shippingInfo,

          // 🎁 We flag the first item so the webhook knows to reset the reward for the user
          referralDiscountApplied: isRewardValid && index === 0,

          payment: {
            method: paymentMethod,
            total: paymentMethod === 'cod' ? ledger.finalPaidPrice + (index === 0 ? COD_FEE : 0) : ledger.finalPaidPrice,      // 👈 Securely derived from the math engine
            cartTotal: summary.finalGrandTotal,
            codFee: paymentMethod === 'cod' && index === 0 ? COD_FEE : 0,
            currency: currencySymbol,
            status: paymentMethod === 'cod' ? 'pending_cod' : 'pending',
            ledger: ledger                     // 👈 Save the full financial breakdown to the DB!
          },
          ...enrichedItem
        };

        orderDocsPayload.push(orderPayload);
        return setDoc(doc(db, 'orders', orderId), orderPayload);
      });

      // 🔥 Start background writes concurrently without blocking the UI
      const orderWritePromise = Promise.all(promises);
      setPendingOrderId(checkoutGroupId);

      // ---------------------------------------------------------
      // 2. PAYMENT FLOWS
      // ---------------------------------------------------------
      if (paymentMethod === 'cod') {
        toast.loading("Finalizing cash order...", { id: 'save_cod' });
        await orderWritePromise;
        toast.dismiss('save_cod');
        clearCart();
        setShowSuccess(true);
      }
      else if (shippingInfo.countryCode === 'IN') {
        const loaded = await loadRazorpay();
        if (!loaded) throw new Error("Razorpay failed");

        const createRzpOrder = httpsCallable(functions, 'createRazorpayOrder');
        const { data }: any = await createRzpOrder({
          amount: summary.finalGrandTotal, // 🟢 Use safe summary
          currency: 'INR',
          applyReferralReward: isRewardValid,
          groupId: checkoutGroupId
        });

        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: "TRYAM",
          description: "Custom T-Shirt Order",
          order_id: data.orderId,
          handler: async function (response: any) {
            setIsProcessing(true);
            try {
              toast.loading("Securing order details... Please wait", { id: 'save_ui' });
              await orderWritePromise; // 🔥 Guarantee data is stored if user pays fast!
              toast.dismiss('save_ui');

              setShowSuccess(true);
              setTimeout(() => {
                navigate('/dashboard/orders');
              }, 3000);
            } catch (err) {
              toast.dismiss('save_ui');
              toast.error("Error finalizing order context. Wait a moment.");
              navigate('/dashboard/orders');
            } finally {
              setIsProcessing(false);
            }
          },
          prefill: {
            name: shippingInfo.fullName,
            email: shippingInfo.email,
            contact: shippingInfo.phone,
          },
          theme: { color: "#ea580c" },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
              setFailureReason("Payment was cancelled. You have not been charged.");
              setPaymentFailed(true);
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);

        rzp.on('payment.failed', function (response: any) {
          setIsProcessing(false);
          setFailureReason(response.error.description || "Payment failed. Please try again.");
          setPaymentFailed(true);
        });

        rzp.open();
        setIsProcessing(false); // Stop UI locking immediately to let users pay
      }
      else {
        const createStripe = httpsCallable(functions, 'createStripeIntent');
        const { data }: any = await createStripe({
          amount: summary.finalGrandTotal, // 🟢 Use safe summary
          currency: stripeCurrencyMap[shippingInfo.countryCode] || 'usd',
          groupId: checkoutGroupId,
          applyReferralReward: isRewardValid
        });

        toast.loading("Preparing secure checkout...", { id: 'save_stripe' });
        await orderWritePromise;
        toast.dismiss('save_stripe');

        setStripePromise(loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY));
        setStripeClientSecret(data.clientSecret);
        setShowStripeModal(true);
        setIsProcessing(false);
      }

    } catch (error) {
      console.error("Order Failed:", error);
      alert("Failed to place order.");
      setIsProcessing(false);
    }
  };

  const handleStripeSuccess = async (txnId: string) => {
    await handlePaymentSuccess(txnId);
  };

  if (loadingItems) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] text-white gap-4">
      <Loader2 className="animate-spin h-8 w-8 text-orange-500" />
      <p className="text-slate-400">Loading checkout...</p>
    </div>
  );

  return (
    <div className="min-h-screen relative pb-20 font-sans bg-[#0f172a] text-slate-100 selection:bg-orange-500/30">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <OrderSuccessOverlay />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 -z-10 w-full h-full bg-[#0f172a]">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] rounded-full bg-orange-600/5 blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-6 pb-24 lg:pb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 pl-0 text-slate-400 hover:text-white hover:bg-transparent group">
          <ChevronLeft className="mr-1 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-800/40 backdrop-blur-md border border-white/10 shadow-lg">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20">1</span>
                  Shipping Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Full Name</Label>
                    <Input name="fullName" value={shippingInfo.fullName} onChange={handleInputChange} className="bg-slate-900/50 border-white/10 text-white focus:border-orange-500/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Email</Label>
                    <Input name="email" disabled={true} value={shippingInfo.email || 'Email'} onChange={handleInputChange} className="bg-slate-900/50 border-white/10 text-white focus:border-orange-500/50" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-300">Phone</Label>
                      {shippingInfo.phone && (
                        isPhoneVerified ? (
                          <span className="text-xs text-green-400 flex items-center gap-1 font-medium"><CheckCircle2 className="h-3 w-3" /> Verified</span>
                        ) : (
                          <span className="text-xs text-red-400 flex items-center gap-1 font-medium animate-pulse"><AlertCircle className="h-3 w-3" /> Not Verified</span>
                        )
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        name="phone"
                        value={shippingInfo.phone}
                        onChange={(e) => {
                          handleInputChange(e);
                          if (isPhoneVerified) setIsPhoneVerified(false);
                        }}
                        className={`bg-slate-900/50 text-white flex-1 ${!isPhoneVerified && shippingInfo.phone ? 'border-red-500/50 focus:border-red-500/50' : 'border-white/10 focus:border-orange-500/50'}`}
                      />
                      {!isPhoneVerified && (
                        <Button
                          type="button"
                          onClick={() => setShowVerifyModal(true)}
                          disabled={!shippingInfo.phone || shippingInfo.phone.length < 10}
                          className="relative overflow-hidden group bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold shrink-0 shadow-[0_0_15px_rgba(234,88,12,0.2)] hover:shadow-[0_0_25px_rgba(234,88,12,0.4)] transition-all duration-300 border-0 h-10 px-5"
                        >
                          <span className="relative z-10 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4" /> Verify
                          </span>
                          <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300">Street Address</Label>
                  <Input name="line1" value={shippingInfo.line1} onChange={handleInputChange} placeholder="House No, Street, Landmark" className="bg-slate-900/50 border-white/10 text-white focus:border-orange-500/50" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 flex items-center justify-between">Country</Label>
                    <Select value={shippingInfo.countryCode} onValueChange={handleCountryChange}>
                      <SelectTrigger className={`bg-slate-900/50 border-white/10 text-white ${isLocationLocked ? "opacity-50 cursor-not-allowed" : ""} `}>
                        <SelectValue placeholder="Select Country" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border-white/10 max-h-64">
                        {countries.map((country) => (
                          <SelectItem key={country.isoCode} value={country.isoCode}>{country.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300">State / Province</Label>
                    <Select value={shippingInfo.stateCode} onValueChange={handleStateChange} disabled={!shippingInfo.countryCode}>
                      <SelectTrigger className="bg-slate-900/50 border-white/10 text-white"><SelectValue placeholder="Select State" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border-white/10 max-h-64">
                        {states.length > 0 ? (
                          states.map((state) => (
                            <SelectItem key={state.isoCode} value={state.isoCode}>{state.name}</SelectItem>
                          ))
                        ) : <div className="p-2 text-xs text-slate-500">No states found</div>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">City</Label>
                    <Select value={shippingInfo.city} onValueChange={handleCityChange} disabled={!shippingInfo.stateCode}>
                      <SelectTrigger className="bg-slate-900/50 border-white/10 text-white"><SelectValue placeholder="Select City" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border-white/10 max-h-64">
                        {cities.length > 0 ? (
                          cities.map((city) => (
                            <SelectItem key={city.name} value={city.name}>{city.name}</SelectItem>
                          ))
                        ) : <div className="p-2 text-xs text-slate-500">Select State First</div>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Zip Code</Label>
                    <Input name="zip" value={shippingInfo.zip} onChange={handleInputChange} className="bg-slate-900/50 border-white/10 text-white focus:border-orange-500/50" />
                  </div>
                </div>

                {shippingInfo.countryCode === 'IN' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-400 text-xs uppercase font-bold tracking-wider">GSTIN (Optional)</Label>
                      {shippingInfo.gstNumber && shippingInfo.gstNumber.length > 0 && (
                        GST_REGEX.test(shippingInfo.gstNumber) ? (
                          <span className="text-green-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Valid GST
                          </span>
                        ) : (
                          <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 animate-pulse">
                            <AlertCircle className="h-3 w-3" /> Invalid Format
                          </span>
                        )
                      )}
                    </div>
                    <Input
                      placeholder="Ex: 22AAAAA0000A1Z5"
                      value={shippingInfo.gstNumber}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/\space/g, '').replace(/\s/g, '');
                        setShippingInfo({ ...shippingInfo, gstNumber: val });
                        if (gstError) setGstError("");
                      }}
                      className={`bg-slate-950/50 text-white placeholder:text-slate-600 transition-colors ${!shippingInfo.gstNumber ? "border-white/10 focus:border-orange-500/50" :
                        GST_REGEX.test(shippingInfo.gstNumber) ? "border-green-500/50 focus:border-green-500/50 bg-green-500/5" :
                          "border-red-500/50 focus:border-red-500/50 bg-red-500/5"
                        }`}
                      maxLength={15}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800/40 backdrop-blur-md border border-white/10 shadow-lg overflow-hidden">
              <CardHeader className="border-b border-white/5 pb-4 bg-slate-900/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20">2</span>
                    Payment Method
                  </CardTitle>
                  <div className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                    <ShieldCheck className="h-3 w-3" /> Secure SSL
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">

                <div onClick={() => setPaymentMethod('online')} className={`relative p-5 min-h-[120px] border rounded-xl transition-all duration-200 group cursor-pointer ${paymentMethod === 'online' ? 'border-orange-500 bg-orange-500/5 ring-1 ring-orange-500/50' : 'border-white/10 hover:bg-white/5 hover:border-white/20'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl transition-colors ${paymentMethod === 'online' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800 text-slate-400'}`}>
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-bold text-lg ${paymentMethod === 'online' ? 'text-white' : 'text-slate-300'}`}>Pay Online</h3>
                        {paymentMethod === 'online' ? (
                          <CheckCircle2 className="text-orange-500 h-5 w-5" />
                        ) : (
                          <Badge variant="outline" className="bg-slate-950/50 border-orange-500/30 text-orange-500 text-[10px] uppercase">Recommended</Badge>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mb-3">Secure, encrypted payment via Razorpay / Stripe.</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-slate-900/50 border-white/10 text-slate-300 text-[10px] font-medium py-1 px-2 gap-1"><Globe className="w-3 h-3 text-blue-400" /> International</Badge>
                        <Badge variant="outline" className="bg-slate-900/50 border-white/10 text-slate-300 text-[10px] font-medium py-1 px-2 gap-1"><CreditCard className="w-3 h-3 text-purple-400" /> Visa / Master</Badge>
                        <Badge variant="outline" className="bg-slate-900/50 border-white/10 text-slate-300 text-[10px] font-medium py-1 px-2 gap-1"><Smartphone className="w-3 h-3 text-green-400" /> UPI / GPay</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                {isCODAvailable &&
                  <div onClick={() => setPaymentMethod('cod')} className={`relative p-5 border rounded-xl cursor-pointer transition-all duration-200 ${paymentMethod === 'cod' ? 'border-orange-500 bg-gradient-to-br from-orange-500/10 to-transparent ring-1 ring-orange-500/50' : 'border-white/10 hover:bg-white/5 hover:border-white/20'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl transition-colors ${paymentMethod === 'cod' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800 text-slate-400'}`}>
                        <Truck className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-bold text-lg ${paymentMethod === 'cod' ? 'text-white' : 'text-slate-300'}`}>Cash on Delivery</h3>
                          {paymentMethod === 'cod' && <CheckCircle2 className="text-orange-500 h-5 w-5" />}
                        </div>
                        <p className="text-slate-400 text-sm">Pay in cash when your order arrives.</p>
                      </div>
                    </div>
                  </div>}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="lg:sticky lg:top-6 border-white/10 bg-slate-800/60 backdrop-blur-xl shadow-2xl">
              <CardHeader className="border-b border-white/5 pb-4 bg-slate-900/30">
                <CardTitle className="text-white flex items-center gap-2 text-lg">
                  <ShoppingBag className="text-orange-400 h-5 w-5" /> Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">

                {/* 🟢 NEW: THE GAMIFICATION PROGRESS BAR */}
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

                <div className="space-y-4 mb-6 max-h-48 sm:max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {/* 🟢 Render from allocatedItems to ensure Ledger accuracy */}
                  {allocatedItems.map((item, idx) => (
                    <div key={idx} className="flex gap-4 border-b border-white/5 pb-4 last:border-0 last:pb-0">
                      <div className="h-14 w-14 rounded-lg overflow-hidden border border-white/10 shrink-0">
                        <img src={item.thumbnail} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="font-medium text-slate-200 text-sm truncate">{item.productTitle}</h4>

                        {/* 🟢 RESTORED: PriceDisplay showing MRP vs Our Price (Qty * Base Price) */}
                        <div className="flex justify-between mt-1 items-center">
                          <span className="text-xs text-slate-400">Qty: {item.quantity}</span>
                          <PriceDisplay
                            price={item.ledger.lineTotal} // Safe math: Base Price * Qty
                            currency={currencySymbol}
                            productId={item.productId}
                            size="sm"
                            align="right"
                          />
                        </div>

                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="bg-white/10 my-4" />

                {mode === 'direct' && hasActiveReward && (
                  <div className="flex items-center justify-between p-3 mb-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl shadow-[0_0_15px_rgba(234,88,12,0.1)]">
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

                {/* 🟢 NEW: TRANSPARENT MACRO RECEIPT TOTALS */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Subtotal ({summary.totalItems} items)</span>
                    <span>{currencySymbol}{summary.mrpSubtotal.toFixed(2)}</span>
                  </div>

                  {summary.totalBulkDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-400 font-medium">
                      <span>Bulk Savings ({discountPct * 100}%)</span>
                      <span>-{currencySymbol}{summary.totalBulkDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  {summary.totalReferralDiscount > 0 && (
                    <div className="flex justify-between text-sm text-orange-400 font-bold">
                      <span>Referral Reward</span>
                      <span>-{currencySymbol}{summary.totalReferralDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Shipping</span>
                    <span className="text-green-400">Free</span>
                  </div>

                  {paymentMethod === 'cod' && (
                    <div className="flex justify-between text-sm text-orange-400 font-medium animate-in fade-in slide-in-from-top-1">
                      <span>COD Handling Fee</span>
                      <span>+{currencySymbol}{COD_FEE.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <Separator className="bg-white/10 my-4" />

                <div className="flex justify-between text-xl font-bold text-white">
                  <span>Total</span>
                  <span className="text-orange-400">{currencySymbol}{totalPayAmount.toFixed(2)}</span>
                </div>

                {/* SAVINGS BADGE */}
                {(summary.totalBulkDiscount > 0 || summary.totalReferralDiscount > 0) && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-green-400 bg-green-500/10 py-2 rounded border border-green-500/20">
                    <Sparkles className="h-3 w-3" /> You saved {currencySymbol}{(summary.totalBulkDiscount + summary.totalReferralDiscount).toFixed(2)}!
                  </div>
                )}

                <div className="hidden lg:block">
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isProcessing || items.length === 0 || (paymentMethod === 'cod' && !isCODAvailable) || paymentMethod === 'online'}
                    className="w-full mt-6 h-14 sm:h-12 text-base sm:text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-lg shadow-orange-900/20 transition-all hover:scale-[1.02]"
                  >
                    {isProcessing ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Processing...</> :
                      (paymentMethod === 'cod' ?
                        (!isCODAvailable ? 'COD Limit Exceeded' : 'Place Order') :
                        'Online Payment Unavailable'
                      )
                    }
                  </Button>
                  {paymentMethod === 'cod' && !isCODAvailable && (
                    <p className="text-[10px] text-red-400 text-center mt-2 italic">COD is only available for orders below {currencySymbol}800. Please reduce cart value or wait for online payments.</p>
                  )}
                </div>

                {shippingInfo.city && shippingInfo.stateCode && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-[11px] sm:text-xs text-green-400 bg-green-900/20 py-2 rounded border border-green-500/20">
                    <MapPin className="h-3 w-3" /> Delivering to: {shippingInfo.city}, {shippingInfo.countryCode}
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={showStripeModal} onOpenChange={setShowStripeModal}>
              <DialogContent className="bg-slate-900 text-white border-white/10">
                <DialogHeader><DialogTitle>Secure Payment</DialogTitle></DialogHeader>
                {stripeClientSecret && stripePromise && (
                  <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret, appearance: { theme: 'night' } }}>
                    <StripeCheckoutForm
                      clientSecret={stripeClientSecret}
                      shippingInfo={shippingInfo}
                      onSuccess={handleStripeSuccess}
                      onError={(errMsg: string) => {
                        setShowStripeModal(false);
                        setFailureReason(errMsg);
                        setPaymentFailed(true);
                      }}
                    />
                  </Elements>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="bg-white/5 backdrop-blur-2xl border-t border-white/10 shadow-[0_-8px_40px_rgba(0,0,0,0.6)]">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] uppercase tracking-widest text-slate-400">Total</span>
              <span className="text-lg font-bold text-white">{currencySymbol}{totalPayAmount.toFixed(2)}</span>
            </div>
            <Button
              onClick={handlePlaceOrder}
              disabled={isProcessing || items.length === 0 || (paymentMethod === 'cod' && !isCODAvailable) || paymentMethod === 'online'}
              className="h-12 px-6 text-base font-bold rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-lg shadow-orange-900/40 transition-all duration-200 hover:scale-[1.02]"
            >
              {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : (paymentMethod === 'cod' ? (isCODAvailable ? "Place Order" : "Limit Exceeded") : "Unavailable")}
            </Button>
          </div>
        </div>
      </div>

      <PhoneVerificationModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        onVerified={(verifiedPhone) => {
          setIsPhoneVerified(true);
          setShippingInfo(prev => ({ ...prev, phone: verifiedPhone }))
        }}
        phoneNumber={shippingInfo.phone}
      />

      {paymentFailed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl shadow-red-900/20 max-w-sm w-full p-8 text-center flex flex-col items-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/10 rounded-full blur-[40px]" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-500/10 rounded-full blur-[40px]" />
            <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
              <div className="relative bg-slate-800 rounded-full p-4 border-2 border-red-500/50">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Payment Failed</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">{failureReason}</p>
            <div className="flex flex-col gap-3 w-full relative z-10">
              <Button onClick={() => setPaymentFailed(false)} className="w-full h-12 text-base font-bold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-lg text-white rounded-xl border-0">
                Try Again
              </Button>
              <Button variant="ghost" onClick={() => { setPaymentFailed(false); navigate('/dashboard/cart'); }} className="w-full h-12 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl">
                Back to Cart
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}