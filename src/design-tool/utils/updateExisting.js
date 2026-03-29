import { resolveFillForFabric } from './gradientUtils';

export default function updateExisting(existing, objData, isDifferent) {
    let updatesNeeded = {};
    for (const key in objData.props) {
        if (isDifferent(existing[key], objData.props[key])) {
            updatesNeeded[key] = objData.props[key];
        }

    }

    if (Object.keys(updatesNeeded).length > 0) {
        // Shadow Fix
        if (updatesNeeded.shadowColor || updatesNeeded.shadowBlur || updatesNeeded.shadowOffsetX || updatesNeeded.shadowOffsetY) {
            const shadowObject = {
                color: updatesNeeded.shadowColor || existing.shadow?.color || '#000000',
                blur: updatesNeeded.shadowBlur || existing.shadow?.blur || 0,
                offsetX: updatesNeeded.shadowOffsetX || existing.shadow?.offsetX || 0,
                offsetY: updatesNeeded.shadowOffsetY || existing.shadow?.offsetY || 0,
            };
            updatesNeeded.shadow = shadowObject;
            ['shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY'].forEach(key => delete updatesNeeded[key]);
        }

        if (updatesNeeded.scaleX !== undefined || updatesNeeded.scaleY !== undefined) {
            existing.set({
                scaleX: updatesNeeded.scaleX ?? existing.scaleX,
                scaleY: updatesNeeded.scaleY ?? existing.scaleY,
            });
            delete updatesNeeded.scaleX;
            delete updatesNeeded.scaleY;
        }

        if (existing.getSrc() !== objData.props.src) {
            existing.setSrc(objData.props.src);
        }

        const resolvedUpdates = { ...updatesNeeded };
        if (resolvedUpdates.fill) resolvedUpdates.fill = resolveFillForFabric(resolvedUpdates.fill);
        if (resolvedUpdates.stroke) resolvedUpdates.stroke = resolveFillForFabric(resolvedUpdates.stroke);
        existing.set(resolvedUpdates);
        existing.setCoords();
    }
}