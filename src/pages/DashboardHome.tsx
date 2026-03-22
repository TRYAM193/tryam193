import { motion } from "framer-motion";
import {
  ArrowRight, Clock, Store, Sparkles, Crown, Zap, Flame, Moon, Copy, Check, Share2, Loader2,
  Image as ImageIcon, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Link, useNavigate } from "react-router"; // Changed to react-router-dom for consistency
import { useTranslation } from "@/hooks/use-translation";
import { useUserDesigns } from "@/hooks/use-user-designs"; // Ensure correct path
import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { toast } from "sonner";

export default function DashboardHome() {
  const { isAuthenticated, user, userProfile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // 1. DATA: Recent Designs
  const { designs: userDesigns, loading: designsLoading } = useUserDesigns(user?.uid);

  // 2. DATA: Recommended Templates (Firestore)
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const referralCount = userProfile?.referralCount || 0;
  const hasActiveReward = userProfile?.hasActiveReward || false;
  const progressPercent = Math.min((referralCount / 3) * 100, 100);
  const [copied, setCopied] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false); // 👈 Add this

  useEffect(() => {
    // Fetch top 10 newest templates
    const q = query(
      collection(db, 'templates'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTemplates(results);
      setTemplatesLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 3. HANDLERS (Open in New Tab for Performance)
  const handleOpenDesign = (id: string) => window.open(`/design?designId=${id}`, '_blank');
  const handleUseTemplate = (id: string) => window.open(`/design?templateId=${id}`, '_blank');
  const handleCreateNew = () => window.open('/design', '_blank');
  const handleClaimReward = async () => {
    if (!user?.uid) return;
    setIsClaiming(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      // This activates the ₹100 credit toggle in their checkout
      await updateDoc(userRef, { hasActiveReward: true });
      toast.success("₹100 credited! Apply it at checkout.");
    } catch (error) {
      toast.error("Failed to claim reward.");
      console.error(error);
    } finally {
      setIsClaiming(false);
    }
  };
  const handleShare = async () => {
    if (!userProfile?.referralCode) return;
    const link = `${window.location.origin}?ref=${userProfile.referralCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TRYAM - Custom T-Shirts',
          text: 'Here is my referral link for ₹100 off your first custom T-shirt on TRYAM!',
          url: link,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback if they are on a very old browser
      navigator.clipboard.writeText(link);
      toast.success("Link copied! Share it anywhere.");
    }
  };

  return (
    <div className="space-y-8 md:space-y-12 pb-20 relative px-4 sm:px-6 md:px-10">

      {/* ✅ BACKGROUND: COSMIC SHIVA THEME */}
      <div className="fixed inset-0 -z-10 w-full h-full bg-[#0f172a]">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-600/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* ✅ HERO SECTION (Preserved from your code) */}
      <section className="space-y-4 pt-6">
        {/* SECTION: REFER & EARN (GAMIFIED) */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-md shadow-xl shadow-black/20">
          {/* Background glow effects */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-[50px]" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-[50px]" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">

            {/* Left Side: Text & Progress */}
              <div className="w-full md:w-1/2 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-400" />
                    {hasActiveReward 
                      ? "Reward Ready to Use! 🎉" 
                      : referralCount >= 3 
                        ? "Goal Reached! 🏆" 
                        : "Invite Friends, Get ₹100"}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {hasActiveReward 
                      ? "Your ₹100 credit is active! Spend it on your next order to unlock your next streak."
                      : referralCount >= 3
                        ? "You successfully invited 3 friends who made a purchase. Claim your reward now!"
                        : "Invite 3 friends to buy their first T-shirt and unlock a ₹100 credit for your next order!"}
                  </p>
                </div>

                {/* THE 3-STATE GAMIFICATION UI */}
                {hasActiveReward ? (
                  // STATE 3: Claimed & Ready to Spend
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-bold">
                    <Check className="w-4 h-4" /> ₹100 Credit Active in Checkout
                  </div>
                ) : referralCount >= 3 ? (
                  // STATE 2: Bar Full, Ready to Claim
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-green-400">3 / 3 Friends</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-green-500 w-full rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    </div>
                    <Button 
                      onClick={handleClaimReward} 
                      disabled={isClaiming}
                      className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold shadow-lg shadow-green-900/20"
                    >
                      {isClaiming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      Claim ₹100 Credit
                    </Button>
                  </div>
                ) : (
                  // STATE 1: In Progress
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-orange-400">{referralCount} / 3 Friends</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-500 rounded-full" 
                        style={{ width: `${progressPercent}%` }} 
                      />
                    </div>
                  </div>
                )}
              </div>

            {/* Right Side: Copy Link Action */}
            <div className="w-full md:w-auto flex flex-col items-center gap-3 bg-slate-950/50 p-4 rounded-xl border border-white/5">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Your Unique Link</span>
              <div className="flex items-center gap-2 w-full">
                <div className="bg-slate-900 border border-slate-700 text-slate-300 px-3 py-2.5 rounded-lg text-sm font-mono truncate w-40 sm:w-56">
                  tryam.com?ref={userProfile?.referralCode || 'GENERATING...'}
                </div>

                {/* 📋 Icon-Only Copy Button */}
                <Button
                  disabled={!userProfile?.referralCode}
                  title="Copy Link"
                  onClick={() => {
                    if (!userProfile?.referralCode) return;
                    const link = `${window.location.origin}?ref=${userProfile.referralCode}`;
                    navigator.clipboard.writeText(link);
                    toast.success("Referral link copied!");

                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`relative overflow-hidden transition-all duration-300 w-10 h-10 p-0 flex-shrink-0 flex items-center justify-center rounded-lg ${copied
                      ? "bg-green-500 hover:bg-green-400 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)] scale-95"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/40 hover:scale-[1.03] active:scale-95 border-0"
                    }`}
                >
                  <span className="relative z-10 flex items-center justify-center">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </span>
                </Button>

                {/* 🚀 Native Share Button */}
                <Button
                  disabled={!userProfile?.referralCode}
                  onClick={handleShare}
                  title="Share Link"
                  className="relative overflow-hidden transition-all duration-300 w-10 h-10 p-0 flex-shrink-0 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 hover:border-white/20 hover:text-white shadow-lg hover:scale-[1.03] active:scale-95"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

          </div>
        </section>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center flex-wrap gap-3"
          >
            <span>
              {t("dashboard.welcome")},  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-orange-400">
                {(user?.displayName?.split(" ")[0]?.charAt(0).toUpperCase() || "") + (user?.displayName?.split(" ")[0]?.slice(1) || "") || "Creator"}
              </span>
            </span>

            {/* 👑 NEW: FOUNDING CREATOR BADGE */}
            {userProfile?.isFoundingCreator && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.15)]"
              >
                <Crown className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 fill-yellow-400/20" />
                <span className="text-xs md:text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-orange-300 uppercase tracking-wider">
                  Founding Creator
                </span>
              </motion.div>
            )}
          </motion.h1>

          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-xs text-slate-300">
            <Moon className="w-3 h-3 text-slate-400" />
            <span>Waxing Phase</span>
          </div>
        </div>

        {/* COMPACT HERO CTA CARD */}
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative group rounded-xl overflow-hidden border border-white/10 shadow-xl shadow-black/40 h-auto md:h-48"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-[#1a2035] to-slate-900" />
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-orange-500/10 rounded-full blur-[80px] group-hover:bg-orange-500/20 transition-all duration-700" />

          <div className="relative z-10 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 h-full">
            <div className="space-y-2 max-w-lg">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-wider">
                <Flame className="w-3 h-3" /> Trending
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">
                Start Your <span className="text-blue-300">Cosmic Collection</span>
              </h2>
              <p className="text-slate-400 text-xs md:text-sm line-clamp-2 md:line-clamp-1">
                Premium hoodies & tees ready for your custom touch.
              </p>

              <div className="pt-2 md:pt-1">
                <Link to="/store">
                  <Button size="sm" className="h-9 px-6 text-sm rounded-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold shadow-lg border-0 w-full md:w-auto">
                    <Store className="mr-2 h-4 w-4" />
                    Browse Catalog
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden md:block relative mr-8">
              <Store className="w-24 h-24 text-slate-700 opacity-50 rotate-12 group-hover:rotate-0 transition-all duration-700" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* ✅ MAIN CONTENT */}
      {isAuthenticated ? (
        <div className="space-y-12">

          {/* SECTION 1: RECENT PROJECTS (Clean UI + Skeleton + Limit 10) */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-400" />
                {t("dashboard.recent")}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white hover:bg-white/5 gap-1"
                onClick={() => navigate('/dashboard/projects')}
              >
                {t("dashboard.viewAll")} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {designsLoading ? (
                // SKELETON LOADING
                [...Array(5)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <Skeleton className="aspect-[3/4] w-full rounded-2xl bg-slate-800/50" />
                    <Skeleton className="h-4 w-3/4 bg-slate-800/50" />
                  </div>
                ))
              ) : userDesigns && userDesigns.length > 0 ? (
                // DESIGN CARDS sorted by newest first (Limit 10)
                [...userDesigns]
                  .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
                  .slice(0, 10)
                  .map((design) => (
                  <motion.div
                    key={design.id}
                    whileHover={{ y: -5 }}
                    className="group cursor-pointer"
                    onClick={() => handleOpenDesign(design.id)}
                  >
                    <div className="h-fit rounded-xl bg-slate-800/20 overflow-hidden relative border border-white/5 group-hover:border-blue-500/30 transition-all duration-300">
                      {design.imageData ? (
                        <img src={design.imageData} alt={design.name} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                          <Zap className="text-slate-700 w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="mt-3 px-1">
                      <h3 className="font-semibold text-slate-200 truncate text-sm group-hover:text-blue-400 transition-colors">
                        {design.name || t("dashboard.untitled")}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {design.updatedAt ? new Date(design.updatedAt).toLocaleDateString() : "Just now"}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                // EMPTY STATE
                <div className="col-span-full py-10 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
                  <p className="text-slate-400 text-sm mb-4">No recent designs found.</p>
                  <Button onClick={handleCreateNew} variant="secondary" size="sm" className="bg-slate-800 text-white hover:bg-slate-700">
                    <Plus className="mr-2 h-4 w-4" /> Start Creating
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 2: FEATURED TEMPLATES (Clean UI + Skeleton + Limit 10) */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-400" />
                {t("templates.title") || "Featured Templates"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white hover:bg-white/5 gap-1"
                onClick={() => navigate('/dashboard/designs')}
              >
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {templatesLoading ? (
                // SKELETON LOADING
                [...Array(5)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <Skeleton className="aspect-[3/4] w-full rounded-2xl bg-slate-800/50" />
                    <Skeleton className="h-4 w-3/4 bg-slate-800/50" />
                  </div>
                ))
              ) : (
                // TEMPLATE CARDS (Already limited to 10 by Query)
                templates.map((template, i) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="group cursor-pointer"
                    onClick={() => handleUseTemplate(template.id)}
                  >
                    <div className="h-fit rounded-xl bg-slate-800/20 overflow-hidden relative border border-white/5 group-hover:border-orange-500/30 transition-all duration-300">
                      {template.thumbnailUrl || template.image ? (
                        <img
                          src={template.thumbnailUrl || template.image}
                          alt={template.name}
                          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/400x500/ffffff/000000?text=Template"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                          <ImageIcon className="text-slate-700 w-8 h-8" />
                        </div>
                      )}

                      {/* Pro Badge */}
                      {(template.tier === "Pro" || template.isPro) && (
                        <div className="absolute top-3 right-3 bg-orange-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Crown className="h-3 w-3" /> PRO
                        </div>
                      )}
                    </div>

                    <div className="mt-3 px-1">
                      <h3 className="font-semibold text-slate-200 truncate text-sm group-hover:text-orange-400 transition-colors">
                        {template.name || "Untitled Template"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {template.category || "General"}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>

        </div>
      ) : (
        // NON-AUTH STATE (Start Free)
        <section className="bg-slate-800/30 border border-white/5 rounded-2xl p-10 text-center space-y-6 mt-10">
          <h2 className="text-2xl font-bold text-white">{t("dashboard.startFree")}</h2>
          <p className="text-slate-400 max-w-md mx-auto">
            {t("dashboard.startDesc")}
          </p>
          <Link to="/store">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8">
              Go to Catalog
            </Button>
          </Link>
        </section>
      )}
    </div>
  );
}