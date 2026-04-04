import React, { useState, useEffect, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import { GRADIENT_PRESETS, buildGradient, parseGradientState, gradientToCSS, resolveFillForFabric } from '@/design-tool/utils/gradientUtils';
import {
    Check, Plus, Bold, Italic, Underline,
    Ban, Circle, Smile, Frown, Flag,
    Loader2, Eraser, ArrowUp, ArrowDown,
    ArrowUpFromLine, ArrowDownToLine, ImagePlus,
    Type, Droplets, Move, Sun, Maximize2, CheckCircle2,
    AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import { AVAILABLE_FONTS } from '@/data/font';
import { Path } from 'fabric';
import CircleText from '@/design-tool/objectAdders/CircleText';
import { processBackgroundRemoval } from '@/design-tool/utils/imageUtils';
import { calculateImageDPI } from '@/design-tool/utils/dpiCalculator'; // ✅ Added Import
import {
    getStarPoints, getPolygonPoints, getTrianglePoints, getRoundedPathFromPoints,
    getArrowPoints, getDiamondPoints, getTrapezoidPoints, getLightningPoints
} from '@/design-tool/utils/shapeUtils';

// Premium Dark Theme Overrides for react-colorful
const PICKER_STYLES = `
  .react-colorful {
    width: 100% !important;
    height: 180px !important;
    border-radius: 12px !important;
    border: none !important;
  }
  .react-colorful__saturation {
    border-radius: 12px 12px 0 0 !important;
    border-bottom: 2px solid rgba(0,0,0,0.2) !important;
  }
  .react-colorful__hue {
    height: 20px !important;
    border-radius: 0 0 12px 12px !important;
  }
  .react-colorful__pointer {
    width: 22px !important;
    height: 22px !important;
    border: 3px solid #fff !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4) !important;
  }
`;

// --- 1. LIVE UPDATE LOGIC (Optimized) ---
function liveUpdateFabric(fabricCanvas, id, updates, currentLiveProps, object, existingObject = null) {
    if (!fabricCanvas) return;
    // Cache the object search during interactions for performance
    const existing = existingObject || fabricCanvas.getObjects().find((o) => o.customId === id);
    if (!existing) return;

    let finalUpdates = { ...updates };

    const shadowKeys = ['shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY'];
    const shadowUpdateKeys = Object.keys(updates).filter(key => shadowKeys.includes(key));

    if (shadowUpdateKeys.length > 0) {
        const mergedProps = { ...currentLiveProps, ...updates };
        finalUpdates.shadow = createFabricShadow(
            mergedProps.shadowColor,
            mergedProps.shadowBlur,
            mergedProps.shadowOffsetX,
            mergedProps.shadowOffsetY
        );
        shadowKeys.forEach(key => delete finalUpdates[key]);
    }

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
        existing.set('colorMap', newColorMap);
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

        const newPathObj = new Path(pathData, {
            ...existing.toObject(['customId']),
            ...finalUpdates,
            path: pathData
        });

        const index = fabricCanvas.getObjects().indexOf(existing);
        fabricCanvas.remove(existing);
        fabricCanvas.add(newPathObj);
        if (index > -1) fabricCanvas.moveObjectTo(newPathObj, index);

        fabricCanvas.setActiveObject(newPathObj);
        newPathObj.setCoords();
        fabricCanvas.requestRenderAll();
        return;
    }

    // ✅ FIXED: Better Object Swapping (Matches Toolbar.jsx logic)
    const isSpecialEffect = ['circle', 'semicircle', 'arc-up', 'arc-down', 'flag'].includes(existing.textEffect) || 
                            ['circle', 'semicircle', 'arc-up', 'arc-down', 'flag'].includes(updates.textEffect);

    if (isSpecialEffect) {
        const mergedProps = { ...currentLiveProps, ...updates };
        const newGroup = CircleText({ id: id, props: mergedProps });
        
        // Find existing again to be absolutely sure
        const toRemove = fabricCanvas.getObjects().find(o => o.customId === id);
        const index = fabricCanvas.getObjects().indexOf(toRemove);
        
        if (toRemove) fabricCanvas.remove(toRemove);
        
        fabricCanvas.add(newGroup);
        if (index > -1) fabricCanvas.moveObjectTo(newGroup, index);

        // Crucial: Maintain selection so the user doesn't lose the slider focus
        fabricCanvas.setActiveObject(newGroup);
        newGroup.setCoords();
        fabricCanvas.requestRenderAll();
        return;
    }

    existing.set(finalUpdates);

    if (existing.type === 'text') {
        if (finalUpdates.text !== undefined || finalUpdates.fontFamily !== undefined || finalUpdates.fontSize !== undefined) {
            existing.initDimensions();
        }
    }

    existing.setCoords();
    fabricCanvas.requestRenderAll();
}

const createFabricShadow = (color, blur, offsetX, offsetY) => {
    if ((!blur || blur === 0) && (offsetX === 0) && (offsetY === 0)) return null;
    return { color: color || '#000000', blur: blur || 0, offsetX: offsetX || 0, offsetY: offsetY || 0 };
};


// --- 2. IMPROVED LIVE SLIDER (Scrubbable Input - Optimized from Toolbar.jsx) ---
const LiveSlider = ({ label, value, min, max, step, object, propKey, updateObject, fabricCanvas, displayMultiplier = 1, onCommitOverride }) => {
    const startX = useRef(0);
    const startVal = useRef(0);
    const hasMoved = useRef(false);
    const cachedObject = useRef(null);
    const [localVal, setLocalVal] = useState(value ?? 0);
    const latestValRef = useRef(value ?? 0);
    const inputRef = useRef(null);

    useEffect(() => { 
        setLocalVal(value ?? 0); 
        latestValRef.current = value ?? 0;
    }, [value, object.id]);

    const updateValue = (newVal) => {
        if (min !== undefined) newVal = Math.max(min, newVal);
        if (max !== undefined) newVal = Math.min(max, newVal);
        const decimals = step < 1 ? 2 : 0;
        newVal = parseFloat(newVal.toFixed(decimals));
        setLocalVal(newVal);
        latestValRef.current = newVal;

        const fabricValue = newVal / displayMultiplier;
        const props = object.props || object;
        liveUpdateFabric(fabricCanvas, object.id, { [propKey]: fabricValue }, props, object, cachedObject.current);
    };

    const commitValue = (finalVal) => {
        if (min !== undefined) finalVal = Math.max(min, finalVal);
        if (max !== undefined) finalVal = Math.min(max, finalVal);
        const decimals = step < 1 ? 2 : 0;
        finalVal = parseFloat(finalVal.toFixed(decimals));

        const fabricVal = finalVal / displayMultiplier;
        if (onCommitOverride) onCommitOverride(fabricVal);
        else updateObject(object.id, { [propKey]: fabricVal });
    };

    const beginInteraction = (clientX) => {
        startX.current = clientX;
        startVal.current = latestValRef.current;
        hasMoved.current = false;
        if (fabricCanvas) {
            cachedObject.current = fabricCanvas.getObjects().find(o => o.customId === object.id);
        }
    };

    const handleMouseDown = (e) => {
        beginInteraction(e.clientX);
        const onMouseMove = (moveEv) => {
            const deltaX = moveEv.clientX - startX.current;
            if (Math.abs(deltaX) > 3) {
                hasMoved.current = true;
                document.body.style.cursor = 'ew-resize';
                updateValue(startVal.current + (deltaX * step));
            }
        };
        const onMouseUp = (e) => {
            document.body.style.cursor = 'default';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            if (hasMoved.current) {
                commitValue(latestValRef.current);
            } else {
                // Trigger focus for manual typing if it was a simple click
                inputRef.current?.focus();
                inputRef.current?.select();
            }
            cachedObject.current = null;
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const handleTouchStart = (e) => {
        const touch = e.touches[0];
        beginInteraction(touch.clientX);
        const onTouchMove = (moveEv) => {
            const currentTouch = moveEv.touches[0];
            const deltaX = currentTouch.clientX - startX.current;
            if (Math.abs(deltaX) > 3) {
                if (moveEv.cancelable) moveEv.preventDefault();
                hasMoved.current = true;
                updateValue(startVal.current + (deltaX * step));
            }
        };
        const onTouchEnd = (e) => {
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            if (hasMoved.current) {
                commitValue(latestValRef.current);
            } else {
                // Mobile Tap: Trigger focus for keyboard entry
                inputRef.current?.focus();
                inputRef.current?.select();
            }
            cachedObject.current = null;
        };
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
    };

    return (
        <div className="flex items-center gap-3 mb-3 animate-in fade-in duration-300 group select-none">
            {/* Scrubbable Label Area */}
            <div 
                className="flex items-center gap-1.5 w-16 cursor-ew-resize touch-none active:text-orange-400 transition-colors"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                <div className="flex flex-col gap-0.5 opacity-50">
                    <div className="w-2.5 h-0.5 bg-slate-400 rounded-full" />
                    <div className="w-2.5 h-0.5 bg-slate-400 rounded-full" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{label}</span>
            </div>

            {/* Input & Scrubbing Zone */}
            <div className="flex-1 relative h-9 bg-slate-800/50 rounded-lg border border-white/5 overflow-hidden transition-all group-hover:border-white/10 active:border-orange-500/50">
                {/* Visual Progress Bar (Matches Toolbar.jsx) */}
                <div
                    className="absolute top-0 left-0 h-full bg-orange-500/10 pointer-events-none"
                    style={{ width: `${Math.min(100, Math.max(0, ((localVal - min) / (max - min)) * 100))}%` }}
                />
                
                {/* Drag Overlay (Transparent but captures gestures) */}
                <div 
                    className="absolute inset-0 z-20 cursor-ew-resize touch-none"
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                />

                {/* Number Input (Matches Toolbar.jsx style but on mobile) */}
                <input
                    ref={inputRef}
                    type="number"
                    step={step}
                    className="w-full h-full bg-transparent text-sm font-mono text-white px-3 focus:outline-none text-right relative z-10 appearance-none m-0 pointer-events-auto"
                    value={step < 1 ? Number(localVal).toFixed(2) : Math.round(localVal)}
                    onChange={(e) => updateValue(Number(e.target.value))}
                    onBlur={(e) => commitValue(Number(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && commitValue(Number(e.currentTarget.value))}
                />
            </div>
        </div>
    );
};

// --- HELPER COMPONENTS (outside main to preserve state) ---

const ScrubbablePalette = ({ currentFill, onSelect, PALETTE, object, fabricCanvas, targetProp }) => {
    const [localFill, setLocalFill] = useState(currentFill);
    const cachedObject = useRef(null);

    useEffect(() => { setLocalFill(currentFill); }, [currentFill]);

    const handleMove = (clientX, clientY) => {
        const element = document.elementFromPoint(clientX, clientY);
        if (element && element.dataset.hex) {
            const hex = element.dataset.hex;
            if (hex !== localFill) {
                setLocalFill(hex);
                if (fabricCanvas && object) {
                    if (!cachedObject.current) {
                        cachedObject.current = fabricCanvas.getObjects().find(o => o.customId === object.id);
                    }
                    const props = object.props || object;
                    liveUpdateFabric(fabricCanvas, object.id, { [targetProp]: hex }, props, object, cachedObject.current);
                }
            }
        }
    };

    const handleTouchMove = (e) => {
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
    };

    const handleEnd = () => {
        onSelect(localFill);
        cachedObject.current = null;
    };

    return (
        <div
            className="grid grid-cols-8 gap-2 max-h-[140px] overflow-y-auto no-scrollbar scroll-smooth pb-2 pr-1 touch-pan-x"
            onTouchMove={handleTouchMove}
            onTouchEnd={handleEnd}
        >
            {PALETTE.map((hex) => (
                <button
                    key={hex}
                    data-hex={hex}
                    onMouseDown={() => handleMove(0, 0)} // placeholder
                    onClick={() => onSelect(hex)}
                    className={`w-full aspect-square rounded-full border-2 transition-all active:scale-95 ${localFill === hex
                        ? 'border-orange-500 scale-110 shadow-lg shadow-orange-500/30'
                        : 'border-white/10'
                        }`}
                    style={{ backgroundColor: hex }}
                />
            ))}
        </div>
    );
};

const CustomColorToggle = ({ value, onChange, label = "Custom", object, fabricCanvas }) => {
    const [show, setShow] = useState(false);
    const [localColor, setLocalColor] = useState(value);
    const containerRef = useRef(null);
    const safeColor = (typeof localColor === 'string' && localColor.startsWith('#')) ? localColor : '#ffffff';

    // Update local state if external value changes (but not during active picking)
    useEffect(() => {
        setLocalColor(value);
    }, [value]);

    useEffect(() => {
        if (show && containerRef.current) {
            setTimeout(() => {
                containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 150);
        }
    }, [show]);

    const handlePickerChange = (color) => {
        setLocalColor(color);
        // Direct Live Update bypasses Redux for butter-smooth feel
        const isValidHex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(color);
        if (isValidHex && fabricCanvas && object) {
            const currentProps = object.props || object;
            // Determine if we're updating fill or stroke (heuristic)
            const propKey = label.toLowerCase().includes('outline') ? 'stroke' : 'fill';
            liveUpdateFabric(fabricCanvas, object.id, { [propKey]: color }, currentProps, object);
        }
    };

    const handleCommit = (color) => {
        onChange(color); // Sync to Redux
    };

    return (
        <div className="flex flex-col gap-3" ref={containerRef}>
            <div
                className={`flex items-center gap-3 bg-slate-800/60 border rounded-xl px-3 py-2.5 cursor-pointer transition-all hover:bg-slate-800/80 ${show ? 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'border-white/10'}`}
                onClick={() => {
                    setShow(!show);
                }}
            >
                <div className="w-6 h-6 rounded-full border-2 border-white/20 shrink-0 shadow-sm" style={{ backgroundColor: safeColor }} />
                <span className="text-xs text-slate-200 font-mono flex-1 uppercase tracking-widest">{safeColor}</span>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{label}</span>
                    <div className={`text-slate-500 transition-transform duration-300 ${show ? 'rotate-180' : ''}`}>
                        <ArrowDown size={14} />
                    </div>
                </div>
            </div>
            {show && (
                <div
                    className="flex flex-col gap-4 p-4 bg-slate-900/40 rounded-2xl border border-white/5 animate-in fade-in zoom-in-95 duration-200"
                >
                    <div onPointerUp={() => handleCommit(localColor)}>
                        <HexColorPicker
                            color={safeColor}
                            onChange={handlePickerChange}
                            className="w-full !h-48"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 bg-slate-800/40 rounded-lg px-2 py-1.5 border border-white/5">
                            <span className="text-[9px] text-slate-500 uppercase font-bold">HEX</span>
                            <input
                                type="text"
                                value={localColor}
                                onChange={(e) => {
                                    let val = e.target.value;
                                    // Auto-prefix # if user types hex chars without it
                                    if (val && !val.startsWith('#') && /^[A-Fa-f0-9]{1,6}$/.test(val)) {
                                        val = '#' + val;
                                    }
                                    setLocalColor(val);

                                    const isValidHex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(val);
                                    if (isValidHex) {
                                        handlePickerChange(val); // Update Live
                                        handleCommit(val); // Update Redux
                                    }
                                }}
                                className="bg-transparent text-xs text-white font-mono w-full focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={() => {
                                handleCommit(localColor);
                                setShow(false);
                            }}
                            className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase py-1.5 rounded-lg border border-orange-500/20 transition-all"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const PALETTE = [
    // Neutrals
    '#ffffff', '#f1f5f9', '#94a3b8', '#64748b', '#334155', '#0f172a', '#000000',
    // Warm
    '#fef3c7', '#fde68a', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e',
    // Orange / Red
    '#fed7aa', '#fb923c', '#f97316', '#ef4444', '#dc2626', '#b91c1c', '#991b1b',
    '#fbcfe8', '#f472b6', '#ec4899', '#a855f7', '#9333ea', '#7c3aed', '#4f46e5',
    // Blue / Cyan
    '#bfdbfe', '#60a5fa', '#3b82f6', '#06b6d4', '#0ea5e9', '#0284c7', '#1d4ed8',
    // Green
    '#bbf7d0', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d',
];

const GradientFillPicker = ({ currentFill, onChange, label, object, fabricCanvas }) => {
    const gradState = parseGradientState(currentFill);
    const [fillMode, setFillMode] = useState(gradState.mode);
    const [gradType, setGradType] = useState(gradState.type);
    const [gradAngle, setGradAngle] = useState(gradState.angle);
    const [fromColor, setFromColor] = useState(gradState.from);
    const [toColor, setToColor] = useState(gradState.to);
    const [open, setOpen] = useState(!label); // collapse by default if it has a label
    const solidColor = typeof currentFill === 'string' ? currentFill : (gradState.from || '#ffffff');

    const applyColor = (val) => {
        onChange(val);
    };

    const applyGradient = (f = fromColor, t = toColor, a = gradAngle, gt = gradType) => {
        const grad = buildGradient(gt, a, f, t);
        applyColor(grad);
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Collapsed Trigger Button */}
            {label && (
                <button
                    onClick={() => setOpen(!open)}
                    className="w-full flex items-center gap-3 bg-slate-800/50 border border-white/10 rounded-xl px-3 py-2.5 transition-all group"
                >
                    <div className="w-6 h-6 rounded-full border-2 border-white/20 shrink-0" style={{ background: fillMode === 'solid' ? solidColor : gradientToCSS(fromColor, toColor, gradAngle) }} />
                    <span className="text-xs font-bold text-slate-300 flex-1 text-left uppercase tracking-wider">{label}</span>
                    <span className={`text-slate-500 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
                </button>
            )}

            {/* Expanded Content */}
            {open && (
                <div className={label ? "flex flex-col gap-4 pl-2 border-l-2 border-slate-700/50 ml-3 pt-2" : "flex flex-col gap-4"}>
                    {/* Tab toggle */}
                    <div className="flex p-1 bg-slate-900/80 rounded-xl border border-white/5">
                        {['solid', 'gradient'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setFillMode(mode)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${fillMode === mode
                                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {mode === 'solid' ? '◼ Solid' : '◑ Gradient'}
                            </button>
                        ))}
                    </div>

                    {fillMode === 'solid' ? (
                        <div className="flex flex-col gap-3">
                            <ScrubbablePalette
                                currentFill={currentFill}
                                onSelect={(hex) => applyColor(hex)}
                                PALETTE={PALETTE}
                                object={object}
                                fabricCanvas={fabricCanvas}
                                targetProp="fill"
                            />
                            <CustomColorToggle
                                value={solidColor}
                                onChange={(val) => applyColor(val)}
                                object={object}
                                fabricCanvas={fabricCanvas}
                                label={label || 'Custom'}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {/* Preset pills */}
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                                {GRADIENT_PRESETS.map((p) => (
                                    <button
                                        key={p.name}
                                        onClick={() => {
                                            setFromColor(p.from); setToColor(p.to);
                                            setGradAngle(p.angle); setGradType('linear');
                                            applyGradient(p.from, p.to, p.angle, 'linear');
                                        }}
                                        className="shrink-0 flex flex-col items-center gap-1 group"
                                    >
                                        <div
                                            className="w-10 h-10 rounded-full border-2 border-white/10 group-hover:border-orange-400 transition-all shadow"
                                            style={{ background: gradientToCSS(p.from, p.to, p.angle) }}
                                        />
                                        <span className="text-[9px] text-slate-500 group-hover:text-orange-400 transition-colors">{p.name}</span>
                                    </button>
                                ))}
                            </div>

                            {/* From / To pickers */}
                            <div className="flex flex-col gap-2">
                                <CustomColorToggle
                                    label="Gradient Start"
                                    value={fromColor}
                                    onChange={(val) => { setFromColor(val); applyGradient(val, toColor); }}
                                    object={object}
                                    fabricCanvas={fabricCanvas}
                                />
                                <CustomColorToggle
                                    label="Gradient End"
                                    value={toColor}
                                    onChange={(val) => { setToColor(val); applyGradient(fromColor, val); }}
                                    object={object}
                                    fabricCanvas={fabricCanvas}
                                />
                            </div>

                            {/* Live preview bar */}
                            <div
                                className="h-8 rounded-xl border border-white/10 shadow-inner"
                                style={{ background: gradientToCSS(fromColor, toColor, gradAngle) }}
                            />

                            {/* Linear / Radial toggle */}
                            <div className="flex gap-2">
                                {['linear', 'radial'].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => { setGradType(t); applyGradient(fromColor, toColor, gradAngle, t); }}
                                        className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${gradType === t
                                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                                            : 'bg-slate-800/60 border-white/10 text-slate-500 hover:text-white'
                                            }`}
                                    >
                                        {t === 'linear' ? '↗ Linear' : '◎ Radial'}
                                    </button>
                                ))}
                            </div>

                            {/* Angle slider */}
                            {gradType === 'linear' && (
                                <div className="flex items-center gap-3">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 w-12 shrink-0">Angle</span>
                                    <input
                                        type="range" min={0} max={360} step={5} value={gradAngle}
                                        className="flex-1 accent-orange-500 h-1.5 cursor-pointer"
                                        onChange={(e) => { const a = Number(e.target.value); setGradAngle(a); applyGradient(fromColor, toColor, a, gradType); }}
                                    />
                                    <span className="text-xs text-slate-300 w-9 text-right font-mono shrink-0">{gradAngle}°</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function PropertyControlBox({ activeProperty, object, updateObject, onClose, fabricCanvas, updateDpiForObject, onAiLoadingStart, onAiLoadingEnd, printDimensions = { w: 4500, h: 5400 } }) {
    if (!activeProperty || !object) return null;

    const fileInputRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const getValue = (key) => object.props?.[key] ?? object[key];
    const handleUpdate = (key, value) => updateObject(object.id, { [key]: value });

    // --- AUTO DPI HANDLER ---
    const handleAutoDpi = () => {
        if (!object || !fabricCanvas || object.type !== 'image') return;

        const currentScaleX = getValue('scaleX') || 1;
        const currentScaleY = getValue('scaleY') || 1;
        console.log(printDimensions)
        // Use actual logical canvas dimensions (visualWidth / zoom)
        const dpiInfo = calculateImageDPI(
            { 
                ...object, 
                originalWidth: object.originalWidth || object.props?.originalWidth,
                originalHeight: object.originalHeight || object.props?.originalHeight,
                getScaledWidth: () => (object.props?.width || object.width || 0) * currentScaleX, 
                getScaledHeight: () => (object.props?.height || object.height || 0) * currentScaleY 
            },
            fabricCanvas.width / fabricCanvas.getZoom(),
            fabricCanvas.height / fabricCanvas.getZoom(),
            printDimensions.w || 4500,
            printDimensions.h || 5400
        );

        if (dpiInfo && dpiInfo.dpi < 300) {
            const correctionFactor = dpiInfo.dpi / 300;
            const newScaleX = currentScaleX * correctionFactor;
            const newScaleY = currentScaleY * correctionFactor;

            // Update Fabric Live
            liveUpdateFabric(fabricCanvas, object.id, { scaleX: newScaleX, scaleY: newScaleY }, object.props, object);

            // Commit to Redux
            updateObject(object.id, { scaleX: newScaleX, scaleY: newScaleY });
            updateDpiForObject(fabricCanvas.getObjects().find(o => o.customId === object.id))
        }
    };

    // 🔤 BULLETPROOF FONT LOADER (Mobile Version)
    const handleFontChange = (newFont) => {
        // Instantly update the Redux state so the UI button highlights immediately
        // handleUpdate('fontFamily', newFont);

        const applyToFabric = () => {
            if (!fabricCanvas) return;

            const activeObj = fabricCanvas.getObjects().find(o => o.customId === object.id);
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

                // Final commit to ensure state is perfectly synced
                updateObject(object.id, { fontFamily: newFont });
                setTimeout(() => {
                    fabricCanvas.requestRenderAll();
                }, 1000)
            }
        };

        const loadWebFont = () => {
            window.WebFont.load({
                google: { families: [`${newFont}:400,700,400i,700i`] },
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

        // Inject WebFontLoader if it isn't already on the page
        if (!window.WebFont) {
            const script = document.createElement('script');
            script.src = 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js';
            script.onload = loadWebFont;
            document.head.appendChild(script);
        } else {
            loadWebFont();
        }
    };

    // --- RENDERERS ---

    const renderColorPicker = (targetProp) => {
        const currentFill = getValue(targetProp);
        return (
            <div className="flex flex-col gap-4">
                <ScrubbablePalette
                    currentFill={currentFill}
                    onSelect={(hex) => handleUpdate(targetProp, hex)}
                    PALETTE={PALETTE}
                    object={object}
                    fabricCanvas={fabricCanvas}
                    targetProp={targetProp}
                />
                <CustomColorToggle
                    value={currentFill}
                    onChange={(val) => handleUpdate(targetProp, val)}
                    object={object}
                    fabricCanvas={fabricCanvas}
                    label={targetProp}
                />
            </div>
        );
    };

    const renderFillPicker = (targetProp) => {
        if (object.type === 'svg' && object.props.colorMap && Object.keys(object.props.colorMap).length > 0) {
            return (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block border-b border-white/5 pb-2 mb-3">Graphic Colors</label>
                    <div className="grid grid-cols-1 gap-2">
                        {Object.entries(object.props.colorMap).map(([originalColor, currentColor], index) => (
                            <GradientFillPicker
                                key={originalColor}
                                label={`Color Path ${index + 1}`}
                                currentFill={currentColor}
                                onChange={(val) => {
                                    const newMap = { ...object.props.colorMap, [originalColor]: val };
                                    handleUpdate('colorMap', newMap);
                                }}
                                object={object}
                                fabricCanvas={fabricCanvas}
                            />
                        ))}
                    </div>
                </div>
            );
        }
        return (
            <GradientFillPicker
                currentFill={getValue(targetProp)}
                onChange={(val) => handleUpdate(targetProp, val)}
                object={object}
                fabricCanvas={fabricCanvas}
            />
        );
    };



    const renderShadow = () => (
        <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-1">
            <div className="mb-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase mb-2 block tracking-wider">Shadow Color</span>
                {renderColorPicker('shadowColor')}
            </div>
            <LiveSlider label="Blur" value={getValue('shadowBlur') ?? 0} min={0} max={50} step={1} propKey="shadowBlur" object={object} updateObject={updateObject} fabricCanvas={fabricCanvas} />
            <div className='flex flex-row gap-4'>
                <LiveSlider label="Offset X" value={getValue('shadowOffsetX') ?? 0} min={-20} max={20} step={1} propKey="shadowOffsetX" object={object} updateObject={updateObject} fabricCanvas={fabricCanvas} />
                <LiveSlider label="Offset Y" value={getValue('shadowOffsetY') ?? 0} min={-20} max={20} step={1} propKey="shadowOffsetY" object={object} updateObject={updateObject} fabricCanvas={fabricCanvas} />
            </div>
        </div>
    );

    const handleRemoveBg = async () => {
        if (!object.props?.src || isProcessing) return;
        setIsProcessing(true);
        try {
            if (onAiLoadingStart) onAiLoadingStart('Removing Background...', 'The Cosmic AI is separating the subject from the void.');
            const newUrl = await processBackgroundRemoval(object.props.src);
            if (newUrl) {
                const fabricObj = fabricCanvas.getObjects().find(o => o.customId === object.id);
                if (fabricObj) {
                    const imgElement = new Image();
                    imgElement.src = newUrl;
                    imgElement.onload = () => {
                        fabricObj.setElement(imgElement);
                        fabricObj.set({
                            proxy_src: newUrl,
                            print_src: newUrl,
                            originalWidth: imgElement.width,
                            originalHeight: imgElement.height,
                        });
                        fabricObj.setCoords();
                        fabricCanvas.requestRenderAll();
                        setIsProcessing(false);
                        onClose();

                        updateObject(object.id, {
                            proxy_src: newUrl,
                            print_src: newUrl,
                            originalWidth: imgElement.width,
                            originalHeight: imgElement.height,
                            src: newUrl
                        });
                    };
                } else {
                    setIsProcessing(false);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsProcessing(false);
            if (onAiLoadingEnd) onAiLoadingEnd();
        }
    };

    const renderAutoDpi = () => (
        <div className="flex flex-col gap-4 py-2">
            <div className="bg-slate-800/30 rounded-xl p-4 border border-white/5">
                <div className="mb-3">
                    <p className="text-sm text-slate-300 font-medium">Upscale Quality</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Use AI to enhance to 300 DPI print quality.</p>
                </div>
                <button
                    onClick={handleAutoDpi}
                    className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all border border-white/5 bg-slate-800 hover:bg-slate-700 text-white"
                >
                    <Maximize2 size={18} className="text-blue-400" />
                    Auto-Fix Scale
                </button>
            </div>
        </div>
    );

    const renderRemoveBg = () => (
        <div className="flex flex-col gap-4 py-2">
            <div className="bg-slate-800/30 rounded-xl p-4 border border-white/5">
                <div className="mb-3">
                    <p className="text-sm text-slate-300 font-medium">Background Removal</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Use AI to isolate the subject.</p>
                </div>
                <button
                    onClick={handleRemoveBg}
                    disabled={isProcessing}
                    className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all border border-white/5 ${isProcessing ? 'bg-slate-800 text-slate-400' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                >
                    {isProcessing ? <Loader2 className="animate-spin text-orange-500" size={18} /> : <Eraser size={18} className="text-orange-500" />}
                    {isProcessing ? "Processing..." : "Remove Background"}
                </button>
            </div>
        </div>
    );

    const renderReplace = () => (
        <div className="flex flex-col gap-4 items-center py-4">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        const localUrl = URL.createObjectURL(file);
                        updateObject(object.id, { src: localUrl });
                        const fabricObj = fabricCanvas.getObjects().find(o => o.customId === object.id);
                        if (fabricObj) {
                            fabricObj.setSrc(localUrl, () => fabricCanvas.requestRenderAll());
                        }
                        onClose();
                    }
                }}
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-white transition-all active:scale-95"
            >
                <ImagePlus size={20} className="text-blue-400" />
                <span>Upload New Image</span>
            </button>
        </div>
    );

    const renderLayerTools = () => {
        const moveLayer = (direction) => {
            const fabricObj = fabricCanvas.getObjects().find(o => o.customId === object.id);
            if (!fabricObj) return;
            if (direction === 'up') fabricCanvas.bringObjectForward(fabricObj);
            if (direction === 'down') fabricCanvas.sendObjectBackwards(fabricObj);
            if (direction === 'front') fabricCanvas.bringObjectToFront(fabricObj);
            if (direction === 'back') fabricCanvas.sendObjectToBack(fabricObj);
            fabricCanvas.requestRenderAll();
        };

        return (
            <div className="grid grid-cols-2 gap-3">
                {[
                    { label: "Forward", icon: ArrowUp, fn: () => moveLayer('up') },
                    { label: "Backward", icon: ArrowDown, fn: () => moveLayer('down') },
                    { label: "To Front", icon: ArrowUpFromLine, fn: () => moveLayer('front') },
                    { label: "To Back", icon: ArrowDownToLine, fn: () => moveLayer('back') },
                ].map((action, i) => (
                    <button key={i} onClick={action.fn} className="p-3 bg-slate-800 rounded-xl flex flex-col items-center gap-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white border border-white/5 active:scale-95 transition-all">
                        <action.icon size={20} className="text-slate-400 group-hover:text-white" />
                        {action.label}
                    </button>
                ))}
            </div>
        );
    };

    // --- MAIN SWITCHER ---
    let content = null;
    let title = "";

    // ✅ SMART TITLE & CONTENT
    switch (activeProperty) {
        case 'fill': title = "Color"; content = renderFillPicker('fill'); break;

        // 🔄 SMART SIZE / TRANSFORM PANEL
        case 'fontSize': // Maps to "Size" icon in Dock
        case 'transform':
        case 'size':
            if (object.type === 'text' || object.type === 'i-text') {
                title = "Text Size";
                content = <LiveSlider label="Size" value={getValue('fontSize')} min={10} max={200} step={1} propKey="fontSize" object={object} updateObject={updateObject} fabricCanvas={fabricCanvas} />;
            } else {
                title = "Dimensions";
                content = (
                    <div className="flex flex-col gap-1">
                        <LiveSlider label="Scale X" value={getValue('scaleX') || 1} min={0.1} max={5} step={0.01} propKey="scaleX" object={object} updateObject={updateObject} fabricCanvas={fabricCanvas} />
                        <LiveSlider label="Scale Y" value={getValue('scaleY') || 1} min={0.1} max={5} step={0.01} propKey="scaleY" object={object} updateObject={updateObject} fabricCanvas={fabricCanvas} />
                    </div>
                );
            }
            break;

        case 'opacity': title = "Opacity"; content = <LiveSlider label="Opacity" value={(getValue('opacity') || 1) * 100} min={0} max={100} step={5} propKey="opacity" object={object} updateObject={updateObject} fabricCanvas={fabricCanvas} displayMultiplier={100} />; break;

        case 'radius':
            title = "Roundness";
            const isRect = object.type === 'rect';
            content = (
                <LiveSlider
                    label="Radius"
                    value={getValue(isRect ? 'rx' : 'radius') ?? 0}
                    min={0} max={isRect ? 100 : 40} step={1}
                    propKey={isRect ? 'rx' : 'radius'}
                    object={object}
                    updateObject={updateObject}
                    fabricCanvas={fabricCanvas}
                    onCommitOverride={(val) => {
                        if (isRect) updateObject(object.id, { rx: val, ry: val });
                        else updateObject(object.id, { radius: val });
                    }}
                />
            );
            break;

        case 'text': title = "Edit Text"; content = (
            <textarea
                value={getValue('text') || ""}
                onChange={(e) => handleUpdate('text', e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.blur();
                    }
                }}
                className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:border-orange-500 outline-none text-sm"
                rows={3}
            />
        ); break;
        case 'fontFamily': title = "Font"; content = (
            <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1">
                {AVAILABLE_FONTS.map(font => (
                    <button key={font} onClick={() => handleFontChange(font)} className={`text-left px-4 py-3 rounded-lg border transition-all ${getValue('fontFamily') === font ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-white/5 text-slate-300 hover:bg-white/5'}`} style={{ fontFamily: font }}>{font}</button>
                ))}
            </div>
        ); break;
        case 'format': title = "Text Style"; content = (
            <div className="flex flex-col gap-3">
                {/* Row 1: Bold, Italic, Underline */}
                <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl border border-white/5">
                    {[
                        { key: 'fontWeight', val: 'bold', icon: Bold, active: getValue('fontWeight') === 'bold', fn: () => handleUpdate('fontWeight', getValue('fontWeight') === 'bold' ? 'normal' : 'bold') },
                        { key: 'fontStyle', val: 'italic', icon: Italic, active: getValue('fontStyle') === 'italic', fn: () => handleUpdate('fontStyle', getValue('fontStyle') === 'italic' ? 'normal' : 'italic') },
                        { key: 'underline', val: true, icon: Underline, active: getValue('underline'), fn: () => handleUpdate('underline', !getValue('underline')) },
                    ].map((btn, i) => (
                        <button key={i} onClick={btn.fn} className={`flex-1 py-3 rounded-lg flex items-center justify-center transition-all ${btn.active ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}>
                            <btn.icon size={20} />
                        </button>
                    ))}
                </div>

                {/* ✅ Row 2: Alignment Options */}
                <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl border border-white/5">
                    {[
                        { val: 'left', icon: AlignLeft, active: getValue('textAlign') === 'left' || !getValue('textAlign'), fn: () => handleUpdate('textAlign', 'left') },
                        { val: 'center', icon: AlignCenter, active: getValue('textAlign') === 'center', fn: () => handleUpdate('textAlign', 'center') },
                        { val: 'right', icon: AlignRight, active: getValue('textAlign') === 'right', fn: () => handleUpdate('textAlign', 'right') },
                    ].map((btn, i) => (
                        <button key={`align-${i}`} onClick={btn.fn} className={`flex-1 py-3 rounded-lg flex items-center justify-center transition-all ${btn.active ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}>
                            <btn.icon size={20} />
                        </button>
                    ))}
                </div>
            </div>
        ); break;
        case 'effect': title = "Text Effects"; content = (
            <div className="flex flex-col gap-4">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {[{ id: 'none', icon: <Ban size={20} />, label: 'None' }, { id: 'circle', icon: <Circle size={20} />, label: 'Circle' }, { id: 'arc-up', icon: <Smile size={20} />, label: 'Arc Up' }, { id: 'arc-down', icon: <Frown size={20} />, label: 'Arc Down' }, { id: 'flag', icon: <Flag size={20} />, label: 'Flag' }].map(e => (
                        <button key={e.id} onClick={() => handleUpdate('textEffect', e.id)} className={`flex flex-col items-center justify-center gap-1 min-w-[64px] h-[64px] rounded-xl border transition-all ${getValue('textEffect') === e.id ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-slate-800/50 border-white/5 text-slate-400'}`}>{e.icon}<span className="text-[9px] font-bold uppercase">{e.label}</span></button>
                    ))}
                </div>
                <div className='flex flex-row gap-4'>
                    {['circle', 'arc-up', 'arc-down'].includes(getValue('textEffect')) && <LiveSlider label="Curve" value={getValue('radius') ?? 150} min={10} max={600} step={10} propKey="radius" object={object} updateObject={updateObject} fabricCanvas={fabricCanvas} />}
                    {['arc-up', 'arc-down'].includes(getValue('textEffect')) && <LiveSlider label="Angle" value={getValue('arcAngle') ?? 120} min={10} max={360} step={5} propKey="arcAngle" object={object} updateObject={updateObject} fabricCanvas={fabricCanvas} />}
                    {getValue('textEffect') === 'flag' && <LiveSlider label="Wave" value={getValue('flagVelocity') ?? 50} min={0} max={100} step={1} propKey="flagVelocity" object={object} updateObject={updateObject} fabricCanvas={fabricCanvas} />}
                </div>
            </div>
        ); break;

        case 'outline': title = "Outline"; content = (
            <div className="flex flex-col gap-2">
                <div className="mb-2"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Color</span>{renderColorPicker('stroke')}</div>
                <LiveSlider label="Thickness" value={getValue('strokeWidth') ?? 0} min={0} max={10} step={0.5} propKey="strokeWidth" object={object} updateObject={updateObject} fabricCanvas={fabricCanvas} />
            </div>
        ); break;

        case 'auto-dpi':
            title = "Print Quality";
            content = renderAutoDpi();
            break;

        case 'remove-bg':
            title = "Remove Background";
            content = renderRemoveBg();
            break;

        case 'replace': title = "Replace Image"; content = renderReplace(); break;
        case 'shadow': title = "Shadow"; content = renderShadow(); break;
        case 'layer': title = "Layer Order"; content = renderLayerTools(); break;
        default: return null;
    }

    return (
        <div
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="fixed bottom-[90px] left-3 right-3 z-50 bg-[#1e293b]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300"
        >
            <style>{PICKER_STYLES}</style>
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-3 border-b border-white/5 bg-white/5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</span>
                <button onClick={onClose} className="p-1.5 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                    <Check size={14} />
                </button>
            </div>
            {/* Body */}
            <div className="p-5 max-h-[50vh] overflow-y-auto custom-scrollbar scroll-smooth">
                {content}
            </div>
        </div>
    );
}