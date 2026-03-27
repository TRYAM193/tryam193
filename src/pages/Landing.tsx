import { motion } from "framer-motion";
import { Crown, Layers, Info, Wand2, Flame, Moon, ArrowUpRight, Menu } from "lucide-react"; // Added Menu
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // Added Sheet components
import { useTranslation } from "@/hooks/use-translation";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useReferralTracking } from "@/hooks/use-referal"; // Import the referral tracking hook

export default function Landing() {
  const { t } = useTranslation();
  const [remainingSlots, setRemainingSlots] = useState<number | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleMouseEnter = () => {
    setIsPopoverOpen(true);
  };

  const handleMouseLeave = () => {
    setTimeout(() => {
      setIsPopoverOpen(false);
    }, 200);
  };

  useReferralTracking();
  useEffect(() => {
    const launchRef = doc(db, 'app_settings', 'launch_status');

    // onSnapshot listens for live updates instantly!
    const unsubscribe = onSnapshot(launchRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const remaining = data.total_slots - data.claimed_slots;
        setRemainingSlots(remaining > 0 ? remaining : 0);
      }
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col font-sans selection:bg-orange-500 selection:text-white">

      {/* ✅ BACKGROUND: COSMIC SHIVA THEME (Deep Night Blue, Saffron, Ash) */}
      <div className="fixed inset-0 -z-10 w-full h-full bg-[#0f172a]">
        {/* Blob 1: Neelkanth Blue (Throat/Poison) - Top Left */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[60%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
        {/* Blob 2: Agni Saffron (Fire/Energy) - Top Right */}
        <div className="absolute top-[10%] right-[-10%] w-[40%] h-[50%] rounded-full bg-orange-600/20 blur-[100px] animate-pulse delay-1000" />
        {/* Blob 3: Bhasma Ash/Silver (Moon/Purity) - Bottom Center */}
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] rounded-full bg-slate-400/10 blur-[120px] animate-pulse delay-2000" />
        {/* Stars / Dust Texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0f172a]/70 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-orange-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
              <img
                src="https://harmless-tapir-303.convex.cloud/api/storage/1a8853ff-ebac-480a-b68b-ffe2343bbf07"
                alt="TRYAM Logo"
                className="relative h-10 w-10 object-cover rounded-full shadow-lg ring-1 ring-white/20"
              />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">TRYAM</span>
          </div>

          {/* Desktop Navigation */}
          {/* Desktop Navigation (> 768px) */}
          <nav className="hidden md:flex items-center gap-8">
            {[{ label: "Catalog", to: "/store" }, { label: "Designs", to: "/designs" }, { label: "About", to: "/about" }, { label: "Help", to: "/help" }, { label: "Contact", to: "/contact" }].map((item) => (
              <Link key={item.label} to={item.to} className="text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors relative group">
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-500 transition-all group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Nav Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Sign In (Hidden on very small phones to save space) */}
            <Link to="/auth" className="hidden sm:block">
              <Button variant="ghost" className="text-slate-300 font-medium hover:text-white hover:bg-white/10 rounded-full px-4 md:px-6 transition-all">
                {t("nav.signin")}
              </Button>
            </Link>

            <Link to="/auth">
              <Button className="rounded-full px-4 md:px-6 h-9 md:h-10 text-sm md:text-base bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg shadow-orange-900/40 hover:shadow-orange-700/50 hover:scale-105 active:scale-95 transition-all duration-300 group border-0 relative overflow-hidden">
                <span className="relative z-10 flex items-center gap-2">
                  {t("auth.getStarted")} <ArrowUpRight className="w-4 h-4" />
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out" />
              </Button>
            </Link>

            {/* Mobile Menu Trigger (< 768px) */}
            <div className="md:hidden ml-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] bg-[#0f172a] border-white/10 p-6">
                  <div className="flex flex-col gap-6 mt-10">
                    {[
                      { label: "Catalog", to: "/store" },
                      { label: "Designs", to: "/designs" },
                      { label: "About", to: "/about" },
                      { label: "Help", to: "/help" },
                      { label: "Contact", to: "/contact" },
                    ].map((item) => (
                      <Link key={item.label} to={item.to} className="text-lg font-medium text-slate-300 hover:text-orange-400">
                        {item.label}
                      </Link>
                    ))}
                    <div className="h-px bg-white/10 my-2" />
                    <Link to="/auth" className="text-lg font-medium text-slate-300 hover:text-white">
                      {t("nav.signin")}
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="pt-24 pb-32 px-4">
          <div className="container mx-auto max-w-6xl text-center space-y-8">

            {/* Badge: Moon Silver style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-900/20 backdrop-blur-md text-sm font-medium text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.3)] cursor-default"
            >
              <Moon className="h-3.5 w-3.5 text-blue-300 fill-blue-300 animate-pulse" />
              <span>{t("landing.hero.badge")}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tighter leading-[1.1] text-white drop-shadow-2xl px-2"
            >
              {t("landing.hero.titleStart")} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-orange-400">
                {t("landing.hero.titleEnd")}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto font-light leading-relaxed"
            >
              {t("landing.hero.desc")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col w-full sm:w-auto sm:flex-row items-center justify-center gap-4 sm:gap-6 pt-8 px-4 sm:px-0"
            >
              <Link to="/design" className="w-full sm:w-auto">
                {/* 🎨 HERO CTA BUTTON: The "Trident Power" Button */}
                <Button size="lg" className="h-16 px-10 text-lg rounded-full bg-white text-slate-900 hover:bg-blue-50 font-bold shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                  <span className="relative z-10 flex items-center gap-3">
                    {t("landing.hero.cta")}
                    <div className="bg-orange-100 p-1 rounded-full group-hover:bg-orange-200 transition-colors">
                      <Flame className="w-5 h-5 text-orange-600 fill-orange-600" />
                    </div>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white via-blue-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Button>
              </Link>

              {/* Secondary CTA */}
              <Link to="/store">
                <Button variant="ghost" size="lg" className="h-16 px-8 text-lg rounded-full text-slate-300 hover:text-white hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all">
                  Browse Collection
                </Button>
              </Link>
            </motion.div>

            {/* 👑 NEW: LIVE FOUNDING CREATOR SCARCITY COUNTER WITH INFO POPOVER */}
            {remainingSlots !== null && remainingSlots > 0 && remainingSlots <= 100 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="mt-8 flex flex-col items-center justify-center"
              >
                <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 rounded-full border border-orange-500/40 bg-orange-500/10 backdrop-blur-md shadow-[0_0_25px_rgba(249,115,22,0.25)] relative overflow-hidden group">
                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />

                  <Flame className="w-5 h-5 text-orange-500 animate-pulse hidden sm:block" />

                  <span className="text-orange-100 font-medium text-sm sm:text-base z-10">
                    Only <span className="text-white font-black text-lg mx-1">{remainingSlots} / 100</span> Founding Creator spots left!
                  </span>

                  {/* ❓ THE INFO ICON (Hover + Click) */}
                  <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => setIsPopoverOpen(true)}
                        className="relative z-10 ml-1 p-1.5 rounded-full bg-orange-500/20 hover:bg-orange-500/40 transition-colors text-orange-300 hover:text-white focus:outline-none cursor-help"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </PopoverTrigger>

                    <PopoverContent
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                      className="w-72 sm:w-80 bg-[#1a2035]/95 backdrop-blur-xl border-orange-500/30 shadow-2xl shadow-black p-5 rounded-2xl z-50"
                      sideOffset={15}
                    >
                      <div className="space-y-3 relative z-50">
                        <h4 className="font-bold text-white text-lg flex items-center gap-2">
                          <Crown className="w-5 h-5 text-orange-500" /> Founding Creator Perks
                        </h4>
                        <p className="text-sm text-slate-300 font-light">
                          Be among the first 100 users to complete an order and unlock lifetime TRYAM benefits:
                        </p>
                        <ul className="text-sm space-y-2 mt-2">
                          <li className="flex items-start gap-2">
                            <span className="text-orange-500 mt-0.5">✦</span>
                            <span className="text-slate-200">Exclusive <strong>Founding Creator</strong> profile badge.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-orange-500 mt-0.5">✦</span>
                            <span className="text-slate-200">Boosted wallet rewards when referring friends.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-orange-500 mt-0.5">✦</span>
                            <span className="text-slate-200">Early VIP access to new AI design tools.</span>
                          </li>
                        </ul>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </motion.div>
            )}

            {/* Hero Visual */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-20 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-sm aspect-[16/9] max-w-5xl mx-auto shadow-2xl shadow-blue-900/20 overflow-hidden relative ring-1 ring-white/10 group"
            >
              <img
                src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop"
                alt="Apparel Mockup"
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-32 relative">
          {/* Subtle separator glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>

          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">{t("landing.features.title")}</h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto font-light">
                {t("landing.features.desc")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Feature 1 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-slate-800/40 backdrop-blur-md rounded-[2rem] p-6 md:p-10 border border-white/5 shadow-xl hover:shadow-blue-500/20 transition-all hover:-translate-y-2 group"
              >
                <div className="h-14 w-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-8 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)] group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                  <Wand2 className="h-7 w-7" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-white">{t("landing.feature.ai.title")}</h3>
                <p className="text-slate-400 text-lg leading-relaxed">
                  {t("landing.feature.ai.desc")}
                </p>
              </motion.div>

              {/* Feature 2 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-slate-800/40 backdrop-blur-md rounded-[2rem] p-6 md:p-10 border border-white/5 shadow-xl hover:shadow-blue-500/20 transition-all hover:-translate-y-2 group"
              >
                <div className="h-14 w-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-8 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.1)] group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                  <Layers className="h-7 w-7" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-white">{t("landing.feature.editor.title")}</h3>
                <p className="text-slate-400 text-lg leading-relaxed">
                  {t("landing.feature.editor.desc")}
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4">
          <div className="container mx-auto max-w-5xl">
            {/* CTA Background: Deep Void to Saffron Burst */}
            <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-[2rem] md:rounded-[3rem] p-8 py-16 md:p-24 text-center relative overflow-hidden shadow-2xl shadow-black/50 border border-white/10 group">

              {/* Background Glows */}
              <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-orange-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-orange-500/30 transition-all duration-700"></div>
              <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-blue-600/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 group-hover:bg-blue-600/30 transition-all duration-700"></div>

              <div className="relative z-10 space-y-8">
                <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white">{t("landing.cta.title")}</h2>
                <p className="text-blue-100/80 text-xl max-w-xl mx-auto font-light">
                  {t("landing.cta.desc")}
                </p>
                <Link to="/dashboard">
                  <Button size="lg" className="h-16 px-12 text-lg rounded-full font-bold bg-white text-slate-900 hover:bg-orange-50 shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-all scale-100 hover:scale-105">
                    {t("landing.cta.button")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        {/* SEO Brand Description — Natural, crawlable content for Google */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-slate-300 mb-4">
              India's Custom Merch Platform — TRYAM
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              TRYAM is a modern custom merch platform available at{" "}
              <a href="https://tryam193.in" className="text-orange-400 hover:underline">
                tryam193.in
              </a>
              . Powered by an AI design tool, TRYAM lets you design and personalize T-shirts, hoodies,
              and apparel with ease — no design experience needed. From creation to delivery, everything
              is streamlined so you can focus on bringing your ideas to life. Whether you know us as TRYAM
              or TRYAM193, we're building the future of personalized merch in India.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}