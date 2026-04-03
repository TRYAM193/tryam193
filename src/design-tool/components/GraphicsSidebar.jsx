import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCanvasObjects } from '../redux/canvasSlice';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_GRAPHICS } from '../../data/graphics';

export default function GraphicsSidebar({ setActivePanel }) {
  const dispatch = useDispatch();
  const canvasObjects = useSelector((state) => state.canvas.present);

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
    setActivePanel(null); // Close sidebar after adding
  };

  return (
    <div className="sidebar-content">
      <div className="p-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Graphics Library
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px'
        }}>
          {DEFAULT_GRAPHICS.map((graphic) => (
            <button
              key={graphic.id}
              onClick={() => handleAddGraphic(graphic)}
              className="flex flex-col items-center justify-center gap-2 p-3 border border-white/10 rounded-lg bg-slate-800/40 text-slate-400 hover:bg-slate-700 hover:border-orange-500/30 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md group"
            >
               {/* Use a simple data URI to render the SVG as an image preview */}
              <img 
                src={`data:image/svg+xml;utf8,${encodeURIComponent(graphic.svgString)}`} 
                alt={graphic.name}
                className="w-12 h-12 object-contain group-hover:scale-110 transition-transform duration-200"
              />
              <span className="text-[10px] font-medium text-center text-slate-400 group-hover:text-white">
                {graphic.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
