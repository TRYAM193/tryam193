import { motion } from "framer-motion";
import { Search, Crown, Sparkles, Image as ImageIcon, Loader2, Paintbrush, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";

// HOOK IMPORT
import { useGlobalTemplates } from "@/hooks/useGlobalTemplates";

// Include your Footer (and Navbar if you have a standalone one)
import Footer from "@/components/Footer";

export default function TemplatesPage() {
  const navigate = useNavigate();

  // Use your exact same hook!
  const { templates, loading, loadMore, categories, isFetchingMore, hasMore } = useGlobalTemplates();

  // State for Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Filtering Logic
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch = (template.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || (template.category || "General") === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, templates]);

  // 🚀 THE MAGIC REDIRECT: We don't open a new tab, we navigate inside the app
  const handleUseTemplate = (template: any) => {
    navigate(`/design?templateId=${template.id}`);
  };

  // ------------------------------------------------------------------
  // 🎨 PUBLIC TEMPLATE CARD (With upgraded Hover UX)
  // ------------------------------------------------------------------
  const TemplateCard = ({ template, index, onClick }: any) => {
    const [imageLoaded, setImageLoaded] = useState(false);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="group cursor-pointer flex flex-col"
        onClick={onClick}
      >
        <div className="relative h-fit w-fit rounded-2xl bg-slate-800/30 overflow-hidden border border-white/5 group-hover:border-orange-500/50 shadow-lg transition-all duration-300">
          
          {/* Skeleton while loading */}
          {!imageLoaded && (template.thumbnailUrl || template.thumbnail) && (
            <Skeleton className="absolute inset-0 w-full h-full bg-slate-800/50 z-10" />
          )}

          {/* The Image */}
          {template.thumbnailUrl || template.thumbnail ? (
            <img
              src={template.thumbnailUrl || template.thumbnailUrl}
              alt={template.name}
              className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
              <ImageIcon className="text-slate-700 w-12 h-12" />
            </div>
          )}

          {/* 🌟 UPGRADED UX: Hover Overlay with Call to Action */}
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] z-20">
            <Button className="bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-xl shadow-orange-900/50 scale-90 group-hover:scale-100 transition-transform duration-300 rounded-full px-6">
              <Paintbrush className="w-4 h-4 mr-2" /> Customize
            </Button>
          </div>

          {/* Pro Badge */}
          {(template.isPro || template.tier === "Pro") && (
            <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md z-30">
              <Crown className="h-3 w-3" /> PRO
            </div>
          )}
        </div>

        {/* Text Below */}
        <div className="mt-3 px-1">
          <h3 className="font-bold text-slate-200 truncate text-base group-hover:text-orange-400 transition-colors">
            {template.name || "Untitled Template"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">
            {template.category || "General"}
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans flex flex-col relative">
      
      {/* 🌌 THEME BACKGROUND (Matches your Landing/Dashboard) */}
      <div className="fixed inset-0 -z-10 w-full h-full bg-[#0f172a]">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-600/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 md:py-20 z-10">
        
        {/* 🚀 PUBLIC HERO SECTION */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="bg-orange-500/10 rounded-full text-orange-400 border-orange-500/20 px-3 py-1 mb-6 text-sm">
              <Sparkles className="w-4 h-4 mr-2 inline" /> Endless Inspiration
            </Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
              Start with a Template. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                Make it Yours.
              </span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed mb-8">
              Don't want to start from scratch? Browse our curated collection of premium designs. 
              Click any template to jump into the editor and customize the text, colors, and layout.
            </p>
          </motion.div>
        </div>

        {/* 🔍 FILTERS */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8 bg-slate-800/30 p-2 pl-4 rounded-full border border-white/5 backdrop-blur-md">
          
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search designs (e.g., 'Anime', 'Vintage')..."
              className="pl-8 h-10 bg-transparent border-0 text-white placeholder:text-slate-500 focus-visible:ring-0 shadow-none text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="hidden md:flex gap-2 overflow-x-auto no-scrollbar border-l border-white/10 pl-4">
            {categories.slice(0, 5).map((cat) => (
              <Badge
                key={cat}
                variant="outline"
                className={`px-4 py-2 cursor-pointer whitespace-nowrap rounded-full transition-all border ${selectedCategory === cat
                  ? "bg-orange-600 text-white border-orange-600"
                  : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
                  }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>

          {/* Mobile Category Select */}
          <div className="md:hidden w-full px-2 pb-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full bg-slate-900/50 border-white/10 text-slate-200 h-10 rounded-xl text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-slate-300">
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 🖼️ TEMPLATE GRID */}
        <div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <Skeleton className="aspect-[3/4] w-full rounded-2xl bg-slate-800/50" />
                  <div className="px-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-slate-800/50" />
                    <Skeleton className="h-3 w-1/3 bg-slate-800/50" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTemplates.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                {filteredTemplates.map((template, i) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    index={i}
                    onClick={() => handleUseTemplate(template)}
                  />
                ))}
                
                {isFetchingMore && [...Array(4)].map((_, i) => (
                  <div key={`more-${i}`} className="flex flex-col gap-3 animate-pulse">
                    <div className="aspect-[3/4] w-full rounded-2xl bg-slate-800/30 border border-white/5" />
                    <div className="px-1 space-y-2">
                      <div className="h-4 w-3/4 bg-slate-800/30 rounded" />
                      <div className="h-3 w-1/3 bg-slate-800/30 rounded" />
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-16 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={isFetchingMore}
                    className="bg-slate-800/50 border-white/10 text-white hover:bg-slate-800 hover:text-orange-400 transition-all px-8 py-6 rounded-full text-base font-bold shadow-lg backdrop-blur-md"
                  >
                    {isFetchingMore ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...</> : 'Load More Inspiration'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded-3xl bg-slate-800/20 text-center px-4 backdrop-blur-sm">
              <div className="bg-slate-800/50 p-5 rounded-full mb-4 shadow-inner">
                <ImageIcon className="h-8 w-8 text-slate-500" />
              </div>
              <p className="text-white text-xl font-bold mb-2">No templates found</p>
              <p className="text-slate-400 mb-6">We couldn't find any designs matching your search.</p>
              <Button
                className="bg-orange-600 hover:bg-orange-500 text-white rounded-full px-8"
                onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}