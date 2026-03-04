import { motion } from "framer-motion";
import {
  ArrowRight, Clock, Store, Sparkles, Crown, Zap, Flame, Moon,
  Image as ImageIcon, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Link, useNavigate } from "react-router"; // Changed to react-router-dom for consistency
import { useTranslation } from "@/hooks/use-translation";
import { useUserDesigns } from "@/hooks/use-user-designs"; // Ensure correct path
import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase";

export default function DashboardHome() {
  const { isAuthenticated, user, userProfile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // 1. DATA: Recent Designs
  const { designs: userDesigns, loading: designsLoading } = useUserDesigns(user?.uid);

  // 2. DATA: Recommended Templates (Firestore)
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold tracking-tight text-white"
          >
            {t("dashboard.welcome")}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-orange-400">
              {user?.displayName?.split(" ")[0] || "Creator"}
            </span>
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
                // DESIGN CARDS (Limit 10)
                userDesigns.slice(0, 10).map((design) => (
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