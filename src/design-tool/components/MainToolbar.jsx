// src/design-tool/components/MainToolbar.jsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ImageHandler from './Image';
import { processUpscale } from '../utils/imageUtils'; // 👈 Import Logic
import {
    FiType, FiImage, FiCpu, FiSquare, FiTool, FiFolder,
    FiBell, FiAlertTriangle, FiCheckCircle, FiInfo, FiX, FiZap
} from 'react-icons/fi';
import { Loader2, Sparkles, ImagePlusIcon, Layout } from 'lucide-react'; // 👈 Import Loader
import Image from '../objectAdders/Image'
import addSvgToRedux from '../objectAdders/Svg';

export default function MainToolbar({
    activePanel, onSelectTool, setSelectedId, setActiveTool,
    isAdmin, brandDisplay, fabricCanvas, productId, storageFolder,
    urlColor, urlSize, dpiIssues = []
}) {

    const ToolButton = ({ icon: Icon, label, isActive, onClick, tool }) => (
        <button
            title={label}
            onClick={onClick}
            className={'tool-button-wrapper'}
        >
            <div className={`p-2.5 rounded-2xl transition-all duration-200 ${tool === activePanel || isActive ? 'bg-white text-orange-600 border-orange-500/50' : 'text-slate-400'}`}>
                <Icon size={24} className={`${!isActive ? 'hover:text-white' : ''}`} />
            </div>
            <span>{label}</span>
        </button>
    );
    const [showQualityDetails, setShowQualityDetails] = useState(false);
    const [isFixing, setIsFixing] = useState(null); // 👈 Track fixing state
    const bellRef = useRef(null);
    const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
    const fileInput = useRef(null)
    const svgInputRef = useRef(null);

    const handleSvgUpload = (event) => {
        const file = event.target.files[0];
        if (!file || file.type !== 'image/svg+xml') return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const svgString = e.target.result;
            if (svgString) {
                addSvgToRedux(svgString); // Push raw math straight to Redux!
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    };

    const handleSavedDesignsClick = () => onSelectTool('saved');

    const handleClick = () => {
        fileInput.current.click();
    };

    const handleImage = (event) => {
        const file = event.target.files[0];

        if (file && file.type.substring(0, 5) === 'image') {
            const reader = new FileReader();

            reader.onload = (e) => {
                const src = e.target.result;

                if (src) {
                    Image(src, setSelectedId, setActiveTool, fabricCanvas);
                }
            };

            reader.readAsDataURL(file);
        }

        event.target.result = ''

    }

    const togglePopup = () => {
        if (!showQualityDetails && bellRef.current) {
            const rect = bellRef.current.getBoundingClientRect();
            setPopupPos({ top: rect.top - 200, left: rect.right + 15 });
        }
        setShowQualityDetails(!showQualityDetails);
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showQualityDetails && bellRef.current && !bellRef.current.contains(e.target) && !e.target.closest('.dpi-popup-content')) {
                setShowQualityDetails(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showQualityDetails]);

    // ✅ NEW: HANDLE FIX
    const handleFixQuality = async (issue) => {
        if (isFixing) return;
        setIsFixing(issue.id);

        try {
            // 1. Get the Blob (Temporary)
            const tempBlobUrl = await processUpscale(issue.src);

            if (tempBlobUrl && fabricCanvas) {

                const obj = fabricCanvas.getObjects().find(o => (o.customId || o.id) === issue.id);
                if (obj) {
                    // 3. Set the PERMANENT URL, not the blob
                    obj.setSrc(tempBlobUrl, () => {
                        obj.scaleX = obj.scaleX / 4;
                        obj.scaleY = obj.scaleY / 4;
                        obj.setCoords();
                        fabricCanvas.requestRenderAll();
                        fabricCanvas.fire('object:modified', { target: obj });

                        // Optional: Revoke the local blob to free memory
                        URL.revokeObjectURL(tempBlobUrl);
                    }, { crossOrigin: 'anonymous' }); // Important for CORS
                }
            }
        } catch (error) {
            console.error("Fix failed:", error);
            // Optionally toast.error("Failed to save enhanced image")
        } finally {
            setIsFixing(null);
        }
    };

    // Derived Logic
    const hasCritical = dpiIssues.some(i => i.status === 'poor');
    const hasWarning = dpiIssues.some(i => i.status === 'warning');
    const hasImages = dpiIssues.length > 0;

    let bellClass = "text-slate-500 hover:text-white";
    let dotClass = "hidden";
    let bgClass = "bg-slate-800/50";

    if (hasCritical) {
        bellClass = "text-red-500 animate-[wiggle_1s_ease-in-out_infinite]";
        dotClass = "bg-red-500";
        bgClass = "bg-red-500/10";
    } else if (hasWarning) {
        bellClass = "text-yellow-500";
        dotClass = "bg-yellow-500";
        bgClass = "bg-yellow-500/10";
    } else if (hasImages) {
        bellClass = "text-green-500";
        dotClass = "bg-green-500";
        bgClass = "bg-green-500/10";
    }

    return (
        <div className="main-toolbar relative flex flex-col h-full no-scrollbar z-40">
            {brandDisplay}
            <button title="Saved Designs" onClick={handleSavedDesignsClick} className={`tool-button-wrapper saved-designs-link ${activePanel === 'saved' ? 'active' : ''}`}>
                <FiFolder size={24} /> <span>Saved</span>
            </button>
            <hr className="toolbar-divider" />
            <ToolButton icon={FiType} label="Text" isActive={activePanel === 'text'} onClick={() => onSelectTool('text')} tool='text' />
            <ImageHandler setSelectedId={setSelectedId} storageFolder={storageFolder} setActiveTool={onSelectTool} className={`tool-button-wrapper ${activePanel === 'image' ? 'active' : ''}`} fabricCanvas={fabricCanvas}>
                <ImagePlusIcon size={24} /> <span>Image</span>
            </ImageHandler>
            {isAdmin && (  // Check if current user is you/admin
                <button onClick={handleClick}>
                    <ImagePlusIcon size={24} />
                    <input type="file" ref={fileInput} onChange={handleImage} style={{ display: 'none' }} accept="image/*" />
                    <span className='text-xs text-slate-600'>AdminImage</span>
                </button>
            )}
            {isAdmin && (
                //120039082030
                <>
                    <button onClick={() => svgInputRef.current.click()} className="text-orange-500">
                        <ImagePlusIcon size={24} />
                        <input type="file" ref={svgInputRef} onChange={handleSvgUpload} style={{ display: 'none' }} accept=".svg" />
                        <span className='text-xs text-slate-600'>Admin SVG</span>
                    </button>
                </>
            )}
            <ToolButton icon={FiSquare} label="Shapes" isActive={activePanel === 'shapes'} onClick={() => onSelectTool('shapes')} />
            <ToolButton icon={Layout} label='Templates' isActive={activePanel === 'templates'} onClick={() => onSelectTool('templates')} />
            <ToolButton icon={FiCpu} label="AI" isActive={activePanel === 'ai'} onClick={() => onSelectTool('ai')} />
            <hr className="toolbar-divider" />
            <ToolButton icon={FiTool} label="More" isActive={activePanel === 'more'} onClick={() => onSelectTool('more')} />


            <div className="flex-grow" />

            {/* 🔔 BELL & PORTAL POPUP */}
            <div className="mt-auto mb-4 w-full flex flex-col items-center">
                {hasImages && (
                    <>
                        <button ref={bellRef} onClick={togglePopup} className={`w-10 h-10 rounded-xl flex items-center justify-center relative border border-white/5 transition-all ${bgClass} ${showQualityDetails ? 'ring-2 ring-white/20' : ''}`}>
                            <FiBell size={20} className={bellClass} />
                            <span className={`absolute top-2 right-2 w-2 h-2 rounded-full border border-[#0f172a] ${dotClass}`} />
                        </button>

                        {showQualityDetails && createPortal(
                            <div
                                className="dpi-popup-content fixed w-72 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-[9999] overflow-hidden flex flex-col animate-in slide-in-from-left-2 fade-in duration-200"
                                style={{ left: popupPos.left, bottom: '20px' }}
                            >
                                <div className="p-3 bg-slate-950/50 border-b border-white/10 flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Print Quality Check</h4>
                                    <button onClick={() => setShowQualityDetails(false)} className="text-slate-400 hover:text-white"><FiX size={14} /></button>
                                </div>

                                <div className="p-2 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                    {dpiIssues.map((issue) => (
                                        <div key={issue.id} className="flex gap-3 p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors items-center">
                                            <div className="w-10 h-10 rounded bg-black/20 overflow-hidden shrink-0">
                                                <img src={issue.src} className="w-full h-full object-contain" alt="" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    {issue.status === 'poor' && <FiAlertTriangle className="text-red-500 shrink-0" size={12} />}
                                                    {issue.status === 'warning' && <FiInfo className="text-yellow-500 shrink-0" size={12} />}
                                                    {issue.status === 'good' && <FiCheckCircle className="text-green-500 shrink-0" size={12} />}
                                                    <span className={`text-xs font-bold truncate ${issue.status === 'poor' ? 'text-red-400' : issue.status === 'warning' ? 'text-yellow-400' : 'text-green-400'}`}>
                                                        {issue.message}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-400">{issue.dpi} DPI</p>
                                            </div>

                                            {/* ✅ FIX BUTTON (Desktop) */}
                                            {issue.status === 'poor' && (
                                                <div className='flex flex-col items-center gap-1.5 mb-0.5'>
                                                    <button
                                                        onClick={() => handleFixQuality(issue)}
                                                        disabled={!!isFixing}
                                                        className="ml-auto px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                                                    >
                                                        {isFixing === issue.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} color='white' strokeWidth={2} />}
                                                        {isFixing === issue.id ? "..." : "Enhance"}
                                                    </button>
                                                    <span className="text-[10px] text-slate-400">Enhance Image Quality</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>,
                            document.body
                        )}
                    </>
                )}
            </div>
        </div>
    );
}