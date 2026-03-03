// src/design-tool/functions/update.js
import { store } from '../redux/store';
import { dispatchDelta } from '../redux/canvasSlice'; // 🛑 NEW: Import the Delta Engine

/**
 * Helper to check if two values are actually different.
 * Handles primitives and simple objects (like Shadow {blur, color...})
 */
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

  // 1. Find the target object
  const targetObj = canvasObjects.find((obj) => obj.id === id);
  if (!targetObj) return;

  // 2. 🛡️ CHECK FOR CHANGES:
  const hasChanges = Object.keys(updates).some((key) => {
    const existingVal = targetObj.props[key];
    const newVal = updates[key];
    return isValueDifferent(existingVal, newVal);
  });

  // 3. Stop if no changes (Prevents Duplicate History spam!)
  if (!hasChanges) return; 

  // 4. 🚀 DISPATCH DELTA (The Magic Happens Here)
  if (shouldDispatch) {
    // A. We build a precise "Before" state containing ONLY the properties being changed
    // E.g., if updates = { opacity: 0.5 }, beforeState = { opacity: 1 }
    const beforeState = {};
    Object.keys(updates).forEach(key => {
        beforeState[key] = targetObj.props[key];
    });

    // B. Shoot the tiny receipt into Redux
    store.dispatch(dispatchDelta({
        type: 'UPDATE',
        targetId: id,
        before: beforeState,
        after: updates
    }));
  }
}