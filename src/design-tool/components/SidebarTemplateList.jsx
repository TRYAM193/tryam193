import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useGlobalTemplates } from '../../hooks/useGlobalTemplates';
import { Skeleton } from "@/components/ui/skeleton";
import {
  FilePlus, RefreshCw, Layout, AlertCircle, MoreHorizontal
} from 'lucide-react';

export default function SidebarTemplateList({ onMerge, onReplace }) {
  const { templates, loading, error } = useGlobalTemplates();
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, origin: 'origin-top-left' });
  const menuRef = useRef(null);

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

  const handleAction = (action, template, e) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (action === 'merge' && onMerge) onMerge(template);
    if (action === 'replace' && onReplace) onReplace(template);
  };

  const handleOpenMenu = (e, templateId) => {
    e.stopPropagation();
    if (openMenuId === templateId) {
      setOpenMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 192; // 'w-48'
    const padding = 10;

    let leftPos = rect.right + padding;
    let transformOrigin = 'origin-top-left';

    // Safety check: Will it go off screen?
    if (leftPos + menuWidth > window.innerWidth) {
      // Flip inward!
      leftPos = Math.max(10, rect.left - menuWidth - padding);
      transformOrigin = 'origin-top-right';
    }

    setMenuPosition({
      top: rect.top,
      left: leftPos,
      origin: transformOrigin
    });
    setOpenMenuId(templateId);
  };

  if (loading) {
    return (
      <div className="h-full overflow-hidden p-3">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl bg-slate-800/50" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-400 text-xs flex flex-col items-center gap-2">
        <AlertCircle size={20} />
        <span>Failed to load templates.</span>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
          <Layout size={20} className="text-slate-600" />
        </div>
        No templates found.
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
        {templates.map((template) => (
          <div
            key={template.id}
            className="group relative bg-slate-800/20 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/40"
          >
            {/* 1. Thumbnail Area (Full Card) */}
            <div className="aspect-square relative flex items-center justify-center bg-slate-900/30">
              {template.thumbnailUrl ? (
                <img
                  src={template.thumbnailUrl}
                  alt={template.name}
                  className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <Layout size={24} className="text-slate-600" />
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Menu Button — always visible on mobile, hover-reveal on desktop */}
              <div className="absolute top-2 right-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={(e) => handleOpenMenu(e, template.id)}
                  className={`p-2 rounded-full backdrop-blur-md transition-colors shadow-xl ${openMenuId === template.id ? 'opacity-100 bg-white text-orange-600' : 'text-white bg-black/60'}`}
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>

            {/* 2. Portal Menu with Info Header */}
            {openMenuId === template.id && ReactDOM.createPortal(
              <div
                ref={menuRef}
                style={{
                  top: menuPosition.top,
                  left: menuPosition.left
                }}
                className={`fixed w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-100 ring-1 ring-white/5 ${menuPosition.origin}`}
              >
                {/* NEW: Info Header inside Menu */}
                <div className="p-3 border-b items-center text-center border-white/5 bg-slate-800/50">
                  <h2 className="text-xs font-bold text-white truncate">{template.name || "Untitled"}</h2>
                  <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                    {template.category || "General"}
                  </span>
                </div>

                <div className="flex flex-col py-1">
                  <button
                    onClick={(e) => handleAction('merge', template, e)}
                    className="flex items-center gap-3 px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors"
                  >
                    <FilePlus size={14} />
                    <span>Merge to Design</span>
                  </button>

                  <button
                    onClick={(e) => handleAction('replace', template, e)}
                    className="flex items-center gap-3 px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-blue-500/10 hover:text-blue-400 transition-colors"
                  >
                    <RefreshCw size={14} />
                    <span>Replace All</span>
                  </button>
                </div>
              </div>,
              document.body
            )}
          </div>
        ))}
      </div>
    </div>
  );
}