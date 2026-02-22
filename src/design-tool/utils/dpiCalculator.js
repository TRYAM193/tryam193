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
    console.log(fabricObject.originalWidth)

    // 3. Get the "Target Spread" (The Size on the Canvas)
    // getScaledWidth() = width * scaleX (This is the size you see on screen)
    const onScreenPixelWidth = fabricObject.getScaledWidth();
    const onScreenPixelHeight = fabricObject.getScaledHeight();

    // 4. Calculate the Physical Ratio (Inches per Screen Pixel)
    const physicalWidthInches = printAreaWidthPx / 300; 
    const physicalHeightInches = printAreaHeightPx / 300; 
    
    const inchesPerPixelX = physicalWidthInches / canvasWidth;
    const inchesPerPixelY = physicalHeightInches / canvasHeight;

    // 5. Calculate Physical Dimensions of the Image on the Shirt
    const physicalObjectW = onScreenPixelWidth * inchesPerPixelX;
    const physicalObjectH = onScreenPixelHeight * inchesPerPixelY;

    // 6. Calculate DPI (Dots Per Inch)
    // Formula: Raw Source Pixels / Physical Inches
    const dpiX = sourceWidth / physicalObjectW;
    const dpiY = sourceHeight / physicalObjectH;

    // 7. Safety: Take the lowest DPI
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