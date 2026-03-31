import React, { useRef } from 'react';
import {
  Type, Shapes, ImagePlus, Sparkles, Layers,
  Palette, BoxSelect, Trash2, X, Move,
  Type as FontIcon, BookMarkedIcon, Bold, PenTool, Ghost, Wand2, LayoutGrid, Tag,
  Eraser, Scan, Keyboard, SunMoon, Maximize2 // ✅ Added Scan icon for Radius, Maximize2 for Auto DPI
} from 'lucide-react';
import { FaFont } from "react-icons/fa";
import Image from '../objectAdders/Image';

export default function SmartDock({
  mode,
  selectedObject,
  onSelectTool,
  onSelectProperty,
  onDelete,
  onDeselect,
  setActiveTool,
  setSelectedId,
  fabricCanvas,
  activePanel,
  productId
}) {

  const creationTools = [
    ...(productId ? [{ id: 'product', label: 'Product', icon: <Tag size={20} className="text-orange-400" /> }] : []),
    { id: 'saved', label: 'Your Designs', icon: <BookMarkedIcon size={20} /> },
    { id: 'text', label: 'Text', icon: <Type size={20} /> },
    { id: 'shapes', label: 'Shapes', icon: <Shapes size={20} /> },
    { id: 'image', label: 'Upload', icon: <ImagePlus size={20} /> },
    { id: 'ai', label: 'TRYAM AI', icon: <Sparkles size={20} className="text-purple-400" /> },
    { id: 'layers', label: 'Layers', icon: <Layers size={20} /> },
    { id: 'templates', label: 'Designs', icon: <LayoutGrid size={20} /> },
  ];

  const fileInput = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];

    if (file && file.type.startsWith('image')) {
      const localBlobUrl = URL.createObjectURL(file);

      // 2. Pass the Blob URL to your Image Adder
      // Your saveDesign.js will detect this "blob:" prefix later and upload it to Firebase.
      if (localBlobUrl) {
        Image(localBlobUrl, setSelectedId, setActiveTool, fabricCanvas);
      }

      // 3. Reset the input so the user can upload the same file again if they deleted it
      e.target.value = '';
    }
  }

  const getEditTools = () => {
    const type = selectedObject?.type;
    const isText = ['text', 'i-text', 'textbox', 'circle-text'].includes(type);
    const isImage = type === 'image';
    const isSvg = selectedObject?.type === 'svg';
    // ✅ Check for shapes that support radius
    const isShape = ['rect', 'triangle', 'star', 'pentagon', 'hexagon', 'arrow', 'diamond', 'trapezoid', 'lightning', 'line', 'heart', 'bubble'].includes(type);
    const supportsRadius = ['rect', 'triangle', 'star', 'pentagon', 'hexagon', 'arrow', 'diamond', 'trapezoid', 'lightning'].includes(type);

    let tools = [
      { id: 'fill', label: 'Color', icon: <Palette size={20} /> },
      { id: 'opacity', label: 'Opacity', icon: <BoxSelect size={20} /> },
      { id: 'layer', label: 'Layering', icon: <Layers size={20} /> },
    ];

    if (isText) {
      tools = [
        { id: 'text', label: 'Edit', icon: <Keyboard size={20} /> },
        { id: 'fontFamily', label: 'Font', icon: <FontIcon size={20} /> },
        { id: 'fontSize', label: 'Font Size', icon: <FaFont size={20} /> },
        ...tools,
        { id: 'format', label: 'Style', icon: <Bold size={20} /> },
        { id: 'shadow', label: 'Shadow', icon: <SunMoon size={20} /> },
        { id: 'outline', label: 'Outline', icon: <PenTool size={20} /> },
        { id: 'effect', label: 'Effects', icon: <Wand2 size={20} /> },
      ];
    }

    if (isImage) {
      tools = [
        { id: 'replace', label: 'New Image', icon: <ImagePlus size={20} /> },
        { id: 'shadow', label: 'Shadow', icon: <SunMoon size={20} /> },
        ...tools.filter(t => t.id !== 'fill'),
        { id: 'auto-dpi', label: 'Auto Scale', icon: <Maximize2 size={20} /> },
        { id: 'remove-bg', label: 'Remove-BG', icon: <Eraser size={20} /> },
      ];
    }

    // ✅ Shape Specific Tools
    if (isShape) {
      // Line doesn't have fill
      const shapeTools = [];
      if (type !== 'line') shapeTools.push({ id: 'fill', label: 'Color', icon: <Palette size={20} /> });

      shapeTools.push({ id: 'outline', label: 'Border', icon: <PenTool size={20} /> });

      if (supportsRadius) {
        shapeTools.push({ id: 'radius', label: 'Roundness', icon: <Scan size={20} /> });
      }

      tools = [
        ...shapeTools,
        { id: 'opacity', label: 'Opacity', icon: <BoxSelect size={20} /> },
        { id: 'shadow', label: 'Shadow', icon: <SunMoon size={20} /> },
        { id: 'layer', label: 'Layering', icon: <Layers size={20} /> },
      ];
    }

    return tools;
  };

  const activeTools = mode === 'edit' ? getEditTools() : creationTools;

  return (
    <div className="fixed bottom-0 left-0 w-full z-20 bg-[#0f172a]/95 backdrop-blur-xl border-t border-white/10 pb-6 transition-all duration-300">

      {mode === 'edit' && (
        <button
          onClick={onDeselect}
          className="absolute -top-12 left-4 bg-slate-800 text-white p-2 rounded-full shadow-lg border border-white/10 flex items-center gap-2 text-xs font-bold"
        >
          <X size={14} /> Done
        </button>
      )}

      <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
        {activeTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              mode === 'edit' ? onSelectProperty(tool.id) : onSelectTool(tool.id)
              if (tool.id === 'image' && fileInput.current) {
                fileInput.current.click();
              }
            }}
            className="relative flex flex-col items-center justify-center min-w-[64px] gap-1.5 group"
          >
            <div className={`p-2.5 rounded-2xl transition-all duration-200 ${mode === 'edit' ? 'bg-slate-800 text-white border border-white/5' : 'bg-transparent hover:bg-white hover:text-orange-600 hover:border-orange-500/30'} ${tool.id === activePanel ? 'bg-white text-orange-600 border-orange-500/50' : 'text-slate-400'}`}>

              {tool.id === 'image' ? (
                <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
                  <input
                    type="file"
                    className='hidden'
                    onChange={handleImageUpload}
                    accept="image/*"
                    ref={fileInput}
                  />
                </div>
              ) : null}

              {tool.icon}
            </div>
            <span className={`text-[10px] font-medium ${tool.id === activePanel ? 'text-white' : 'text-slate-400'} group-hover:text-white`}>
              {tool.label}
            </span>
          </button>
        ))}

        {mode === 'edit' && (
          <>
            <div className="w-[1px] h-8 bg-white/10 mx-2" />
            <button onClick={onDelete} className="flex flex-col items-center justify-center min-w-[50px] gap-1 text-red-500">
              <Trash2 size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}