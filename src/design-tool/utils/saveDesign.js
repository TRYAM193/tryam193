import { db as firestore, storage } from '@/firebase'; // Adjust path if needed
import { doc, setDoc, collection, addDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { getDownloadURL, uploadBytes, uploadString, ref, listAll, deleteObject } from "firebase/storage";

// 🧬 HELPER: Clones images from browser cache to the new design folder
const cloneCanvasImagesForCopy = async (userId, newDesignId, viewStates) => {
  const clonedViewStates = JSON.parse(JSON.stringify(viewStates));

  const processObjects = async (objects) => {
    if (!objects) return;
    for (let obj of objects) {
      if ((obj.type === 'image' || obj.type === 'Image') && obj.src && obj.src.includes('firebasestorage')) {
        try {
          // 1. Fetch the existing image (Instant via browser cache)
          const response = await fetch(obj.src);
          const blob = await response.blob();

          // 2. Upload to the new design's folder
          const fileId = uuidv4();
          const newRef = ref(storage, `users/${userId}/designs/${newDesignId}/images/originals/${fileId}`);
          await uploadBytes(newRef, blob);
          obj.src = await getDownloadURL(newRef);

          // 3. Clone print_src (High-res version) if it exists
          if (obj.print_src && obj.print_src.includes('firebasestorage')) {
            const pRes = await fetch(obj.print_src);
            const pBlob = await pRes.blob();
            const pRef = ref(storage, `users/${userId}/designs/${newDesignId}/images/proxies/${fileId}`);
            await uploadBytes(pRef, pBlob);
            obj.print_src = await getDownloadURL(pRef);
          }
        } catch (err) {
          console.error("Failed to clone image:", err);
        }
      }
      if (obj.type === 'group' && obj.objects) await processObjects(obj.objects);
    }
  };

  for (const view of Object.keys(clonedViewStates)) {
    await processObjects(clonedViewStates[view]);
  }
  return clonedViewStates; // Returns JSON with brand new URLs
};

const cleanUpRemovedImages = async (userId, designId, viewStates) => {
  try {
    // 1. Get all image URLs currently used on the canvas
    const usedUrls = new Set();
    Object.values(viewStates).forEach(objects => {
      const traverse = (objs) => {
        if (!objs) return;
        objs.forEach(obj => {
          if ((obj.type === 'image' || obj.type === 'Image') && obj.src) {
            if (obj.src.includes('firebasestorage')) usedUrls.add(obj.src.split('?')[0]);
            if (obj.print_src && obj.print_src.includes('firebasestorage')) usedUrls.add(obj.print_src.split('?')[0]);
          }
          if (obj.type === 'group' && obj.objects) traverse(obj.objects);
        });
      };
      traverse(objects);
    });

    const usedUrlsArray = Array.from(usedUrls);

    // 2. Check both 'originals' and 'proxies' folders
    const foldersToCheck = ['originals', 'proxies'];

    for (const subFolder of foldersToCheck) {
      const folderRef = ref(storage, `users/${userId}/designs/${designId}/images/${subFolder}`);
      const fileList = await listAll(folderRef);

      // 3. Delete files that are no longer on the canvas
      const deletePromises = fileList.items.map(async (itemRef) => {
        const itemUrl = await getDownloadURL(itemRef);
        const cleanItemUrl = itemUrl.split('?')[0];

        if (!usedUrlsArray.includes(cleanItemUrl)) {
          console.log(`🗑️ Auto-deleting removed image: ${itemRef.name}`);
          return deleteObject(itemRef);
        }
      });
      await Promise.all(deletePromises);
    }
  } catch (error) {
    if (error.code !== 'storage/object-not-found') console.error("Cleanup Error:", error);
  }
};

// Upload the images to Storage
export const uploadToStorage = async (imgURL, fileLocation) => {
  const storageRef = ref(storage, `${fileLocation}.png`);

  let blob;

  // 1️⃣ data URL (canvas.toDataURL)
  if (typeof imgURL === "string" && imgURL.startsWith("data:")) {
    blob = dataURLtoBlob(imgURL);
  }

  // 2️⃣ blob URL (URL.createObjectURL)
  else if (typeof imgURL === "string" && imgURL.startsWith("blob:")) {
    const response = await fetch(imgURL);
    blob = await response.blob();
  }

  // 3️⃣ File or Blob
  else if (imgURL instanceof Blob) {
    blob = imgURL;
  }

  else {
    throw new Error("Unsupported image source type");
  }

  await uploadBytes(storageRef, blob, {
    contentType: blob.type || "image/png",
  });

  return await getDownloadURL(storageRef);
};

// --- HELPER: Auto-Generate Lightweight Proxy ---
const generateProxyImage = async (imgSrc, maxWidth = 500) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // If the image is already small, return it as-is
      if (img.width <= maxWidth) {
        resolve({ url: imgSrc, width: img.width, height: img.height });
        return;
      }

      const scale = maxWidth / img.width;
      const canvas = document.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Return the new data URL AND the new physical dimensions
      resolve({
        url: canvas.toDataURL("image/webp", 0.8),
        width: canvas.width,
        height: canvas.height
      });
    };
    img.src = imgSrc;
  });
};


const dataURLtoBlob = (dataURL) => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
};



// --- HELPER: Build Data Object ---
const buildDesignDoc = (id, currentObjects, viewStates, productData, userId, currentView, isNew, thumbnailDataUrl, name) => {
  const now = Date.now();

  // Clean objects
  const cleanObjects = (currentObjects || []).filter(obj =>
    obj.id !== 'print-area-border' && obj.customId !== 'print-area-border'
  );

  const finalViewStates = {
    ...viewStates,
    [currentView]: cleanObjects
  };

  let designDoc = {};

  if (productData && productData.productId) {
    // === PRODUCT MODE ===
    designDoc = {
      type: 'PRODUCT',
      canvasData: finalViewStates,
      productConfig: {
        productId: productData.productId,
        variantColor: productData.color || null,
        variantSize: productData.size || null,
        activeView: currentView || 'front',
        printAreas: productData.print_areas || {}
      }
    };
  } else {
    // === BLANK MODE ===
    designDoc = {
      type: 'BLANK',
      canvasData: finalViewStates.front || cleanObjects // Default to front/single view
    };
  }

  // Common Fields
  designDoc.id = id;
  designDoc.name = name || "Untitled Design"; // ✅ Save Name
  designDoc.updatedAt = now;
  if (thumbnailDataUrl) designDoc.imageData = thumbnailDataUrl;
  if (isNew) {
    designDoc.createdAt = now;
    designDoc.userId = id.split('_')[0]; // Assuming ID implies user, or pass userId explicitly
  }

  return designDoc;
};

// 📸 HELPER: Upload Base64 Thumbnail to Storage
const uploadThumbnail = async (userId, designId, base64String) => {
  // 1. Safety check
  if (!base64String || !base64String.startsWith('data:image')) return null;

  try {
    // 2. Create the exact path in the user's design folder
    const imageRef = ref(storage, `users/${userId}/designs/${designId}/thumbnail.png`);

    // 3. Upload the base64 string directly
    await uploadString(imageRef, base64String, 'data_url');

    // 4. Return the lightweight, permanent URL
    const downloadURL = await getDownloadURL(imageRef);
    return downloadURL;

  } catch (error) {
    console.error("Failed to upload thumbnail:", error);
    return null; // Fallback to null so the design still saves even if image fails
  }
};

// 🚀 HELPER: Ensures all local blob URLs from Tools (Remove BG / Enhance) are saved permanently
const ensurePermanentUrls = async (viewStates, userId, designId) => {
  for (const view of Object.keys(viewStates)) {
    const objects = viewStates[view];
    
    const processObjects = async (objs) => {
      if (!objs) return;
      for (let obj of objs) {
        if (obj.type === 'image' || obj.type === 'Image') {
          const fileId = uuidv4();
          let newPrintUrl = null;
          let newProxyUrl = null;
          
          if (obj.print_src && obj.print_src.startsWith('blob:')) {
            const loc = `users/${userId}/designs/${designId}/images/originals/${fileId}`;
            newPrintUrl = await uploadToStorage(obj.print_src, loc);
            obj.print_src = newPrintUrl;
          }
          
          if (obj.proxy_src && obj.proxy_src.startsWith('blob:')) {
            const loc = `users/${userId}/designs/${designId}/images/proxies/${fileId}`;
            newProxyUrl = await uploadToStorage(obj.proxy_src, loc);
            obj.proxy_src = newProxyUrl;
          }
          
          if (obj.src && obj.src.startsWith('blob:')) {
            if (newProxyUrl) {
              obj.src = newProxyUrl;
            } else if (newPrintUrl) {
              obj.src = newPrintUrl;
            } else {
              const loc = `users/${userId}/designs/${designId}/images/proxies/${fileId}-fallback`;
              obj.src = await uploadToStorage(obj.src, loc);
            }
          }
        }
        if (obj.type === 'group' && obj.objects) await processObjects(obj.objects);
      }
    };
    
    await processObjects(objects);
  }
};

// --- SAVE NEW DESIGN ---
// 👇 Add `isCopy = false` to the end of the parameters
export const saveNewDesign = async (userId, currentObjects, viewStates, productData, currentView, setSaving, thumbnailDataUrl, name, isCopy = false) => {
  setSaving(true);
  try {
    const newId = uuidv4();
    let finalViewStates = { ...viewStates, [currentView]: currentObjects };

    // 🛑 1. Ensure Permanent URLs for anything local before duplicating
    await ensurePermanentUrls(finalViewStates, userId, newId);

    // 🛑 2. THE CLONE FIX: If "Save As Copy", physical duplicate the files to the new ID!
    if (isCopy) {
      finalViewStates = await cloneCanvasImagesForCopy(userId, newId, finalViewStates);
    }
    
    currentObjects = finalViewStates[currentView]; // Sync changes back to current objects

    // 1. Upload the thumbnail to Storage first
    const thumbnailUrl = await uploadThumbnail(userId, newId, thumbnailDataUrl);

    // 2. Build the doc using finalViewStates
    const designDoc = buildDesignDoc(newId, currentObjects, finalViewStates, productData, userId, currentView, true, thumbnailUrl, name);
    designDoc.userId = userId;
    // 3. Save to Firestore
    const designRef = doc(firestore, `users/${userId}/designs`, newId);
    await setDoc(designRef, designDoc);

    return { success: true, message: "Design saved successfully", id: newId };
  } catch (err) {
    console.error("Error saving new design:", err);
    return { success: false, error: err };
  } finally {
    setSaving(false);
  }
};
// --- OVERWRITE EXISTING DESIGN ---
export const overwriteDesign = async (userId, designId, currentObjects, viewStates, productData, currentView, setSaving, thumbnailDataUrl, name) => {
  if (!designId) return { success: false, error: "No Design ID provided" };
  setSaving(true);

  try {
    const thumbnailUrl = await uploadThumbnail(userId, designId, thumbnailDataUrl);
    // ✅ Pass 'name' to the builder
    const finalViewStates = { ...viewStates, [currentView]: currentObjects };
    
    // 🛑 1. Upload blobs to firebase permanently first
    await ensurePermanentUrls(finalViewStates, userId, designId);

    // 🛑 2. Delete missing images
    await cleanUpRemovedImages(userId, designId, finalViewStates);
    
    currentObjects = finalViewStates[currentView]; // Sync changes!

    const designDoc = buildDesignDoc(designId, currentObjects, viewStates, productData, userId, currentView, false, thumbnailUrl, name);

    const designRef = doc(firestore, `users/${userId}/designs`, designId);
    await setDoc(designRef, designDoc, { merge: true });

    return { success: true, message: "Design updated", id: designId };
  } catch (err) {
    console.error("Error overwriting design:", err);
    return { success: false, error: err };
  } finally {
    setSaving(false);
  }
};

export const exportSavedDesignImage = (designData) => {
  if (!designData || !designData.imageData) {
    alert("No preview image available for this design.");
    return;
  }

  try {
    const link = document.createElement('a');
    link.href = designData.imageData; // The Base64 image string

    // Sanitize filename
    const safeName = (designData.name || "design").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${safeName}-preview.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    console.error("Failed to download image:", error);
    alert("Could not download image.");
  }
};

export const exportReferenceImage = (canvas, fileName = 'design-preview', removeBg = false) => {
  if (!canvas) return;

  // 1. Save current state variables
  const activeObj = canvas.getActiveObject();

  // 2. Prepare Canvas for Snapshot
  // Deselect everything to remove the blue bounding boxes/handles
  canvas.discardActiveObject();

  // Find and hide the "Print Area Border" (Editor artifact)
  const borderObj = canvas.getObjects().find(obj =>
    obj.id === 'print-area-border' || obj.customId === 'print-area-border'
  );
  const wasBorderVisible = borderObj ? borderObj.visible : false;

  if (borderObj) {
    borderObj.visible = false;
  }
  // canvas.backgroundColor = 'transparent' //removeBg ? 'transparent' : canvas.backgroundColor || '#fff';
  canvas.requestRenderAll();

  try {
    // 3. Generate Image Data
    // Multiplier: 2 provides good quality for Retina screens/Reference without creating massive Print files.
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
      enableRetinaScaling: true,
    });

    // 4. Trigger Download
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `${fileName}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    console.error("Export failed:", error);
    alert("Failed to export image.");
  } finally {
    // 5. Restore Editor State
    if (borderObj) {
      borderObj.visible = wasBorderVisible;
    }
    if (activeObj) {
      canvas.setActiveObject(activeObj);
    }
    canvas.requestRenderAll();
  }
};

export const saveGlobalTemplate = async (canvas, name, category = "General", objects) => {
  if (!canvas) return;

  try {
    // 1. Generate Thumbnail
    // We use a lower multiplier (1) for thumbnails to save space
    canvas.discardActiveObject();
    canvas.requestRenderAll();

    const dataURL = await canvas.toDataURL({
      format: 'png',
      quality: 0.8,
      multiplier: 1,
    });

    const templateId = `TEMP-${uuidv4()}`
    const mainLoc = `templates/${templateId}`
    const thumbnailURL = await uploadToStorage(dataURL, `${mainLoc}/thumbnail`)

    const modifiedObjects = await Promise.all(
      objects.map(async (obj, i) => {
        if (obj.type !== "image") {
          return { ...obj };
        }

        const objSRC = obj.props?.src;
        if (!objSRC) {
          return { ...obj };
        }

        // A. Upload the ORIGINAL massive image for the backend renderer
        const highResURL = await uploadToStorage(objSRC, `${mainLoc}/image-${i + 1}-highres`);

        // B. Generate proxy and get its exact new dimensions
        const proxyData = await generateProxyImage(objSRC, 500);
        const proxyURL = await uploadToStorage(proxyData.url, `${mainLoc}/image-${i + 1}-proxy`);

        // C. THE MATH FIX: Calculate the ratio difference
        const originalWidth = obj.props.width;
        const originalHeight = obj.props.height;
        const widthRatio = originalWidth / proxyData.width;
        const heightRatio = originalHeight / proxyData.height;

        // D. Save the mathematically adjusted object
        return {
          ...obj,
          props: {
            ...obj.props,
            src: proxyURL,
            print_src: highResURL,
            originalWidth: originalWidth,
            originalHeight: originalWidth,
            width: proxyData.width,
            height: proxyData.height,
            scaleX: obj.props.scaleX * widthRatio,
            scaleY: obj.props.scaleY * heightRatio,
          }
        };
      })
    );

    const templateData = {
      id: templateId,
      name: name || "Untitled Template",
      category,
      createdAt: Date.now(),
      type: 'BLANK', // Always BLANK as requested
      thumbnailUrl: thumbnailURL,
      canvasData: JSON.parse(JSON.stringify(modifiedObjects)),
      canvasBackground: canvas?.backgroundColor || 'white'
    };

    console.log(templateData)

    // 3. Save to Root Collection
    await addDoc(collection(firestore, "templates"), templateData);
    alert("Template created successfully!");

  } catch (error) {
    console.error("Error saving template:", error);
    alert("Failed to save template.");
  }
};