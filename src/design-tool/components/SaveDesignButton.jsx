import React, { useState } from 'react';
import { saveNewDesign, overwriteDesign } from '../utils/saveDesign';
import SavePromptModal from './SavePromptModal';
import { CloudUpload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils"; // ✅ Import utility for class merging

export default function SaveDesignButton({
  canvas,
  userId,
  editingDesignId,
  currentDesignName,
  currentView,
  viewStates,
  productData,
  onGetSnapshot,
  onSaveSuccess,
  urlDesignId, // 👈 New prop to pass URL design ID for better image management
  fabricCanvas,
  className,
  id,
  variant = "outline", // Default to desktop style
  size = "sm"         // Default to desktop size
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState('idle');

  let slimObjectsToSave = JSON.parse(JSON.stringify(canvas.present)); // Start with the current Redux state of canvas objects

  const handleSaveClick = () => {
    setIsModalOpen(true);
  };

  const handleConfirmSave = async (name, saveAsCopy) => {
    setSaveResult('idle');
    setIsSaving(true);
    // 1. Capture Snapshot
    const snapshot = onGetSnapshot ? await onGetSnapshot(1200, true) : null;
    let result;

    // 3. Save using the updated slim objects!
    if (saveAsCopy || !urlDesignId) {

      if (fabricCanvas) {
        const liveFabricObjects = fabricCanvas.getObjects();
        // Iterate through the Redux objects
        slimObjectsToSave = await slimObjectsToSave.map((reduxObj) => {
          // If it's an image, find its live twin on the canvas
          if (reduxObj.type === 'image' || reduxObj.type === 'Image') {
            const liveObj = liveFabricObjects.find(o => o.customId === reduxObj.id);
            console.log(reduxObj, liveObj)
            if (liveObj) {
              reduxObj.props.src = liveObj.proxy_src;
              reduxObj.props.print_src = liveObj.print_src;
              reduxObj.props.originalWidth = liveObj.originalWidth;
              reduxObj.props.originalHeight = liveObj.originalHeight;
            }
          }
          return reduxObj;
        });
      }

      result = await saveNewDesign(
        userId,
        slimObjectsToSave, // 👈 Pass the updated slim array here
        viewStates,
        productData,
        currentView,
        () => {}, // 👈 Override internal setIsSaving hook to prevent UI flashing
        snapshot,
        name,
        saveAsCopy
      );
    }
    else {
      result = await overwriteDesign(
        userId,
        editingDesignId,
        slimObjectsToSave, // 👈 Pass the updated slim array here
        viewStates,
        productData,
        currentView,
        () => {}, // 👈 Override internal setIsSaving hook to prevent UI flashing
        snapshot,
        name
      );
    }

    if (result && result.success) {
      if (onSaveSuccess) onSaveSuccess(result.id);
      setSaveResult('success');
      setTimeout(() => {
        setIsModalOpen(false);
        setIsSaving(false);
        setSaveResult('idle');
      }, 1500);
    } else {
      setSaveResult('error');
      setTimeout(() => {
        setIsSaving(false);
        setSaveResult('idle');
      }, 2000);
    }
  };

  return (
    <>
      <Button
        id={id}
        onClick={handleSaveClick}
        variant={variant}
        size={size}
        title="Save Design"
        // ✅ Merge classes: 'gap-2' is base, 'className' overrides (e.g., text color, bg)
        className={cn("gap-2", className)}
      >
        <CloudUpload size={16} />
      </Button>

      <SavePromptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmSave}
        isSaving={isSaving}
        saveResult={saveResult}
        isExistingDesign={!!urlDesignId}
        currentName={currentDesignName}
      />
    </>
  );
}