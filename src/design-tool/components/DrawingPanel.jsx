// src/design-tool/components/DrawingPanel.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import { useDispatch } from 'react-redux';
import { dispatchDelta } from '../redux/canvasSlice';
import { v4 as uuidv4 } from 'uuid';
import { Trash2, Pencil, Paintbrush, PenTool, SprayCan, Circle, Eraser } from 'lucide-react';

const BRUSHES = [
  {
    id: 'pencil',
    label: 'Pencil',
    Icon: Pencil,
    desc: 'Sharp & precise',
    commitLabel: 'Commit Pencil Sketch',
    type: 'pencil',
    opacity: 1,
    width: 2,
  },
  {
    id: 'brush',
    label: 'Brush',
    Icon: Paintbrush,
    desc: 'Smooth & flowing',
    commitLabel: 'Commit Brushwork',
    type: 'pencil',
    opacity: 0.85,
    width: 8,
  },
  {
    id: 'marker',
    label: 'Marker',
    Icon: PenTool,
    desc: 'Thick & bold',
    commitLabel: 'Commit Marker Art',
    type: 'pencil',
    opacity: 0.7,
    width: 18,
  },
  {
    id: 'spray',
    label: 'Spray',
    Icon: SprayCan,
    desc: 'Scattered dots',
    commitLabel: 'Commit Spray Art',
    type: 'spray',
    opacity: 1,
    width: 30,
  },
  {
    id: 'circle',
    label: 'Circle',
    Icon: Circle,
    desc: 'Bubbly strokes',
    commitLabel: 'Commit Circle Art',
    type: 'circle',
    opacity: 0.9,
    width: 10,
  },
  {
    id: 'eraser',
    label: 'Eraser',
    Icon: Eraser,
    desc: 'Erase strokes',
    commitLabel: null,
    type: 'eraser',
    opacity: 1,
    width: 20,
  },
];

const SWATCHES = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
  '#64748b', '#f1f5f9',
];

const hexToRgba = (hex, opacity) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Detect if a color string is dark (luminance < 0.5)
function isColorDark(color) {
  let r, g, b;
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const full = hex.length === 3
      ? hex.split('').map(c => c + c).join('')
      : hex;
    r = parseInt(full.slice(0, 2), 16);
    g = parseInt(full.slice(2, 4), 16);
    b = parseInt(full.slice(4, 6), 16);
  } else if (color.startsWith('rgb')) {
    const match = color.match(/(\d+)/g);
    if (!match) return false;
    [r, g, b] = match.map(Number);
  } else {
    return false; // unknown format, assume light
  }
  // Perceived luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.45;
}

// Lucide SVG inner paths for cursor rendering (24x24 viewBox)
function getLucidePaths(brushId) {
  switch (brushId) {
    case 'pencil':
      return '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>';
    case 'brush':
      return '<path d="m18.37 2.63-1.67 1.67a2 2 0 0 1-2.83 0L9 9.17a2 2 0 0 0 0 2.83l3 3a2 2 0 0 0 2.83 0L19.66 10.17a2 2 0 0 1 0-2.83l1.67-1.67a2 2 0 0 0-2.96-2.96z"/><path d="M9 14.5c-3 3-5.5 4-7 4 0 0 .5-2 2-4s3-3.5 3-3.5"/>';
    case 'marker':
      return '<path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/>';
    case 'spray':
      return '<path d="M10 2v2"/><path d="M14 2v4"/><path d="M10 8v1"/><path d="M6 8v2"/><path d="M14 12v2"/><path d="M10 12v6"/><path d="M6 12v4"/><path d="M14 18v2"/><path d="M10 20v2"/><path d="M6 18v4"/>';
    case 'circle':
      return '<circle cx="12" cy="12" r="10"/>';
    case 'eraser':
      return '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>';
    default:
      return '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>';
  }
}

export default function DrawingPanel({ fabricCanvas, setActivePanel }) {
  const dispatch = useDispatch();
  const [activeBrush, setActiveBrush] = useState('pencil');
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(6);
  const [opacity, setOpacity] = useState(100);
  const [hasDrawing, setHasDrawing] = useState(false);
  const savedCursorRef = useRef(null);

  // --- Generate SVG-icon cursor CSS for a given brushId ---
  const makeCursorCss = useCallback((brushId) => {
    const brushDef = BRUSHES.find(b => b.id === brushId);
    if (!brushDef) return 'crosshair';

    // Detect if canvas bg is dark → use white cursor, otherwise black
    let cursorColor = 'black';
    if (fabricCanvas) {
      const bg = fabricCanvas.backgroundColor;
      if (bg && typeof bg === 'string') {
        cursorColor = isColorDark(bg) ? 'white' : 'black';
      }
    }

    const sz = 32;
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="${cursorColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${getLucidePaths(brushId)}</svg>`;
    const encoded = encodeURIComponent(svgStr);
    return `url("data:image/svg+xml,${encoded}") ${sz / 2} ${sz / 2}, crosshair`;
  }, [fabricCanvas]);

  // Setup: enable drawing mode when panel opens
  useEffect(() => {
    if (!fabricCanvas) return;

    // Save the original freeDrawingCursor so we can restore it
    savedCursorRef.current = fabricCanvas.freeDrawingCursor;

    fabricCanvas.isDrawingMode = true;
    applyBrush(activeBrush, color, size, opacity);

    const onPathCreated = () => setHasDrawing(true);
    fabricCanvas.on('path:created', onPathCreated);

    return () => {
      fabricCanvas.isDrawingMode = false;
      fabricCanvas.off('path:created', onPathCreated);
      // Restore original cursor
      fabricCanvas.freeDrawingCursor = savedCursorRef.current || 'crosshair';
    };
  }, [fabricCanvas]);

  const applyBrush = useCallback((brushId, col, sz, op) => {
    if (!fabricCanvas) return;
    const brushDef = BRUSHES.find(b => b.id === brushId);
    if (!brushDef) return;

    // Set freeDrawingCursor to our SVG icon cursor
    const cursorCss = makeCursorCss(brushId);
    fabricCanvas.freeDrawingCursor = cursorCss;

    let brush;
    const rgbaColor = hexToRgba(col, (op / 100) * brushDef.opacity);

    if (brushDef.type === 'spray') {
      brush = new fabric.SprayBrush(fabricCanvas);
      brush.density = 30;
      brush.dotWidth = 2;
      brush.dotWidthVariance = 1;
    } else if (brushDef.type === 'circle') {
      brush = new fabric.CircleBrush(fabricCanvas);
    } else if (brushDef.id === 'eraser') {
      brush = new fabric.PencilBrush(fabricCanvas);
      brush.color = '#ffffff';
      brush.width = sz;
      fabricCanvas.freeDrawingBrush = brush;
      fabricCanvas.requestRenderAll();
      return;
    } else {
      brush = new fabric.PencilBrush(fabricCanvas);
      if (brushDef.id === 'marker') {
        brush.strokeLineCap = 'square';
        brush.strokeLineJoin = 'miter';
      } else {
        brush.strokeLineCap = 'round';
        brush.strokeLineJoin = 'round';
      }
    }

    brush.color = rgbaColor;
    brush.width = sz;
    fabricCanvas.freeDrawingBrush = brush;
    fabricCanvas.requestRenderAll();
  }, [fabricCanvas, makeCursorCss]);

  // Re-apply brush + cursor when props change
  useEffect(() => {
    applyBrush(activeBrush, color, size, opacity);
  }, [activeBrush, color, size, opacity, applyBrush]);

  const handleSelectBrush = (id) => {
    setActiveBrush(id);
    const def = BRUSHES.find(b => b.id === id);
    if (def && id !== 'eraser') {
      setSize(def.width);
      setOpacity(Math.round(def.opacity * 100));
    } else if (id === 'eraser') {
      setSize(20);
    }
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    // Remove all path objects (freehand drawings)
    const toRemove = fabricCanvas.getObjects().filter(o => o.type === 'path' && !o.customId);
    toRemove.forEach(o => fabricCanvas.remove(o));
    fabricCanvas.requestRenderAll();
    setHasDrawing(false);
  };

  const handleCommit = () => {
    if (!fabricCanvas) return;

    // Collect all uncommitted drawing paths (no customId = not yet in Redux)
    const drawingPaths = fabricCanvas.getObjects().filter(o => o.type === 'path' && !o.customId);
    if (drawingPaths.length === 0) return;

    const zoom = fabricCanvas.getZoom();

    // --- Build a proper SVG from the fabric path objects ---
    // Calculate the bounding box of ALL paths combined (in logical canvas coords)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    drawingPaths.forEach(p => {
      const b = p.getBoundingRect(true); // true = absolute coords
      const lx = b.left / zoom;
      const ly = b.top / zoom;
      const rx = lx + b.width / zoom;
      const ry = ly + b.height / zoom;
      if (lx < minX) minX = lx;
      if (ly < minY) minY = ly;
      if (rx > maxX) maxX = rx;
      if (ry > maxY) maxY = ry;
    });

    const svgW = maxX - minX;
    const svgH = maxY - minY;

    // Serialize each path element into SVG <path> markup
    const pathElements = drawingPaths.map(p => {
      // fabric stores path data as an array of command arrays; join to a d= string
      const dStr = p.path
        ? (Array.isArray(p.path)
            ? p.path.map(cmd => cmd.join(' ')).join(' ')
            : p.path)
        : '';

      // Convert fabric's absolute canvas coords to SVG-local coords
      const ox = (p.left / zoom) - minX;
      const oy = (p.top / zoom) - minY;
      const strokeColor = p.stroke || p.fill || '#000000';
      const strokeOpacity = p.opacity != null ? p.opacity : 1;
      const sw = (p.strokeWidth || 1) / zoom;

      return `<path
        d="${dStr}"
        transform="translate(${ox} ${oy})"
        stroke="${strokeColor}"
        stroke-opacity="${strokeOpacity}"
        stroke-width="${sw}"
        stroke-linecap="${p.strokeLineCap || 'round'}"
        stroke-linejoin="${p.strokeLineJoin || 'round'}"
        fill="none"
      />`;
    }).join('\n');

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">${pathElements}</svg>`;

    // Remove raw uncommitted paths from the canvas
    drawingPaths.forEach(o => fabricCanvas.remove(o));
    fabricCanvas.requestRenderAll();

    // Dispatch as a proper SVG object — fully vector, no DPI issues!
    const newId = uuidv4();
    const newObj = {
      id: newId,
      type: 'svg',
      svgString,
      props: {
        left: minX,
        top: minY,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        opacity: 1,
        selectable: true,
        evented: true,
      },
    };
    dispatch(dispatchDelta({ type: 'ADD', targetId: newId, before: null, after: newObj }));
    setHasDrawing(false);
  };

  return (
    <div className="flex flex-col h-full text-white select-none">

      {/* === BRUSH GRID === */}
      <div className="px-3 pt-4 pb-3">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Choose Brush</p>
        <div className="grid grid-cols-3 gap-2">
          {BRUSHES.map(b => (
            <button
              key={b.id}
              onClick={() => handleSelectBrush(b.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                activeBrush === b.id
                  ? b.id === 'eraser'
                    ? 'bg-zinc-700/60 border-zinc-400 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                    : 'bg-gradient-to-b from-orange-500/20 to-orange-600/10 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
              }`}
            >
              <b.Icon size={22} className={`${activeBrush === b.id ? (b.id === 'eraser' ? 'text-zinc-200' : 'text-orange-400') : 'text-zinc-400'}`} />
              <span className={`text-[10px] font-bold ${activeBrush === b.id ? (b.id === 'eraser' ? 'text-zinc-200' : 'text-orange-400') : 'text-zinc-400'}`}>{b.label}</span>
              <span className="text-[9px] text-zinc-600 leading-none text-center">{b.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-white/5 mx-3 my-1" />

      {/* === COLOR === */}
      {activeBrush !== 'eraser' && (
        <div className="px-3 py-3">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Color</p>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: color }} />
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0 opacity-0 absolute"
                style={{ marginLeft: '-1.5rem' }}
              />
              <span className="text-xs font-mono text-zinc-400 uppercase">{color}</span>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-1.5 mb-3">
            {SWATCHES.map(sw => (
              <button
                key={sw}
                onClick={() => setColor(sw)}
                className={`w-full aspect-square rounded-lg border-2 transition-all duration-150 ${color === sw ? 'border-orange-500 scale-110 shadow-[0_0_10px_rgba(249,115,22,0.4)]' : 'border-transparent hover:scale-105'}`}
                style={{ backgroundColor: sw }}
              />
            ))}
          </div>
          {/* Full color picker */}
          <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/5">
            <span className="text-[10px] text-zinc-500">Custom</span>
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="flex-1 h-7 rounded-lg cursor-pointer border-0 bg-transparent"
            />
          </div>
        </div>
      )}

      <div className="h-px bg-white/5 mx-3" />

      {/* === SIZE & OPACITY === */}
      <div className="px-3 py-3 space-y-4">
        {/* Size */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Size</p>
            <span className="text-xs font-mono text-orange-400 font-bold">{size}px</span>
          </div>
          <div className="relative h-6 flex items-center">
            <input
              type="range"
              min={1}
              max={activeBrush === 'spray' ? 80 : 60}
              value={size}
              onChange={e => setSize(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-orange-500 to-red-500"
              style={{ accentColor: '#f97316' }}
            />
          </div>
          {/* Visual size preview */}
          <div className="flex items-center justify-center mt-2 h-10">
            <div
              className="rounded-full transition-all"
              style={{
                width: Math.min(size, 50),
                height: Math.min(size, 50),
                backgroundColor: activeBrush === 'eraser' ? '#64748b' : color,
                opacity: opacity / 100,
              }}
            />
          </div>
        </div>

        {/* Opacity (hidden for eraser) */}
        {activeBrush !== 'eraser' && (
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Opacity</p>
              <span className="text-xs font-mono text-orange-400 font-bold">{opacity}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={opacity}
              onChange={e => setOpacity(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: '#f97316' }}
            />
          </div>
        )}
      </div>

      <div className="flex-grow" />

      {/* === ACTIONS === */}
      <div className="px-3 pb-4 space-y-2">
        {hasDrawing && activeBrush !== 'eraser' && (() => {
          const brushDef = BRUSHES.find(b => b.id === activeBrush);
          const commitLabel = brushDef?.commitLabel || 'Commit to Canvas';
          const BrushIcon = brushDef?.Icon || Paintbrush;
          return (
            <button
              onClick={handleCommit}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-900/30 hover:from-orange-400 hover:to-red-400 transition-all"
            >
              <BrushIcon size={16} />
              {commitLabel}
            </button>
          );
        })()}
        <button
          onClick={handleClear}
          className="w-full py-2.5 rounded-xl bg-white/5 border border-white/5 text-zinc-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all"
        >
          <Trash2 size={14} /> Clear Drawing
        </button>
        <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
          Draw freely on the canvas. Click "Commit" to lock your artwork as a moveable vector SVG.
        </p>
      </div>
    </div>
  );
}

