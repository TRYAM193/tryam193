import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { FiFile, FiCopy, FiX, FiSave, FiCornerUpLeft, FiLayers, FiImage, FiShield, FiCheckCircle } from 'react-icons/fi';

const SavePromptModal = ({
  isOpen,
  onClose,
  onConfirm,
  isSaving,
  saveResult,
  currentName,
  isExistingDesign
}) => {
  const [designName, setDesignName] = useState("");
  const [mode, setMode] = useState('initial');
  const [mounted, setMounted] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);

  const loadingSteps = [
    { text: "Analyzing design layers...", Icon: FiLayers },
    { text: "Generating print-ready assets...", Icon: FiImage },
    { text: "Securing design securely...", Icon: FiShield },
    { text: "Finalizing details...", Icon: FiCheckCircle }
  ];

  useEffect(() => {
    if (isSaving) {
      setLoadingStage(0);
      const interval = setInterval(() => {
        setLoadingStage(prev => Math.min(prev + 1, loadingSteps.length - 1));
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isSaving]);

  // Ensure we only use Portal after component mounts (prevents hydration errors)
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setDesignName(currentName || "Untitled Design");
      // If existing, ask for Choice. If new, ask for Name directly.
      setMode(isExistingDesign ? 'choice' : 'input');
    }
  }, [isOpen, currentName, isExistingDesign]);

  if (!isOpen || !mounted) return null;

  // Handlers
  const handleUpdateClick = () => {
    // "Update" -> Overwrite existing, keep same name
    onConfirm(designName, false);
  };

  const handleSaveAsCopyClick = () => {
    setDesignName(`${currentName || 'Untitled'} (Copy)`);
    setMode('input');
  };

  const handleFinalConfirm = () => {
    // If we are in input mode for an existing design, it is a Copy.
    const isCopy = isExistingDesign && mode === 'input';
    onConfirm(designName, isCopy);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center px-4">
      {/* Backdrop with Blur */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={!isSaving ? onClose : undefined}
      />

      {/* Modal Box - Cosmic Theme */}
      <div className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {isSaving ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-6 h-[250px]">
            {saveResult === 'success' ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-green-500/20 rounded-full animate-ping pointer-events-none"></div>
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center shadow-inner border border-green-500/30">
                     <FiCheckCircle className="text-green-500 w-12 h-12" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-white tracking-wide">Success!</h3>
                  <p className="text-sm text-green-400 font-medium">Design securely saved.</p>
                </div>
              </div>
            ) : saveResult === 'error' ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-red-500/20 rounded-full"></div>
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center shadow-inner border border-red-500/30 animate-pulse">
                     <FiX className="text-red-500 w-12 h-12" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-white tracking-wide">Error</h3>
                  <p className="text-sm text-red-400 font-medium">Failed to save design. Please try again.</p>
                </div>
              </div>
            ) : (
                <div className="w-full flex flex-col items-center justify-center">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-slate-700/50 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
              <div className="w-16 h-16 bg-slate-800/80 rounded-full flex items-center justify-center shadow-inner relative overflow-hidden">
                {loadingSteps.map((step, idx) => {
                  const Icon = step.Icon;
                  return (
                    <div
                      key={idx}
                      className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out ${idx === loadingStage
                          ? "opacity-100 scale-100 translate-y-0"
                          : idx < loadingStage
                            ? "opacity-0 scale-50 -translate-y-8"
                            : "opacity-0 scale-50 translate-y-8"
                        }`}
                    >
                      <Icon className={`text-orange-500 w-8 h-8 ${idx === loadingStage ? 'animate-pulse' : ''}`} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-center space-y-2 h-14 relative flex flex-col items-center justify-start overflow-hidden w-full">
              <h3 className="text-xl font-bold text-white tracking-wide z-10">Saving Design</h3>
              <div className="relative w-full h-6 flex justify-center mt-1">
                {loadingSteps.map((step, idx) => (
                  <p
                    key={idx}
                    className={`absolute text-sm font-medium transition-all duration-500 ease-in-out w-full text-center ${idx === loadingStage
                        ? "opacity-100 translate-y-0 text-orange-400"
                        : idx < loadingStage
                          ? "opacity-0 -translate-y-4 text-slate-500"
                          : "opacity-0 translate-y-4 text-slate-500"
                      }`}
                  >
                    {step.text}
                  </p>
                ))}
              </div>
            </div>

                  <div className="w-full max-w-[240px] h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner mt-2">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-600 via-yellow-500 to-orange-400 transition-all duration-1000 ease-in-out"
                      style={{ width: `${(loadingStage + 1) * 25}%` }}
                    />
                  </div>
                </div>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {mode === 'choice' ? (
                  <>
                    <FiSave className="text-orange-500" /> Save Changes
                  </>
                ) : (
                  <>
                    <FiFile className="text-orange-500" /> {isExistingDesign ? "Save Copy" : "Name Design"}
                  </>
                )}
              </h3>
              <button
                onClick={onClose}
                disabled={isSaving}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* --- MODE: CHOICE (Existing Design) --- */}
            {mode === 'choice' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  You are editing an existing design. How would you like to proceed?
                </p>

                <div className="grid gap-3">
                  {/* Option 1: Overwrite */}
                  <button
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-slate-800/50 hover:bg-slate-800 hover:border-orange-500/50 transition-all group text-left"
                    onClick={handleUpdateClick}
                    disabled={isSaving}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:text-blue-300 group-hover:scale-110 transition-transform">
                      <FiFile size={20} />
                    </div>
                    <div>
                      <strong className="block text-white text-sm">Update Existing</strong>
                      <span className="text-xs text-slate-500">Overwrite the current file</span>
                    </div>
                  </button>

                  {/* Option 2: Save as Copy */}
                  <button
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-slate-800/50 hover:bg-slate-800 hover:border-green-500/50 transition-all group text-left"
                    onClick={handleSaveAsCopyClick}
                    disabled={isSaving}
                  >
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 group-hover:text-green-300 group-hover:scale-110 transition-transform">
                      <FiCopy size={20} />
                    </div>
                    <div>
                      <strong className="block text-white text-sm">Save as New</strong>
                      <span className="text-xs text-slate-500">Create a separate copy</span>
                    </div>
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <button className="text-xs text-slate-500 hover:text-slate-300 transition-colors" onClick={onClose}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* --- MODE: INPUT (New Design OR Copy) --- */}
            {mode === 'input' && (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    {isExistingDesign ? "Name your copy" : "Name your design"}
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all placeholder:text-slate-600"
                    value={designName}
                    onChange={(e) => setDesignName(e.target.value)}
                    placeholder="e.g. My Awesome Shirt"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white transition-all text-sm font-medium flex items-center justify-center gap-2"
                    onClick={() => isExistingDesign ? setMode('choice') : onClose()}
                    disabled={isSaving}
                  >
                    {isExistingDesign ? <><FiCornerUpLeft /> Back</> : 'Cancel'}
                  </button>

                  <button
                    className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold shadow-lg shadow-orange-900/20 hover:shadow-orange-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleFinalConfirm}
                    disabled={isSaving || !designName.trim()}
                  >
                    Save Design
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default SavePromptModal;