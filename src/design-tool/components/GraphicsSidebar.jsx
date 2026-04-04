import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCanvasObjects } from '../redux/canvasSlice';
import { v4 as uuidv4 } from 'uuid';
import { GRAPHICS_CATEGORIES, GRAPHICS_LIBRARY } from '../../data/graphics';
import { Skeleton } from '@/components/ui/skeleton';

export default function GraphicsSidebar({ setActivePanel }) {
  const dispatch = useDispatch();
  const canvasObjects = useSelector((state) => state.canvas.present);
  const [activeCategory, setActiveCategory] = useState(GRAPHICS_CATEGORIES[0].id);
  const [loading, setLoading] = useState(true);

  // Simulated professional "Lazy Loading" effect
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [activeCategory]);

  const handleAddGraphic = (graphic) => {
    const id = uuidv4();
    const newObject = {
      id: id,
      type: 'svg',
      svgString: graphic.svgString,
      props: {
        left: 400,
        top: 400,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        opacity: 1,
      }
    };

    dispatch(setCanvasObjects([...canvasObjects, newObject]));
    setActivePanel(null); // Close sidebar after adding on mobile
  };

  const currentGraphics = GRAPHICS_LIBRARY[activeCategory] || [];

  return (
    <div className="sidebar-content flex flex-col h-full bg-slate-900/50">
      {/* Category Navigation */}
      <div className="p-3 border-b border-white/5 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max pb-1">
          {GRAPHICS_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-200 
                ${activeCategory === cat.id
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Graphics Grid Area */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          Explore {GRAPHICS_CATEGORIES.find(c => c.id === activeCategory)?.name}
        </h3>

        <div className="grid grid-cols-2 gap-3 pb-8">
          {loading ? (
            // Skeleton State
            Array(6).fill(0).map((_, i) => (
              <div key={`skel-${i}`} className="p-4 border border-white/5 rounded-xl bg-slate-800/20">
                <Skeleton className="w-full aspect-square rounded-lg mb-2 bg-slate-700/30" />
                <Skeleton className="h-2 w-1/2 mx-auto bg-slate-700/20" />
              </div>
            ))
          ) : (
            // Loaded State
            currentGraphics.map((graphic) => (
              <button
                key={graphic.id}
                onClick={() => handleAddGraphic(graphic)}
                className="flex flex-col items-center justify-center gap-3 p-4 border border-white/5 rounded-xl bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:border-orange-500/30 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl group hover:-translate-y-0.5"
              >
                <div className="w-full aspect-square flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/5 rounded-full transition-all duration-500 scale-0 group-hover:scale-100" />
                  <img
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(graphic.svgString)}`}
                    alt={graphic.name}
                    className="w-16 h-16 object-contain z-10 group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <span className="text-[10px] font-bold text-center text-slate-500 group-hover:text-white uppercase tracking-wider transition-colors">
                  {graphic.name}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
