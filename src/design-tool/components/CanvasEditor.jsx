// src/design-tool/components/CanvasEditor.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import * as fabric from 'fabric';
import StraightText from '../objectAdders/straightText';
import CircleText from '../objectAdders/CircleText';
import { store } from '../redux/store';
// 🛑 THE FIX: Removed setCanvasObjects for active editing, imported dispatchDelta
import { setCanvasObjects, dispatchDelta, undo, redo, setClipboard } from '../redux/canvasSlice';
import { FabricImage } from 'fabric';
import updateExisting from '../utils/updateExisting';
import FloatingMenu from './FloatingMenu';
import { handleCanvasAction } from '../utils/canvasActions';
import ShapeAdder from '../objectAdders/Shapes';
import ContextMenu from './ContextMenu';
import { v4 as uuidv4 } from 'uuid';

fabric.Object.prototype.toObject = (function (toObject) {
  return function (propertiesToInclude) {
    return toObject.call(
      this,
      (propertiesToInclude || []).concat([
        'customId', 'textStyle', 'textEffect', 'radius', 'effectValue',
        'selectable', 'lockMovementX', 'lockMovementY', 'print_src', 'originalWidth', 'originalHeight'
      ])
    );
  };
})(fabric.Object.prototype.toObject);
fabric.Image.prototype.crossOrigin = 'anonymous';

const isDifferent = (val1, val2) => {
  if (typeof val1 === 'number' && typeof val2 === 'number') {
    return Math.abs(val1 - val2) > 0.1;
  }
  return val1 !== val2;
};

const getDistance = (touch1, touch2) => {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

export default function CanvasEditor({
  setActiveTool,
  setSelectedId,
  setFabricCanvas,
  fabricCanvas,
  printDimensions,
  productId,
  isMobile
}) {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const isSyncingRef = useRef(false);
  const pendingImagesRef = useRef(new Set());

  // 🛑 1. THE NEW DELTA TRACKER: Holds the "Before" state when an object is clicked
  const beforeStateRef = useRef(null);

  const [initialized, setInitialized] = useState(false);
  const wrapperRef = useRef(null);
  const canvasObjects = useSelector((state) => state.canvas.present);
  const previousStatesRef = useRef(new Map());
  const dispatch = useDispatch();

  const [menuPosition, setMenuPosition] = useState(null);
  const [selectedObjectLocked, setSelectedObjectLocked] = useState(false);
  const [selectedObjectUUIDs, setSelectedObjectUUIDs] = useState([]);
  const shapes = ['rect', 'circle', 'triangle', 'star', 'pentagon', 'hexagon', 'line', 'arrow', 'diamond', 'trapezoid', 'heart', 'lightning', 'bubble'];

  const clipboard = useSelector((state) => state.canvas.clipboard);
  const [contextMenu, setContextMenu] = useState({ isOpen: false, x: 0, y: 0 });
  const gestureState = useRef({
    isGesture: false,
    startDist: 0,
    startScale: 1, 
    startZoom: 1   
  });

  // --- 🆕 DELTA COPY, CUT, PASTE LOGIC ---
  const handleCopy = () => {
    if (selectedObjectUUIDs.length === 0) return;
    const copiedObjects = canvasObjects.filter(obj => selectedObjectUUIDs.includes(obj.id));
    dispatch(setClipboard(copiedObjects));
  };

  const handleCut = () => {
    if (selectedObjectUUIDs.length === 0) return;
    const copiedObjects = canvasObjects.filter(obj => selectedObjectUUIDs.includes(obj.id));
    dispatch(setClipboard(copiedObjects));

    // 🚀 BATCH FIX: Delete them all in one receipt
    const batchDeltas = copiedObjects.map(obj => ({
       type: 'REMOVE', targetId: obj.id, before: obj, after: null 
    }));
    if (batchDeltas.length > 0) dispatch(dispatchDelta(batchDeltas));
    
    fabricCanvasRef.current?.discardActiveObject();
  };

  const handlePaste = () => {
    if (!clipboard || clipboard.length === 0) return;

    // 🚀 BATCH FIX: Add them all in one receipt
    const batchDeltas = clipboard.map(obj => {
      const newId = uuidv4();
      const newObj = {
        ...obj, id: newId,
        props: { ...obj.props, left: (obj.props.left || 0) + 20, top: (obj.props.top || 0) + 20 }
      };
      return { type: 'ADD', targetId: newId, before: null, after: newObj };
    });

    if (batchDeltas.length > 0) dispatch(dispatchDelta(batchDeltas));
  };

  const handleDuplicate = () => {
    if (selectedObjectUUIDs.length === 0) return;
    const copiedObjects = canvasObjects.filter(obj => selectedObjectUUIDs.includes(obj.id));
    
    copiedObjects.forEach(obj => {
      const newId = uuidv4();
      const newObj = {
        ...obj,
        id: newId,
        props: { ...obj.props, left: (obj.props.left || 0) + 20, top: (obj.props.top || 0) + 20 }
      };
      // Dispatch an ADD delta
      dispatch(dispatchDelta({ type: 'ADD', targetId: newId, before: null, after: newObj }));
    });
  };

  const handleUndo = () => dispatch(undo());
  const handleRedo = () => dispatch(redo());

  const getLogicalSize = () => {
    if (productId && printDimensions?.width && printDimensions?.height) {
      return { width: printDimensions.width, height: printDimensions.height };
    }
    return { width: 500, height: 500 };
  };

  const fitCanvasToScreen = (canvas, containerW, containerH) => {
    if (!canvas) return;
    const { width: targetW, height: targetH } = getLogicalSize();
    let scale;

    if (isMobile) {
      const maxMobileWidth = containerW * 0.65;
      const maxMobileHeight = containerH * 0.5;
      scale = Math.min(maxMobileWidth / targetW, maxMobileHeight / targetH);
      if (canvas.wrapperEl) {
        canvas.wrapperEl.style.boxShadow = "0 20px 50px -10px rgba(0,0,0,0.5)";
        canvas.wrapperEl.style.borderRadius = "12px";
        canvas.wrapperEl.style.border = "1px solid rgba(255,255,255,0.1)";
      }
    } else {
      const padding = 50;
      const availW = containerW - padding;
      const availH = containerH - padding;
      scale = Math.min(1, availW / targetW, availH / targetH);
      if (canvas.wrapperEl) {
        canvas.wrapperEl.style.boxShadow = "0 4px 15px rgba(0,0,0,0.15)";
        canvas.wrapperEl.style.borderRadius = "0px";
      }
    }

    canvas.setDimensions({ width: targetW * scale, height: targetH * scale });
    canvas.setZoom(scale);

    const controlSize = isMobile ? 24 : 12;
    fabric.Object.prototype.set({
      cornerSize: controlSize / scale,
      touchCornerSize: 40 / scale,
      transparentCorners: false,
      borderScaleFactor: 2 / scale,
    });
    canvas.requestRenderAll();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'c': e.preventDefault(); handleCopy(); break;
          case 'x': e.preventDefault(); handleCut(); break;
          case 'v': e.preventDefault(); handlePaste(); break;
          case 'z': e.preventDefault(); if (e.shiftKey) handleRedo(); else handleUndo(); break;
          case 'y': e.preventDefault(); handleRedo(); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasObjects, clipboard, selectedObjectUUIDs]);

  const updateMenuPosition = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !wrapperRef.current) return;
    const activeObj = canvas.getActiveObject();

    if (activeObj) {
      const vpt = canvas.viewportTransform;
      if (!vpt) return;

      const canvasEl = canvas.getElement();
      const canvasRect = canvasEl.getBoundingClientRect();
      const wrapperRect = wrapperRef.current.getBoundingClientRect();

      const offsetX = canvasRect.left - wrapperRect.left;
      const offsetY = canvasRect.top - wrapperRect.top;

      const objectCenter = activeObj.getCenterPoint();
      const objPixelX = objectCenter.x * vpt[0] + vpt[4];
      const objPixelY = objectCenter.y * vpt[3] + vpt[5];

      const screenX = objPixelX + offsetX;
      const screenY = objPixelY + offsetY;

      const scaledWidth = activeObj.getScaledWidth() * vpt[0];
      const scaledHeight = activeObj.getScaledHeight() * vpt[3];

      let finalLeft, finalTop;
      const menuWidth = 220; 
      const screenPadding = 15; 

      if (isMobile) {
        finalLeft = screenX + (scaledWidth / 2) + 20;
        finalTop = screenY - (scaledHeight / 2);
      } else {
        finalLeft = screenX + (scaledWidth / 2) + 40;
        finalTop = screenY - (scaledHeight / 2) - 40;
      }

      if (finalLeft + menuWidth > window.innerWidth) {
        finalLeft = window.innerWidth - menuWidth - screenPadding;
      }
      finalLeft = Math.max(screenPadding, finalLeft);

      setMenuPosition({ left: finalLeft, top: finalTop });

      if (activeObj.type === 'activeselection') {
        setSelectedObjectUUIDs(activeObj.getObjects().map(o => o.customId));
        setSelectedObjectLocked(activeObj.getObjects().some(o => o.lockMovementX));
      } else {
        setSelectedObjectUUIDs([activeObj.customId]);
        setSelectedObjectLocked(activeObj.lockMovementX === true);
      }
    } else {
      setMenuPosition(null);
      setSelectedObjectUUIDs([]);
    }
  };

  useEffect(() => {
    let canvas = fabricCanvasRef.current;
    if (!canvas) {
      canvas = new fabric.Canvas(canvasRef.current, {
        backgroundColor: '#ffffff',
        selection: true,
        controlsAboveOverlay: true,
        preserveObjectStacking: true,
        allowTouchScrolling: false,
        fireRightClick: true,  
        stopContextMenu: true,
      });
      fabricCanvasRef.current = canvas;
      setFabricCanvas(canvas);
      setInitialized(true);

      const upperCanvas = canvas.upperCanvasEl;

      upperCanvas.addEventListener('contextmenu', (e) => {
        e.preventDefault(); 
        const target = canvas.findTarget(e, false);
        if (target && canvas.getActiveObject() !== target) {
          canvas.requestRenderAll();
        }
        setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY });
      });

      upperCanvas.addEventListener('click', () => {
        setContextMenu(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
      });

      if (canvas.wrapperEl) {
        canvas.wrapperEl.style.boxShadow = "0 4px 15px rgba(0,0,0,0.15)";
        canvas.wrapperEl.style.border = "1px solid #e2e8f0";
      }

      const onTouchStart = (e) => {
        if (e.touches && e.touches.length === 2) {
          e.preventDefault();
          gestureState.current.isGesture = true;
          gestureState.current.startDist = getDistance(e.touches[0], e.touches[1]);
          const activeObj = canvas.getActiveObject();
          if (activeObj) gestureState.current.startScale = activeObj.scaleX;
          else gestureState.current.startZoom = canvas.getZoom();
        }
      };

      const onTouchMove = (e) => {
        if (!gestureState.current.isGesture || e.touches.length !== 2) return;
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const scaleFactor = dist / gestureState.current.startDist;
        const activeObj = canvas.getActiveObject();

        if (activeObj) {
          const newScale = gestureState.current.startScale * scaleFactor;
          activeObj.set({ scaleX: newScale, scaleY: newScale });
          activeObj.setCoords();
          canvas.requestRenderAll();
        } else {
          let newZoom = gestureState.current.startZoom * scaleFactor;
          if (newZoom > 5) newZoom = 5;
          if (newZoom < 0.2) newZoom = 0.2;
          const { width: logicalW, height: logicalH } = getLogicalSize();
          canvas.setDimensions({ width: logicalW * newZoom, height: logicalH * newZoom });
          canvas.setZoom(newZoom);
        }
      };

      const onTouchEnd = (e) => {
        if (e.touches.length < 2) gestureState.current.isGesture = false;
      };

      upperCanvas.addEventListener('touchstart', onTouchStart, { passive: false });
      upperCanvas.addEventListener('touchmove', onTouchMove, { passive: false });
      upperCanvas.addEventListener('touchend', onTouchEnd);
    }

    const resizeCanvas = () => {
      if (wrapperRef.current && canvas) {
        fitCanvasToScreen(canvas, wrapperRef.current.clientWidth, wrapperRef.current.clientHeight);
      }
    };

    const ro = new ResizeObserver(() => resizeCanvas());
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    resizeCanvas();
    return () => ro.disconnect();
  }, [printDimensions, productId, isMobile]);

  // --- SELECTION, MODIFICATION & DELTA ENGINE ---
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handleSelection = (e) => {
      if (isSyncingRef.current) return;
      const selected = e.selected?.[0];
      if (selected) {
        setSelectedId(selected.customId);
        setActiveTool(selected.textEffect === 'circle' ? 'circle-text' : selected.type);
        updateMenuPosition();
      }
    };

    const handleCleared = () => {
      if (isSyncingRef.current) return;
      setSelectedId(null);
      setActiveTool(null);
      setMenuPosition(null);
    };

    const handleMoving = () => {
      if (isSyncingRef.current) return;
      updateMenuPosition();
    };

    // 🚀 THE NEW ENGINE: No mouse:down tracker needed! We compare Fabric directly to Redux!
    const handleObjectModified = (e) => {
      if (isSyncingRef.current) return;
      updateMenuPosition();

      let obj = e.target;
      if (!obj) return;

      setSelectedId(obj.customId);
      setActiveTool(obj.textEffect === 'circle' ? 'circle-text' : obj.type);

      // Grab the "Before" state directly from the pristine Redux store!
      const currentReduxState = store.getState().canvas.present;

      // --- 📦 BATCH SELECTION LOGIC ---
      if (obj.type === 'activeselection') {
        setTimeout(() => {
          const children = [...obj.getObjects()];
          canvas.discardActiveObject(); // Instantly converts them back to Absolute Coordinates!

          const batchDeltas = [];

          children.forEach((child) => {
             const reduxObj = currentReduxState.find(o => o.id === child.customId);
             if (reduxObj) {
                 // Verify the object actually moved before making a receipt
                 if (
                    Math.abs(reduxObj.props.left - child.left) > 0.1 ||
                    Math.abs(reduxObj.props.top - child.top) > 0.1 ||
                    Math.abs(reduxObj.props.scaleX - child.scaleX) > 0.01 ||
                    Math.abs(reduxObj.props.scaleY - child.scaleY) > 0.01 ||
                    Math.abs(reduxObj.props.angle - child.angle) > 0.1
                 ) {
                     batchDeltas.push({
                        type: 'UPDATE',
                        targetId: child.customId,
                        before: {
                           left: reduxObj.props.left, top: reduxObj.props.top,
                           scaleX: reduxObj.props.scaleX, scaleY: reduxObj.props.scaleY,
                           angle: reduxObj.props.angle, width: reduxObj.props.width, height: reduxObj.props.height
                        },
                        after: {
                           left: child.left, top: child.top,
                           scaleX: child.scaleX, scaleY: child.scaleY,
                           angle: child.angle, width: child.width, height: child.height
                        }
                     });
                 }
             }
          });

          // Dispatch all updates instantly in a single receipt!
          if (batchDeltas.length > 0) {
             dispatch(dispatchDelta(batchDeltas));
          }

          // Quietly rebuild the selection box for the user
          if (children.length > 0) {
            const sel = new fabric.ActiveSelection(children, { canvas });
            canvas.setActiveObject(sel);
            canvas.requestRenderAll();
          }
        }, 0);
        return;
      }

      // --- 🖌️ SINGLE OBJECT LOGIC ---
      if (obj.customId) {
         const reduxObj = currentReduxState.find(o => o.id === obj.customId);
         if (reduxObj) {
             if (
                Math.abs(reduxObj.props.left - obj.left) > 0.1 ||
                Math.abs(reduxObj.props.top - obj.top) > 0.1 ||
                Math.abs(reduxObj.props.scaleX - obj.scaleX) > 0.01 ||
                Math.abs(reduxObj.props.scaleY - obj.scaleY) > 0.01 ||
                Math.abs(reduxObj.props.angle - obj.angle) > 0.1
             ) {
                 dispatch(dispatchDelta({
                    type: 'UPDATE',
                    targetId: obj.customId,
                    before: {
                       left: reduxObj.props.left, top: reduxObj.props.top,
                       scaleX: reduxObj.props.scaleX, scaleY: reduxObj.props.scaleY,
                       angle: reduxObj.props.angle, width: reduxObj.props.width, height: reduxObj.props.height
                    },
                    after: {
                       left: obj.left, top: obj.top,
                       scaleX: obj.scaleX, scaleY: obj.scaleY,
                       angle: obj.angle, width: obj.width, height: obj.height
                    }
                 }));
             }
         }
      }
    };

    canvas.on('object:added', (e) => {
      const obj = e.target;
      if (!obj) return;
      obj.set('objectCaching', true);
      if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') obj.set('paintFirst', 'stroke');
    });

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleCleared);
    canvas.on('object:moving', handleMoving);
    canvas.on('object:scaling', handleMoving);
    canvas.on('object:rotating', handleMoving);
    canvas.on('object:modified', handleObjectModified);

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared', handleCleared);
      canvas.off('object:moving', handleMoving);
      canvas.off('object:scaling', handleMoving);
      canvas.off('object:rotating', handleMoving);
      canvas.off('object:modified', handleObjectModified);
    };
  }, []);

  // --- SYNC LOOP (Remains the same, but now rarely triggers) ---
  useEffect(() => {
    if (!initialized) return;
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    let selectedIds = [];
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
      if (activeObject.type === 'activeselection') {
        selectedIds = activeObject.getObjects().map(o => o.customId);
        fabricCanvas.discardActiveObject(); 
      } else {
        selectedIds = [activeObject.customId];
      }
    }

    isSyncingRef.current = true;
    const fabricObjects = fabricCanvas.getObjects();
    let syncTimeout;

    const syncObjects = async () => {
      for (const objData of canvasObjects) {
        const currentString = JSON.stringify(objData);
        const previousString = previousStatesRef.current.get(objData.id);

        if (currentString === previousString) continue;

        let existing = fabricObjects.find((o) => o.customId === objData.id);

        if (['text', 'textbox', 'i-text'].includes(objData.type) || shapes.includes(objData.type)) {
          const curvedEffects = ['circle', 'semicircle', 'arc-up', 'arc-down', 'flag'];
          const isCurved = curvedEffects.includes(objData.props.textEffect);

          if (existing && existing.type === objData.type && !isCurved) {
            existing.set(objData.props);
            if (['text', 'textbox', 'i-text'].includes(existing.type)) {
              delete existing.__charBounds;
              delete existing.__lineWidths;
              if (existing.type !== 'textbox') {
                delete existing.width;
                delete existing.height;
              }
              existing.initDimensions();
            }
            existing.setCoords();
          } else {
            if (existing) fabricCanvas.remove(existing);
            let newObj;
            if (isCurved) newObj = CircleText(objData);
            else if (shapes.includes(objData.type)) newObj = ShapeAdder(objData);
            else newObj = StraightText(objData);

            if (newObj) {
              newObj.customId = objData.id;
              fabricCanvas.add(newObj);
              fabricCanvas.requestRenderAll();
            }
          }
        }

        if (objData.type.toLowerCase() === 'image') {
          const isPending = pendingImagesRef.current.has(objData.id);
          const alreadyOnCanvas = fabricCanvas.getObjects().some(obj => obj.customId === objData.id);

          if (!existing && !alreadyOnCanvas && !isPending) {
            pendingImagesRef.current.add(objData.id);
            try {
              const newObj = await FabricImage.fromURL(objData.props.src, { crossOrigin: 'anonymous' });
              newObj.set({ customId: objData.id, ...objData.props });
              if (!fabricCanvas.getObjects().some(o => o.customId === objData.id)) {
                fabricCanvas.add(newObj);
              }
            } catch (err) { console.error("Image load failed", err); } 
            finally { pendingImagesRef.current.delete(objData.id); }
          } else if (existing) {
            updateExisting(existing, objData, isDifferent);
          }
        }

        if (objData.type === 'svg') {
          if (!existing) {
            try {
              const { objects, options } = await fabric.loadSVGFromString(objData.svgString);
              const svgGroup = fabric.util.groupSVGElements(objects, options);
              svgGroup.set({ customId: objData.id, customType: 'svg', ...objData.props });
              if (objData.props.fill && svgGroup._objects) {
                svgGroup._objects.forEach(path => path.set('fill', objData.props.fill));
              }
              fabricCanvas.add(svgGroup);
              fabricCanvas.requestRenderAll();
            } catch (err) { console.error("Failed to load SVG:", err); }
          } else {
            existing.set({
              ...objData.props
            });
            existing.setCoords();
          }
        }
        previousStatesRef.current.set(objData.id, currentString);
      }

      const reduxIds = new Set(canvasObjects.map(o => o.id));
      fabricCanvas.getObjects().forEach((obj) => {
        if (!reduxIds.has(obj.customId)) {
          fabricCanvas.remove(obj);
          previousStatesRef.current.delete(obj.customId);
          fabricCanvas.requestRenderAll();
        }
      });

      canvasObjects.forEach((objData) => {
        const fabricObj = fabricCanvas.getObjects().find(o => o.customId === objData.id);
        if (fabricObj) fabricCanvas.bringObjectToFront(fabricObj);
      });

      if (selectedIds.length > 0) {
        const objectsToSelect = fabricCanvas.getObjects().filter(obj => selectedIds.includes(obj.customId));
        if (objectsToSelect.length > 1) {
          const selection = new fabric.ActiveSelection(objectsToSelect, { canvas: fabricCanvas });
          fabricCanvas.setActiveObject(selection);
        } else if (objectsToSelect.length === 1) {
          fabricCanvas.setActiveObject(objectsToSelect[0]);
        }
      }

      fabricCanvas.requestRenderAll();
      setTimeout(() => {
        updateMenuPosition();
        isSyncingRef.current = false;
      }, 50);
    };

    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => { syncObjects(); }, 50);
    return () => clearTimeout(syncTimeout);

  }, [canvasObjects, initialized]);

  const onMenuAction = (action) => {
    if (action === 'cut') return handleCut();
    handleCanvasAction(
      action, selectedObjectUUIDs, store.getState().canvas.present, dispatch,
      setCanvasObjects, setActiveTool, setSelectedId, handleCopy, handlePaste
    );
    if (action === 'delete') {
       // Also dispatch a REMOVE delta when user deletes from the floating menu
       selectedObjectUUIDs.forEach(id => {
         const obj = canvasObjects.find(o => o.id === id);
         if(obj) dispatch(dispatchDelta({ type: 'REMOVE', targetId: id, before: obj, after: null }));
       });
       fabricCanvasRef.current?.discardActiveObject();
    }
  };

  return (
    <div
      ref={wrapperRef}
      id="canvas-wrapper"
      className="relative w-full h-full flex flex-col gap-2 items-center justify-center overflow-auto no-scrollbar"
      style={{ touchAction: 'none'}} 
    >
      {!productId &&
        <div
          className="relative w-8 h-8 rounded-full left-25 overflow-hidden shadow-md cursor-pointer border border-white/20 hover:scale-110 transition-transform"
          style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
          title="Change Canvas Background"
        >
          <input
            type="color"
            defaultValue="#ffffff"
            className="absolute -top-2 -left-4 w-12 h-12 opacity-0 cursor-pointer"
            onChange={(e) => {
              if (fabricCanvas) {
                fabricCanvas.backgroundColor = e.target.value;
                fabricCanvas.requestRenderAll();
              }
            }}
          />
        </div>
      }
      <canvas ref={canvasRef} id="canvas" />

      {menuPosition && selectedObjectUUIDs.length > 0 && (
        <FloatingMenu
          position={menuPosition}
          onAction={onMenuAction}
          isLocked={selectedObjectLocked}
          isPasteAvailable={Boolean(clipboard?.length)}
        />
      )}

      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        onClose={() => setContextMenu({ ...contextMenu, isOpen: false })}
        hasSelection={selectedObjectUUIDs.length > 0}
        hasClipboard={clipboard && clipboard.length > 0}
        actions={{
          onCopy: handleCopy,
          onCut: handleCut,
          onPaste: handlePaste,
          onDuplicate: handleDuplicate,
          onDelete: () => onMenuAction('delete'),
          onLayerUp: () => onMenuAction('bringForward'),
          onLayerDown: () => onMenuAction('sendBackward'),
          toFont: () => onMenuAction('bringToFront'),
          toBack: () => onMenuAction('sendToBack'),
          flipVertical: () => onMenuAction('flipVertical'),
          flipHorizontal: () => onMenuAction('flipHorizontal'),
        }}
      />
    </div>
  );
}