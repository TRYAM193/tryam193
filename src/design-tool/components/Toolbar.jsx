// src/design-tool/components/Toolbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  FiBold, FiItalic, FiUnderline,
  FiLoader, FiSlash, FiCircle, FiSmile, FiFrown, FiLayers, FiFlag,
  FiAlignLeft, FiAlignCenter, FiAlignRight, FiType, FiDroplet, FiZap,
  FiChevronDown, FiCheck, FiMaximize2, FiCheckCircle
} from 'react-icons/fi';
import { Type, MoveHorizontal } from 'lucide-react';
import CircleText from '../objectAdders/CircleText';
import { Path } from 'fabric';
import {
  getStarPoints, getPolygonPoints, getTrianglePoints, getRoundedPathFromPoints,
  getArrowPoints, getDiamondPoints, getTrapezoidPoints, getLightningPoints
} from '../utils/shapeUtils';
import { processBackgroundRemoval } from '../utils/imageUtils';
import { calculateImageDPI } from '../utils/dpiCalculator'; // ✅ Import DPI Logic
import { AVAILABLE_FONTS } from '@/data/font';
import { FONTS } from '../../data/font.js'
import { GRADIENT_PRESETS, buildGradient, parseGradientState, gradientToCSS, resolveFillForFabric } from '../utils/gradientUtils';

// --- 🎨 UI COMPONENTS ---

const QUICK_PALETTE = [
  '#ffffff', '#000000', '#f97316', '#ef4444', '#a855f7',
  '#3b82f6', '#22c55e', '#fbbf24', '#ec4899', '#06b6d4', '#334155', '#0f172a'
];


/** FillPickerButton — inline expandable, fits within sidebar without overflow */
const FillPickerButton = ({ value, onChange, onTransparent, label = 'Fill Color' }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('solid');
  const colorInputRef = useRef(null);
  const fromRef = useRef(null);
  const toRef = useRef(null);
  const gs = parseGradientState(value);
  const [fromColor, setFromColor] = useState(gs.from);
  const [toColor, setToColor] = useState(gs.to);
  const [gradAngle, setGradAngle] = useState(gs.angle);
  const [gradType, setGradType] = useState(gs.type);

  const solidColor = typeof value === 'string' ? value : (gs.from || '#ffffff');
  const isGradient = typeof value === 'object' && value !== null;
  const previewStyle = isGradient
    ? { background: gradientToCSS(gs.from, gs.to, gs.angle) }
    : { backgroundColor: solidColor };

  const applyGradient = (f = fromColor, t = toColor, a = gradAngle, gt = gradType) => {
    onChange(buildGradient(gt, a, f, t));
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Trigger row — full width */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 bg-slate-800/50 border border-white/10 hover:border-orange-500/50 rounded-xl px-3 py-2.5 transition-all group"
      >
        <div className="w-6 h-6 rounded-full border-2 border-white/20 shrink-0" style={previewStyle} />
        <span className="text-xs text-slate-300 flex-1 text-left">{label}</span>
        <span className={`text-slate-500 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* Inline panel — expands within sidebar */}
      {open && (
        <div className="flex flex-col gap-3 bg-slate-800/30 border border-white/10 rounded-2xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Tab toggle */}
          <div className="flex p-1 bg-slate-900/80 rounded-xl border border-white/5">
            {['solid', 'gradient'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${tab === t ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
              >
                {t === 'solid' ? '◼ Solid' : '◑ Gradient'}
              </button>
            ))}
          </div>

          {tab === 'solid' ? (
            <div className="flex flex-col gap-2">
              {/* Quick palette — 6 col grid fits sidebar */}
              <div className="grid grid-cols-6 gap-2">
                {QUICK_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => { onChange(hex); setOpen(false); }}
                    className={`w-full aspect-square rounded-full border-2 transition-all hover:scale-110 ${value === hex ? 'border-orange-500 scale-110' : 'border-white/10'
                      }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
              {/* Custom + Transparent row */}
              <div className="flex gap-2">
                <div
                  className="flex-1 flex items-center gap-2 bg-slate-900/60 border border-white/10 rounded-xl px-2 py-1.5 cursor-pointer hover:border-orange-500/50 transition-all"
                  onClick={() => colorInputRef.current?.click()}
                >
                  <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: solidColor }} />
                  <span className="text-[10px] text-slate-300 font-mono uppercase flex-1 truncate">{solidColor}</span>
                  <input ref={colorInputRef} type="color" className="sr-only" value={solidColor}
                    onChange={(e) => onChange(e.target.value)} />
                </div>
                {onTransparent && (
                  <button
                    onClick={() => { onTransparent(); setOpen(false); }}
                    className="px-2 py-1.5 bg-slate-900/60 border border-white/10 rounded-xl text-[10px] text-slate-400 hover:text-white hover:border-white/30 transition-all shrink-0"
                  >None</button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Presets — 4 col grid */}
              <div className="grid grid-cols-4 gap-2">
                {GRADIENT_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => {
                      setFromColor(p.from); setToColor(p.to);
                      setGradAngle(p.angle); setGradType('linear');
                      applyGradient(p.from, p.to, p.angle, 'linear');
                    }}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div
                      className="w-full aspect-square rounded-full border-2 border-white/10 group-hover:border-orange-400 transition-all"
                      style={{ background: gradientToCSS(p.from, p.to, p.angle) }}
                    />
                    <span className="text-[9px] text-slate-500 group-hover:text-orange-400 truncate w-full text-center">{p.name}</span>
                  </button>
                ))}
              </div>
              {/* From / To */}
              <div className="grid grid-cols-2 gap-2">
                {[{ label: 'From', color: fromColor, ref: fromRef }, { label: 'To', color: toColor, ref: toRef }].map(({ label, color, ref }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 bg-slate-900/60 border border-white/10 rounded-xl px-2 py-2 cursor-pointer hover:border-orange-500/40 transition-all"
                    onClick={() => ref.current?.click()}
                  >
                    <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] text-slate-500 uppercase">{label}</span>
                      <span className="text-[10px] text-slate-300 font-mono truncate">{color}</span>
                    </div>
                    <input ref={ref} type="color" className="sr-only" value={color}
                      onChange={(e) => {
                        if (label === 'From') { setFromColor(e.target.value); applyGradient(e.target.value, toColor); }
                        else { setToColor(e.target.value); applyGradient(fromColor, e.target.value); }
                      }} />
                  </div>
                ))}
              </div>
              {/* Preview bar */}
              <div className="h-6 rounded-xl border border-white/10" style={{ background: gradientToCSS(fromColor, toColor, gradAngle) }} />
              {/* Linear/Radial */}
              <div className="flex gap-2">
                {['linear', 'radial'].map((t) => (
                  <button key={t}
                    onClick={() => { setGradType(t); applyGradient(fromColor, toColor, gradAngle, t); }}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${gradType === t ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-slate-800 border-white/10 text-slate-500 hover:text-white'
                      }`}
                  >{t === 'linear' ? '↗ Linear' : '◎ Radial'}</button>
                ))}
              </div>
              {/* Angle slider */}
              {gradType === 'linear' && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 uppercase w-10 shrink-0">Angle</span>
                  <input type="range" min={0} max={360} step={5} value={gradAngle}
                    className="flex-1 accent-orange-500 h-1.5"
                    onChange={(e) => { const a = Number(e.target.value); setGradAngle(a); applyGradient(fromColor, toColor, a, gradType); }} />
                  <span className="text-[10px] text-slate-300 w-8 text-right font-mono shrink-0">{gradAngle}°</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};


const ScrubbableInput = ({ label, value, min, max, step = 1, onChange, onCommit, icon: Icon, icon2: Icon2 }) => {
  const startX = useRef(0);
  const startVal = useRef(0);

  const handleMouseDown = (e) => {
    e.preventDefault();
    startX.current = e.clientX;
    startVal.current = value || 0;
    document.body.style.cursor = 'ew-resize';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    const delta = (e.clientX - startX.current) * step;
    let newVal = startVal.current + delta; // Float support
    if (min !== undefined) newVal = Math.max(min, newVal);
    if (max !== undefined) newVal = Math.min(max, newVal);

    // Round to step precision to avoid floating point errors (e.g. 1.000000002)
    const decimals = step < 1 ? 2 : 0;
    newVal = parseFloat(newVal.toFixed(decimals));

    onChange(newVal);
  };

  const handleMouseUp = (e) => {
    document.body.style.cursor = 'default';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    const delta = (e.clientX - startX.current) * step;
    let newVal = startVal.current + delta;
    if (min !== undefined) newVal = Math.max(min, newVal);
    if (max !== undefined) newVal = Math.min(max, newVal);

    const decimals = step < 1 ? 2 : 0;
    newVal = parseFloat(newVal.toFixed(decimals));

    onCommit(newVal);
  };

  // Determine display format
  const displayValue = step < 1 ? Number(value).toFixed(2) : Math.round(value);

  return (
    <div className="flex items-center gap-2 group mb-2">
      <div
        className="flex items-center gap-1.5 cursor-ew-resize text-slate-400 hover:text-white select-none w-16"
        onMouseDown={handleMouseDown}
      >
        <div className='flex flex-col gap-0.5'>
          {Icon ? <Icon size={12} /> : null}
          {Icon2 ? <Icon2 size={12} /> : null}
        </div>
        <span className="text-[10px] font-bold uppercase">{label}</span>
      </div>
      <div className="flex-1 relative bg-slate-800/50 hover:bg-slate-800 rounded-md border border-white/5 overflow-hidden">
        {/* Progress Bar Visual (Only for bounded inputs) */}

        <div
          className="absolute top-0 left-0 h-full bg-indigo-500/20 pointer-events-none"
          style={{ width: `${Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))}%` }}
        />

        <input
          type="number"
          step={step}
          min={min}
          max={max}
          className="w-full bg-transparent text-xs font-medium text-white px-2 py-1.5 focus:outline-none text-right relative z-10"
          value={parseInt(value) || '0'}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onBlur={(e) => onCommit(parseFloat(e.target.value))}
          onKeyDown={(e) => e.key === 'Enter' && onCommit(parseFloat(e.currentTarget.value))}
          onMouseUp={(e) => onCommit(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
};

const FontPicker = ({ currentFont, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const clickOut = (e) => wrapperRef.current && !wrapperRef.current.contains(e.target) && setIsOpen(false);
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  return (
    <div className="relative w-full mb-3" ref={wrapperRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-left hover:border-white/30 transition-all">
        <span className="text-sm text-white truncate" style={{ fontFamily: currentFont }}>{currentFont}</span>
        <FiChevronDown className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full max-h-60 overflow-y-auto bg-slate-900 border border-white/10 rounded-lg shadow-xl z-50 p-1 custom-scrollbar">
          {AVAILABLE_FONTS.map(font => (
            <button key={font} onClick={() => { onSelect(font); setIsOpen(false); }} className={`w-full text-left px-3 py-2 rounded-md text-sm flex justify-between items-center ${currentFont === font ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10'}`} style={{ fontFamily: font }}>
              {font} {currentFont === font && <FiCheck size={12} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- 🛠️ LOGIC (UNCHANGED) ---

const createFabricShadow = (color, blur, offsetX, offsetY) => {
  if ((!blur || blur === 0) && (offsetX === 0) && (offsetY === 0)) return null;
  return { color: color || '#000000', blur: blur || 0, offsetX: offsetX || 0, offsetY: offsetY || 0 };
};

function liveUpdateFabric(fabricCanvas, id, updates, currentLiveProps, object) {
  if (!fabricCanvas) return;
  const existing = fabricCanvas.getObjects().find((o) => o.customId === id);
  if (!existing) return;

  let finalUpdates = { ...updates };
  const shadowKeys = ['shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY'];
  const shadowUpdateKeys = Object.keys(updates).filter(key => shadowKeys.includes(key));

  if (shadowUpdateKeys.length > 0) {
    const mergedProps = { ...currentLiveProps, ...updates };
    finalUpdates.shadow = createFabricShadow(mergedProps.shadowColor, mergedProps.shadowBlur, mergedProps.shadowOffsetX, mergedProps.shadowOffsetY);
    shadowKeys.forEach(key => delete finalUpdates[key]);
  }

  // Resolve fills and strokes (Redux plain data -> Fabric instances)
  if (finalUpdates.fill) finalUpdates.fill = resolveFillForFabric(finalUpdates.fill);
  if (finalUpdates.stroke) finalUpdates.stroke = resolveFillForFabric(finalUpdates.stroke);

  const type = object.type;
  
  if (updates.colorMap && type === 'svg') {
     const newColorMap = updates.colorMap;
     if (existing._objects) {
         existing._objects.forEach(path => {
             if (path.originalFill && newColorMap[path.originalFill]) {
                 path.set('fill', resolveFillForFabric(newColorMap[path.originalFill]));
             }
             if (path.originalStroke && newColorMap[path.originalStroke]) {
                 path.set('stroke', resolveFillForFabric(newColorMap[path.originalStroke]));
             }
         });
     }
     existing.set('colorMap', newColorMap); // Sync Fabric object
     fabricCanvas.requestRenderAll();
     return;
  }

  const shapeTypes = ['star', 'pentagon', 'hexagon', 'triangle', 'arrow', 'diamond', 'trapezoid', 'lightning'];

  if (shapeTypes.includes(type) && (updates.radius !== undefined || updates.rx !== undefined)) {
    const mergedProps = { ...currentLiveProps, ...updates };
    const r = mergedProps.radius !== undefined ? mergedProps.radius : (mergedProps.rx || 0);

    let points = [];
    if (type === 'star') points = getStarPoints(5, 50, 25);
    else if (type === 'pentagon') points = getPolygonPoints(5, 50);
    else if (type === 'hexagon') points = getPolygonPoints(6, 50);
    else if (type === 'triangle') points = getTrianglePoints(100, 100);
    else if (type === 'arrow') points = getArrowPoints(100, 100);
    else if (type === 'diamond') points = getDiamondPoints(100, 150);
    else if (type === 'trapezoid') points = getTrapezoidPoints(100, 80);
    else if (type === 'lightning') points = getLightningPoints(50, 100);

    const pathData = getRoundedPathFromPoints(points, r);
    const newPathObj = new Path(pathData, { ...existing.toObject(['customId']), ...finalUpdates, path: pathData });

    const index = fabricCanvas.getObjects().indexOf(existing);
    fabricCanvas.remove(existing);
    fabricCanvas.add(newPathObj);
    if (index > -1) fabricCanvas.moveObjectTo(newPathObj, index);

    fabricCanvas.setActiveObject(newPathObj);
    newPathObj.setCoords();
    fabricCanvas.requestRenderAll();
    return;
  }

  existing.set(finalUpdates);
  // Special check for Text scale updates to keep it responsive
  if (existing.type === 'text' && (finalUpdates.text !== undefined || finalUpdates.fontFamily !== undefined || finalUpdates.fontSize !== undefined)) {
    existing.initDimensions();
  }

  const specialEffects = ['circle', 'semicircle', 'arc-up', 'arc-down', 'flag'];
  const isSpecialEffect = specialEffects.includes(existing.textEffect) || specialEffects.includes(updates.textEffect);

  if (isSpecialEffect) {
    const mergedProps = { ...currentLiveProps, ...updates };
    const newGroup = CircleText({ id: id, props: mergedProps });
    const index = fabricCanvas.getObjects().indexOf(existing);
    fabricCanvas.remove(existing);
    fabricCanvas.add(newGroup);
    if (index > -1) fabricCanvas.moveObjectTo(newGroup, index);
    fabricCanvas.setActiveObject(newGroup);
    newGroup.setCoords();
    fabricCanvas.requestRenderAll();
    return;
  }

  existing.setCoords();
  fabricCanvas.requestRenderAll();
}

export default function Toolbar({ id, type, object, updateObject, updateDpiForObject, printDimensions = { w: 4500, h: 5400 }, fabricCanvas, onAiLoadingStart, onAiLoadingEnd }) {
  const props = object?.props || {};
  const [liveProps, setLiveProps] = useState(props);

  // ✅ SCALING STATE
  const [scaleX, setScaleX] = useState(props.scaleX || 1);
  const [scaleY, setScaleY] = useState(props.scaleY || 1);
  const textareaRef = useRef(null);
  const isTypingRef = useRef(false);
  const [localText, setLocalText] = useState(liveProps.text || '');

  const [borderRadius, setBorderRadius] = useState(props.rx || props.radius || 0);
  const [circleRadius, setCircleRadius] = useState(props.radius || 150);
  const [arcAngle, setArcAngle] = useState(props.arcAngle || 120);
  const [flagVelocity, setFlagVelocity] = useState(props.flagVelocity || 50);

  const currentEffect = object?.textEffect || props.textEffect || 'none';
  const effectiveType = object?.type || type;
  const isSvg = object?.type === 'svg';
  const isTextObject = effectiveType === 'text' || effectiveType === 'circle-text';
  const isShapeObject = ['rect', 'circle', 'triangle', 'star', 'pentagon', 'hexagon', 'line', 'arrow', 'diamond', 'trapezoid', 'heart', 'lightning', 'bubble'].includes(effectiveType);
  const supportsBorderRadius = ['rect', 'triangle', 'star', 'pentagon', 'hexagon', 'arrow', 'diamond', 'trapezoid', 'lightning'].includes(effectiveType);
  const colorCommitTimer = useRef(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  const [currentFont, setCurrentFont] = useState(liveProps.fontFamily || 'Roboto')
  const fontCaps = FONTS[currentFont] || { bold: false, italic: false };
  const canBold = fontCaps.bold;
  const canItalic = fontCaps.italic;

  const handleRemoveBackground = async () => {
    if (!object || type !== 'image' || !fabricCanvas || isRemovingBg) return;
    const currentSrc = object.props.src || '';
    if (!currentSrc) { alert('No image source found!'); return; }
    try {
      setIsRemovingBg(true);
      if (onAiLoadingStart) onAiLoadingStart('Removing Background...', 'The Cosmic AI is separating the subject from the void.');
      const newImageUrl = await processBackgroundRemoval(currentSrc);
      const fabricObj = fabricCanvas.getObjects().find((o) => o.customId === id);
      if (fabricObj && newImageUrl) {
        const imgElement = new Image();
        imgElement.src = newImageUrl;
        imgElement.onload = () => {
          fabricObj.setElement(imgElement);
          fabricObj.setCoords();
          fabricObj.set({
            originalWidth: imgElement.width,
            originalHeight: imgElement.height,
            proxy_src: imgElement.src,
            print_src: imgElement.src,
          });
          fabricCanvas.requestRenderAll();
          updateObject(id, { 
            src: newImageUrl, 
            proxy_src: imgElement.src, 
            print_src: imgElement.src, 
            originalWidth: imgElement.width, 
            originalHeight: imgElement.height 
          });
        }
      }
    } catch (error) { console.error('BG Removal Error', error); toast.error('Failed. Try again.'); }
    finally {
      setIsRemovingBg(false);
      if (onAiLoadingEnd) onAiLoadingEnd();
    }
  }

  // ✅ AUTO DPI FIX
  const handleAutoDpi = async () => {
    if (!object || !fabricCanvas || type !== 'image') return;

    // Use current canvas dimensions as proxy for Print Area (High Res Workflow)
    const dpiInfo = calculateImageDPI(
      fabricCanvas.getObjects().find(o => o.customId === id),
      fabricCanvas.width,
      fabricCanvas.height,
      printDimensions.w || 4500,
      printDimensions.h || 5400
    );

    if (dpiInfo && dpiInfo.dpi < 300) {
      // Calculate target scale to reach 300 DPI
      // NewScale = CurrentScale * (CurrentDPI / 300)
      const correctionFactor = dpiInfo.dpi / 300;
      const newScaleX = scaleX * correctionFactor;
      const newScaleY = scaleY * correctionFactor;
      // Update State & Canvas
      setScaleX(newScaleX);
      setScaleY(newScaleY);
      await handleUpdateAndHistory('scaleX', newScaleX);
      await handleUpdateAndHistory('scaleY', newScaleY);

      updateDpiForObject(fabricCanvas.getObjects().find(o => o.customId === object.id))
    }
  };

  useEffect(() => {
    if (object && object.props) {
      setLiveProps(object.props);
      setBorderRadius(object.props.rx || object.props.radius || 0);
      setCircleRadius(object.props.radius || 150);
      setArcAngle(object.props.arcAngle || 120);
      setFlagVelocity(object.props.flagVelocity || 50);

      // Sync Scale state
      setScaleX(object.props.scaleX || 1);
      setScaleY(object.props.scaleY || 1);
    }
  }, [object]);

  useEffect(() => {
    if (!object || !object.props) return;

    setLiveProps(object.props);

    // 🔒 Do NOT overwrite while user is typing
    if (!isTypingRef.current) {
      setLocalText(object.props.text || '');
    }
  }, [object?.id]);

  // 🔤 BULLETPROOF FONT LOADER (Using WebFontLoader)
  const handleFontChange = (newFont) => {
    // 1. Instantly update the UI dropdown so it feels snappy to the user
    // setCurrentFont(newFont);

    const applyToFabric = () => {
      if (!fabricCanvas) return;

      const activeObj = fabricCanvas.getObjects().find(o => o.customId === id);
      if (activeObj && ['text', 'i-text', 'textbox'].includes(activeObj.type)) {
        // Set the new font
        activeObj.set('fontFamily', newFont);

        // Clear old Arial cache bounds
        delete activeObj.__charBounds;
        delete activeObj.__lineWidths;

        // Force proper measurement of the new font
        activeObj.initDimensions();
        activeObj.setCoords();
        fabricCanvas.requestRenderAll();

        // Commit to history and database
        handleUpdateAndHistory('fontFamily', newFont);
        setTimeout(() => {
          fabricCanvas.requestRenderAll();
        }, 1000)
      }
    };

    const loadWebFont = () => {
      window.WebFont.load({
        google: {
          // Request normal, bold, and italic versions so they don't pop later
          families: [`${newFont}:400,700,400i,700i`]
        },
        active: () => {
          // 🎉 FONT IS 100% READY AND PAINTED. Safe to draw!
          applyToFabric();
        },
        inactive: () => {
          console.warn(`WebFontLoader failed to load: ${newFont}. Falling back.`);
          applyToFabric(); // Fallback just in case
        },
        timeout: 5000 // 5 second safety net
      });
    };

    // 2. Check if WebFontLoader is already in the browser, if not, inject it!
    if (!window.WebFont) {
      const script = document.createElement('script');
      script.src = 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js';
      script.onload = loadWebFont;
      document.head.appendChild(script);
    } else {
      loadWebFont();
    }
  };

  const handleUpdateAndHistory = async (key, value) => {
    const updates = { [key]: value };
    const shadowKeys = ['shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY'];
    if (shadowKeys.includes(key)) {
      updateObject(id, updates);
      const mergedProps = { ...liveProps, [key]: value };
      const shadowObject = createFabricShadow(mergedProps.shadowColor, mergedProps.shadowBlur, mergedProps.shadowOffsetX, mergedProps.shadowOffsetY);
      updateObject(id, { shadow: shadowObject });
      return;
    }
    if (key === 'fontFamily') setCurrentFont(value);
    updateObject(id, updates);
    if (fabricCanvas) fabricCanvas.requestRenderAll(); // Ensure canvas updates immediately
  };

  const handleLiveUpdate = (key, value) => {
    setLiveProps(prev => ({ ...prev, [key]: value }));
    liveUpdateFabric(fabricCanvas, id, { [key]: value }, liveProps, object);
  };

  const toggleTextStyle = (style) => {
    let propKey, nextValue;
    const currentProps = object?.props || {};
    if (style === 'underline') { propKey = 'underline'; nextValue = !currentProps.underline; }
    else if (style === 'italic') { if (!canItalic) return; propKey = 'fontStyle'; nextValue = currentProps.fontStyle === 'italic' ? 'normal' : 'italic'; }
    else if (style === 'bold') { if (!canBold) return; propKey = 'fontWeight'; nextValue = currentProps.fontWeight === 'bold' ? 'normal' : 'bold'; }
    else return;
    handleUpdateAndHistory(propKey, nextValue);
  };

  const applyTextEffect = (effectType) => {
    let updates = { textEffect: effectType };
    if (effectType === 'circle') updates.radius = circleRadius;
    else if (['arc-up', 'arc-down'].includes(effectType)) { updates.radius = circleRadius; updates.arcAngle = arcAngle; }
    else if (effectType === 'flag') updates.flagVelocity = flagVelocity;
    else if (effectType === 'none') updates.path = null;
    updateObject(id, updates);
  };

  const handleColorChange = (key, value) => {
    setLiveProps(prev => ({ ...prev, [key]: value }));
    liveUpdateFabric(fabricCanvas, id, { [key]: value }, liveProps, object);
    if (colorCommitTimer.current) clearTimeout(colorCommitTimer.current);
    colorCommitTimer.current = setTimeout(() => { handleUpdateAndHistory(key, value); }, 300);
  };

  if (!object && !type) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 rounded-2xl bg-slate-800/30 border border-white/5 flex items-center justify-center mb-4 relative overflow-hidden group">
          <FiLayers size={32} className="text-slate-600 group-hover:text-indigo-400 transition-colors duration-300" />
        </div>
        <h3 className="text-sm font-bold text-slate-300 mb-1 tracking-wide">No Selection</h3>
        <p className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed">
          Click on any element in the canvas to customize its properties, style, and effects.
        </p>
      </div>
    );
  }

  // --- 🎨 MAIN RENDER ---
  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar p-4 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {isTextObject ? 'Typography' : isShapeObject ? 'Shape Settings' : 'Properties'}
        </h3>
        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300 font-mono opacity-50">
          {type}
        </span>
      </div>

      {/* ================= TEXT PROPERTIES ================= */}
      {isTextObject && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

          <div className="space-y-1.5">
            <textarea
              ref={textareaRef}
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-indigo-500 no-scrollbar transition-colors resize-none"
              rows={3}
              value={localText}
              placeholder="Enter text..."
              onChange={(e) => {
                const cursor = e.target.selectionStart;
                const value = e.target.value;

                isTypingRef.current = true;
                setLocalText(value);

                handleUpdateAndHistory('text', value);

                requestAnimationFrame(() => {
                  if (!textareaRef.current) return;
                  textareaRef.current.selectionStart = cursor;
                  textareaRef.current.selectionEnd = cursor;
                });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              onBlur={() => {
                isTypingRef.current = false;
                handleUpdateAndHistory('text', localText); // history + final commit
              }}
            />
          </div>

          {/* Style Pills: Bold / Italic / Underline */}
          <div className="flex bg-slate-900/80 p-1 rounded-lg border border-white/5">
            <button disabled={!canBold} onClick={() => toggleTextStyle('bold')} className={`flex-1 py-1.5 rounded flex justify-center transition-colors ${liveProps.fontWeight === 'bold' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-white disabled:opacity-30'}`}><FiBold /></button>
            <button disabled={!canItalic} onClick={() => toggleTextStyle('italic')} className={`flex-1 py-1.5 rounded flex justify-center transition-colors ${liveProps.fontStyle === 'italic' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-white disabled:opacity-30'}`}><FiItalic /></button>
            <button onClick={() => toggleTextStyle('underline')} className={`flex-1 py-1.5 rounded flex justify-center transition-colors ${liveProps.underline ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}><FiUnderline /></button>
          </div>

          {/* Text Fill Color — full-width inline picker */}
          <FillPickerButton
            label="Text Color"
            value={liveProps.fill}
            onChange={(val) => handleColorChange('fill', val)}
            onTransparent={() => handleUpdateAndHistory('fill', 'transparent')}
          />

          <div className="flex bg-slate-900/80 p-1 rounded-lg border border-white/5">
            {/* ✅ NEW ALIGNMENT BUTTONS */}
            <button onClick={() => handleUpdateAndHistory('textAlign', 'left')} className={`flex-1 py-1.5 rounded flex justify-center transition-colors ${liveProps.textAlign === 'left' || !liveProps.textAlign ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`} title="Align Left">
              <FiAlignLeft />
            </button>
            <button onClick={() => handleUpdateAndHistory('textAlign', 'center')} className={`flex-1 py-1.5 rounded flex justify-center transition-colors ${liveProps.textAlign === 'center' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`} title="Align Center">
              <FiAlignCenter />
            </button>
            <button onClick={() => handleUpdateAndHistory('textAlign', 'right')} className={`flex-1 py-1.5 rounded flex justify-center transition-colors ${liveProps.textAlign === 'right' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`} title="Align Right">
              <FiAlignRight />
            </button>
          </div>
          {/* Text Effects Pills */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Effect</label>
            <div className="flex bg-slate-900/80 p-1 rounded-lg border border-white/5 overflow-x-auto custom-scrollbar gap-1">
              {[
                { id: 'straight', icon: <FiSlash size={14} />, label: 'None' },
                { id: 'circle', icon: <FiCircle size={14} />, label: 'Circle' },
                { id: 'arc-up', icon: <FiSmile size={14} />, label: 'Arc Up' },
                { id: 'arc-down', icon: <FiFrown size={14} />, label: 'Arc Down' },
                { id: 'flag', icon: <FiFlag size={14} />, label: 'Flag' }
              ].map((eff) => (
                <button
                  key={eff.id}
                  onClick={() => applyTextEffect(eff.id)}
                  className={`min-w-[40px] py-1.5 rounded flex items-center justify-center transition-colors ${currentEffect === eff.id ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
                  title={eff.label}
                >
                  {eff.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Effect Sliders */}
          {['circle', 'arc-up', 'arc-down'].includes(currentEffect) && (
            <ScrubbableInput
              label="Radius" value={circleRadius} min={10} max={600} step={10}
              onChange={(v) => { setCircleRadius(v); handleLiveUpdate('radius', v); }}
              onCommit={(v) => updateObject(id, { radius: v })}
            />
          )}
          {['arc-up', 'arc-down'].includes(currentEffect) && (
            <ScrubbableInput
              label="Angle" value={arcAngle} min={10} max={360} step={5}
              onChange={(v) => { setArcAngle(v); handleLiveUpdate('arcAngle', v); }}
              onCommit={(v) => updateObject(id, { arcAngle: v })}
            />
          )}
          {currentEffect === 'flag' && (
            <ScrubbableInput
              label="Wave" value={flagVelocity} min={0} max={100}
              onChange={(v) => { setFlagVelocity(v); handleLiveUpdate('flagVelocity', v); }}
              onCommit={(v) => updateObject(id, { flagVelocity: v })}
            />
          )}

          {/* Font Selection */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <FontPicker currentFont={liveProps.fontFamily} onSelect={handleFontChange} />

            {/* Font Size (Standalone Row) */}
            <ScrubbableInput
              label="Font Size" icon={FiType} value={liveProps.fontSize} min={10} max={200}
              onChange={(v) => handleLiveUpdate('fontSize', v)}
              onCommit={(v) => handleUpdateAndHistory('fontSize', v)}
            />
            <ScrubbableInput
              label="Letter Spacing" icon={Type} icon2={MoveHorizontal} value={liveProps.charSpacing || 0} min={-50} max={500}
              onChange={(v) => handleLiveUpdate('charSpacing', v)}
              onCommit={(v) => handleUpdateAndHistory('charSpacing', v)}
            />

            {/* Outline (Standalone Section) */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Text Outline</label>
                <input type="color" className="w-5 h-5 rounded-full cursor-pointer bg-transparent border-none p-0" value={liveProps.stroke || '#000000'} onChange={(e) => {
                  handleColorChange('stroke', e.target.value);
                }} />
              </div>
              <ScrubbableInput
                label="Outline Width" value={liveProps.strokeWidth || 0} min={0} max={10} step={0.5}
                onChange={(v) => handleLiveUpdate('strokeWidth', v)}
                onCommit={(v) => {
                  handleUpdateAndHistory('strokeWidth', v);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= SHAPE PROPERTIES ================= */}
      {(isShapeObject || isSvg) && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

          {/* Fill Color — full width with gradient support */}
          {type !== 'line' && (
            isSvg && liveProps.colorMap && Object.keys(liveProps.colorMap).length > 0 ? (
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Graphic Colors</label>
                {Object.entries(liveProps.colorMap).map(([originalColor, currentColor], index) => (
                  <FillPickerButton
                    key={originalColor}
                    label={`Color ${index + 1}`}
                    value={currentColor}
                    onChange={(val) => {
                      const newColorMap = { ...liveProps.colorMap, [originalColor]: val };
                      setLiveProps(prev => ({ ...prev, colorMap: newColorMap }));
                      if (colorCommitTimer.current) clearTimeout(colorCommitTimer.current);
                      colorCommitTimer.current = setTimeout(() => { handleUpdateAndHistory('colorMap', newColorMap); }, 300);
                    }}
                  />
                ))}
              </div>
            ) : (
              <FillPickerButton
                label="Fill Color"
                value={liveProps.fill}
                onChange={(val) => handleColorChange('fill', val)}
                onTransparent={() => handleUpdateAndHistory('fill', null)}
              />
            )
          )}

          {/* Border Color + Width — stacked below fill */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between bg-slate-800/50 border border-white/10 rounded-xl px-3 py-2.5">
              <span className="text-xs text-slate-300">Border Color</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full border-2 border-white/20 cursor-pointer hover:border-orange-400 transition-all shrink-0"
                  style={{ backgroundColor: liveProps.stroke || '#000000' }}
                  onClick={(e) => e.currentTarget.nextSibling?.click()}
                />
                <input
                  type="color"
                  className="sr-only"
                  value={liveProps.stroke || '#000000'}
                  onChange={(e) => handleColorChange('stroke', e.target.value)}
                />
              </div>
            </div>
            <ScrubbableInput
              label="Border Width" value={liveProps.strokeWidth} min={0} max={type === 'line' ? 50 : 20}
              onChange={(v) => handleLiveUpdate('strokeWidth', v)}
              onCommit={(v) => handleUpdateAndHistory('strokeWidth', v)}
            />
          </div>


          {supportsBorderRadius && (
            <ScrubbableInput
              label="Corner Radius" value={borderRadius} min={0} max={effectiveType === 'rect' ? 100 : 40}
              onChange={(v) => {
                setBorderRadius(v);
                if (effectiveType === 'rect') {
                  setLiveProps(prev => ({ ...prev, rx: v, ry: v }));
                  liveUpdateFabric(fabricCanvas, id, { rx: v, ry: v }, liveProps, object);
                } else {
                  setLiveProps(prev => ({ ...prev, radius: v }));
                  liveUpdateFabric(fabricCanvas, id, { radius: v }, liveProps, object);
                }
              }}
              onCommit={(v) => {
                const key = effectiveType === 'rect' ? 'rx' : 'radius';
                updateObject(id, { [key]: v, ...(effectiveType === 'rect' ? { ry: v } : {}) });
              }}
            />
          )}
        </div>
      )}

      {/* ================= GENERAL PROPERTIES (TRANSFORM) ================= */}
      <div className="space-y-3 pt-4 border-t border-white/5">
        <h3 className="text-[10px] font-bold uppercase text-slate-500">Transform & General</h3>

        {/* ✅ SCALE CONTROLS */}
        <div className="grid grid-cols-2 gap-3">
          <ScrubbableInput
            label="Scale X" icon={FiMaximize2}
            value={scaleX || 1} min={0.1} max={5} step={0.01}
            onChange={(v) => { setScaleX(v); handleLiveUpdate('scaleX', v); }}
            onCommit={(v) => handleUpdateAndHistory('scaleX', v)}
          />
          <ScrubbableInput
            label="Scale Y" icon={FiMaximize2}
            value={scaleY || 1} min={0.1} max={5} step={0.01}
            onChange={(v) => { setScaleY(v); handleLiveUpdate('scaleY', v); }}
            onCommit={(v) => handleUpdateAndHistory('scaleY', v)}
          />
        </div>

        <ScrubbableInput
          label="Opacity" icon={FiDroplet}
          value={Math.round((liveProps.opacity || object?.props.opacity || 0) * 100)} min={0} max={100}
          onChange={(v) => handleLiveUpdate('opacity', v / 100)}
          onCommit={(v) => handleUpdateAndHistory('opacity', v / 100)}
        />
      </div>

      {/* ================= SHADOW EFFECT ================= */}
      <div className="space-y-3 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase text-slate-500">Drop Shadow</h3>
          <div className="flex items-center gap-2">
            <input type="color" className="w-4 h-4 rounded-full cursor-pointer bg-transparent p-0 border-none" value={liveProps.shadowColor || '#000000'} onChange={(e) => handleColorChange('shadowColor', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ScrubbableInput
            label="Blur" value={liveProps.shadowBlur || 0} min={0} max={50}
            onChange={(v) => handleLiveUpdate('shadowBlur', v, object)}
            onCommit={(v) => handleUpdateAndHistory('shadowBlur', v)}
          />
          <div />
          <ScrubbableInput
            label="Offset X" value={liveProps.shadowOffsetX || 0} min={-20} max={20}
            onChange={(v) => handleLiveUpdate('shadowOffsetX', v, object)}
            onCommit={(v) => handleUpdateAndHistory('shadowOffsetX', v)}
          />
          <ScrubbableInput
            label="Offset Y" value={liveProps.shadowOffsetY || 0} min={-20} max={20}
            onChange={(v) => handleLiveUpdate('shadowOffsetY', v, object)}
            onCommit={(v) => handleUpdateAndHistory('shadowOffsetY', v)}
          />
        </div>
      </div>

      {/* ================= REMOVE BG & AUTO FIX (IMAGE ONLY) ================= */}
      {type === 'image' && (
        <div className="pt-4 border-t border-white/5 space-y-3">
          {/* ✅ AUTO DPI FIX BUTTON */}
          <button
            onClick={handleAutoDpi}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 py-2.5 rounded-lg border border-indigo-500/30 transition-all text-xs font-bold"
          >
            <FiCheckCircle /> Auto-Scale for Print (300 DPI)
          </button>

          {/* Remove BG */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg blur opacity-30 group-hover:opacity-75 transition duration-200"></div>
            <button
              onClick={handleRemoveBackground}
              disabled={isRemovingBg}
              className="relative rounded-full w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-lg border border-white/10 transition-all"
            >
              {isRemovingBg ? (
                <>
                  <FiLoader className="animate-spin text-purple-400" />
                  <span className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-pink-300 to-purple-300">Processing...</span>
                </>
              ) : (
                <>
                  <FiZap className="text-yellow-400" />
                  <span className="text-sm font-bold">Remove Background</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 text-center">*First time load may take a moment</p>
        </div>
      )}
    </div>
  );
}