// src/design-tool/functions/update.js
import { store } from '../redux/store';
import { dispatchDelta } from '../redux/canvasSlice';

const isValueDifferent = (prev, next) => {
  if (prev === next) return false;
  if (prev === null || next === null || prev === undefined || next === undefined) return prev !== next;

  if (typeof prev === 'object' && typeof next === 'object') {
    const keysA = Object.keys(prev);
    const keysB = Object.keys(next);
    if (keysA.length !== keysB.length) return true;
    for (const key of keysA) {
      if (prev[key] !== next[key]) return true;
    }
    return false;
  }
  return true;
};

export default function updateObject(id, updates, shouldDispatch = true) {
  const state = store.getState();
  const canvasObjects = state.canvas.present;

  const targetObj = canvasObjects.find((obj) => obj.id === id);
  if (!targetObj) return;

  const hasChanges = Object.keys(updates).some((key) => {
    const existingVal = targetObj.props[key];
    const newVal = updates[key];
    return isValueDifferent(existingVal, newVal);
  });

  if (!hasChanges) return; 

  if (shouldDispatch) {
    const beforeState = {};
    
    Object.keys(updates).forEach(key => {
        let val = targetObj.props[key];
        
        // 🛑 THE FIX: Guarantee a valid fallback so Undo can safely overwrite properties
        if (val === undefined) {
            if (['fill', 'stroke', 'shadowColor'].includes(key)) val = '#000000'; 
            else if (['strokeWidth', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'radius'].includes(key)) val = 0;
            else if (['scaleX', 'scaleY', 'opacity'].includes(key)) val = 1;
            else val = null;
        }
        
        beforeState[key] = val;
    });

    store.dispatch(dispatchDelta({
        type: 'UPDATE',
        targetId: id,
        before: beforeState,
        after: updates
    }));
  }
}