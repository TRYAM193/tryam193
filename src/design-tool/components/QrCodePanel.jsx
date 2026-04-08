// src/design-tool/components/QrCodePanel.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { useDispatch } from 'react-redux';
import { dispatchDelta } from '../redux/canvasSlice';
import { v4 as uuidv4 } from 'uuid';
import { QrCode, Plus, Link, Type } from 'lucide-react';

const ERROR_LEVELS = [
  { value: 'L', label: 'L', desc: '7% correction' },
  { value: 'M', label: 'M', desc: '15% correction' },
  { value: 'Q', label: 'Q', desc: '25% correction' },
  { value: 'H', label: 'H', desc: '30% correction' },
];

const BRAND_COLORS = [
  { dark: '#000000', light: '#ffffff', label: 'Classic' },
  { dark: '#f97316', light: '#000000', label: 'Orange' },
  { dark: '#ef4444', light: '#ffffff', label: 'Red' },
  { dark: '#3b82f6', light: '#ffffff', label: 'Blue' },
  { dark: '#8b5cf6', light: '#ffffff', label: 'Purple' },
  { dark: '#ffffff', light: '#0f172a', label: 'White' },
];

export default function QrCodePanel({ fabricCanvas, setActivePanel }) {
  const dispatch = useDispatch();
  const [text, setText] = useState('https://');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [errorLevel, setErrorLevel] = useState('M');
  const [qrSvgString, setQrSvgString] = useState(null);    // raw SVG markup
  const [qrPreviewUrl, setQrPreviewUrl] = useState(null);  // blob URL for <img> preview
  const [isAdding, setIsAdding] = useState(false);
  const [qrSize, setQrSize] = useState(256);
  const debounceRef = useRef(null);
  const prevPreviewUrl = useRef(null);

  const generateQr = useCallback(async (value, fg, bg, ec, size) => {
    if (!value || value.trim() === '' || value === 'https://') {
      setQrSvgString(null);
      setQrPreviewUrl(null);
      return;
    }
    try {
      // Generate as raw SVG string (vector — no DPI issues!)
      const svgString = await QRCode.toString(value, {
        type: 'svg',
        errorCorrectionLevel: ec,
        margin: 2,
        width: size,
        color: { dark: fg, light: bg },
      });
      setQrSvgString(svgString);

      // Create a blob URL just for the live preview <img>
      if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      prevPreviewUrl.current = url;
      setQrPreviewUrl(url);
    } catch {
      setQrSvgString(null);
      setQrPreviewUrl(null);
    }
  }, []);

  // Cleanup blob URL on unmount
  useEffect(() => () => { if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current); }, []);

  // Debounced generation on input change
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      generateQr(text, fgColor, bgColor, errorLevel, qrSize);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [text, fgColor, bgColor, errorLevel, qrSize, generateQr]);

  const handleAddToCanvas = async () => {
    if (!qrSvgString || !fabricCanvas) return;
    setIsAdding(true);
    try {
      const newId = uuidv4();
      const zoom = fabricCanvas.getZoom();
      const cx = fabricCanvas.width / zoom / 2;
      const cy = fabricCanvas.height / zoom / 2;
      const displaySize = Math.min(qrSize, 300);

      // Dispatch as a proper SVG object — fully vector, zero DPI issues!
      const newObj = {
        id: newId,
        type: 'svg',
        svgString: qrSvgString,
        props: {
          left: cx - displaySize / 2,
          top: cy - displaySize / 2,
          scaleX: displaySize / qrSize,
          scaleY: displaySize / qrSize,
          angle: 0,
          opacity: 1,
          selectable: true,
          evented: true,
        },
      };
      dispatch(dispatchDelta({ type: 'ADD', targetId: newId, before: null, after: newObj }));
      setActivePanel(null);
    } finally {
      setIsAdding(false);
    }
  };

  const applyPreset = (preset) => {
    setFgColor(preset.dark);
    setBgColor(preset.light);
  };

  const isValidInput = text && text.trim().length > 3 && text !== 'https://';

  return (
    <div className="flex flex-col h-full text-white select-none">

      {/* === LIVE PREVIEW === */}
      <div className="flex flex-col items-center pt-5 pb-4 px-4">
        <div
          className={`relative rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-500 ${qrPreviewUrl
              ? 'border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]'
              : 'border border-dashed border-white/10 bg-white/3'
            }`}
          style={{ width: 180, height: 180, backgroundColor: qrPreviewUrl ? bgColor : 'transparent' }}
        >
          {qrPreviewUrl ? (
            <img src={qrPreviewUrl} alt="QR Code" className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-300" />
          ) : (
            <div className="flex flex-col items-center gap-3 opacity-30">
              <QrCode size={48} className="text-zinc-500" />
              <span className="text-[10px] text-zinc-500 text-center">Type a URL or text below</span>
            </div>
          )}
        </div>
        {qrPreviewUrl && (
          <p className="text-[10px] text-zinc-500 mt-2 text-center">Live Preview</p>
        )}
      </div>

      <div className="h-px bg-white/5 mx-3" />

      {/* === INPUT === */}
      <div className="px-3 py-3">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">URL or Text</p>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
            {text.startsWith('http') ? <Link size={14} /> : <Type size={14} />}
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="https://your-website.com"
            rows={2}
            className="w-full pl-9 pr-3 py-2.5 bg-black/40 text-white text-xs font-mono rounded-xl border border-white/10 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 placeholder:text-zinc-600 resize-none transition-all"
          />
        </div>
      </div>

      <div className="h-px bg-white/5 mx-3" />

      {/* === COLOR PRESETS === */}
      <div className="px-3 py-3">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2.5">Color Presets</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {BRAND_COLORS.map(preset => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-150 ${fgColor === preset.dark && bgColor === preset.light
                  ? 'border-orange-500/60 bg-orange-500/10'
                  : 'border-white/5 bg-white/5 hover:bg-white/10'
                }`}
            >
              <div className="flex rounded-lg overflow-hidden w-10 h-6 flex-shrink-0 border border-white/10">
                <div className="flex-1" style={{ backgroundColor: preset.light }} />
                <div className="flex-1" style={{ backgroundColor: preset.dark }} />
              </div>
              <span className="text-[9px] text-zinc-500">{preset.label}</span>
            </button>
          ))}
        </div>

        {/* Custom colors row */}
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <p className="text-[9px] text-zinc-600 uppercase tracking-wider">QR Color</p>
            <div className="relative flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
              <div className="w-5 h-5 rounded border border-white/10 flex-shrink-0" style={{ backgroundColor: fgColor }} />
              <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} className="absolute inset-0 w-full opacity-0 cursor-pointer" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase">{fgColor}</span>
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Background</p>
            <div className="relative flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
              <div className="w-5 h-5 rounded border border-white/10 flex-shrink-0" style={{ backgroundColor: bgColor }} />
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="absolute inset-0 w-full opacity-0 cursor-pointer" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase">{bgColor}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-white/5 mx-3" />

      {/* === ERROR CORRECTION === */}
      <div className="px-3 py-3">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Error Correction</p>
        <div className="grid grid-cols-4 gap-1.5">
          {ERROR_LEVELS.map(ec => (
            <button
              key={ec.value}
              onClick={() => setErrorLevel(ec.value)}
              className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border text-[10px] font-bold transition-all duration-150 ${errorLevel === ec.value
                  ? 'bg-gradient-to-b from-orange-500/20 to-orange-600/10 border-orange-500/50 text-orange-400'
                  : 'bg-white/5 border-white/5 text-zinc-500 hover:text-white hover:bg-white/10'
                }`}
            >
              {ec.label}
              <span className="text-[8px] font-normal text-zinc-600 leading-none">{ec.desc.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* === SIZE === */}
      <div className="px-3 pb-2">
        <div className="flex justify-between items-center mb-1.5">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Size</p>
          <span className="text-xs font-mono text-orange-400 font-bold">{qrSize}px</span>
        </div>
        <input
          type="range" min={128} max={512} step={64}
          value={qrSize}
          onChange={e => setQrSize(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: '#f97316' }}
        />
      </div>

      <div className="flex-grow" />

      {/* === ADD BUTTON === */}
      <div className="px-3 pb-4 pt-2">
        <button
          onClick={handleAddToCanvas}
          disabled={!isValidInput || !qrSvgString || isAdding}
          className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${isValidInput && qrSvgString
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-900/30 hover:from-orange-400 hover:to-red-400'
              : 'bg-white/5 text-zinc-600 cursor-not-allowed border border-white/5'
            }`}
        >
          {isAdding ? (
            <span className="animate-spin">⌛</span>
          ) : (
            <Plus size={16} />
          )}
          {isAdding ? 'Adding...' : 'Add QR to Canvas'}
        </button>
        {!isValidInput && (
          <p className="text-[10px] text-zinc-600 text-center mt-2">Enter a URL or text to generate a QR code</p>
        )}
      </div>
    </div>
  );
}
