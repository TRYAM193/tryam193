// src/design-tool/mobile/MobileEditorLayout.jsx
import React, { useState } from 'react';
import SmartDock from './SmartDock';
import PropertyControlBox from './PropertyControlBox';
import ProductDrawer from './ProductDrawer';
import { processUpscale } from '../utils/imageUtils'; // 👈 Import Logic
import {
    ArrowLeft, Undo2, Redo2, Eye, Bell,
    AlertTriangle, CheckCircle, X, Sparkles, Loader2, ClipboardPaste
} from 'lucide-react'; // 👈 Icons
import ExportButton from '../components/ExportButton';
import SaveTemplateButton from '../components/SaveTemplateButton';

export default function MobileEditorLayout({
    children, fabricCanvas, selectedId, setSelectedId, updateDpiForObject, updateObject,
    setActiveTool, setActivePanel, activePanel, navigation, canvasObjects, handlePaste, clipboard,
    onUndo, onRedo, canUndo, canRedo, saveButton, onGeneratePreview,
    isGeneratingPreview, currentView, onSwitchView, availableViews = ['front', 'back'],
    productProps, dpiIssues = [], currentDesignName
}) {
    const [activeProperty, setActiveProperty] = useState(null);
    const [showDpiList, setShowDpiList] = useState(false);
    const [isFixing, setIsFixing] = useState(null); // 👈 Track state
    const selectedObject = canvasObjects.find(o => o.id === selectedId);

    // ... (Keep existing handlers for tools/deselect) ...

    const handleToolSelect = (toolId) => {
        if (toolId === 'product') setActivePanel('product');
        else if (['shapes', 'ai', 'image', 'saved', 'templates', 'layers'].includes(toolId)) setActivePanel(toolId);
        else if (toolId === 'text') setActivePanel('text');
    };

    const handleDeselect = () => {
        setSelectedId(null);
        setActiveProperty(null);
        if (fabricCanvas) {
            fabricCanvas.discardActiveObject()
            fabricCanvas.requestRenderAll()
        };
    };

    // ✅ NEW: HANDLE FIX (Mobile)
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

    const hasCritical = dpiIssues.some(i => i.status === 'poor');
    const hasImages = dpiIssues.length > 0;

    return (
        <div className="flex flex-col h-[100dvh] w-full bg-[#0f172a] relative overflow-hidden">
            {/* 1. TOP HEADER */}
            <div className="absolute top-0 left-0 w-full z-30 px-4 py-3 flex justify-between items-center bg-gradient-to-b from-[#0f172a]/90 to-transparent pointer-events-none">
                <div className="flex gap-2 pointer-events-auto">
                    <button onClick={() => navigation('/dashboard')} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/5"><ArrowLeft size={18} /></button>
                </div>
                <div className="flex gap-2 pointer-events-auto bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10">
                    <button onClick={onUndo} disabled={!canUndo} className={`w-9 h-9 rounded-full flex items-center justify-center ${!canUndo ? 'text-white/20' : 'text-white'}`}><Undo2 size={18} /></button>
                    <div className="w-[1px] h-5 bg-white/10 my-auto" />
                    <button onClick={onRedo} disabled={!canRedo} className={`w-9 h-9 rounded-full flex items-center justify-center ${!canRedo ? 'text-white/20' : 'text-white'}`}><Redo2 size={18} /></button>
                </div>
                <div className="flex gap-2 pointer-events-auto">
                    {productProps.id &&
                        <button onClick={onGeneratePreview} disabled={isGeneratingPreview} className="w-9 h-9 rounded-full bg-slate-800/80 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-lg">
                            {isGeneratingPreview ? <span className="animate-spin text-xs">⌛</span> : <Eye size={18} />}
                        </button>}
                    <div className="pointer-events-auto">{saveButton}</div>
                    <button
                        onClick={handlePaste}
                        disabled={!clipboard || clipboard.length === 0}
                        className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${!clipboard || clipboard.length === 0 ? 'opacity-40 cursor-not-allowed text-slate-500' : ' text-white-400 hover:text-indigo-300'}`}
                        title="Paste"
                    >
                        <ClipboardPaste size={18} />
                    </button>
                    <ExportButton
                        canvas={fabricCanvas}
                        currentDesignName={currentDesignName}
                        isMobile={true}
                    />
                    <SaveTemplateButton
                        canvas={fabricCanvas}
                        objects={canvasObjects}
                        isMobile={true}
                    />
                </div>
            </div>

            {/* 2. CANVAS */}
            <div className="flex-1 relative z-0 w-full h-full pb-[100px] bg-[#0f172a]">
                {children}
            </div>

            {/* 🔔 3. FLOATING DPI BELL */}
            {hasImages && (
                <>
                    <button
                        onClick={() => setShowDpiList(!showDpiList)}
                        className={`
                    absolute right-4 z-40 shadow-xl flex items-center justify-center rounded-full transition-all duration-300
                    border border-white/10 backdrop-blur-md
                    ${hasCritical ? 'w-14 h-14 bg-red-600 text-white animate-bounce' : 'w-12 h-12 bg-slate-800/90 text-slate-200'}
                `}
                        style={{ bottom: '110px' }}
                    >
                        <Bell size={20} />
                        {hasCritical && <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-red-400 border-2 border-slate-900 animate-ping" />}
                        {!hasCritical && <span className={`absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${dpiIssues.some(i => i.status === 'warning') ? 'bg-yellow-500' : 'bg-green-500'}`} />}
                    </button>

                    {showDpiList && (
                        <div className="absolute right-4 z-50 w-72 bg-slate-900/95 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl animate-in slide-in-from-right-5 fade-in duration-200 flex flex-col max-h-[40vh]" style={{ bottom: '170px' }}>
                            <div className="p-3 border-b border-white/10 flex justify-between items-center">
                                <h4 className="text-xs font-bold text-white uppercase">Image Quality</h4>
                                <button onClick={() => setShowDpiList(false)}><X size={16} className="text-slate-400" /></button>
                            </div>

                            <div className="overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                {dpiIssues.map((issue) => (
                                    <div key={issue.id} className="flex gap-3 p-2 rounded-lg bg-white/5 border border-white/5 items-center">
                                        <div className="w-10 h-10 rounded bg-white/10 overflow-hidden shrink-0">
                                            <img src={issue.src} className="w-full h-full object-contain" alt="" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                {issue.status === 'poor' ? <AlertTriangle size={12} className="text-red-500" /> : <CheckCircle size={12} className="text-green-500" />}
                                                <span className={`text-xs font-bold ${issue.status === 'poor' ? 'text-red-400' : 'text-green-400'}`}>
                                                    {issue.message}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400">{issue.dpi} DPI</p>
                                        </div>

                                        {/* ✅ FIX BUTTON (Mobile) */}
                                        {issue.status === 'poor' && (
                                            <button
                                                onClick={() => handleFixQuality(issue)}
                                                disabled={!!isFixing}
                                                className="px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold flex items-center gap-1"
                                            >
                                                {isFixing === issue.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} color="white" strokeWidth={1.5} />}
                                                {isFixing === issue.id ? "..." : "Enhance"}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* 4. OTHER COMPONENTS */}
            {productProps.id && !selectedId && !activePanel && availableViews.length > 1 && (
                <div className="absolute bottom-[130px] left-1/2 -translate-x-1/2 z-20 flex gap-1 p-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-xl">
                    {availableViews.map(view => (
                        <button key={view} onClick={() => onSwitchView(view)} className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${currentView === view ? 'bg-white text-black shadow-md' : 'text-white/70 hover:bg-white/10'}`}>
                            {view}
                        </button>
                    ))}
                </div>
            )}
            {productProps.id && activePanel === 'product' && <ProductDrawer {...productProps} onClose={() => setActivePanel(null)} />}
            <PropertyControlBox activeProperty={activeProperty} object={selectedObject} onClose={() => setActiveProperty(null)} fabricCanvas={fabricCanvas} updateObject={updateObject} updateDpiForObject={updateDpiForObject} printDimensions={productProps.printDimensions} />
            <SmartDock mode={selectedId ? 'edit' : 'create'} selectedObject={selectedObject} onSelectTool={handleToolSelect} onSelectProperty={(prop) => setActiveProperty(prop === activeProperty ? null : prop)} onDeselect={handleDeselect} setActiveTool={setActiveTool} setSelectedId={setSelectedId} fabricCanvas={fabricCanvas} activePanel={activePanel} productId={productProps.id} />
        </div>
    );
}