// src/design-tool/utils/canvasActions.js
import { v4 as uuidv4 } from 'uuid';
import { dispatchDelta } from '../redux/canvasSlice';

export const handleCanvasAction = (action, selectedIds, canvasObjects, dispatch, setCanvasObjects, setActiveTool, setSelectedId, handleCopy, handlePaste) => {
  if (!selectedIds || selectedIds.length === 0 || !canvasObjects) return;

  // Helper to find original object
  const getObj = (id) => canvasObjects.find(o => o.id === id);

  switch (action) {
    // --- DELETE (Multi) ---
    case 'delete':
      selectedIds.forEach(id => {
        const obj = getObj(id);
        if (obj) {
          dispatch(dispatchDelta({ type: 'REMOVE', targetId: id, before: obj, after: null }));
        }
      });
      setActiveTool(null);
      setSelectedId(null);
      return; // Exit early, Delta handles Redux

    // --- DUPLICATE (Multi) ---
    case 'duplicate':
      selectedIds.forEach(id => {
        const obj = getObj(id);
        if (obj) {
          const newId = uuidv4();
          const newObj = {
            ...obj,
            id: newId,
            props: {
              ...obj.props,
              left: (obj.props.left || 0) + 20, 
              top: (obj.props.top || 0) + 20
            }
          };
          dispatch(dispatchDelta({ type: 'ADD', targetId: newId, before: null, after: newObj }));
        }
      });
      return;

    // --- LOCK/UNLOCK (Multi) ---
    case 'toggleLock':
      const firstObj = getObj(selectedIds[0]);
      if (!firstObj) return;
      
      const targetLockState = !firstObj.props.lockMovementX; 

      selectedIds.forEach(id => {
        const obj = getObj(id);
        if (obj) {
          dispatch(dispatchDelta({
            type: 'UPDATE',
            targetId: id,
            before: { 
              lockMovementX: obj.props.lockMovementX, lockMovementY: obj.props.lockMovementY, 
              lockRotation: obj.props.lockRotation, lockScalingX: obj.props.lockScalingX, 
              lockScalingY: obj.props.lockScalingY, hasControls: obj.props.hasControls 
            },
            after: { 
              lockMovementX: targetLockState, lockMovementY: targetLockState, 
              lockRotation: targetLockState, lockScalingX: targetLockState, 
              lockScalingY: targetLockState, hasControls: !targetLockState 
            }
          }));
        }
      });
      return;

    // --- FLIP (Multi) ---
    case 'flipHorizontal':
    case 'flipVertical':
      const prop = action === 'flipHorizontal' ? 'flipX' : 'flipY';
      selectedIds.forEach(id => {
        const obj = getObj(id);
        if (obj) {
          dispatch(dispatchDelta({
            type: 'UPDATE',
            targetId: id,
            before: { [prop]: obj.props[prop] },
            after: { [prop]: !obj.props[prop] }
          }));
        }
      });
      return;

    case 'copy':
      handleCopy();
      return;

    case 'paste':
      handlePaste();
      return;
  }

  // --- LAYERING (Multi - Uses REORDER Delta) ---
  // Layering is the only action that requires tracking the entire array order
  let newObjects = [...canvasObjects];

  if (action === 'bringToFront') {
      const toFront = newObjects.filter(o => selectedIds.includes(o.id));
      const remainingFront = newObjects.filter(o => !selectedIds.includes(o.id));
      newObjects = [...remainingFront, ...toFront];
  } 
  else if (action === 'sendToBack') {
      const toBack = newObjects.filter(o => selectedIds.includes(o.id));
      const remainingBack = newObjects.filter(o => !selectedIds.includes(o.id));
      newObjects = [...toBack, ...remainingBack];
  }
  else if (action === 'bringForward' && selectedIds.length === 1) {
      const idx = newObjects.findIndex(o => o.id === selectedIds[0]);
      if (idx < newObjects.length - 1) {
          [newObjects[idx], newObjects[idx + 1]] = [newObjects[idx + 1], newObjects[idx]];
      }
  }
  else if (action === 'sendBackward' && selectedIds.length === 1) {
      const idx = newObjects.findIndex(o => o.id === selectedIds[0]);
      if (idx > 0) {
          [newObjects[idx], newObjects[idx - 1]] = [newObjects[idx - 1], newObjects[idx]];
      }
  } else {
      return; // If it didn't match anything, do nothing
  }

  // Dispatch the REORDER receipt
  dispatch(dispatchDelta({ 
      type: 'REORDER', 
      targetId: 'ALL', 
      before: canvasObjects, // The old array layout
      after: newObjects      // The new array layout
  }));
};