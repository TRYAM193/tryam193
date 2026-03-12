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

    // Detect Pure Black for slight highlight adjustments
    const isPureBlack = selectedColor?.toLowerCase() === '#000000' || selectedColor?.toLowerCase() === '#000';

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
        switch(activeSide) {
            case 'left': return '0%';
            case 'front': return '-100%';
            case 'right': return '-200%';
            default: return '0%';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[100vw] h-[100vh] p-0 gap-0 bg-zinc-950 border-zinc-800 flex flex-col overflow-hidden rounded-xl shadow-2xl">
                <DialogTitle className="sr-only">Preview Design</DialogTitle>
                <DialogDescription className="sr-only">Preview your design in 2D or 3D</DialogDescription>

                {/* --- HEADER --- */}
                <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-900 z-10 flex-shrink-0">
                    <div className="flex gap-2 p-1 bg-black/40 rounded-lg border border-white/5">
                        
                        {!isMug && (
                            <button
                                onClick={() => setViewMode('2d')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                    viewMode === '2d' ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"
                                }`}
                            >
                                <ImageIcon size={16} /> 2D Mockup
                            </button>
                        )}
                        
                        <button
                            onClick={() => has3D && setViewMode('3d')}
                            disabled={!has3D}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                viewMode === '3d' ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"
                            } ${!has3D ? "opacity-40 cursor-not-allowed bg-transparent hover:text-zinc-400" : ""}`}
                        >
                            <Box size={16} /> 
                            {has3D ? "3D View" : "3D Not Available"}
                        </button>
                    </div>

                    <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-400 hover:text-white rounded-full hover:bg-white/10">
                        <X size={20} />
                    </Button>
                </div>

                {/* --- MAIN STAGE --- */}
                <div className="flex-1 relative w-full bg-zinc-900 overflow-hidden flex">
                    
                    {/* === LEFT: PREVIEW AREA === */}
                    <div className="flex-1 relative flex flex-col min-w-0">
                        {viewMode === '2d' && (
                            <div className="relative w-full h-full flex flex-col">
                                <div className="flex-1 flex items-center justify-center bg-zinc-900 p-8 overflow-auto">
                                    
                                    {/* 🖼️ MOCKUP CONTAINER */}
                                    <div className="relative w-full max-w-[500px] aspect-[3/4] shadow-2xl rounded-lg overflow-hidden bg-zinc-200 flex-shrink-0 group">
                                        
                                        {/* 🪄 LAYER 1: BASE COLOR (Z-0) */}
                                        <div 
                                            className="absolute inset-0 w-full h-full z-0 transition-colors duration-300"
                                            style={{ 
                                                backgroundColor: selectedColor,
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
                                        {/* Placed UNDER the design to give the shirt depth without darkening the ink */}
                                        {(shadows[activeSide] || mockups[activeSide]) && (
                                            <img 
                                                src={shadows[activeSide] || mockups[activeSide]} 
                                                alt={`${activeSide} shadows`} 
                                                className="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none"
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
                                        {/* NO mix-blend-mode: multiply! It sits cleanly on top of the dark shadows. */}
                                        {currentTexture && (
                                            <div 
                                                className="absolute z-20 border border-transparent hover:border-white/50 transition-colors overflow-hidden"
                                                style={{
                                                    top: `${adjustments.top}%`,
                                                    left: `${adjustments.left}%`,
                                                    width: `${adjustments.width}%`,
                                                    height: `${adjustments.height}%`,
                                                    // mixBlendMode removed to prevent the "trapped" dark look!
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
                                                                transition: 'left 0.4s ease-in-out',
                                                                objectFit: 'fill'
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <img src={currentTexture} alt="design" className="w-full h-full object-fill" />
                                                )}
                                            </div>
                                        )}

                                        {/* ✨ LAYER 4: HIGHLIGHTS (Z-30) */}
                                        {/* Placed OVER the design to give it a realistic 3D gloss/wrinkle reflection */}
                                        {(highlights[activeSide] || mockups[activeSide]) && (
                                            <img 
                                                src={highlights[activeSide] || mockups[activeSide]} 
                                                alt={`${activeSide} highlights`} 
                                                className="absolute inset-0 w-full h-full object-contain z-30 pointer-events-none"
                                                style={{ 
                                                    mixBlendMode: 'screen', 
                                                    opacity: isPureBlack ? 0.2 : 0.6 
                                                }} 
                                            />
                                        )}
                                        
                                        {/* Fallback text if completely missing data */}
                                        {!mockups[activeSide] && !currentTexture && (
                                            <div className="absolute inset-0 w-full h-full flex items-center justify-center text-zinc-500 z-50">
                                                No Mockup Available
                                            </div>
                                        )}

                                    </div>
                                </div>

                                {/* Side Selector Thumbnails */}
                                {mockupKeys.length > 1 && (
                                    <div className="h-24 border-t border-white/10 bg-zinc-950 flex items-center justify-center gap-4 flex-shrink-0">
                                        {mockupKeys.map(side => (
                                            <button
                                                key={side}
                                                onClick={() => setActiveSide(side)}
                                                className={`relative w-16 h-16 rounded-lg border-2 overflow-hidden transition-all bg-zinc-200 ${
                                                    activeSide === side ? "border-white scale-110" : "border-white/20 opacity-60 hover:opacity-100"
                                                }`}
                                            >
                                                <div 
                                                    className="absolute inset-0" 
                                                    style={{ 
                                                        backgroundColor: selectedColor,
                                                        maskImage: `url(${mockups[side]})`,
                                                        maskSize: 'cover',
                                                        WebkitMaskImage: `url(${mockups[side]})`,
                                                        WebkitMaskSize: 'cover'
                                                    }} 
                                                />
                                                
                                                <img 
                                                    src={shadows[side] || mockups[side]} 
                                                    alt={side} 
                                                    className="absolute inset-0 w-full h-full object-cover" 
                                                    style={{ mixBlendMode: 'multiply' }}
                                                />
                                                <img 
                                                    src={highlights[side] || mockups[side]} 
                                                    alt={side} 
                                                    className="absolute inset-0 w-full h-full object-cover" 
                                                    style={{ mixBlendMode: 'screen', opacity: isPureBlack ? 0.2 : 0.6 }}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* === 3D VIEW === */}
                        {viewMode === '3d' && has3D && (
                            <div className="w-full h-full">
                                <Tshirt3DPreview
                                    modelUrl={productData.model3d}
                                    textures={{
                                        front: textures.front?.url,
                                        back: textures.back?.url,
                                        leftSleeve: textures.leftSleeve?.url,
                                        rightSleeve: textures.rightSleeve?.url
                                    }}
                                    color={selectedColor}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}