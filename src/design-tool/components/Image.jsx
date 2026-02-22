import React from 'react';
import { useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ImageAdder from '../objectAdders/Image';
import { uploadToStorage } from '../utils/saveDesign';

export default function ImageHandler({ 
  setSelectedId, 
  setActiveTool, 
  children, 
  className, 
  fabricCanvas,
  storageFolder = "user_drafts" // 👈 Default is the 30-day temp folder!
}) {
  const fileInput = useRef(null);

  const handleClick = () => {
    fileInput.current.click();
    if (setActiveTool) setActiveTool('image');
  };

  const handleChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image')) return;

    // Load the massive original file temporarily
    const originalLocalUrl = URL.createObjectURL(file);
    const tempImg = new Image();
    tempImg.src = originalLocalUrl;

    tempImg.onload = async () => {
      // --- STEP A: ADVISORY DPI SHIELD ---
      const dpi = Math.round(tempImg.width / 15); // Standard 15" print area

      if (dpi < 200) {
        const confirmLowQuality = window.confirm(
          `⚠️ Low Quality Warning: This image is only ${dpi} DPI. It may look blurry when printed. \n\nDo you still want to use it?`
        );
        if (!confirmLowQuality) {
          URL.revokeObjectURL(originalLocalUrl);
          event.target.value = '';
          return;
        }
      }

      // --- STEP B: GENERATE LOCAL PROXY (Using Longest Edge) ---
      const maxDimension = 500;
      const largestSide = Math.max(tempImg.width, tempImg.height);
      const scale = largestSide > maxDimension ? maxDimension / largestSide : 1; 
      
      const targetWidth = tempImg.width * scale;
      const targetHeight = tempImg.height * scale;

      const proxyCanvas = document.createElement('canvas');
      proxyCanvas.width = targetWidth;
      proxyCanvas.height = targetHeight;
      const ctx = proxyCanvas.getContext('2d');
      ctx.drawImage(tempImg, 0, 0, targetWidth, targetHeight);

      // Convert the small proxy canvas to a local blob
      proxyCanvas.toBlob(async (proxyBlob) => {
        const proxyLocalUrl = URL.createObjectURL(proxyBlob);
        const customId = Date.now();

        // --- STEP C: PUT *PROXY* ON CANVAS ---
        await ImageAdder(proxyLocalUrl, setSelectedId, setActiveTool, fabricCanvas);
        
        const fabricObj = fabricCanvas.getActiveObject();
        if (fabricObj) {
          fabricObj.set({ 
            customId: customId,
            originalWidth: tempImg.width,   // Save massive width for DPI/Backend
            originalHeight: tempImg.height, // Save massive height for DPI/Backend
            isUploading: true 
          });
        }

        // --- STEP D: BACKGROUND DUAL UPLOAD ---
        try {
          const fileId = uuidv4();
          let highResUrl, proxyUrl;

          if (largestSide <= 500) {
            // Upload straight to dynamic folder
            highResUrl = await uploadToStorage(file, `${storageFolder}/originals/${fileId}`);
            proxyUrl = highResUrl; 
          } else {
            // Dual Upload to dynamic folder
            [highResUrl, proxyUrl] = await Promise.all([
              uploadToStorage(file, `${storageFolder}/originals/${fileId}`),
              uploadToStorage(proxyBlob, `${storageFolder}/proxies/${fileId}`)
            ]);
          }

          if (fabricObj) {
            fabricObj.set({
              src: proxyUrl,          // Face of the image (cart/session)
              print_src: highResUrl,  // Soul of the image (backend renderer)
              isUploading: false
            });
          }
        } catch (err) {
          console.error("Upload failed:", err);
        }

        // Cleanup local memory
        URL.revokeObjectURL(originalLocalUrl);
      }, 'image/webp', 0.8);

      event.target.value = '';
    };
  };

  return (
    <>
      <button onClick={handleClick} className={className}>
        {children || <span>Upload</span>}
      </button>
      <input type="file" ref={fileInput} onChange={handleChange} style={{ display: 'none' }} accept="image/*" />
    </>
  );
}