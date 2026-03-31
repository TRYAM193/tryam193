import { toast } from 'sonner';
import { getAuth } from 'firebase/auth';

const getApiUrl = (endpoint) => {
  const baseUrl = import.meta.env.VITE_PYTHON_API_URL;
  return `${baseUrl}${endpoint}`;
};

/**
 * Calls Python Backend for Background Removal.
 * RETURNS: A temporary Blob URL (not uploaded yet).
 */
export const processBackgroundRemoval = async (imageSrc) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) { toast.error("Login Required"); return null; }

  try {
    const token = await currentUser.getIdToken();
    const response = await fetch(imageSrc);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append('file', blob, 'image.png');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const apiResponse = await fetch(getApiUrl('/remove-bg'), {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (apiResponse.status === 429) {
      toast.error("Daily Limit Reached");
      return null;
    }
    if (!apiResponse.ok) throw new Error("Failed to remove background");

    const resultBlob = await apiResponse.blob();
    // ⚡ Return local Blob URL only
    return URL.createObjectURL(resultBlob);

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error("BG Removal Timeout:", error);
      toast.error("Request timed out. Please try again.");
    } else {
      console.error("BG Removal Error:", error);
      toast.error("Background removal failed.");
    }
    return null;
  }
};

/**
 * Calls Python Backend for Upscaling.
 * RETURNS: A temporary Blob URL (not uploaded yet).
 */
export const processUpscale = async (imageSrc) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) { toast.error("Login Required"); return null; }

  try {
    const token = await currentUser.getIdToken();
    const response = await fetch(imageSrc);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append('file', blob, 'image.png');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const apiResponse = await fetch(getApiUrl('/upscale'), {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (apiResponse.status === 429) {
      toast.error("Daily Limit Reached");
      return null;
    }
    if (!apiResponse.ok) throw new Error("Server Error");

    const resultBlob = await apiResponse.blob();
    // ⚡ Return local Blob URL only
    return URL.createObjectURL(resultBlob);

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error("Upscale Timeout:", error);
      toast.error("Upscale request timed out.");
    } else {
      console.error("Upscale Failed:", error);
      toast.error("Enhancement Failed");
    }
    return null;
  }
};