// src/design-tool/functions/remove.js
import { store } from '../redux/store';
import { dispatchDelta } from '../redux/canvasSlice';

export default function removeObject(id, setSelectedId, setActiveTool) {
  if (!id) return;

  const state = store.getState();
  
  // 1. Find the exact object we are deleting
  const objToRemove = state.canvas.present.find((obj) => obj.id === id);

  if (objToRemove) {
    // 2. 🚀 Dispatch REMOVE receipt, passing the original object into 'before'
    store.dispatch(dispatchDelta({
      type: 'REMOVE',
      targetId: id,
      before: objToRemove, // Crucial for Undo!
      after: null
    }));
  }

  if (setSelectedId) setSelectedId(null);
  if (setActiveTool) setActiveTool(null);
}