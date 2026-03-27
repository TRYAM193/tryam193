import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import useUserDesigns from '../hooks/useUserDesigns';
import { exportSavedDesignImage } from '../utils/saveDesign';
import { doc, deleteDoc } from 'firebase/firestore'; 
import { db } from '@/firebase';
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MoreVertical, Edit, Merge, Trash2, MoreHorizontal,
  AlertCircle, FileJson, Image as ImageIcon 
} from 'lucide-react';
import { deleteDesign } from '../utils/deleteDesign';

export default function SidebarSavedList({ 
  userId,
  productId, 
  onLoadDesign, 
  onMergeDesign 
}) {
  const { designs, loading } = useUserDesigns(userId);
  
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, origin: 'origin-top-left' });
  const menuRef = useRef(null);

  // Close menu on outside click or scroll
  useEffect(() => {
    const handleClose = (event) => {
      if (menuRef.current && menuRef.current.contains(event.target)) {
        return;
      }
      setOpenMenuId(null);
    };
    const handleScroll = () => setOpenMenuId(null);

    document.addEventListener('mousedown', handleClose);
    document.addEventListener('touchstart', handleClose); // ✅ Mobile support
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClose);
      document.removeEventListener('touchstart', handleClose);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const handleAction = async (action, design, e) => {
    e.stopPropagation(); 
    setOpenMenuId(null); 

    if (action === 'merge') {
      if (onMergeDesign) onMergeDesign(design);
    } 
    else if (action === 'edit') {
      if (onLoadDesign) onLoadDesign(design);
    } 
    else if (action === 'export') {
      exportSavedDesignImage(design);
    }
    else if (action === 'delete') {
      if (window.confirm(`Delete "${design.name}"? This cannot be undone.`)) {
        await deleteDesign(design.id, userId);
        alert("Design deleted successfully.");
      }
    }
  };

  const handleOpenMenu = (e, designId) => {
    e.stopPropagation();
    if (openMenuId === designId) {
      setOpenMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 192; // 'w-48' in Tailwind is exactly 192px
    const padding = 10;
    
    let leftPos = rect.right + padding;
    let transformOrigin = 'origin-top-left';

    // Safety check: If opening to the right goes off-screen (like on mobile)
    if (leftPos + menuWidth > window.innerWidth) {
      // Flip it to open on the left side of the button instead
      leftPos = Math.max(10, rect.left - menuWidth - padding); 
      transformOrigin = 'origin-top-right';
    }

    setMenuPosition({
      top: rect.top, 
      left: leftPos,
      origin: transformOrigin
    });
    setOpenMenuId(designId);
  };

  const filteredDesigns = (designs || []).filter(design => {
    if (productId) return true; 
    return design.type === 'BLANK' || !design.type; 
  });

  // LOADING SKELETON
  if (loading) {
    return (
      <div className="h-full overflow-hidden p-3">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
             <Skeleton key={i} className="aspect-square w-full rounded-xl bg-slate-800/50" />
          ))}
        </div>
      </div>
    );
  }

  // EMPTY STATE
  if (filteredDesigns.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
             <FileJson size={20} className="text-slate-600" />
        </div>
        {productId ? "No saved designs found." : "No blank designs found."}
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-y-auto custom-scrollbar"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-2 gap-3 p-3 pb-24">
        {filteredDesigns.map((design) => {
          const isBlankDesign = design.type === 'BLANK' || !design.type;

          return (
            <div 
              key={design.id} 
              className="group relative bg-slate-800/20 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/40"
            >
              {/* Thumbnail Area - Full Card */}
              <div className="aspect-square relative flex items-center justify-center bg-slate-900/30">
                {design.imageData ? (
                  <img 
                    src={design.imageData} 
                    alt={design.name} 
                    className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-110" 
                  />
                ) : (
                  <FileJson size={24} className="text-slate-600" />
                )}
                
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Menu Button — always visible on mobile, hover-reveal on desktop */}
                <div className="absolute top-2 right-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                   <button
                    onClick={(e) => handleOpenMenu(e, design.id)}
                    className={`p-2 rounded-full backdrop-blur-md transition-colors shadow-xl ${openMenuId === design.id ? 'opacity-100 bg-white text-orange-600' : 'text-white bg-black/60'}`}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </div>

              {/* Portal Menu */}
              {openMenuId === design.id && ReactDOM.createPortal(
                <div 
                  ref={menuRef}
                  style={{ 
                    top: menuPosition.top, 
                    left: menuPosition.left 
                  }}
                  className={`fixed w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-100 ring-1 ring-white/5 ${menuPosition.origin}`}
                >
                  {/* HEADER: JUST NAME CENTERED */}
                  <div className="p-3 border-b border-white/5 bg-slate-800/50 text-center">
                      <h4 className="text-xs font-bold text-white truncate px-1">
                        {design.name || "Untitled"}
                      </h4>
                  </div>

                  <div className="flex flex-col py-1">
                    
                    {isBlankDesign && (
                      <button 
                        onClick={(e) => handleAction('merge', design, e)}
                        className="flex items-center gap-3 px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors border-b border-white/5"
                      >
                        <Merge size={14} /> 
                        <span>Merge to Canvas</span>
                      </button>
                    )}

                    <button 
                      onClick={(e) => handleAction('edit', design, e)}
                      className="flex items-center gap-3 px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-blue-500/10 hover:text-blue-400 transition-colors"
                    >
                      <Edit size={14} /> 
                      <span>Edit Design</span>
                    </button>

                    <button 
                      onClick={(e) => handleAction('export', design, e)}
                      className="flex items-center gap-3 px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-green-500/10 hover:text-green-400 transition-colors"
                    >
                      <ImageIcon size={14} /> 
                      <span>Export Image</span>
                    </button>

                    <div className="h-px bg-white/5 my-1 mx-2" />

                    <button 
                      onClick={(e) => handleAction('delete', design, e)}
                      className="flex items-center gap-3 px-3 py-2.5 text-left text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} /> 
                      <span>Delete</span>
                    </button>
                  </div>
                </div>,
                document.body 
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}