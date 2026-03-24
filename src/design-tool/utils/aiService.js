// src/design-tool/utils/aiService.js
import { getFunctions, httpsCallable } from "firebase/functions";

export const generateDesignJsonFromPrompt = async (prompt, style, canvasWidth, canvasHeight, productInfo, referenceImages = []) => {
  const functions = getFunctions();
  const generateFabricJson = httpsCallable(functions, 'generateFabricJson');

  try {
    const result = await generateFabricJson({ prompt, style, canvasWidth, canvasHeight, productInfo, referenceImages });
    
    if (result.data.success) {
      return result.data.objects; // Returns the JSON array for Fabric.js
    } else {
      throw new Error("Generation failed");
    }
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};