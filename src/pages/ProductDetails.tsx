import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { doc, getDoc, collection, query, orderBy, getDocs, limit, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Paintbrush, ChevronRight, Check, Truck, Star, ShieldCheck, Globe, Sparkles, Droplets, Wind, Palette, Shield, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { COLOR_MAP } from "@/lib/colorMaps";
import { FiCheckCircle } from "react-icons/fi";
import { Skeleton } from "@/components/ui/skeleton";
import { getRegionFromIP } from "@/lib/ipDetect";
import { useAuth } from '@/hooks/use-auth';
import { PriceDisplay } from "@/components/PriceDisplay";

// ✅ Interface matches our 'initialProducts.ts' structure
interface ProductVariants {
    colors: string[]
    sizes: string[]
    sizeChart?: Record<string, number[]>;
}

interface ProductData {
    id: string;
    title: string;
    description: string;
    image: string | null;
    image1: string | null
    category: string;
    price: {
        IN: number;
        US: number;
        GB: number;
        EU: number;
        CA: number;
    };
    mockups?: {
        front?: string;
        back?: string;
        left?: string;
        right?: string;
    };
    variants: {
        qikink: ProductVariants,
        printify?: ProductVariants,
        gelato?: ProductVariants
    }
}

export default function ProductDetails() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const [product, setProduct] = useState<ProductData | null>(null);
    const [loading, setLoading] = useState(true);
    const [colors, setColors] = useState<string[]>([])
    const [sizes, setSizes] = useState<string[]>([])

    // Selection States
    const [selectedColor, setSelectedColor] = useState<string>("White");
    const [selectedSize, setSelectedSize] = useState<string>("S");
    const [activeImage, setActiveImage] = useState<string>("");

    // Size Chart States
    const [activeSizeChart, setActiveSizeChart] = useState<Record<string, number[]> | null>(null);
    const [showSizeChart, setShowSizeChart] = useState(false);

    // ✅ Region State
    const [region, setRegion] = useState<"IN" | "US" | "GB" | "EU" | "CA">("IN");
    const [checkingLocation, setCheckingLocation] = useState(false);

    // Reviews
    const [reviews, setReviews] = useState<any[]>([])
    const [reviewsLoading, setReviewsLoading] = useState(false)

    const [showReviewModal, setShowReviewModal] = useState(false)
    const [rating, setRating] = useState(0)
    const [name, setName] = useState("")
    const [comment, setComment] = useState("")
    const [aiLoading, setAiLoading] = useState(false)
    const [autoReviewCount, setAutoReviewCount] = useState(0)
    const [isDescExpanded, setIsDescExpanded] = useState(false);

    const AUTO_REVIEW_MAP: Record<number, string[]> = {
        5: [
            "Absolutely loved this product! The quality exceeded my expectations and the fit was perfect.",
            "Amazing quality and design. Totally worth the purchase and I’d definitely recommend it.",
        ],
        4: [
            "Really good product overall. Quality is great, just a small improvement could make it perfect.",
            "Nice fit and material. Happy with the purchase and would buy again.",
        ],
        3: [
            "Decent product. It does the job, though there’s room for improvement in some areas.",
            "Average experience. Not bad, but not outstanding either.",
        ],
        2: [
            "The product was okay but didn’t fully meet my expectations.",
            "Quality could be improved. Hoping for better refinement in the future.",
        ],
        1: [
            "Unfortunately, this product didn’t meet my expectations.",
            "Not satisfied with the overall quality. Could be improved significantly.",
        ],
    }



    const totalReviews = reviews.length

    const averageRating =
        totalReviews > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
            : 0



    const currencyConfig = {
        IN: { symbol: "₹", label: "INR" },
        US: { symbol: "$", label: "USD" },
        GB: { symbol: "£", label: "GBP" },
        EU: { symbol: "€", label: "EUR" },
        CA: { symbol: "C$", label: "CAD" },
    };

    const fetchReviews = async () => {
        if (!productId) return
        if (!user) return
        setReviewsLoading(true)

        try {
            const q = query(
                collection(db, "base_products", productId, "reviews"),
                orderBy("createdAt", "desc"),
                limit(10)
            )
            const snap = await getDocs(q)
            setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        } catch (error) {
            console.error("Error fetching reviews", error)
        } finally {
            setReviewsLoading(false)
        }
    }
    // 1️⃣ Fetch Product Data
    useEffect(() => {
        async function fetchProduct() {
            if (!productId) return;
            try {
                const docRef = doc(db, "base_products", productId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data() as ProductData;
                    setProduct(data);

                    const initialImg = data.mockups?.front || data.image || "";
                    setActiveImage(initialImg);

                    if (region === 'IN') {
                        setColors(data.variants.qikink.colors)
                        setSizes(data.variants.qikink.sizes)
                        setActiveSizeChart(data.variants.qikink.sizeChart || null);
                    }
                    else if (region === 'US' || region === 'CA') {
                        setColors(data.variants.gelato?.colors || [])
                        setSizes(data.variants.gelato?.sizes || [])
                        setActiveSizeChart(data.variants.gelato?.sizeChart || null);
                    }
                    else {
                        setColors(data.variants.printify?.colors || [])
                        setSizes(data.variants.printify?.sizes || [])
                        setActiveSizeChart(data.variants.printify?.sizeChart || null);
                    }

                    if (colors.length > 0) setSelectedColor(colors[0]);
                    if (sizes.length > 0) setSelectedSize(sizes[0]);
                }
            } catch (error) {
                console.error("Error loading product", error);
                toast.error("Failed to load product details.");
            } finally {
                setLoading(false);
            }
        }
        fetchProduct();
        fetchReviews();
    }, [productId, region]);

    // 2️⃣ Automatic IP-Based Region Detection
    // useEffect(() => {
    //     async function detectRegion() {
    //         const data = location.state as { region?: string };
    //         if (data?.region && ["IN", "US", "GB", "CA"].includes(data.region)) {
    //             setRegion(data.region as "IN" | "US" | "GB" | "CA");
    //             setCheckingLocation(false);
    //             return;
    //         }

    //         try {
    //             const regionFromIp = await getRegionFromIP();
    //             setRegion(regionFromIp);
    //         } catch (error) {
    //             console.warn("Could not detect location, defaulting to IN");
    //             setRegion("IN");
    //         } finally {
    //             setCheckingLocation(false);
    //         }

    //     }
    //     detectRegion();
    // }, []);

    const handleStartDesigning = () => {
        if (!product) return;
        if (!selectedColor || !selectedSize) {
            toast.error("Please select a color and size first.");
            return;
        }
        localStorage.setItem('region', region);
        window.open(`/design?product=${product.id}&color=${selectedColor}&size=${selectedSize}&region=${region}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#090A0F] text-slate-200">
                <div className="p-4 border-b border-white/5 flex justify-between items-center px-4 md:px-10">
                    <Skeleton className="w-32 h-6 bg-white/5" />
                    <Skeleton className="w-8 h-8 rounded-full bg-white/5" />
                </div>
                <div className="max-w-7xl mx-auto p-6 md:p-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        {/* Left: Image Skeleton */}
                        <Skeleton className="aspect-[3/4] rounded-2xl bg-white/5 w-full" />
                        {/* Right: Details Skeleton */}
                        <div className="space-y-8 pt-4">
                            <div className="flex justify-between">
                                <Skeleton className="w-24 h-6 rounded-full bg-white/5" />
                                <Skeleton className="w-32 h-8 rounded-full bg-white/5" />
                            </div>
                            <Skeleton className="w-3/4 h-12 bg-white/5" /> {/* Title */}
                            <div className="space-y-2">
                                <Skeleton className="w-full h-4 bg-white/5" />
                                <Skeleton className="w-full h-4 bg-white/5" />
                                <Skeleton className="w-2/3 h-4 bg-white/5" />
                            </div>
                            <Skeleton className="w-40 h-12 bg-white/5" /> {/* Price */}
                            <Separator className="bg-white/5" />
                            <div className="space-y-4">
                                <Skeleton className="w-20 h-4 bg-white/5" />
                                <div className="flex gap-3">
                                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="w-10 h-10 rounded-full bg-white/5" />)}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <Skeleton className="w-20 h-4 bg-white/5" />
                                <div className="grid grid-cols-5 gap-3">
                                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 rounded-xl bg-white/5" />)}
                                </div>
                            </div>
                            <Skeleton className="w-full h-16 rounded-lg bg-white/5" /> {/* Button */}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
    if (!product) return <div className="h-screen flex items-center justify-center bg-[#090A0F] text-slate-400">Product not found</div>;

    const handleSubmitReview = async () => {
        if (!productId) return

        if (!user) {
            toast.error("You must be logged in to submit a review")
            return
        }

        if (rating === 0) {
            toast.error("Please select a rating")
            return
        }

        if (comment.trim().length < 20) {
            toast.error("Review must be at least 20 characters")
            return
        }

        const reviewRef = doc(
            db,
            "base_products",
            productId,
            "reviews",
            user.uid // 🔐 ONE review per user
        )

        await setDoc(reviewRef, {
            userId: user.uid,
            rating,
            name: name || user.displayName || "Anonymous",
            comment,
            verified: false,
            createdAt: serverTimestamp(),
        })

        toast.success("Thank you for your review!")

        setRating(0)
        setName("")
        setComment("")
        setAutoReviewCount(0)
        setShowReviewModal(false)

        fetchReviews()
    }

    const handleAutoReview = () => {
        if (rating === 0) {
            toast.error("Please select a rating first")
            return
        }

        if (autoReviewCount >= 2) {
            toast.info("Auto review limit reached")
            return
        }

        setAiLoading(true)

        setTimeout(() => {
            const options = AUTO_REVIEW_MAP[rating]
            const randomText =
                options[autoReviewCount]

            setComment(randomText)
            setAutoReviewCount((prev) => prev + 1)
            setAiLoading(false)
        }, 200)
    }

    const handleClose = () => {
        setShowReviewModal(false)
        setAutoReviewCount(0)
        setComment('')
        setRating(0)
    }


    const galleryImages = [
        product.mockups?.front,
        product.mockups?.back,
        product.mockups?.left,
        product.mockups?.right,
        product.image,
        product.image1
    ].filter(Boolean) as string[];

    const uniqueGallery = [...new Set(galleryImages)];
    const currentPrice = product.price[region] || product.price.US;
    const currentSymbol = currencyConfig[region].symbol;

    return (
        // 🌌 COSMIC BACKGROUND
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1B2735] via-[#090A0F] to-[#000000] text-slate-200">

            {/* GLASS HEADER */}
            <div className="p-4 border-b border-white/5 sticky top-0 bg-[#090A0F]/80 backdrop-blur-xl z-20 flex justify-between items-center px-4 md:px-10 shadow-lg shadow-black/50">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="cursor-pointer hover:text-orange-400 transition-colors" onClick={() => navigate("/store")}>Store</span>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                    <span className="capitalize text-slate-200 font-medium tracking-wide">{product.category}</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 md:p-12">
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16">

                    {/* 📸 LEFT: GALACTIC IMAGE DISPLAY */}
                    <div className="space-y-6">
                        <div className="aspect-[4/5] sm:aspect-[3/4] bg-white/5 rounded-2xl overflow-hidden border border-white/10 relative shadow-[0_0_60px_-15px_rgba(99,102,241,0.15)] group">
                            <img
                                src={activeImage || "https://placehold.co/600x800?text=No+Image"}
                                alt={product.title}
                                className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                            />
                        </div>
                        {uniqueGallery.length > 1 && (
                            <div className="flex gap-4 snap-x snap-mandatory pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                {uniqueGallery.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImage(img)}
                                        className={cn(
                                            "w-16 h-16 sm:w-20 sm:h-20 snap-start rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all duration-300",
                                            activeImage === img
                                                ? "border-orange-500 shadow-[0_0_15px_-3px_rgba(249,115,22,0.5)] scale-105"
                                                : "border-white/5 hover:border-white/20 bg-white/5"
                                        )}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 🔮 RIGHT: MYSTICAL DETAILS */}
                    <div className="space-y-8 lg:pt-4">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="text-indigo-300 border-indigo-500/30 bg-indigo-500/10 capitalize px-3 py-1">
                                        {product.category}
                                    </Badge>
                                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20">
                                        <Check size={12} strokeWidth={3} /> In Stock
                                    </span>
                                </div>

                                {!checkingLocation && (
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                        <Globe className="w-3.5 h-3.5 text-indigo-400" />
                                        <span>{currencyConfig[region].label}</span>
                                    </div>
                                )}
                            </div>

                            {/* TITLE WITH MYSTICAL GRADIENT */}
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-indigo-200 to-slate-100 drop-shadow-sm">
                                {product.title}
                            </h1>

                            <div className="space-y-1">
                                <p 
                                    className={cn(
                                        "text-sm sm:text-base md:text-lg text-slate-400 leading-relaxed font-light border-l-2 border-indigo-500/30 pl-4 transition-all duration-300",
                                        !isDescExpanded && "line-clamp-2"
                                    )}
                                >
                                    {product.description}
                                </p>
                                <button 
                                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                                    className="text-xs sm:text-sm text-indigo-400 hover:text-indigo-300 font-medium pl-4 focus:outline-none transition-colors"
                                    title={isDescExpanded ? "Show less" : "Read more..."}
                                >
                                    {isDescExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* 💰 PRICE (GOLDEN GLOW) */}
                        <div className="space-y-1">
                            {/* Optional "Limited Deal" Badge */}
                            <div className="inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded mb-1">
                                Limited Time Deal
                            </div>

                            {checkingLocation ? (
                                <span className="text-lg text-slate-500 animate-pulse">Loading price...</span>
                            ) : (
                                <PriceDisplay
                                    price={currentPrice}
                                    currency={currentSymbol}
                                    productId={product.id}
                                    size="xl"
                                    showSaveBadge={true}
                                />
                            )}
                        </div>

                        <Separator className="bg-white/10" />

                        {/* 🎨 COLOR SELECTOR */}
                        <div className="space-y-4">
                            <span className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                Color: <span className="text-indigo-300 ml-1">{selectedColor}</span>
                            </span>
                            <div className="flex flex-wrap gap-3">
                                {colors.length > 0 ? colors.map((color) => {
                                    const hex = COLOR_MAP[color as keyof typeof COLOR_MAP] || "#000000"
                                    const isActive = selectedColor === color
                                    return (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={cn(
                                                "w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all relative flex items-center justify-center shadow-lg",
                                                isActive ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-[#090A0F] scale-110" : "hover:scale-110 ring-1 ring-white/10 hover:ring-white/30"
                                            )}
                                            style={{ backgroundColor: hex }}
                                        >
                                            {isActive && <FiCheckCircle className="text-orange-500 absolute -top-1.5 -right-1.5 bg-[#090A0F] rounded-full text-lg shadow-sm" />}
                                        </button>
                                    )
                                }) : <p className="text-sm text-slate-500">No colors available</p>}
                            </div>
                        </div>

                        {/* 📏 SIZE SELECTOR */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                    Size
                                </span>

                                {activeSizeChart && (
                                    <button
                                        onClick={() => setShowSizeChart(true)}
                                        className="text-xs text-orange-400 hover:text-orange-300 transition-colors font-semibold flex items-center gap-1.5 group"
                                    >
                                        <Paintbrush className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                                        Size Guide
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {sizes?.map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        className={cn(
                                            "h-12 rounded-xl text-sm font-bold flex items-center justify-center transition-all duration-300 border",
                                            selectedSize === size
                                                ? "border-orange-500 bg-orange-500/10 text-orange-400 shadow-[0_0_15px_-3px_rgba(249,115,22,0.3)]"
                                                : "border-white/10 bg-white/5 text-slate-400 hover:border-white/30 hover:bg-white/10"
                                        )}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 🔥 ACTION BUTTON (RUDRA FIRE) */}
                        {/* 🔥 ACTION BUTTON (RUDRA FIRE) */}
                        <div className="pt-8">
                            <Button
                                size="lg"
                                className="w-full h-16 text-lg font-bold tracking-wide shadow-2xl relative overflow-hidden group border-0"
                                onClick={handleStartDesigning}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 transition-all duration-300 group-hover:scale-105"></div>
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                                <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                                    <Paintbrush className="w-5 h-5" /> START DESIGNING
                                </span>
                            </Button>

                            <p className="text-xs text-center text-slate-500 mt-4 font-mono">
                                *Custom forged for you. <span className="text-red-400">No returns for wrong sizes.</span>
                            </p>
                        </div>

                        {/* ICONS FOOTER (Moved right below the button for instant trust) */}
                        <div className="grid grid-cols-2 gap-4 pt-8 mt-4 border-t border-white/10">
                            <div className="flex items-center gap-3 text-sm text-slate-400 group">
                                <div className="p-2.5 bg-white/5 rounded-full border border-white/5 group-hover:border-indigo-500/30 transition-colors"><Truck className="w-4 h-4 text-indigo-400" /></div>
                                <span>Cosmic Speed Delivery</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-400 group">
                                <div className="p-2.5 bg-white/5 rounded-full border border-white/5 group-hover:border-emerald-500/30 transition-colors"><ShieldCheck className="w-4 h-4 text-emerald-400" /></div>
                                <span>Divine Quality Guarantee</span>
                            </div>
                        </div>

                    </div> {/* <-- THIS CLOSES THE RIGHT COLUMN */}
                </div> {/* <-- THIS CLOSES THE 2-COLUMN GRID */}


                {/* ========================================================= */}
                {/* 🟢 NEW FULL-WIDTH SECTIONS (Spans the entire page) */}
                {/* ========================================================= */}

                <div className="mt-16 sm:mt-24 space-y-16">

                    {/* FULL-WIDTH SPECS & EXPECTATIONS */}
                    <div className="space-y-6">

                        {/* Crafted For You Banner (Stretches full width) */}
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-5 p-6 md:p-8 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-transparent border border-indigo-500/20 shadow-inner">
                            <div className="p-4 bg-indigo-500/20 rounded-xl text-indigo-400 shrink-0 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                                <Sparkles className="w-6 h-6 md:w-8 md:h-8" />
                            </div>
                            <div className="space-y-1.5">
                                <h4 className="text-base md:text-lg font-bold text-indigo-200 uppercase tracking-wider">
                                    Crafted Exclusively For You
                                </h4>
                                <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-5xl">
                                    Good things take time. Your custom asset isn't pulled from a dusty warehouse shelf—it is freshly prepared and printed specifically for you. Please allow 5-7 days for careful production before your unique item ships.
                                </p>
                            </div>
                        </div>

                        {/* Specs Grid (Now uses a beautiful 3-column layout on desktop!) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col gap-4 hover:bg-white/10 transition-colors">
                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 w-fit"><Palette className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-lg font-bold text-slate-200 mb-1.5">Vibrant Print Tech</p>
                                    <p className="text-sm text-slate-400 leading-relaxed">High-fidelity Direct-to-Film (DTF) printing. Eco-friendly, fade-resistant inks that bind seamlessly into the fabric.</p>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col gap-4 hover:bg-white/10 transition-colors">
                                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 w-fit"><Shield className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-lg font-bold text-slate-200 mb-1.5">Built to Last</p>
                                    <p className="text-sm text-slate-400 leading-relaxed">Premium materials featuring double-stitched hems, pre-shrunk fabric, and a seamless collar for ultimate durability.</p>
                                </div>
                            </div>

                            {/* Conditionally render Wash Care based on product type */}
                            {!product.title.toLowerCase().includes('mug') ? (
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col gap-4 hover:bg-white/10 transition-colors">
                                    <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 w-fit"><Droplets className="w-6 h-6" /></div>
                                    <div>
                                        <p className="text-lg font-bold text-slate-200 mb-1.5">Wash & Care</p>
                                        <p className="text-sm text-slate-400 leading-relaxed">Machine wash cold inside-out with similar colors. Tumble dry on low or hang-dry for longest life. Do not iron over print.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col gap-4 hover:bg-white/10 transition-colors">
                                    <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 w-fit"><Wind className="w-6 h-6" /></div>
                                    <div>
                                        <p className="text-lg font-bold text-slate-200 mb-1.5">Microwave & Dishwasher Safe</p>
                                        <p className="text-sm text-slate-400 leading-relaxed">The high-quality sublimation printing ensures the design will not fade or peel, even after hundreds of washes.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* FULL-WIDTH CUSTOMER REVIEWS (Centered nicely) */}
                    <div className="border-t border-white/10 pt-16 space-y-8 max-w-4xl mx-auto">
                        <h3 className="text-3xl font-black text-slate-200 text-center tracking-tight">
                            Customer Reviews
                        </h3>

                        {reviewsLoading ? (
                            <p className="text-slate-500 text-center">Loading reviews...</p>
                        ) : reviews.length === 0 ? (
                            <div className="text-center space-y-4 py-12 bg-white/5 rounded-2xl border border-white/10">
                                <div className="flex justify-center gap-1 text-slate-600">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <Star key={i} className="w-8 h-8" />
                                    ))}
                                </div>

                                <p className="text-slate-400 text-lg">No reviews yet</p>

                                <Button onClick={() => setShowReviewModal(true)} className="rounded-full px-6 h-12 text-base font-bold bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg shadow-orange-900/40 hover:shadow-orange-700/50 hover:scale-105 active:scale-95 transition-all duration-300 border-0">
                                    Be the first to write a review
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/5 p-8 rounded-3xl border border-white/10 shadow-lg">
                                    <div className="text-center sm:text-left">
                                        <div className="flex justify-center sm:justify-start gap-1 mb-3">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <Star
                                                    key={i}
                                                    className={cn(
                                                        "w-6 h-6",
                                                        i <= Math.round(averageRating)
                                                            ? "fill-orange-400 text-orange-400 drop-shadow-sm"
                                                            : "text-slate-600"
                                                    )}
                                                />
                                            ))}
                                        </div>

                                        <p className="text-lg text-slate-300 font-medium">
                                            {averageRating.toFixed(1)} out of 5 · <span className="text-slate-500">{totalReviews} review(s)</span>
                                        </p>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowReviewModal(true)}
                                        className="rounded-full px-8 h-12 text-base font-bold bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg shadow-orange-900/40 hover:shadow-orange-700/50 hover:scale-105 active:scale-95 transition-all duration-300 border-0"
                                    >
                                        Write a review
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {reviews.map(review => (
                                        <div
                                            key={review.id}
                                            className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 hover:bg-white/10 transition-colors shadow-sm"
                                        >
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold text-slate-200 text-lg">
                                                    {review.name}
                                                </p>
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map(i => (
                                                        <Star
                                                            key={i}
                                                            className={cn(
                                                                "w-4 h-4",
                                                                i <= review.rating
                                                                    ? "fill-orange-400 text-orange-400"
                                                                    : "text-slate-600"
                                                            )}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <p className="text-base text-slate-400 leading-relaxed">
                                                {review.comment}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* 🌌 SIZE CHART MODAL (DARK THEME) */}
            {showSizeChart && activeSizeChart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#0f111a] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative">

                        {/* Modal Header */}
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="font-bold text-lg text-slate-200 flex items-center gap-2">
                                <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                                Size Guide (Inches)
                            </h3>
                            <button
                                onClick={() => setShowSizeChart(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Measurements Table */}
                        <div className="p-6">
                            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-400 uppercase bg-white/5 border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-4 font-bold tracking-wider">Size</th>
                                            <th className="px-6 py-4 font-bold tracking-wider">Chest</th>
                                            <th className="px-6 py-4 font-bold tracking-wider">Length</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {Object.entries(activeSizeChart)
                                            .sort(([sizeA], [sizeB]) => {
                                                const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL"];
                                                const indexA = sizeOrder.indexOf(sizeA);
                                                const indexB = sizeOrder.indexOf(sizeB);
                                                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                                if (indexA === -1) return 1;
                                                if (indexB === -1) return -1;
                                                return 0;
                                            })
                                            .map(([size, measurements]) => (
                                                <tr key={size} className="hover:bg-white/5 transition-colors text-slate-300">
                                                    <td className="px-6 py-4 font-bold text-white">{size}</td>
                                                    <td className="px-6 py-4">{measurements?.[0] || "-"}</td>
                                                    <td className="px-6 py-4">{measurements?.[1] || "-"}</td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-slate-500 mt-5 text-center font-mono">
                                *Measurements may vary by +/- 0.5 inches due to cosmic shifts.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {showReviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">

                    <div className="bg-[#0f111a] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative">

                        {/* ✨ MODAL HEADER (MATCHES SIZE CHART STYLE) */}
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="font-bold text-lg text-slate-200 flex items-center gap-2">
                                <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                                Write a Review
                            </h3>
                            <button
                                onClick={handleClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        {/* 🌌 MODAL BODY */}
                        <div className="p-6 space-y-6">

                            {/* ⭐ STAR RATING */}
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                                    Rating
                                </p>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <button
                                            key={i}
                                            onClick={() => setRating(i)}
                                            className="transition-transform hover:scale-110"
                                        >
                                            <Star
                                                className={cn(
                                                    "w-6 h-6",
                                                    rating >= i
                                                        ? "fill-orange-400 text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.6)]"
                                                        : "text-slate-600"
                                                )}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 👤 NAME INPUT */}
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                                    Name
                                </p>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name (optional)"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                                />
                            </div>

                            {/* 💬 REVIEW TEXT */}
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                                    Review
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAutoReview}
                                    disabled={aiLoading || autoReviewCount >= 2}
                                    className="flex items-center gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-slate-300"
                                >
                                    {aiLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4 text-orange-400" />
                                            Auto-write review
                                        </>
                                    )}
                                </Button>
                                {autoReviewCount >= 2 && (
                                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
                                        AI assist used up — feel free to edit manually
                                    </span>
                                )}


                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Share your experience with this product..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 h-28 text-slate-200 placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                                />
                                <p className="text-[10px] text-slate-500 font-mono">
                                    *Minimum 20 characters
                                </p>
                            </div>

                            {/* 🔥 ACTION BUTTONS */}
                            <div className="flex justify-end gap-3 pt-2">
                                <Button
                                    variant="ghost"
                                    onClick={handleClose}
                                    className="text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all duration-200"
                                >
                                    Cancel
                                </Button>

                                <Button
                                    onClick={handleSubmitReview}
                                    className="relative overflow-hidden border-0"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 transition-transform group-hover:scale-105"></div>
                                    <span className="relative z-10 text-white font-semibold">
                                        Submit Review
                                    </span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}