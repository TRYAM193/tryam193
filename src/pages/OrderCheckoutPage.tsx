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
  Sparkles, Zap, XCircle
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { calculatePriceDetails } from "@/lib/priceUtils";
import { PriceDisplay } from "@/components/PriceDisplay";

const StripeCheckoutForm = ({ clientSecret, shippingInfo, onSuccess, onError }: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: any) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);

    // Modern Stripe Confirmation for PaymentElement
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
      redirect: 'if_required' // Prevents Stripe from navigating away from your React app
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
  // Inside your component...
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
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false); // Local state fallback
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [failureReason, setFailureReason] = useState("");

  const [isCODAvailable, setIsCODAvailable] = useState(true)
  // Regex for Indian GSTIN
  const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const [gstError, setGstError] = useState("");

  const stripeCurrencyMap: Record<string, string> = {
    US: 'usd',
    GB: 'gbp',
    DE: 'eur',
    FR: 'eur',
    IT: 'eur',
    ES: 'eur',
    NL: 'eur',
    CA: 'cad'
  }

  const checkoutAnalysis = items.reduce((acc, item) => {
    const { originalPrice, savings } = calculatePriceDetails(item.price, item.productId);
    acc.totalMRP += (originalPrice * item.quantity);
    acc.totalSavings += (savings * item.quantity);
    return acc;
  }, { totalMRP: 0, totalSavings: 0 });


  // Check verification on load (From User Profile)
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
  // 🔒 Location Lock State
  const [isLocationLocked, setIsLocationLocked] = useState(false);

  const [stripePromise, setStripePromise] = useState<any>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState('');
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState('');
  const email = user?.email
  // Shipping State
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
    if (email) setShippingInfo({ ...shippingInfo, email: user.email })
  }, [user])

  // 1. Fetch Items & User Profile
  useEffect(() => {
    const initData = async () => {
      setLoadingItems(true);

      // Load Cart/Items
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

      // Load Saved Address
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
              // We will override this below if IP check passes
              countryCode: addr.countryCode || 'IN',
              country: addr.country || resolvedCountry || 'India', // ✅ Load or Resolve

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

  // ---------------------------------------------------------
  // ✅ UNIVERSAL SUCCESS HANDLER (Updates DB Client-Side)
  // ---------------------------------------------------------
  const handlePaymentSuccess = async (txnId: string) => {
    setIsProcessing(true);
    try {
      // 🛑 We NO LONGER update the database here!
      // The secure Razorpay/Stripe webhooks in the backend will mark it 'paid'
      console.log(`Payment authorized (Txn: ${txnId}). Awaiting backend webhook verification.`);

      // 1. Clean up the modals and cart
      setShowStripeModal(false);
      clearCart();

      // 2. Trigger the celebration overlay (which auto-redirects after 3 seconds!)
      setShowSuccess(true);

    } catch (error) {
      console.error("Success handling failed:", error);
      navigate('/dashboard/orders');
    } finally {
      setIsProcessing(false);
    }
  };

  // // 2. 🌍 IP Geolocation & Restriction Logic
  // useEffect(() => {
  //   // Only fetch if we haven't locked it yet
  //   const fetchLocation = async () => {
  //     try {
  //       const res = await fetch('https://ipapi.co/json/');
  //       const data = await res.json();

  //       // Logic: If user is in India, Force India.
  //       // You can add 'OR data.country_code === "US"' if you want to lock US users too.
  //       if (data.country_code === 'IN') {
  //         setShippingInfo(prev => ({
  //           ...prev,
  //           countryCode: 'IN',
  //           country: 'India', // ✅ Explicitly set name

  //           // Only clear state if we switched countries
  //           stateCode: prev.countryCode !== 'IN' ? '' : prev.stateCode,
  //           state: prev.countryCode !== 'IN' ? '' : prev.state,
  //           city: prev.countryCode !== 'IN' ? '' : prev.city
  //         }));
  //         setIsLocationLocked(true);
  //       }
  //     } catch (error) {
  //       console.warn("Could not fetch IP location, defaulting to open selection.");
  //     }
  //   };

  //   // fetchLocation();
  // }, []);

  // --- LOCATION LIBRARIES ---
  const countries = useMemo(() => {
    const allowedCodes = ['IN', 'US', 'GB', 'CA'];
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

  // Currency Logic
  const currencySymbol = shippingInfo.countryCode === 'US' ? "$" : (shippingInfo.countryCode === 'GB' ? "£" : (['DE', 'FR', 'IT', 'ES', 'NL'].includes(shippingInfo.countryCode) ? "€" : (shippingInfo.countryCode === 'CA') ? "C$" : "₹"));
  const basePayAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const isRewardValid = applyReward && hasActiveReward;
  const totalPayAmount = isRewardValid ? Math.max(0, basePayAmount - 100) : basePayAmount;

  if (totalPayAmount >= 3000) setIsCODAvailable(false)

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShippingInfo({ ...shippingInfo, [e.target.name]: e.target.value });
  };

  const handleCountryChange = (value: string) => {
    // 1. Find the Name object from the library
    const countryData = Country.getCountryByCode(value);

    setShippingInfo({
      ...shippingInfo,
      countryCode: value,
      country: countryData?.name || value, // ✅ Save Name

      // Reset State/City when country changes
      stateCode: '',
      state: '',
      city: ''
    });
  }
  const handleStateChange = (value: string) => {
    // 1. Find the Name object
    const stateData = State.getStateByCodeAndCountry(value, shippingInfo.countryCode);

    setShippingInfo({
      ...shippingInfo,
      stateCode: value,
      state: stateData?.name || value, // ✅ Save Name
      city: ''
    });
  };
  const handleCityChange = (value: string) => setShippingInfo({ ...shippingInfo, city: value });

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    if (!shippingInfo.line1 || !shippingInfo.city || !shippingInfo.stateCode) {
      alert("Address incomplete."); return;
    }
    // if (!isPhoneVerified) {
    //   setShowVerifyModal(true); return;
    // }

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

      // 🛑 CRITICAL FIX: Reuse the existing Group ID if they are retrying a failed payment
      const checkoutGroupId = pendingOrderId || generateCompactId();
      
      // Save it to state so we remember it on the next click
      if (!pendingOrderId) {
        setPendingOrderId(checkoutGroupId);
      }

      const createdOrderIds: string[] = [];
      const orderDocsPayload: any[] = []; // We keep this to send to the invoice function later

      // 1. CREATE SPLIT ORDERS (One per Item Line)
      const promises = items.map(async (cartItem, index) => {

        // 1. Enrich
        const masterProduct = INITIAL_PRODUCTS.find(p => p.id === cartItem.productId);
        const enrichedItem = {
          ...cartItem,
          vendor_maps: masterProduct?.vendor_maps || {},
          print_areas: masterProduct?.print_areas || { front: { width: 4500, height: 5400 } }
        };

        // 2. IDs & Provider
        const orderId = `${checkoutGroupId}${index + 1}`;
        createdOrderIds.push(orderId);

        let provider = 'gelato';
        if (shippingInfo.countryCode === 'IN') provider = 'qikink';
        if (shippingInfo.countryCode === 'US' || shippingInfo.countryCode === 'CA') provider = 'printful';

        // 🧮 3. NEW MATH: Anchor the discount to the FIRST item only
        const isFirstItem = index === 0;
        const appliesToThisItem = isRewardValid && isFirstItem;

        // Calculate what THIS specific item costs
        const itemBasePrice = cartItem.price * cartItem.quantity;
        // If it's the anchor item, deduct the ₹100 from its total
        const itemFinalPrice = appliesToThisItem ? Math.max(0, itemBasePrice - 100) : itemBasePrice;

        // 4. FLATTENED PAYLOAD
        const orderPayload = {
          // A. Order Meta
          orderId: orderId,
          groupId: checkoutGroupId,
          userId: user?.uid || 'guest',
          status: paymentMethod === 'cod' ? 'processing' : 'pending_payment',
          createdAt: serverTimestamp(),
          provider,
          shippingAddress: shippingInfo,

          // 🎁 ONLY the first item gets the true flag!
          referralDiscountApplied: appliesToThisItem,

          payment: {
            method: paymentMethod,
            total: itemFinalPrice,        // 👈 What THIS specific split-order costs
            cartTotal: totalPayAmount,    // 👈 Keeping the overall cart total for reference
            currency: currencySymbol,
            status: paymentMethod === 'cod' ? 'pending_cod' : 'pending'
          },
          ...enrichedItem
        };

        orderDocsPayload.push(orderPayload);
        return setDoc(doc(db, 'orders', orderId), orderPayload);
      });

      await Promise.all(promises);
      setPendingOrderId(checkoutGroupId); // We track Group ID now, not single Order ID

      // ---------------------------------------------------------
      // 2. PAYMENT FLOWS
      // ---------------------------------------------------------

      // A. CASH ON DELIVERY (India)
      if (paymentMethod === 'cod') {
        clearCart();
        setShowSuccess(true);
      }

      // B. RAZORPAY (India Online)
      else if (shippingInfo.countryCode === 'IN') {
        const loaded = await loadRazorpay();
        if (!loaded) throw new Error("Razorpay failed");

        const createRzpOrder = httpsCallable(functions, 'createRazorpayOrder');
        const { data }: any = await createRzpOrder({ 
          amount: basePayAmount, 
          currency: 'INR', 
          applyReferralReward: isRewardValid,
          groupId: checkoutGroupId // 👈 Pass the Group ID to the backend
        });

        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: "TRYAM",
          description: "Custom T-Shirt Order",
          order_id: data.orderId,
          handler: async function (response: any) {
            // ✅ SUCCESS
            setIsProcessing(false);
            setShowSuccess(true);
            setTimeout(() => {
              navigate('/dashboard/orders');
            }, 3000);
          },
          prefill: {
            name: shippingInfo.fullName,
            email: shippingInfo.email,
            contact: shippingInfo.phone,
          },
          theme: { color: "#ea580c" },
          modal: {
            ondismiss: function () {
              // 🔴 USER CLOSED THE POPUP
              setIsProcessing(false);
              setFailureReason("Payment was cancelled. You have not been charged.");
              setPaymentFailed(true);
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);

        // 🔴 BANK DECLINED / TIMEOUT / WRONG OTP
        rzp.on('payment.failed', function (response: any) {
          setIsProcessing(false);
          setFailureReason(response.error.description || "Payment failed. Please try again.");
          setPaymentFailed(true);
        });

        rzp.open();
        setIsProcessing(false);
      }

      // C. STRIPE (International)
      else {
        const createStripe = httpsCallable(functions, 'createStripeIntent');
        const { data }: any = await createStripe({
          amount: basePayAmount,
          currency: stripeCurrencyMap[shippingInfo.countryCode] || 'usd',
          groupId: checkoutGroupId,
          applyReferralReward: isRewardValid
        });

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

  // C. Stripe Success Handler
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

      {/* Background */}
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
            {/* SHIPPING DETAILS */}
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
                    {/* ✅ Added text-white to all Inputs */}
                    <Input name="fullName" value={shippingInfo.fullName} onChange={handleInputChange} className="bg-slate-900/50 border-white/10 text-white focus:border-orange-500/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Email</Label>
                    <Input name="email" value={shippingInfo.email || 'Email'} onChange={handleInputChange} className="bg-slate-900/50 border-white/10 text-white focus:border-orange-500/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Phone</Label>
                    <Input name="phone" value={shippingInfo.phone} onChange={handleInputChange} className="bg-slate-900/50 border-white/10 text-white focus:border-orange-500/50" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300">Street Address</Label>
                  <Input name="line1" value={shippingInfo.line1} onChange={handleInputChange} placeholder="House No, Street, Landmark" className="bg-slate-900/50 border-white/10 text-white focus:border-orange-500/50" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 flex items-center justify-between">
                      Country
                    </Label>

                    {/* 🔒 Locked Select if isLocationLocked is true */}
                    <Select
                      value={shippingInfo.countryCode}
                      onValueChange={handleCountryChange}
                    // disabled={isLocationLocked}
                    >
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
                      {/* 🔴 ERROR INDICATOR */}
                      {gstError && (
                        <span className="text-red-400 text-xs flex items-center gap-1 animate-pulse">
                          <AlertCircle className="h-3 w-3" /> {gstError}
                        </span>
                      )}
                    </div>
                    <Input
                      placeholder="Ex: 22AAAAA0000A1Z5"
                      value={shippingInfo.gstNumber}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/\s/g, '');
                        setShippingInfo({ ...shippingInfo, gstNumber: val });
                        if (gstError) setGstError(""); // Clear error on type
                      }}
                      // 🔴 RED BORDER IF ERROR
                      className={`bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500/50 ${gstError ? "border-red-500 focus:border-red-500" : ""}`}
                      maxLength={15}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PAYMENT METHOD */}
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
                {/* Pay Online */}
                <div onClick={() => setPaymentMethod('online')} className={`relative p-5  min-h-[120px] border rounded-xl cursor-pointer transition-all duration-200 group ${paymentMethod === 'online' ? 'border-orange-500 bg-gradient-to-br from-orange-500/10 to-transparent ring-1 ring-orange-500/50' : 'border-white/10 hover:bg-white/5 hover:border-white/20'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl transition-colors ${paymentMethod === 'online' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800 text-slate-400'}`}>
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-bold text-lg ${paymentMethod === 'online' ? 'text-white' : 'text-slate-300'}`}>Pay Online</h3>
                        {paymentMethod === 'online' && <CheckCircle2 className="text-orange-500 h-5 w-5" />}
                      </div>
                      <p className="text-slate-400 text-sm mb-3">Instant & Secure. Support for all major methods.</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-slate-900/50 border-white/10 text-slate-300 text-[10px] font-medium py-1 px-2 gap-1"><Globe className="w-3 h-3 text-blue-400" /> International</Badge>
                        <Badge variant="outline" className="bg-slate-900/50 border-white/10 text-slate-300 text-[10px] font-medium py-1 px-2 gap-1"><CreditCard className="w-3 h-3 text-purple-400" /> Visa / Master</Badge>
                        <Badge variant="outline" className="bg-slate-900/50 border-white/10 text-slate-300 text-[10px] font-medium py-1 px-2 gap-1"><Smartphone className="w-3 h-3 text-green-400" /> UPI / GPay</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                {/* COD */}
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

          {/* SUMMARY */}
          <div className="lg:col-span-1">
            <Card className="lg:sticky lg:top-6 border-white/10 bg-slate-800/60 backdrop-blur-xl shadow-2xl">
              <CardHeader className="border-b border-white/5 pb-4 bg-slate-900/30">
                <CardTitle className="text-white flex items-center gap-2 text-lg">
                  <ShoppingBag className="text-orange-400 h-5 w-5" /> Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4 mb-6 max-h-48 sm:max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-4 border-b border-white/5 pb-4 last:border-0 last:pb-0">
                      <div className="h-14 w-14 rounded-lg overflow-hidden border border-white/10 shrink-0">
                        <img src={item.thumbnail} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                      {/* Inside the items.map loop */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="font-medium text-slate-200 text-sm truncate">{item.productTitle}</h4>

                        {/* NEW PRICE DISPLAY */}
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-slate-400">Qty: {item.quantity}</span>
                          <PriceDisplay
                            price={item.price * item.quantity}
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

                {/* 🎁 REWARD TOGGLE (Only for Direct Mode) */}
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

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Total MRP</span>
                    <span className="line-through">{currencySymbol}{checkoutAnalysis.totalMRP.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-400 font-medium">
                    <span>Discount</span>
                    <span>-{currencySymbol}{checkoutAnalysis.totalSavings.toFixed(2)}</span>
                  </div>

                  {/* 🎁 REWARD LINE ITEM */}
                  {isRewardValid && (
                    <div className="flex justify-between text-sm text-orange-400 font-bold">
                      <span>Referral Reward</span>
                      <span>-{currencySymbol}100.00</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Shipping</span>
                    <span className="text-green-400">Free</span>
                  </div>

                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Incl. of Tax</span>
                  </div>

                  <Separator className="bg-white/10 my-2" />

                  <div className="flex justify-between text-xl font-bold text-white">
                    <span>Total</span>
                    <span>{currencySymbol}{totalPayAmount.toFixed(2)}</span>
                  </div>

                  {/* SAVINGS BADGE */}
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-green-400 bg-green-500/10 py-2 rounded border border-green-500/20">
                    <Sparkles className="h-3 w-3" /> You saved {currencySymbol}{checkoutAnalysis.totalSavings.toFixed(2)}!
                  </div>
                </div>
                <div className="hidden lg:block">
                  <Button onClick={handlePlaceOrder} disabled={isProcessing} className="w-full mt-6 h-14 sm:h-12 text-base sm:text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 font-bold shadow-lg shadow-orange-900/20 transition-all hover:scale-[1.02]">
                    {isProcessing ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Processing...</> : (paymentMethod === 'cod' ? 'Place Order' : `Pay ${currencySymbol}${totalPayAmount.toFixed(2)}`)}
                  </Button>
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
      {/* 📱 Mobile Sticky Pay Bar */}
      {/* 📱 Mobile Glass Pay Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div
          className="
      bg-white/5
      backdrop-blur-2xl
      border-t border-white/10
      shadow-[0_-8px_40px_rgba(0,0,0,0.6)]
    "
        >
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

            {/* 💰 Price Info */}
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] uppercase tracking-widest text-slate-400">
                Total
              </span>
              <span className="text-lg font-bold text-white">
                {currencySymbol}{totalPayAmount.toFixed(2)}
              </span>
            </div>

            {/* 🔥 Pay Button */}
            <Button
              onClick={handlePlaceOrder}
              disabled={isProcessing}
              className="
          h-12 px-6 text-base font-bold rounded-2xl
          bg-gradient-to-r from-orange-600 to-red-600
          hover:from-orange-500 hover:to-red-500
          shadow-lg shadow-orange-900/40
          transition-all duration-200
          hover:scale-[1.02]
        "
            >
              {isProcessing ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : paymentMethod === "cod" ? (
                "Place Order"
              ) : (
                "Pay Now"
              )}
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
            {/* Background Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/10 rounded-full blur-[40px]" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-500/10 rounded-full blur-[40px]" />

            {/* Icon */}
            <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
              <div className="relative bg-slate-800 rounded-full p-4 border-2 border-red-500/50">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
            </div>

            {/* Text */}
            <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Payment Failed</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              {failureReason}
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-3 w-full relative z-10">
              <Button
                onClick={() => setPaymentFailed(false)}
                className="w-full h-12 text-base font-bold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-lg text-white rounded-xl border-0"
              >
                Try Again
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setPaymentFailed(false);
                  navigate('/cart');
                }}
                className="w-full h-12 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl"
              >
                Back to Cart
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ${isLocationLocked ? "opacity-50 cursor-not-allowed" : ""}