// src/design-tool/components/AiGeneratorModal.jsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FiLoader, FiCpu, FiZap } from 'react-icons/fi';
import { generateDesignJsonFromPrompt } from '../utils/aiService';
import { useDailyLimits } from '../../hooks/useDailyLimits';
import { Loader2, Sparkles, Lock, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';

const STYLES = [
  { id: 'none', label: 'No Style', icon: '🚫' },
  { id: 'typography poster', label: 'Typography', icon: '📝' },
  { id: 'abstract geometric layout', label: 'Geometric', icon: '🔺' },
  { id: 'retro synthwave text', label: 'Retro Text', icon: '📼' },
  { id: 'minimalist branding layout', label: 'Minimalist', icon: '✨' },
  { id: 'emoji art composition', label: 'Emoji Art', icon: '🎨' },
  { id: 'streetwear bold text', label: 'Streetwear', icon: '🔥' },
];

export function AiGeneratorModal({ isOpen, onClose, onDesignGenerated, fabricCanvas, productId, onGenerateStart, onGenerateEnd, onGenerateProgress }) {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('none');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [referenceImages, setReferenceImages] = useState([]);
  const { genRemaining, genLimit, incrementGen } = useDailyLimits();

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const isSvg = file.type === 'image/svg+xml';
      const reader = new FileReader();
      reader.onload = (e) => {
        if (isSvg) {
          resolve({ base64: e.target.result.split(',')[1], mimeType: file.type, previewUrl: e.target.result });
          return;
        }
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const MAX_SIZE = 800;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve({
            base64: dataUrl.split(',')[1],
            mimeType: 'image/jpeg',
            previewUrl: dataUrl
          });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e) => {
    if (!e.target.files?.length) return;
    const newFiles = Array.from(e.target.files);

    if (referenceImages.length + newFiles.length > 5) {
      setError('You can only upload up to 5 reference images.');
      return;
    }

    try {
      setIsGenerating(true);
      setError('');
      const processed = await Promise.all(newFiles.map(compressImage));
      setReferenceImages(prev => [...prev, ...processed.map(p => ({ ...p, id: Math.random().toString(36).substr(2, 9) }))]);
    } catch (err) {
      setError('Failed to process one or more images.');
    } finally {
      setIsGenerating(false);
      e.target.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && referenceImages.length === 0) {
      setError('Please provide a prompt or an image.');
      return;
    }
    setIsGenerating(true);
    setError('');

    if (onGenerateStart) {
      onGenerateStart();
    }

    const STEPS = [
      "Consulting the Stars...",
      "Analyzing your prompt & references...",
      "Harmonizing colors & typography...",
      "Constructing vector paths...",
      "Aligning geometry...",
      "Finalizing layout design..."
    ];
    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      stepIndex++;
      if (stepIndex < STEPS.length) {
        if (onGenerateProgress) onGenerateProgress(STEPS[stepIndex]);
      }
    }, 1500);

    try {
      const cWidth = fabricCanvas ? fabricCanvas.width : 800;
      const cHeight = fabricCanvas ? fabricCanvas.height : 800;
      const pInfo = productId ? `product ID: ${productId}` : "a blank canvas";
      
      const designJson = await generateDesignJsonFromPrompt(prompt, selectedStyle, cWidth, cHeight, pInfo, referenceImages);

      onDesignGenerated(designJson);
      incrementGen(); // Optimistically update the UI limit

      setPrompt('');
      setReferenceImages([]);

      clearInterval(progressInterval);
      setIsGenerating(false);

      if (onGenerateEnd) onGenerateEnd();
      else onClose();

    } catch (err) {
      console.error(err);
      toast.error('Cosmic AI failed to generate design. Please try again.');
      clearInterval(progressInterval);
      setIsGenerating(false);
      if (onGenerateEnd) onGenerateEnd(); // Clean up loaders
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f172a]/95 border border-white/10 text-white sm:max-w-[480px] w-[95vw] rounded-2xl shadow-2xl backdrop-blur-xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-white/10 bg-white/5 flex-shrink-0">
          <DialogTitle className="flex items-center justify-between text-lg font-bold">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <FiCpu className="text-orange-500" size={18} />
              </div>
              <span>Cosmic AI</span>
            </div>
          </DialogTitle>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-6">

          {/* Prompt Area */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Describe Your Vision
            </label>
            <textarea
              className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[100px] resize-none placeholder:text-slate-600 transition-all shadow-inner"
              placeholder="E.g. A retro poster layout with bold text saying 'FUTURE' and geometric shapes..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* Reference Images */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span> References ({referenceImages.length}/5)
              </label>
              <label className={`cursor-pointer flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${referenceImages.length >= 5 ? 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed' : 'text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20'}`}>
                <ImagePlus size={14} /> Add Media
                <input type="file" multiple accept="image/png, image/jpeg, image/webp, image/svg+xml" className="hidden" onChange={handleFileUpload} disabled={referenceImages.length >= 5} />
              </label>
            </div>
            {referenceImages.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-2">
                {referenceImages.map(img => (
                  <div key={img.id} className="relative w-16 h-16 rounded-xl border border-white/10 bg-black/40 group overflow-hidden shadow-inner">
                    <img src={img.previewUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Reference" />
                    <button onClick={() => setReferenceImages(prev => prev.filter(i => i.id !== img.id))} className="absolute top-1 right-1 p-0.5 bg-red-500/90 text-white rounded-full opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all shadow-lg hover:bg-red-500">
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Style Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Choose a Style
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 group ${selectedStyle === style.id
                    ? 'bg-gradient-to-b from-blue-600/20 to-purple-600/20 border-blue-500/50 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)] scale-105'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/20'
                    }`}
                >
                  <span className={`text-2xl mb-1.5 transition-transform duration-300 ${selectedStyle === style.id ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110 grayscale group-hover:grayscale-0'}`}>{style.icon}</span>
                  <span className="text-[10px] font-semibold text-center leading-tight truncate w-full px-1">{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center font-medium animate-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center p-3.5 bg-gradient-to-r from-indigo-900/40 to-slate-900/40 border border-indigo-500/20 rounded-xl shadow-inner">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-indigo-500/20 rounded-md">
                  <Sparkles size={14} className="text-indigo-400" />
                </div>
                <span className="text-sm font-medium text-indigo-100">Daily Quota</span>
              </div>
              <div className="text-sm font-black text-white bg-indigo-500/20 px-3 py-1 rounded-md border border-indigo-500/30">
                {genRemaining} / {genLimit}
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <span className="text-amber-400 text-lg mt-0.5 animate-pulse">💡</span>
              <p className="text-[11px] text-amber-200/80 leading-relaxed font-medium">
                <strong className="text-amber-300">Friendly Caution:</strong> The Cosmic AI is currently experimental! If it generates something bizarre, don't worry—just tweak it on the canvas or roll the dice again!
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-white/10 bg-black/20 flex-shrink-0">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (!prompt.trim() && referenceImages.length === 0) || genRemaining === 0}
            className="w-full h-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold tracking-wider shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-[0.98] border-0 rounded-xl"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <FiLoader className="animate-spin" size={18} /> Consulting the Stars...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FiZap className="fill-current text-yellow-400" size={18} /> Generate Design Layout
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}