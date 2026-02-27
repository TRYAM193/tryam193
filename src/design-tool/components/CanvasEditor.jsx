// src/design-tool/components/CanvasEditor.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import * as fabric from 'fabric';
import StraightText from '../objectAdders/straightText';
import CircleText from '../objectAdders/CircleText';
import updateObject from '../functions/update';
import { store } from '../redux/store';
import { setCanvasObjects, undo, redo, setClipboard } from '../redux/canvasSlice';
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

// ✅ HELPER: Calculate distance between two touch points
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

  // 🔒 NEW: Track pending image loads to prevent duplicates
  const pendingImagesRef = useRef(new Set());

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
  // ✅ REF for Gesture State (Avoiding Re-renders)
  const gestureState = useRef({
    isGesture: false,
    startDist: 0,
    startScale: 1, // For Object
    startZoom: 1   // For Canvas
  });

  // --- CUT, COPY, PASTE, UNDO, REDO LOGIC ---
  const handleCopy = () => {
    if (selectedObjectUUIDs.length === 0) return;
    const copiedObjects = canvasObjects.filter(obj => selectedObjectUUIDs.includes(obj.id));
    dispatch(setClipboard(copiedObjects));
  };

  const handleCut = () => {
    if (selectedObjectUUIDs.length === 0) return;
    const copiedObjects = canvasObjects.filter(obj => selectedObjectUUIDs.includes(obj.id));
    dispatch(setClipboard(copiedObjects));

    // Remove from canvas
    const newObjects = canvasObjects.filter(obj => !selectedObjectUUIDs.includes(obj.id));
    dispatch(setCanvasObjects(newObjects));
    fabricCanvasRef.current?.discardActiveObject();
  };

  const handlePaste = () => {
    if (!clipboard || clipboard.length === 0) return;

    const newObjects = clipboard.map(obj => {
      const newId = uuidv4();
      return {
        ...obj,
        id: newId,
        props: {
          ...obj.props,
          left: (obj.props.left || 0) + 20, // Offset so it doesn't paste invisibly on top
          top: (obj.props.top || 0) + 20
        }
      };
    });

    dispatch(setCanvasObjects([...canvasObjects, ...newObjects]));
  };

  const handleDuplicate = () => {
    if (selectedObjectUUIDs.length === 0) return;
    const copiedObjects = canvasObjects.filter(obj => selectedObjectUUIDs.includes(obj.id));
    const newObjects = copiedObjects.map(obj => ({
      ...obj,
      id: uuidv4(),
      props: { ...obj.props, left: (obj.props.left || 0) + 20, top: (obj.props.top || 0) + 20 }
    }));
    dispatch(setCanvasObjects([...canvasObjects, ...newObjects]));
  };

  const handleUndo = () => dispatch(undo());
  const handleRedo = () => dispatch(redo());

  // ✅ 1. LOGICAL SIZE
  const getLogicalSize = () => {
    if (productId && printDimensions?.width && printDimensions?.height) {
      return { width: printDimensions.width, height: printDimensions.height };
    }
    return { width: 500, height: 500 };
  };

  // ✅ 2. FIT TO SCREEN
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

    canvas.setDimensions({
      width: targetW * scale,
      height: targetH * scale
    });

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

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'c': e.preventDefault(); handleCopy(); break;
          case 'x': e.preventDefault(); handleCut(); break;
          case 'v': e.preventDefault(); handlePaste(); break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) handleRedo(); else handleUndo();
            break;
          case 'y': e.preventDefault(); handleRedo(); break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasObjects, clipboard, selectedObjectUUIDs]); // Dependencies ensure fresh state

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
      const menuWidth = 220; // Estimated width of your Floating Menu
      const screenPadding = 15; // Pixels to keep away from the screen edge

      if (isMobile) {
        finalLeft = screenX + (scaledWidth / 2) + 20;
        finalTop = screenY - (scaledHeight / 2);
      } else {
        // Desktop: anchor to the right edge of the object
        finalLeft = screenX + (scaledWidth / 2) + 40;
        finalTop = screenY - (scaledHeight / 2) - 40;
      }

      // ✅ THE FIX: Smoothly nudge it left if it hits the right edge of the screen
      if (finalLeft + menuWidth > window.innerWidth) {
        finalLeft = window.innerWidth - menuWidth - screenPadding;
      }

      // Safety: Prevent it from going off the left edge of the screen too
      finalLeft = Math.max(screenPadding, finalLeft);

      setMenuPosition({
        left: finalLeft,
        top: finalTop
      });

      if (activeObj.type === 'activeselection') {
        const ids = activeObj.getObjects().map(o => o.customId);
        setSelectedObjectUUIDs(ids);
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

  // ✅ 3. INITIALIZE & MANUAL GESTURES
  useEffect(() => {
    let canvas = fabricCanvasRef.current;
    if (!canvas) {
      canvas = new fabric.Canvas(canvasRef.current, {
        backgroundColor: '#ffffff',
        selection: true,
        controlsAboveOverlay: true,
        preserveObjectStacking: true,
        allowTouchScrolling: false,
        fireRightClick: true,  // ✅ ADD THIS
        stopContextMenu: true,
      });
      fabricCanvasRef.current = canvas;
      setFabricCanvas(canvas);
      setInitialized(true);

      // ✅ NEW STRATEGY: Native DOM Context Menu Listener
      const upperCanvas = canvas.upperCanvasEl;

      upperCanvas.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // 100% blocks the browser menu

        // Check if they right-clicked specifically on an object
        const target = canvas.findTarget(e, false);

        if (target && canvas.getActiveObject() !== target) {
          // If they right-clicked an unselected object, select it automatically
          // canvas.setActiveObject(target);
          canvas.requestRenderAll();
        }

        // Open our custom React menu
        setContextMenu({
          isOpen: true,
          x: e.clientX,
          y: e.clientY
        });
      });

      // Close the menu if they left-click anywhere on the canvas
      upperCanvas.addEventListener('click', (e) => {
        setContextMenu(prev => {
          if (prev.isOpen) return { ...prev, isOpen: false };
          return prev;
        });
      });

      if (canvas.wrapperEl) {
        canvas.wrapperEl.style.boxShadow = "0 4px 15px rgba(0,0,0,0.15)";
        canvas.wrapperEl.style.border = "1px solid #e2e8f0";
      }

      const onTouchStart = (e) => {
        if (e.touches && e.touches.length === 2) {
          e.preventDefault();
          const dist = getDistance(e.touches[0], e.touches[1]);

          gestureState.current.isGesture = true;
          gestureState.current.startDist = dist;

          const activeObj = canvas.getActiveObject();
          if (activeObj) {
            gestureState.current.startScale = activeObj.scaleX;
          } else {
            gestureState.current.startZoom = canvas.getZoom();
          }
        }
      };

      const onTouchMove = (e) => {
        if (!gestureState.current.isGesture || e.touches.length !== 2) return;
        e.preventDefault();

        const dist = getDistance(e.touches[0], e.touches[1]);
        const startDist = gestureState.current.startDist;
        const scaleFactor = dist / startDist;

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

          canvas.setDimensions({
            width: logicalW * newZoom,
            height: logicalH * newZoom
          });
          canvas.setZoom(newZoom);
        }
      };

      const onTouchEnd = (e) => {
        if (e.touches.length < 2) {
          gestureState.current.isGesture = false;
        }
      };

      upperCanvas.addEventListener('touchstart', onTouchStart, { passive: false });
      upperCanvas.addEventListener('touchmove', onTouchMove, { passive: false });
      upperCanvas.addEventListener('touchend', onTouchEnd);
    }

    const resizeCanvas = () => {
      if (wrapperRef.current && canvas) {
        const { clientWidth, clientHeight } = wrapperRef.current;
        fitCanvasToScreen(canvas, clientWidth, clientHeight);
      }
    };

    const ro = new ResizeObserver(() => resizeCanvas());
    if (wrapperRef.current) ro.observe(wrapperRef.current);

    resizeCanvas();

    return () => ro.disconnect();
  }, [printDimensions, productId, isMobile]);

  // ✅ 4. SELECTION
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

    canvas.on('object:added', (e) => {
      const obj = e.target;
      if (!obj) return;
      obj.set('objectCaching', true);

      if (obj._renderPaintInOrder) {
        obj._renderPaintInOrder = function (ctx) {
          this._renderFill(ctx);
          if (this.stroke && this.strokeWidth > 0) {
            const savedComp = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = 'destination-over';
            this._renderStroke(ctx);
            ctx.globalCompositeOperation = savedComp;
          }
        };
      }

      if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
        obj.set('paintFirst', 'stroke');
      }
    });

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleCleared);
    canvas.on('object:moving', handleMoving);
    canvas.on('object:scaling', handleMoving);
    canvas.on('object:rotating', handleMoving);
    canvas.on('object:modified', handleMoving);

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared', handleCleared);
      canvas.off('object:moving', handleMoving);
      canvas.off('object:scaling', handleMoving);
      canvas.off('object:rotating', handleMoving);
      canvas.off('object:modified', handleMoving);
    };
  }, [fabricCanvas, setSelectedId, setActiveTool]);

  // ✅ 5. MODIFICATION
  useEffect(() => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    const handleObjectModified = (e) => {
      if (isSyncingRef.current) return;
      updateMenuPosition();

      let obj = e.target;
      if (!obj) return;

      const type = obj.type ? obj.type.toLowerCase() : '';

      if (type === 'activeselection') {
        const children = [...obj.getObjects()];

        // ⚡ FIX: Use setTimeout to prevent "Maximum call stack size exceeded"
        setTimeout(() => {
          // 1. Discard the group. This forces Fabric to apply the group's 
          //    transformations to the children's properties automatically.
          fabricCanvas.discardActiveObject();

          const present = store.getState().canvas.present;
          let updatedPresent = present.map((o) => JSON.parse(JSON.stringify(o)));
          let hasChanges = false;

          children.forEach((child) => {
            const index = updatedPresent.findIndex((o) => o.id === child.customId);
            if (index === -1) return;

            // 2. Read the "Trust Fabric" values directly from the child
            //    (No complex matrix math needed anymore)

            // if (child.type === 'text' || child.type === 'textbox' || child.customType === 'text') {
            //   // For text, we normalize scale into fontSize
            //   const newFontSize = child.fontSize * child.scaleX;
            //   child.set({ fontSize: newFontSize, scaleX: 1, scaleY: 1 });
            //   child.setCoords();

            //   updatedPresent[index].props = {
            //     ...updatedPresent[index].props,
            //     fontSize: newFontSize,
            //     left: child.left,
            //     top: child.top,
            //     angle: child.angle,
            //     scaleX: 1,
            //     scaleY: 1
            //   };
            // } else {
            updatedPresent[index].props = {
              ...updatedPresent[index].props,
              left: child.left,
              top: child.top,
              angle: child.angle,
              scaleX: child.scaleX,
              scaleY: child.scaleY,
              width: child.width,
              height: child.height
              // Note: Do not force width/height updates here unless necessary
              // };
            }
            hasChanges = true;
          });

          if (hasChanges) {
            store.dispatch(setCanvasObjects(updatedPresent));
          }

          // 3. Restore selection quietly
          if (children.length > 0) {
            const sel = new fabric.ActiveSelection(children, {
              canvas: fabricCanvas,
            });
            fabricCanvas.setActiveObject(sel);
            fabricCanvas.requestRenderAll();
          }
        }, 0);

        return;
      }

      // if (type === 'text' || type === 'textbox') {
      //   const newFontSize = obj.fontSize * obj.scaleX;
      //   obj.set({ fontSize: newFontSize, scaleX: 1, scaleY: 1 });
      //   obj.setCoords();
      //   fabricCanvas.renderAll();
      //   updateObject(obj.customId, {
      //     fontSize: newFontSize,
      //     left: obj.left,
      //     top: obj.top,
      //     angle: obj.angle,
      //   });
      //   return;
      // }

      updateObject(obj.customId, {
        left: obj.left,
        top: obj.top,
        angle: obj.angle,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        width: obj.width,
        height: obj.height,
      });
    };

    fabricCanvas.on('object:modified', handleObjectModified);
    return () => {
      fabricCanvas.off('object:modified', handleObjectModified);
    };
  }, []);

  // ✅ 6. SYNC (FIXED: Race Condition on Image Load)
  useEffect(() => {
    if (!initialized) return;
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    let selectedIds = [];
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && activeObject.type === 'activeselection') {
      selectedIds = activeObject.getObjects().map(o => o.customId);
      fabricCanvas.discardActiveObject();
    } else if (activeObject) {
      selectedIds = [activeObject.customId];
    }

    isSyncingRef.current = true;
    const fabricObjects = fabricCanvas.getObjects();

    // Use async loop safely
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
            // 1. Apply the new properties (like the new font)
            existing.set(objData.props);

            // 2. 🛑 THE FIX: Force Fabric to rebuild the selectable bounding box
            if (['text', 'textbox', 'i-text'].includes(existing.type)) {
              // Erase Fabric's cached memory of the old font's dimensions
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

        if (objData.type === 'image') {
          // 🛡️ CRITICAL FIX: Prevent Double Loading
          const isPending = pendingImagesRef.current.has(objData.id);
          const alreadyOnCanvas = fabricCanvas.getObjects().some(obj => obj.customId === objData.id);

          if (!existing && !alreadyOnCanvas && !isPending) {
            // 🔒 Lock: Mark this ID as "Loading"
            pendingImagesRef.current.add(objData.id);
            try {
              const newObj = await FabricImage.fromURL(objData.props.src, { crossOrigin: 'anonymous' });
              newObj.set({
                customId: objData.id,
                ...objData.props
              });

              // Final check before adding (Double Safety)
              if (!fabricCanvas.getObjects().some(o => o.customId === objData.id)) {
                fabricCanvas.add(newObj);
              }
            } catch (err) {
              console.error("Image load failed", err);
            } finally {
              // 🔓 Unlock: Finished loading
              pendingImagesRef.current.delete(objData.id);
            }
          } else if (existing) {
            updateExisting(existing, objData, isDifferent);
          }
        }
        if (objData.type === 'svg') {
          if (!existing) {
            try {
              // 👇 THE FIX: Use Fabric v6 Promise syntax
              const { objects, options } = await fabric.loadSVGFromString(objData.svgString);

              const svgGroup = fabric.util.groupSVGElements(objects, options);

              // Apply Redux properties
              svgGroup.set({
                customId: objData.id,
                customType: 'svg', // 👈 Tag it so the toolbars recognize it!
                ...objData.props
              });

              // If it has a specific fill, apply it to all internal shapes
              if (objData.props.fill && svgGroup._objects) {
                svgGroup._objects.forEach(path => path.set('fill', objData.props.fill));
              }

              fabricCanvas.add(svgGroup);
              fabricCanvas.requestRenderAll();
            } catch (err) {
              console.error("Failed to load SVG from Redux string:", err);
            }
          } else {
            // 2. Update existing SVG (Sync Redux -> Fabric)
            existing.set({
              left: objData.props.left,
              top: objData.props.top,
              scaleX: objData.props.scaleX,
              scaleY: objData.props.scaleY,
              angle: objData.props.angle,
              opacity: objData.props.opacity
            });

            // Loop through paths to sync color changes
            if (objData.props.fill && existing._objects) {
              existing._objects.forEach(path => path.set('fill', objData.props.fill));
            }

            existing.setCoords();
          }
        }

        previousStatesRef.current.set(objData.id, currentString);
      }

      // Cleanup removed objects
      const reduxIds = new Set(canvasObjects.map(o => o.id));
      fabricCanvas.getObjects().forEach((obj) => {
        if (!reduxIds.has(obj.customId)) {
          fabricCanvas.remove(obj);
          previousStatesRef.current.delete(obj.customId);
        }
      });

      // Restore Z-Index
      canvasObjects.forEach((objData, index) => {
        const fabricObj = fabricCanvas.getObjects().find(o => o.customId === objData.id);
        if (fabricObj) {
          fabricCanvas.moveObjectTo(fabricObj, index);
        }
      });

      // Restore Selection
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

    syncObjects();

  }, [canvasObjects, initialized]);

  const onMenuAction = (action) => {
    if (action === 'cut') return handleCut();
    handleCanvasAction(
      action,
      selectedObjectUUIDs,
      store.getState().canvas.present,
      dispatch,
      setCanvasObjects,
      setActiveTool,
      setSelectedId,
      handleCopy,
      handlePaste
    );
  };

  return (
    <div
      ref={wrapperRef}
      id="canvas-wrapper"
      className="relative w-full h-full flex flex-col gap-2 items-center justify-center overflow-auto no-scrollbar"
      style={{ touchAction: 'none' }} // ✅ ADDED THIS LINE
    >
      {/* ✅ CANVAS BACKGROUND COLOR PICKER */}
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
            // Check if fabricCanvas is available in this file
            if (fabricCanvas) {
              fabricCanvas.backgroundColor = e.target.value;
              fabricCanvas.requestRenderAll();
            }
          }}
        />
      </div>
      <canvas ref={canvasRef} id="canvas" />

      {menuPosition && selectedObjectUUIDs.length > 0 && (
        <FloatingMenu
          position={menuPosition}
          onAction={onMenuAction}
          isLocked={selectedObjectLocked}
          isPasteAvailable={Boolean(clipboard?.length)}
        />
      )}

      {/* ✅ ADDED CONTEXT MENU */}
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