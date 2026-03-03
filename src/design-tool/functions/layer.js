// src/design-tool/functions/layer.js
import { store } from '../redux/store';
import { dispatchDelta } from '../redux/canvasSlice';

export function reorderLayers(newObjects) {
  // 1. Grab the current array layout before the user dragged the layer
  const state = store.getState();
  const currentObjects = state.canvas.present;

  // 2. 🚀 Dispatch the REORDER receipt!
  store.dispatch(dispatchDelta({
    type: 'REORDER',
    targetId: 'ALL',
    before: currentObjects, // The old layout (for Undo)
    after: newObjects       // The new layout (for Redo / Present State)
  }));
}