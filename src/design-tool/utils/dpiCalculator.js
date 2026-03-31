// src/design-tool/utils/dpiCalculator.js

export const calculateImageDPI = (
    fabricObject,
    canvasWidth,
    canvasHeight,
    printAreaWidthPx,
    printAreaHeightPx
) => {
    // 1. Safety Checks
    if (!fabricObject || fabricObject.type !== 'image') return null;
    if (!canvasWidth || !canvasHeight || !printAreaWidthPx || !printAreaHeightPx) return null;

    // 👇 2. THE FIX: Get the "Source of Truth" from the hidden metadata first!
    // We check if we stored the massive original dimensions during upload. 
    // If not, we fall back to the standard fabric object width.
    const sourceWidth = fabricObject.originalWidth || fabricObject.width;
    const sourceHeight = fabricObject.originalHeight || fabricObject.height;
    console.log(fabricObject)

    // 3. Get the "Target Spread" (The Size on the Canvas in LOGICAL pixels)
    // In FabricJS, getScaledWidth() = width * scaleX. This is unzoomed! 
    // It remains exactly the same on Mobile and Desktop, representing the Print Area space.
    const logicalPixelWidth = fabricObject.getScaledWidth();
    const logicalPixelHeight = fabricObject.getScaledHeight();

    // 4. Calculate Physical Dimensions of the Image on the Shirt
    // Since the canvas is natively created representing the Print Area at exactly 300 PPI, 
    // a logical pixel ALWAYS represents 1/300th of a physical inch!
    const physicalObjectW = logicalPixelWidth / 300;
    const physicalObjectH = logicalPixelHeight / 300;

    // 5. Calculate DPI (Dots Per Inch)
    // Formula: Raw Source Pixels / Physical Inches
    const dpiX = sourceWidth / (physicalObjectW || 1);
    const dpiY = sourceHeight / (physicalObjectH || 1);

    // 6. Safety: Take the lowest DPI
    const finalDpi = Math.round(Math.min(dpiX, dpiY));

    // 8. Determine Status
    let status = 'good';
    let color = '#22c55e'; // Green
    let message = 'Great Quality';

    if (finalDpi < 150) {
        status = 'poor';
        color = '#ef4444'; // Red
        message = 'Low Quality';
    } else if (finalDpi < 300) {
        status = 'warning';
        color = '#eab308'; // Yellow
        message = 'Fair Quality';
    }

    return { dpi: finalDpi, status, color, message };
};