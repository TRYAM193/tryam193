export const calculateImageDPI = (
    fabricObject,
    canvasWidth,
    canvasHeight,
    printAreaWidthPx,
    printAreaHeightPx
) => {
    // 1. Safety Checks
    if (!fabricObject || (fabricObject.type !== 'image' && fabricObject.type !== 'i-text' && fabricObject.type !== 'textbox')) return null;
    if (!canvasWidth || !canvasHeight || !printAreaWidthPx || !printAreaHeightPx) return null;

    // 2. High-Res Source of Truth
    // If the object is an image, we use its original pixel dimensions for accurate DPI.
    // If it's text, we can conceptually treat it as infinity, but usually, this tool is for images.
    const sourceWidth = fabricObject.originalWidth || (fabricObject.props?.width || fabricObject.width);
    const sourceHeight = fabricObject.originalHeight || (fabricObject.props?.height || fabricObject.height);

    if (!sourceWidth || !sourceHeight) return null;

    // 3. Normalize the "Logical Width" to the High-Res Print Area space
    // Fabric objects might report width in logical units (0-4500) or screen units (0-900).
    // We calibrate by checking how much of the canvas they cover.
    
    // getScaledWidth() on a real Fabric object returns visual width including canvas zoom?
    // To be platform-agnostic, we use the canvasWidth provided to the utility.
    const scaledWidth = fabricObject.getScaledWidth();
    const scaledHeight = fabricObject.getScaledHeight();

    // 4. Calculate Percentage of the Canvas covered
    const coverageX = scaledWidth / canvasWidth;
    const coverageY = scaledHeight / canvasHeight;

    // 5. Translate that coverage to Physical Inches in the Output
    // Standard Print Area Width at 300 PPI is (printAreaWidthPx / 300) inches.
    const physicalPrintAreaW = printAreaWidthPx / 300;
    const physicalPrintAreaH = printAreaHeightPx / 300;

    const physicalObjectW = coverageX * physicalPrintAreaW;
    const physicalObjectH = coverageY * physicalPrintAreaH;

    // 6. Calculate DPI (Dots Per Inch)
    // Formula: Source Pixels / Physical Inches
    const dpiX = sourceWidth / (physicalObjectW || 1);
    const dpiY = sourceHeight / (physicalObjectH || 1);

    const finalDpi = Math.round(Math.min(dpiX, dpiY));

    // 7. Determine Status
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