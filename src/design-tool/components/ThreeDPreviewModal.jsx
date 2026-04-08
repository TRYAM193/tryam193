// src/design-tool/components/ThreeDPreviewModal.jsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag, X, Box, Image as ImageIcon, Settings2, Move, Maximize2 } from "lucide-react";
import Tshirt3DPreview from '../preview3d/Tshirt3DPreview';

export function ThreeDPreviewModal({
    isOpen,
    onClose,
    textures,
    onAddToCart,
    isSaving,
    productId,
    productData = {},
    selectedColor
}) {
    const has3D = !!productData.model3d;
    // 🧮 HELPER: Calculates perceived brightness of a hex color (0 to 255)
    const getBrightness = (hexColor) => {
        if (!hexColor) return 255;
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) || 255;
        const g = parseInt(hex.substring(2, 2), 16) || 255;
        const b = parseInt(hex.substring(4, 2), 16) || 255;
        // Standard luminance formula
        return (r * 299 + g * 587 + b * 114) / 1000;
    };

    // Fallback to empty objects if data is missing
    const mockups = productData.mockups || {};
    const shadows = productData.shadows || {}; // NEW: Separate shadow maps
    const highlights = productData.highlights || {}; // NEW: Separate highlight maps

    const mockupKeys = Object.keys(mockups);

    // ✅ 1. DETECT MUG
    const isMug = productData?.title?.toLowerCase().includes("mug") ||
        productData?.category?.toLowerCase().includes("mug");

    const [viewMode, setViewMode] = useState('2d');
    const [activeSide, setActiveSide] = useState(mockupKeys[0] || 'front');

    const [adjustments, setAdjustments] = useState({
        top: 25,
        left: 0,
        width: 100,
        height: 50
    });

    // 🟢 NEW: Calculate exact brightness to prevent washing out designs on light shirts!
    const brightness = getBrightness(selectedColor);
    const highlightOpacity = brightness > 200 ? 0.05 : (brightness < 50 ? 0.25 : 0.15);

    useEffect(() => {
        if (isOpen) {
            if (isMug && has3D) {
                setViewMode('3d');
            } else {
                setViewMode('2d');
            }
            setActiveSide(mockupKeys[0] || 'front');
        }
    }, [isOpen, productId, isMug, has3D]);

    useEffect(() => {
        const defaults = productData.print_area_2d?.[activeSide] || { top: 20, left: 30, width: 40, height: 40 };
        setAdjustments({
            top: defaults.top,
            left: defaults.left,
            width: defaults.width,
            height: defaults.height || defaults.width || 40
        });
    }, [activeSide, productData]);

    const getCurrentTexture = () => {
        if (isMug) return textures.front?.url;
        if (activeSide === 'left' || activeSide === 'right') return textures.front?.url;
        return textures[activeSide]?.url;
    };

    const currentTexture = getCurrentTexture();

    const handleAdjustment = (key, value) => {
        setAdjustments(prev => ({ ...prev, [key]: parseFloat(value) }));
    };

    const getMugShift = () => {
        if (!isMug) return '0%';
        switch (activeSide) {
            case 'left': return '0%';
            case 'front': return '-100%';
            case 'right': return '-200%';
            default: return '0%';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[100vw] sm:w-[95vw] h-[100dvh] sm:h-[95dvh] sm:max-w-7xl p-0 gap-0 bg-transparent border-0 overflow-hidden rounded-2xl shadow-[0_0_150px_rgba(0,0,0,0.6)] [&>button]:hidden">
                <DialogTitle className="sr-only">Premium Design Preview</DialogTitle>
                <DialogDescription className="sr-only">Experience your design in stunning 2D or interactive 3D.</DialogDescription>

                {/* Glassmorphic Base */}
                <div className="absolute inset-0 bg-[#060913]/90 backdrop-blur-3xl" />

                {/* Ambient Cinematic Lights */}
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="relative flex flex-col w-full h-full z-10 border border-white/10 sm:rounded-2xl overflow-hidden ring-1 ring-white/5">
                    {/* --- HEADER --- */}
                    <div className="h-16 border-b border-white/5 flex items-center justify-between px-2 sm:px-6 bg-white/5 backdrop-blur-md z-30 flex-shrink-0 shadow-sm">
                        
                        {/* Live Badge (Responsive) */}
                        <div className="w-[15%] sm:w-1/4 flex items-center justify-start pl-2 sm:pl-0">
                            {/* Desktop Full Badge */}
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                <span className="text-[10px] font-extrabold text-red-400 tracking-[0.2em] uppercase">Live View</span>
                            </div>
                            {/* Mobile Dot Only */}
                            <div className="flex sm:hidden items-center justify-center">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                            </div>
                        </div>

                        {/* View Switcher (Center Flex) */}
                        <div className="flex-1 flex justify-center min-w-0">
                            <div className="flex p-0.5 sm:p-1 bg-black/40 rounded-full border border-white/5 shadow-inner">
                                {!isMug && (
                                    <button
                                        onClick={() => setViewMode('2d')}
                                        className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-300 ${viewMode === '2d' ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25" : "text-zinc-400 hover:text-white"
                                            }`}
                                    >
                                        <ImageIcon size={14} className="hidden sm:block" /> Studio 2D
                                    </button>
                                )}
                                <button
                                    onClick={() => has3D && setViewMode('3d')}
                                    disabled={!has3D}
                                    className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-300 ${viewMode === '3d' ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25" : "text-zinc-400 hover:text-white"
                                        } ${!has3D ? "opacity-30 cursor-not-allowed bg-transparent hover:text-zinc-400" : ""}`}
                                >
                                    <Box size={14} className="hidden sm:block" />
                                    {has3D ? "Interactive 3D" : "No 3D"}
                                </button>
                            </div>
                        </div>

                        {/* Close Button */}
                        <div className="w-[15%] sm:w-1/4 flex justify-end pr-1 sm:pr-0">
                            <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                                <X size={18} />
                            </Button>
                        </div>
                    </div>

                    {/* --- MAIN STAGE --- */}
                    <div className="flex-1 relative w-full bg-transparent no-scrollbar overflow-hidden flex">

                        {/* === LEFT: PREVIEW AREA === */}
                        <div className="flex-1 relative flex flex-col min-w-0">
                            {viewMode === '2d' && (
                                <div className="relative w-full h-full flex flex-col">
                                    <div className="flex-1 flex items-center no-scrollbar justify-center relative p-8 sm:p-12 overflow-auto">
                                        
                                        {/* Cinematic Studio Backdrop Overlay */}
                                        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent opacity-80" />

                                        {/* 🖼️ MOCKUP CONTAINER */}
                                        <div className="relative w-full max-w-[500px] aspect-[3/4] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden bg-transparent flex-shrink-0 group animate-in slide-in-from-bottom-8 fade-in duration-700 ease-out">

                                            {/* 🪄 LAYER 1: BASE COLOR (Z-0) */}
                                            <div
                                                className="absolute inset-0 w-full h-full z-0 transition-colors duration-500"
                                                style={{
                                                    backgroundColor: selectedColor || '#ffffff',
                                                    maskImage: `url(${mockups[activeSide]})`,
                                                    maskSize: 'contain',
                                                    maskRepeat: 'no-repeat',
                                                    maskPosition: 'center',
                                                    WebkitMaskImage: `url(${mockups[activeSide]})`,
                                                    WebkitMaskSize: 'contain',
                                                    WebkitMaskRepeat: 'no-repeat',
                                                    WebkitMaskPosition: 'center',
                                                }}
                                            />

                                            {/* 🌑 LAYER 2: SHADOWS (Z-10) */}
                                            {(shadows[activeSide] || mockups[activeSide]) && (
                                                <img
                                                    src={shadows[activeSide] || mockups[activeSide]}
                                                    alt={`${activeSide} shadows`}
                                                    className="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none transition-opacity duration-300"
                                                    style={{ mixBlendMode: 'multiply' }}
                                                />
                                            )}

                                            {/* ☕ LAYER 2.5: MUG SHADOW (Only for mugs) */}
                                            {isMug && (
                                                <div
                                                    className="absolute inset-0 z-15 pointer-events-none"
                                                    style={{
                                                        background: `linear-gradient(to right, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.05) 25%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0.0) 50%, rgba(0,0,0,0.05) 75%, rgba(0,0,0,0.4) 100%)`,
                                                        mixBlendMode: 'multiply'
                                                    }}
                                                />
                                            )}

                                            {/* 🎨 LAYER 3: USER DESIGN (Z-20) */}
                                            {activeSide === 'front' && (productData.print_area_2d?.left_chest || productData.print_area_2d?.right_chest) ? (
                                                ['left_chest', 'right_chest'].map(chestKey => {
                                                    const chestTexture = textures[chestKey]?.url;
                                                    const area = productData.print_area_2d[chestKey];

                                                    if (!chestTexture || !area) return null;

                                                    return (
                                                        <div
                                                            key={chestKey}
                                                            className="absolute z-20 overflow-hidden"
                                                            style={{
                                                                top: `${area.top}%`,
                                                                left: `${area.left}%`,
                                                                width: `${area.width}%`,
                                                                height: `${area.height}%`,
                                                            }}
                                                        >
                                                            <img src={chestTexture} alt={chestKey} className="w-full h-full object-fill animate-in fade-in duration-500" style={{
                                                                position: 'absolute',
                                                                transition: 'left 0.4s ease-in-out',
                                                            }} />
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                currentTexture && (
                                                    <div
                                                        className="absolute z-20 overflow-hidden"
                                                        style={{
                                                            top: `${adjustments.top - 1}%`,
                                                            left: `${adjustments.left - 3}%`,
                                                            width: `${adjustments.width + 5}%`,
                                                            height: `${adjustments.height + 2}%`,
                                                        }}
                                                    >
                                                        {isMug ? (
                                                            <div className="relative w-full h-full">
                                                                <img
                                                                    src={currentTexture}
                                                                    alt="design"
                                                                    style={{
                                                                        width: '300%',
                                                                        maxWidth: 'none',
                                                                        height: '100%',
                                                                        position: 'absolute',
                                                                        top: 0,
                                                                        left: getMugShift(),
                                                                        transition: 'left 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                        objectFit: 'fill'
                                                                    }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <img src={currentTexture} alt="design" className="w-full h-full object-fill animate-in fade-in duration-500" />
                                                        )}
                                                    </div>
                                                )
                                            )}

                                            {/* ✨ LAYER 4: HIGHLIGHTS (Z-30) */}
                                            {(highlights[activeSide] || mockups[activeSide]) && (
                                                <img
                                                    src={highlights[activeSide] || mockups[activeSide]}
                                                    alt={`${activeSide} highlights`}
                                                    className="absolute inset-0 w-full h-full object-contain z-30 pointer-events-none"
                                                    style={{
                                                        mixBlendMode: 'screen',
                                                        opacity: highlightOpacity
                                                    }}
                                                />
                                            )}

                                            {/* Fallback text if completely missing data */}
                                            {!mockups[activeSide] && !currentTexture && (
                                                <div className="absolute inset-0 w-full h-full flex items-center justify-center text-zinc-500 z-50 font-medium tracking-wider">
                                                    No Mockup Available
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Text-Based Side Switchers */}
                                    {mockupKeys.length > 1 && (
                                        <div className="h-24 border-t border-white/5 bg-black/30 backdrop-blur-2xl flex items-center justify-center flex-shrink-0 relative z-20 px-4">
                                            <div className="flex p-1.5 bg-black/60 rounded-full border border-white/10 shadow-inner overflow-hidden gap-1">
                                                {mockupKeys.map(side => (
                                                    <button
                                                        key={side}
                                                        onClick={() => setActiveSide(side)}
                                                        className={`px-8 py-2.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] transition-all duration-300 ${
                                                            activeSide === side 
                                                                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-[0_0_25px_rgba(249,115,22,0.4)]" 
                                                                : "text-zinc-500 hover:text-white hover:bg-white/5"
                                                        }`}
                                                    >
                                                        {side.replace('_', ' ')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* === 3D VIEW === */}
                            {viewMode === '3d' && has3D && (
                                <div className="w-full h-full relative animate-in fade-in zoom-in-95 duration-500">
                                    <Tshirt3DPreview
                                        modelUrl={productData.model3d}
                                        textures={{
                                            front: textures.front?.url,
                                            back: textures.back?.url,
                                            leftSleeve: textures.leftSleeve?.url,
                                            rightSleeve: textures.rightSleeve?.url
                                        }}
                                        color={selectedColor || '#ffffff'}
                                    />
                                    {/* 3D Vignette / Depth Effect overlay */}
                                    <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}