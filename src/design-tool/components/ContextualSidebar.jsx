// src/design-tool/components/ContextualSidebar.jsx
import React, { useState } from 'react';
import ShapesSidebar from './ShapesSidebar';
import SidebarSavedList from './SidebarSavedList';
import { AiGeneratorModal } from './AiGeneratorModal';
import addImageToCanvas from '../objectAdders/Image';
import { FiCpu, FiType, FiUploadCloud, FiAlertTriangle, FiCheckCircle, FiX} from 'react-icons/fi';
import LayersPanel from './LayersPanel';
import SidebarTemplateList from './SidebarTemplateList';

export default function ContextualSidebar({ activePanel, setActivePanel, addText, addHeading, addSubheading, productId, handleLoadSavedDesign, fabricCanvas, setSelectedId, setActiveTool, selectedId= null, onMergeDesign, userId, onMergeTemplate, 
  onReplaceTemplate, onAiObjectsGenerated, onAiGenerateStart, onAiGenerateEnd}) {

  let ContentComponent = null;
  let title = "";

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleAiDesignGenerated = (jsonArray) => {
    if (onAiObjectsGenerated && jsonArray) {
      onAiObjectsGenerated(jsonArray);
    }
  };

  switch (activePanel) {
    case 'saved':
      title = "Your Saved Designs";
      ContentComponent = () => (
        <SidebarSavedList
          productId={productId}
          onLoadDesign={handleLoadSavedDesign}
          onMergeDesign={onMergeDesign}
          userId={userId}
        />
      );
      break;
    case 'text':
      title = "Text Styles";
      ContentComponent = () => (
        <div className="sidebar-content space-y-4">
          <button
            onClick={() => {
              addText()
              setActivePanel(null)
            }}
            className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold shadow-lg shadow-orange-900/20 transition-all flex items-center justify-center gap-2"
          >
            <FiType /> Add Text Box
          </button>

          <div className="space-y-2 mt-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Presets</h3>
            <div
              className='p-4 border border-white/10 rounded-lg cursor-pointer hover:bg-white/5 hover:border-orange-500/50 transition-all bg-slate-800/40'
              onClick={() => {
                addHeading()
                setActivePanel(null)
              }}
            >
              <h1 className="text-2xl font-bold text-white text-center">Add Heading</h1>
            </div>
            <div
              className='p-3 border border-white/10 rounded-lg cursor-pointer hover:bg-white/5 hover:border-orange-500/50 transition-all bg-slate-800/40'
              onClick={() => {
                addSubheading()
                setActivePanel(null)
              }}
            >
              <h3 className="text-lg font-medium text-slate-300 text-center">Add Subheading</h3>
            </div>
          </div>
        </div>
      );
      break;
    case 'image':
      title = "Images";
      ContentComponent = () => (
        <div className="sidebar-content text-center py-8">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
            <FiUploadCloud size={24} className="text-slate-400" />
          </div>
          <h3 className="text-sm font-bold text-white mb-2">Upload Image</h3>
          <p className="text-xs text-slate-400 px-4">
            Use the "Image" button in the main toolbar to upload files from your device.
          </p>
        </div>
      );
      break;
    case 'ai':
      title = "AI Generator";
      ContentComponent = () => (
        <div className="sidebar-content">
          <div className="p-5 bg-gradient-to-b from-slate-800/50 to-slate-900/50 border border-orange-500/20 rounded-xl text-center shadow-lg">
            <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiCpu size={24} className="text-orange-500" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Create with AI</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Describe your vision and let our cosmic AI generate unique artwork for your merch.
            </p>
            <button
              onClick={() => setIsAiModalOpen(true)}
              className='w-full py-2.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-orange-900/30 transition-all'
            >
              Open Generator
            </button>
          </div>
        </div>
      );
      break;
    case 'shapes':
      title = "Shapes";
      ContentComponent = () => <ShapesSidebar setActivePanel={setActivePanel} />;
      break;
    case 'layers':
      title = "Layers";
      ContentComponent = () => <LayersPanel fabricCanvas={fabricCanvas} setSelectedId={setSelectedId} selectedId={selectedId}/>;
      break;
    case 'templates':
      title = "Global Templates";
      ContentComponent = () => (
        <SidebarTemplateList 
          onMerge={onMergeTemplate}
          onReplace={onReplaceTemplate}
        />
      );
      break;
    default:
      ContentComponent = null;
      title = "";
  }

  const FinalContent = ContentComponent ? <ContentComponent onClose={() => setActivePanel(null)} /> : null;

  return (
    <aside className="contextual-sidebar flex flex-col h-full">
      <div className="sidebar-header shrink-0">
        <h2 className="text-sm font-bold text-white uppercase tracking-wide">{title}</h2>
        <button
          onClick={() => setActivePanel(null)}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          title="Close Sidebar"
        >
          <FiX size={16} />
        </button>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar overscroll-none">
        {FinalContent}
      </div>

      <AiGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onDesignGenerated={handleAiDesignGenerated}
        fabricCanvas={fabricCanvas}
        productId={productId}
        onGenerateStart={() => {
           setIsAiModalOpen(false);
           setActivePanel(null);
           if (onAiGenerateStart) onAiGenerateStart();
        }}
        onGenerateEnd={onAiGenerateEnd}
      />
    </aside>
  );
}