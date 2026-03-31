import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Clock, Store, Sparkles, Crown, Zap, Flame, Moon, Copy, Check, Share2, Loader2,
  Image as ImageIcon, Plus, Gift, Timer, Users, MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { Link, useNavigate } from "react-router"; 
import { useTranslation } from "@/hooks/use-translation";
import { useUserDesigns } from "@/hooks/use-user-designs"; 
import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { toast } from "sonner";
import { FaWhatsapp, FaTelegramPlane } from 'react-icons/fa';

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
  // Gamification & Session States
  const [timeLeft, setTimeLeft] = useState<{h: number, m: number, s: number}>({ h: 23, m: 59, s: 59 });
  const [randomStats, setRandomStats] = useState({ joined: 8, invites: 14 });
  const [activityIndex, setActivityIndex] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  const activities = [
    "🔥 A creator just joined",
    "👀 Someone shared their referral link",
    "💥 ₹100 reward unlocked",
    "🚀 5 new invites sent in the last hour"
  ];

  useEffect(() => {
    // Generate Random Believable Stats ONCE per session
    setRandomStats({
      joined: Math.floor(Math.random() * (20 - 5 + 1)) + 5,
      invites: Math.floor(Math.random() * (35 - 10 + 1)) + 10
    });
    
    // Countdown Timer logic (simulated 24 hours) - Use localStorage to persist session
    let endTime = localStorage.getItem('tryam_ref_timer_end');
    if (!endTime) {
      endTime = (new Date().getTime() + 24 * 60 * 60 * 1000).toString();
      localStorage.setItem('tryam_ref_timer_end', endTime);
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = parseInt(endTime!) - now;
      if (distance < 0) {
        clearInterval(timer);
        return;
      }
      setTimeLeft({
        h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);
    
    // Rotate Live Activity Feed
    const activityTimer = setInterval(() => {
      setActivityIndex((prev) => (prev + 1) % activities.length);
    }, 6000);
    
    return () => {
      clearInterval(timer);
      clearInterval(activityTimer);
    };
  }, []);

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
      await updateDoc(userRef, { hasActiveReward: true });
      toast.success("₹100 credited! Apply it at checkout.");
    } catch (error) {
      toast.error("Failed to claim reward.");
      console.error(error);
    } finally {
      setIsClaiming(false);
    }
  };

  const shareMessage = `Get ₹100 off your first custom T-shirt on TRYAM 🔥\nUse my link: `;
  
  const getReferralUrl = () => {
    if (!userProfile?.referralCode) return '';
    return `${window.location.origin}?ref=${userProfile.referralCode}`;
  };

  const notifyShare = () => {
    // Post-Share Viral Loop trigger
    if (referralCount < 3) {
      setTimeout(() => {
          setIsShareModalOpen(true);
      }, 800);
    }
  };

  const handleCopy = () => {
    const link = getReferralUrl();
    if (!link) return;
    navigator.clipboard.writeText(shareMessage + link);
    toast.success("Referral link copied!");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    notifyShare();
  };

  const handleNativeShare = async () => {
    const link = getReferralUrl();
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TRYAM - Custom T-Shirts',
          text: shareMessage,
          url: link,
        });
        notifyShare();
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      handleCopy();
    }
  };
  
  const handleWhatsAppShare = () => {
    const link = getReferralUrl();
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage + link)}`, '_blank');
    notifyShare();
  };
  
  const handleTelegramShare = () => {
    const link = getReferralUrl();
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareMessage)}`, '_blank');
    notifyShare();
  };

  return (
    <div className="space-y-8 md:space-y-12 pb-20 relative px-4 sm:px-6 md:px-10">

      {/* ✅ BACKGROUND: COSMIC SHIVA THEME */}
      <div className="fixed inset-0 -z-10 w-full h-full bg-[#0f172a]">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-600/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* ✅ HERO SECTION */}
      <section className="space-y-4 pt-6">

        {/* ═══════════════════════════════════════════
            🎁 GAMIFIED REFER & EARN SECTION
        ═══════════════════════════════════════════ */}
        <section className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-800/80 backdrop-blur-md shadow-2xl shadow-black/40">
          {/* Ambient Glow */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-orange-500/15 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-blue-500/10 rounded-full blur-[70px] pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />

          <div className="relative z-10 p-5 sm:p-6">

            {/* ── TOP ROW: Scarcity Badges + Activity Feed ── */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[10px] font-bold uppercase tracking-wider">
                  <Timer className="w-3 h-3" />
                  ⏳ Limited-time reward
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                  🚀 Be among first 100 creators
                </span>
              </div>

              {/* ⏰ Live Countdown Timer */}
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono">
                <span className="bg-slate-800 border border-white/10 px-2 py-0.5 rounded text-orange-300 font-bold">{String(timeLeft.h).padStart(2, '0')}</span>
                <span className="text-slate-600">:</span>
                <span className="bg-slate-800 border border-white/10 px-2 py-0.5 rounded text-orange-300 font-bold">{String(timeLeft.m).padStart(2, '0')}</span>
                <span className="text-slate-600">:</span>
                <span className="bg-slate-800 border border-white/10 px-2 py-0.5 rounded text-orange-300 font-bold">{String(timeLeft.s).padStart(2, '0')}</span>
              </div>
            </div>

            {/* ── MAIN CONTENT ROW ── */}
            <div className="flex flex-col lg:flex-row items-start justify-between gap-6">

              {/* LEFT: Headline + Progress */}
              <div className="w-full lg:w-1/2 space-y-4">

                {/* Reward-First Headline */}
                <div>
                  {hasActiveReward ? (
                    <div className="space-y-1">
                      <div className="text-4xl font-black text-green-400 tracking-tight leading-none">✅ ₹100</div>
                      <h2 className="text-lg font-bold text-white">Applied at Checkout!</h2>
                      <p className="text-sm text-slate-400">Your reward is active. Use it on your next order now.</p>
                    </div>
                  ) : referralCount >= 3 ? (
                    <div className="space-y-1">
                      <div className="text-4xl font-black text-green-400 tracking-tight leading-none">🏆 ₹100</div>
                      <h2 className="text-lg font-bold text-white">Goal Reached! Claim your reward</h2>
                      <p className="text-sm text-slate-400">You've invited 3 friends who made a purchase. Claim now!</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-end gap-2">
                        <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300 tracking-tight leading-none">₹100</span>
                        <span className="text-lg font-bold text-white mb-1">OFF</span>
                      </div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Gift className="w-4 h-4 text-orange-400 flex-shrink-0" />
                        Get ₹100 off your next order
                      </h2>
                      <p className="text-sm text-slate-400">Invite 3 friends who make a purchase — reward unlocks automatically.</p>
                    </div>
                  )}
                </div>

                {/* ── 3-State Progress Block ── */}
                {hasActiveReward ? (
                  // STATE 3: Active — Use it now
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-bold w-full">
                      <Check className="w-4 h-4 flex-shrink-0" />
                      <span>₹100 credit is active in Checkout</span>
                    </div>
                    <Link to="/store">
                      <Button className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold shadow-lg shadow-green-900/30 border-0">
                        <Store className="w-4 h-4 mr-2" /> Use it now →
                      </Button>
                    </Link>
                  </div>
                ) : referralCount >= 3 ? (
                  // STATE 2: Ready to Claim
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-green-400 animate-pulse">3 / 3 ✅</span>
                      </div>
                      <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                          className="h-full bg-green-500 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.6)]"
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ repeat: Infinity, duration: 2.5 }}
                    >
                      <Button
                        onClick={handleClaimReward}
                        disabled={isClaiming}
                        className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold shadow-lg shadow-green-900/30 border-0"
                      >
                        {isClaiming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        Unlock ₹100 Now
                      </Button>
                    </motion.div>
                  </div>
                ) : (
                  // STATE 1: In Progress
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                      <span className="text-slate-500">Progress</span>
                      <span className={referralCount > 0 ? "text-orange-400" : "text-slate-500"}>
                        {referralCount} / 3 Friends
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-800/80 rounded-full overflow-hidden border border-white/5">
                      <motion.div
                        className="h-full bg-gradient-to-r from-orange-600 via-orange-400 to-amber-300 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.4)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(progressPercent, referralCount > 0 ? 8 : 0)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    {/* Milestone Psychology Text */}
                    <p className="text-xs text-slate-400">
                      {referralCount === 0 && "You're among the early creators 🌟 — invite 3 friends to unlock ₹100"}
                      {referralCount === 1 && "Nice! Keep going 💪 — only 2 more invites to unlock ₹100"}
                      {referralCount === 2 && "Almost there 🚀 — just 1 more friend to unlock your reward!"}
                    </p>
                    {/* Personalized % closer */}
                    {referralCount > 0 && (
                      <p className="text-xs font-bold text-orange-400">
                        You're {Math.round(progressPercent)}% closer 🔥 — only {3 - referralCount} more invite{3 - referralCount !== 1 ? 's' : ''} to unlock ₹100
                      </p>
                    )}
                  </div>
                )}

                {/* ── Dynamic Stats Row ── */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Users className="w-3 h-3 text-orange-400" />
                    🔥 <span className="font-bold text-slate-300">{randomStats.joined}</span> creators joined this week
                  </span>
                  <span className="text-slate-700">·</span>
                  <span className="text-xs text-slate-500">
                    💥 <span className="font-bold text-slate-300">{randomStats.invites}</span> invites sent today
                  </span>
                </div>

                {/* ── Animated Activity Feed ── */}
                <div className="h-6 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={activityIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4 }}
                      className="text-xs text-slate-500 italic"
                    >
                      {activities[activityIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              {/* RIGHT: Link + Share Buttons */}
              <div className="w-full lg:w-auto flex flex-col gap-3 bg-slate-950/60 p-4 rounded-2xl border border-white/5 min-w-0 lg:min-w-[280px]">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider text-center">🔗 Your Unique Referral Link</span>

                {/* Dynamic Link Display */}
                <button
                  onClick={handleCopy}
                  disabled={!userProfile?.referralCode}
                  className="group flex items-center gap-2 w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-orange-500/40 text-slate-300 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer"
                  title="Click to copy"
                >
                  <span className="text-sm font-mono truncate flex-1 text-left">
                    {userProfile?.referralCode
                      ? `${window.location.host}?ref=${userProfile.referralCode}`
                      : 'Generating...'
                    }
                  </span>
                  <span className="flex-shrink-0">
                    {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-slate-500 group-hover:text-orange-400 transition-colors" />}
                  </span>
                </button>

                {/* ── One-Tap Share Buttons ── */}
                <div className="grid grid-cols-2 gap-2">
                  {/* WhatsApp */}
                  <Button
                    onClick={handleWhatsAppShare}
                    disabled={!userProfile?.referralCode}
                    className="flex items-center gap-2 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] font-bold text-xs h-9 rounded-xl border-0"
                  >
                    <FaWhatsapp className="w-4 h-4" /> WhatsApp
                  </Button>

                  {/* Telegram */}
                  <Button
                    onClick={handleTelegramShare}
                    disabled={!userProfile?.referralCode}
                    className="flex items-center gap-2 bg-[#2AABEE]/15 hover:bg-[#2AABEE]/25 border border-[#2AABEE]/30 text-[#2AABEE] font-bold text-xs h-9 rounded-xl border-0"
                  >
                    <FaTelegramPlane className="w-4 h-4" /> Telegram
                  </Button>

                  {/* Copy Full */}
                  <Button
                    onClick={handleCopy}
                    disabled={!userProfile?.referralCode}
                    className={`flex items-center gap-1.5 font-bold text-xs h-9 rounded-xl border-0 transition-all ${
                      copied
                        ? "bg-green-500/20 border border-green-500/30 text-green-400"
                        : "bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300"
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </Button>

                  {/* Native Share */}
                  <Button
                    onClick={handleNativeShare}
                    disabled={!userProfile?.referralCode}
                    className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 text-blue-400 font-bold text-xs h-9 rounded-xl border-0"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Post-Share Viral Loop Modal ── */}
        <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
          <DialogContent className="bg-slate-900 border border-orange-500/20 text-white max-w-sm rounded-2xl shadow-2xl shadow-black/60">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-center">
                🔥 You're closer to <span className="text-orange-400">₹100!</span>
              </DialogTitle>
              <DialogDescription className="text-center text-slate-400">
                Invite {Math.max(3 - referralCount, 0)} more friend{Math.max(3 - referralCount, 0) !== 1 ? 's' : ''} who make a purchase to unlock your reward.
              </DialogDescription>
            </DialogHeader>

            {/* Progress in Modal */}
            <div className="space-y-2 px-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500">Current Progress</span>
                <span className="text-orange-400">{referralCount} / 3</span>
              </div>
              <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-600 to-amber-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(progressPercent, referralCount > 0 ? 8 : 4)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-center text-slate-500 pt-1">
                Only {Math.max(3 - referralCount, 0)} more invite{Math.max(3 - referralCount, 0) !== 1 ? 's' : ''} away from ₹100 free credit!
              </p>
            </div>

            <DialogFooter className="flex flex-col gap-2 sm:flex-col">
              <Button
                onClick={() => { setIsShareModalOpen(false); handleWhatsAppShare(); }}
                disabled={!userProfile?.referralCode}
                className="w-full bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold rounded-xl border-0"
              >
                <FaWhatsapp className="w-4 h-4 mr-2" /> Share on WhatsApp
              </Button>
              <Button
                onClick={() => { setIsShareModalOpen(false); handleCopy(); }}
                variant="outline"
                className="w-full border-white/10 text-slate-300 hover:text-white rounded-xl"
              >
                <Copy className="w-4 h-4 mr-2" /> Copy Link & Share Again
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


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

            {/* 👑 FOUNDING CREATOR BADGE */}
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

            {/* 🏆 REFERRAL GAMIFICATION BADGE */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: 0.3 }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                referralCount >= 3
                  ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                  : referralCount >= 1
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    : "bg-slate-800/80 border-white/10 text-slate-500"
              }`}
            >
              {referralCount >= 3 ? "🚀 Influencer" : referralCount >= 1 ? "🔗 Connector" : "🌱 Starter"}
            </motion.div>
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