import { motion } from "framer-motion";
import { Search, Image as ImageIcon, Trash2, Calendar, PaletteIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useUserDesigns } from "@/hooks/use-user-designs"; 
import { useAuth } from "@/hooks/use-auth";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { deleteDesign } from '@/design-tool/utils/deleteDesign';
import { toast } from "sonner";

export default function DashboardProjects() {
  const { user } = useAuth();
  const { designs, loading } = useUserDesigns(user?.uid);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filtering & Sorting Logic
  const filteredDesigns = useMemo(() => {
    if (!designs) return [];
    return [...designs]
      .filter((design) => {
        const name = design.name || "Untitled";
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  }, [searchQuery, designs]);

  // Handle Opening Project (New Tab)
  const handleOpenProject = (designId: string) => {
    const url = `/design?designId=${designId}`;
    window.open(url, '_blank'); 
  };

  // Handle Delete Project
  const handleDeleteProject = async (e: React.MouseEvent, designId: string, designName: string) => {
    e.stopPropagation(); 
    if (!user) return;
    
    if (window.confirm(`Are you sure you want to delete "${designName}"? This cannot be undone.`)) {
      setDeletingId(designId);
      try {
        await deleteDesign(designId, user.uid);
        toast.success("Project deleted successfully.");
      } catch (err) {
        console.error("Error deleting design:", err);
        toast.error("Failed to delete project.");
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 relative pb-20 p-4 md:p-10 min-h-screen">
      
      {/* Background */}
      <div className="fixed inset-0 -z-10 w-full h-full bg-[#0f172a]"> 
         <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px]" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-600/10 blur-[100px]" />
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Header and Search */}
      <div className="flex flex-col gap-4 md:gap-6 max-w-7xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2"
        >
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
            <PaletteIcon className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
            My Projects
          </h1>
          <p className="text-sm md:text-base text-slate-400">Manage and continue your saved designs.</p>
        </motion.div>
        
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center justify-between">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search my projects..."
              className="pl-10 h-10 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:ring-blue-500/50 focus:border-blue-500/50 rounded-full text-sm" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Grid of Projects */}
      <div className="max-w-7xl mx-auto w-full">
        {loading ? (
           // ✅ SKELETON LOADING GRID (Responsive)
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="aspect-[3/4] w-full rounded-2xl bg-slate-800/50" />
                  <div className="px-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4 bg-slate-800/50" />
                    <Skeleton className="h-2 w-1/3 bg-slate-800/50" />
                  </div>
                </div>
              ))}
           </div>
        ) : filteredDesigns.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
          {filteredDesigns.map((design, i) => (
            <motion.div
              key={design.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group cursor-pointer relative"
              onClick={() => handleOpenProject(design.id)}
            >
              {/* Thumbnail Container */}
              <div className="h-fit rounded-xl bg-slate-800/20 overflow-hidden relative border border-white/5 group-hover:border-blue-500/30 transition-all duration-300">
                 {/* Thumbnail Image */}
                 {design.imageData ? (
                     <img 
                       src={design.imageData} 
                       alt={design.name}
                       className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                     />
                 ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                        <ImageIcon className="text-slate-700 w-10 h-10 md:w-12 md:h-12" />
                    </div>
                 )}
                 
                 {/* Delete Button (Visible on Hover/Touch) */}
                 <div className="absolute top-2 right-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                   <button
                     onClick={(e) => handleDeleteProject(e, design.id, design.name)}
                     disabled={deletingId === design.id}
                     className="p-1.5 md:p-2 rounded-full bg-black/60 hover:bg-red-600 text-white backdrop-blur-md transition-colors shadow-lg disabled:opacity-50"
                     title="Delete Project"
                   >
                     {deletingId === design.id ? (
                       <Loader2 size={14} className="md:w-4 md:h-4 animate-spin" />
                     ) : (
                       <Trash2 size={14} className="md:w-4 md:h-4" />
                     )}
                   </button>
                 </div>
              </div>
              
              {/* Text Below */}
              <div className="mt-2 md:mt-3 px-1">
                <h3 className="font-semibold text-slate-200 truncate text-xs md:text-sm group-hover:text-blue-400 transition-colors">
                    {design.name || "Untitled Project"}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5 md:mt-1">
                    <Calendar size={10} className="text-slate-500 md:w-3 md:h-3" />
                    <p className="text-[10px] md:text-xs text-slate-500">
                        {design.updatedAt 
                            ? new Date(design.updatedAt).toLocaleDateString() 
                            : "Unknown date"}
                    </p>
                </div>
              </div>
            </motion.div>
          ))}
          </div>
        ) : (
          // Empty State
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/10 rounded-3xl bg-white/5 text-center px-4">
            <div className="bg-slate-800/50 p-4 rounded-full mb-4">
                <PaletteIcon className="h-6 w-6 md:h-8 md:w-8 text-slate-500" />
            </div>
            <p className="text-slate-300 text-base md:text-lg font-medium">No projects found</p>
            <p className="text-slate-500 text-sm mt-1">Start a new design to see it here.</p>
            {searchQuery && (
                <Button 
                    variant="link" 
                    className="text-blue-400 mt-2"
                    onClick={() => setSearchQuery("")}
                >
                    Clear Search
                </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}