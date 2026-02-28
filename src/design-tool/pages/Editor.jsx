// src/design-tool/pages/Editor.jsx
import React, { useState, useEffect, useRef } from 'react';
import '../styles/Editor.css';
import CanvasEditor from '../components/CanvasEditor';
import Text from '../functions/text';
import updateObject from '../functions/update';
import removeObject from '../functions/remove';
import SaveDesignButton from '../components/SaveDesignButton';
import RightSidebarTabs from '../components/RightSidebarTabs';
import { undo, redo, setCanvasObjects, setHistory } from '../redux/canvasSlice';
import { store } from '../redux/store';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, useSearchParams } from 'react-router';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/context/CartContext';
import MainToolbar from '../components/MainToolbar';
import ContextualSidebar from '../components/ContextualSidebar';
import { db } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ThreeDPreviewModal } from '../components/ThreeDPreviewModal';
import { Button } from "@/components/ui/button";
import { Loader2, Save, Undo2, Redo2, Eye, ClipboardPaste } from "lucide-react";
import { COLOR_MAP } from '../../lib/colorMaps'
import { FiTrash2, FiLayers, FiCheckCircle, FiChevronDown, FiShoppingBag, FiShoppingCart, FiPlus, FiMinus } from 'react-icons/fi';
import { useIsMobile } from "@/hooks/use-mobile";
import MobileEditorLayout from '../mobile/MobileEditorLayout';
import { calculateImageDPI } from '../utils/dpiCalculator';
import { toast } from 'sonner';
import ExportButton from '../components/ExportButton';
import SaveTemplateButton from '../components/SaveTemplateButton';
import { v4 as uuidv4 } from 'uuid';
import { uploadToStorage } from '../utils/saveDesign'
import { PriceDisplay } from '@/components/PriceDisplay';

function removeUndefined(obj) {
    if (Array.isArray(obj)) {
        return obj.map(removeUndefined);
    } else if (obj && typeof obj === 'object') {
        const cleaned = {};
        for (const key in obj) {
            if (obj[key] !== undefined) {
                cleaned[key] = removeUndefined(obj[key]);
            }
        }
        return cleaned;
    }
    return obj;
}

const preloadFontsFromObjects = async (objects) => {
    if (!objects || !Array.isArray(objects)) return;

    // 1. Scan for used fonts
    const fonts = new Set();
    const traverse = (objs) => {
        objs.forEach(obj => {
            const type = (obj.type || '').toLowerCase();
            if ((type === 'text' || type === 'i-text' || type === 'textbox') && obj.fontFamily) {
                fonts.add(obj.fontFamily.replace(/['"]/g, '').trim());
            }
            if (type === 'group' && obj.objects) traverse(obj.objects);
        });
    };
    traverse(objects);

    const uniqueFonts = Array.from(fonts).filter(f => !['Arial', 'Helvetica', 'Times New Roman'].includes(f));
    if (uniqueFonts.length === 0) return;

    // 2. Build Google Fonts URL
    const families = uniqueFonts.map(font => `${font.replace(/ /g, '+')}:ital,wght@0,400;0,700;1,400;1,700`).join('&family=');
    const fontUrl = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;

    // 3. Inject CSS into the document head if it's not already there
    let link = document.querySelector(`link[href="${fontUrl}"]`);
    if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fontUrl;
        document.head.appendChild(link);
    }

    // 4. Force the browser to wait until the fonts are painted
    await document.fonts.ready;

    // 5. Explicitly command the browser to load them into memory to prevent race conditions
    const loadPromises = uniqueFonts.map(font => document.fonts.load(`16px "${font}"`).catch(() => { }));
    await Promise.all(loadPromises);
};


const CURRENCY_MAP = {
    IN: { symbol: '₹', code: 'INR' },
    US: { symbol: '$', code: 'USD' },
    GB: { symbol: '£', code: 'GBP' },
    EU: { symbol: '€', code: 'EUR' },
    CA: { symbol: 'C$', code: 'CAD' }
};

export default function EditorPanel() {
    const dispatch = useDispatch();
    const navigation = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const userId = user?.uid;

    const { addItem, updateItemContent, items: cartItems } = useCart();

    const [fabricCanvas, setFabricCanvas] = useState(null);
    const [activeTool, setActiveTool] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [currentDesign, setCurrentDesign] = useState(null);
    const [editingDesignId, setEditingDesignId] = useState(null);
    const [showProperties, setShowProperties] = useState(false);
    const isMobile = useIsMobile();

    // Redux State
    const canvasObjects = useSelector((state) => state.canvas.present);
    const past = useSelector((state) => state.canvas.past);
    const future = useSelector((state) => state.canvas.future);
    const clipboard = useSelector((state) => state.canvas.clipboard);

    const urlProductId = searchParams.get('product');
    const urlColor = searchParams.get('color');
    const urlSize = searchParams.get('size');
    const urlDesignId = searchParams.get('designId');
    const urlTemplateId = searchParams.get('templateId');
    const editCartId = searchParams.get('editCartId');
    const [isEditMode, setIsEditMode] = useState(false);

    const [colors, setColors] = useState([])
    const [sizes, setSizes] = useState([])

    const [isAdmin, setIsAdmin] = useState(false);

    const urlRegion = searchParams.get('region') || 'IN';

    const [productData, setProductData] = useState(false);
    const [selectedSize, setSelectedSize] = useState(urlSize || 'M');
    const [quantity, setQuantity] = useState(1);

    const [canvasBg, setCanvasBg] = useState(COLOR_MAP[urlColor]);
    const [currentView, setCurrentView] = useState("front");
    const [viewStates, setViewStates] = useState({});

    // ✅ NEW: Track Full Fabric JSON for High-Quality Rendering
    const [canvasViewStates, setCanvasViewStates] = useState({});
    const [dpiRegistry, setDpiRegistry] = useState({});

    const currentViewRef = useRef(currentView);
    const viewStatesRef = useRef(viewStates);

    useEffect(() => { currentViewRef.current = currentView; }, [currentView]);
    useEffect(() => { viewStatesRef.current = viewStates; }, [viewStates]);
    useEffect(() => {
        if (!fabricCanvas) return
        setTimeout(() => fabricCanvas.backgroundColor = canvasBg, 1000)
    }, [canvasBg])

    const [designTextures, setDesignTextures] = useState({
        front: { blob: null, url: null },
        back: { blob: null, url: null },
    });
    const containerRef = useRef(null);
    const [scaleFactor, setScaleFactor] = useState(0.2);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
    const { addText, addHeading, addSubheading } = Text(setSelectedId, setActiveTool);
    const [activePanel, setActivePanel] = useState('text');
    const [canvasDims, setCanvasDims] = useState({ width: 4500, height: 5400 });
    const [showColorPanel, setShowColorPanel] = useState(false);
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const isSidebarOpen = !!activePanel && activePanel !== 'product';

    useEffect(() => {
        if (!urlTemplateId && !urlProductId && !editingDesignId) {
            // It's a brand new design, generate ID right now!
            setEditingDesignId(uuidv4());
        }
    }, []);

    const currencyInfo = CURRENCY_MAP[urlRegion] || CURRENCY_MAP.IN;
    let currentPrice = 0;
    if (productData) {
        if (typeof productData.price === 'object') {
            currentPrice = productData.price[urlRegion] || productData.price.IN || 0;
        } else {
            currentPrice = productData.price || 0;
        }
    }
    const totalPrice = (currentPrice * quantity).toFixed(2);

    useEffect(() => {
        if (!selectedId) {
            setShowColorPanel(true);
        }
    }, [selectedId]);

    //DPI Calucator
    const updateDpiForObject = (obj) => {
        if (!obj || obj.type !== 'image') return;
        // Get Print Area for current view (e.g. Front)
        const printArea = productData?.print_areas?.[currentView] || { width: 4500, height: 5400 };

        const info = calculateImageDPI(
            obj,
            fabricCanvas.width,
            fabricCanvas.height,
            printArea.width,
            printArea.height
        );

        if (info) {
            setDpiRegistry(prev => ({
                ...prev,
                [obj.customId || obj.id]: {
                    id: obj.customId || obj.id,
                    src: obj.getSrc(),
                    ...info
                }
            }));
        }
    };

    useEffect(() => {
        if (!fabricCanvas) return;

        // A. Handle New Image (Add to Registry)
        const handleAdd = (e) => {
            if (e.target?.type === 'image') {
                // Small delay to ensure image data is ready
                setTimeout(() => updateDpiForObject(e.target), 100);
            }
        };

        // B. Handle Resize/Scale (Update Registry)
        const handleModify = (e) => {
            if (e.target?.type === 'image') {
                updateDpiForObject(e.target);
            }
        };

        // C. Handle Delete (Remove from Registry)
        const handleRemove = (e) => {
            if (e.target?.type === 'image') {
                setDpiRegistry(prev => {
                    const next = { ...prev };
                    delete next[e.target.customId || e.target.id];
                    return next;
                });
            }
        };

        const handleScaling = (e) => {
            if (e.target?.type === 'image') {
                updateDpiForObject(e.target)
            }
        }

        // D. Handle View Switch / Load (Refresh All)
        // We still need to scan once when loading a saved design or switching views
        const refreshAll = () => {
            const images = fabricCanvas.getObjects().filter(o => o.type === 'image');
            const newRegistry = {};
            const printArea = productData?.print_areas?.[currentView] || { width: 4500, height: 5400 };

            images.forEach(img => {
                const info = calculateImageDPI(img, fabricCanvas.width, fabricCanvas.height, printArea.width, printArea.height);
                if (info) {
                    newRegistry[img.customId || img.id] = { id: img.customId || img.id, src: img.getSrc(), ...info };
                }
            });
            setDpiRegistry(newRegistry);
        };

        fabricCanvas.on('object:added', handleAdd);
        fabricCanvas.on('object:modified', handleModify);
        fabricCanvas.on('object:removed', handleRemove);
        fabricCanvas.on('object:scaling', handleScaling)

        // Initial Scan (for page loads)
        refreshAll();

        return () => {
            fabricCanvas.off('object:added', handleAdd);
            fabricCanvas.off('object:modified', handleModify);
            fabricCanvas.off('object:removed', handleRemove);
            fabricCanvas.off('object:scaling', handleScaling)
        };
    }, [fabricCanvas, productData, currentView]);

    const validateBeforeAction = () => {
        const issues = Object.values(dpiRegistry);
        const critical = issues.some(i => i.status === 'poor');

        if (critical) {
            toast.error("Low Quality Image Detected", {
                description: "One of your images is too blurry to print. Please fix it before checking out.",
                duration: 5000,
            });
            // Optional: Open the "Quality Bell" list automatically here
            return false;
        }
        return true;
    };

    const handlePaste = () => {
        if (!clipboard || clipboard.length === 0) return;

        // Create new objects with fresh IDs and slight offset
        const newObjects = clipboard.map(obj => ({
            ...obj,
            id: uuidv4(),
            props: {
                ...obj.props,
                left: (obj.props.left || 0) + 20,
                top: (obj.props.top || 0) + 20
            }
        }));

        dispatch(setCanvasObjects([...canvasObjects, ...newObjects]));
    };

    const handleAddToCartSafe = async () => {
        if (!validateBeforeAction()) return; // 🛑 STOP if bad image
        handleAddToCart(); // Run original function
    };

    const handleBuyNowSafe = async () => {
        if (!validateBeforeAction()) return; // 🛑 STOP if bad image
        handleBuyNow(); // Run original function
    };
    const dpiIssuesList = Object.values(dpiRegistry);

    const handleMergeDesign = async (designItem) => {
        if (!designItem || !userId) return;

        try {
            // ✅ USING YOUR EXACT LOGIC
            const designRef = doc(db, `users/${userId}/designs`, designItem.id);
            const designSnap = await getDoc(designRef);

            if (!designSnap.exists()) return;
            const designData = designSnap.data();

            // Extract Objects
            const incomingObjects = Array.isArray(designData.canvasData)
                ? designData.canvasData
                : (designData.canvasData?.front || []);

            if (incomingObjects.length > 0) {
                // Remap IDs and Offset
                const newObjects = incomingObjects.map(obj => ({
                    ...obj,
                    id: uuidv4(),
                    customId: uuidv4(),
                    props: {
                        ...obj.props,
                        left: (obj.props.left || 0) + 20,
                        top: (obj.props.top || 0) + 20
                    }
                }));

                const currentObjects = store.getState().canvas.present;
                const combinedObjects = [...currentObjects, ...newObjects];
                dispatch(setCanvasObjects(combinedObjects));
                setActivePanel(null); // Close sidebar on success
            }
        } catch (error) {
            console.error("Error merging design:", error);
        }
    };
    console.log(fabricCanvas?.getActiveObject())

    // 👇 2. EDIT LOGIC (Strictly for "Edit/Replace Design")
    const handleLoadSavedDesign = async (designItem) => {
        if (!designItem || !userId) return;

        try {
            const designRef = doc(db, `users/${userId}/designs`, designItem.id);
            const designSnap = await getDoc(designRef);

            if (!designSnap.exists()) return;
            const designData = designSnap.data();

            const isProduct = designData.type === 'PRODUCT';
            const isBlank = designData.type === 'BLANK' || !designData.type;

            // CASE A: Load Product Design (Existing logic)
            if (isProduct) {
                if (designData.productConfig?.productId === (urlProductId || productData.id)) {
                    setCurrentDesign(designData);
                    setEditingDesignId(designData.id);

                    const savedStates = designData.canvasData || {};
                    setViewStates(savedStates);

                    if (designData.canvasViewStates) {
                        setCanvasViewStates(designData.canvasViewStates);
                    }

                    const activeView = designData.productConfig.activeView || 'front';
                    setCurrentView(activeView);
                    const activeObjects = savedStates[activeView] || [];

                    await preloadFontsFromObjects(designData.canvasData);
                    dispatch(setCanvasObjects(activeObjects));

                    setSearchParams(prev => {
                        prev.set('designId', designData.id);
                        return prev;
                    });
                    setActivePanel(null);
                }
            }
            // CASE B: Load Blank Design (NEW: Replace canvas instead of merge)
            else if (isBlank) {
                const incomingObjects = Array.isArray(designData.canvasData)
                    ? designData.canvasData
                    : (designData.canvasData?.front || []);

                // Replace Canvas
                await preloadFontsFromObjects(designData.canvasData);
                dispatch(setCanvasObjects(incomingObjects));
                setEditingDesignId(designData.id);
                setCurrentDesign(designData);
                setActivePanel(null);
            }

        } catch (error) {
            console.error("Error loading saved design:", error);
        }
    };

    // Template Load to canvas
    useEffect(() => {
        const loadTemplateFromUrl = async () => {
            // Only run if we have a template ID and we haven't loaded a design yet
            if (!urlTemplateId) return;

            try {
                // A. Fetch the Template from the Global Collection
                const templatesRef = collection(db, "templates");

                const q = query(
                    templatesRef,
                    where("id", "==", urlTemplateId)
                );

                const querySnap = await getDocs(q);

                if (!querySnap.empty) {
                    const templateData = querySnap.docs[0].data();

                    // B. THE JOB IS DONE HERE 👇
                    if (templateData.canvasData) {
                        await preloadFontsFromObjects(templateData.canvasData);
                        dispatch(setCanvasObjects(templateData.canvasData));
                    }

                    setCanvasBg(templateData.canvasBackground)

                    // C. Detach from the template (treat as new design)
                    setEditingDesignId(null);
                    setCurrentDesign(null);

                    // Optional: clean URL
                    setSearchParams({});
                } else {
                    console.error("Template not found");
                }
            } catch (err) {
                console.error("Error loading template from URL:", err);
            }
        };

        loadTemplateFromUrl();
    }, [urlTemplateId]);

    // --- Product Data Helpers ---

    const fetchProductData = async (pid) => {
        if (!pid) return null;
        try {
            const docRef = doc(db, "base_products", pid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const processedData = {
                    ...data,
                    print_areas: data.print_areas || { front: { width: 4500, height: 5400 } },
                    options: data.options || { colors: [] }
                };
                setProductData(processedData);
                if (urlRegion === 'IN') {
                    setColors(data.variants.qikink.colors)
                    setSizes(data.variants.qikink.sizes)
                }
                else if (urlRegion === 'US' || urlRegion === 'CA') {
                    setColors(data.variants.printify?.colors || [])
                    setSizes(data.variants.printify?.sizes || [])
                }
                else {
                    setColors(data.variants.gelato?.colors || [])
                    setSizes(data.variants.gelato?.sizes || [])
                }
                return processedData;
            }
        } catch (err) {
            console.error("Error loading product:", err);
        }
        return null;
    };

    // --- Load Cart Item (Edit Mode) ---

    useEffect(() => {
        if (editCartId && cartItems.length > 0) {
            const itemToEdit = cartItems.find(i => i.id === editCartId);

            if (itemToEdit && itemToEdit.designData) {
                console.log("Loading Cart Item for Edit:", itemToEdit);

                setIsEditMode(true);

                if (itemToEdit.variant?.color) {
                    const cName = itemToEdit.variant.color;
                    setCanvasBg(COLOR_MAP[cName] || cName);
                }
                if (itemToEdit.variant?.size) setSelectedSize(itemToEdit.variant.size);
                if (itemToEdit.quantity) setQuantity(itemToEdit.quantity);

                // Restore Redux states
                if (itemToEdit.designData.viewStates) {
                    setViewStates(itemToEdit.designData.viewStates);
                    viewStatesRef.current = itemToEdit.designData.viewStates;
                }

                // ✅ NEW: Restore Canvas JSON States
                if (itemToEdit.designData.canvasViewStates) {
                    setCanvasViewStates(itemToEdit.designData.canvasViewStates);
                }

                const savedView = itemToEdit.designData.currentView || 'front';
                setCurrentView(savedView);

                const objectsToLoad = itemToEdit.designData.viewStates?.[savedView] || [];
                dispatch(setCanvasObjects(objectsToLoad));

                fetchProductData(itemToEdit.productId);
            }
        }
    }, [editCartId, cartItems, dispatch]);


    useEffect(() => {
        if (!editCartId) {
            const pid = urlProductId || currentDesign?.productConfig?.productId;
            if (pid) {
                fetchProductData(pid).then((data) => {
                    if (data && !urlColor && !currentDesign) {
                        const initialColor = data.options?.colors?.[0] || "White";
                        setCanvasBg(COLOR_MAP[initialColor] || "#FFFFFF");
                    }
                });
            }
        }
    }, [urlProductId, currentDesign, editCartId]);


    // --- Merge & Design Loading Effects ---
    useEffect(() => {
        if (!userId) return;

        const mergeId = location.state?.mergeDesignId;
        const isMerge = !!mergeId;

        if (isMerge) {
            // ... (Merge logic kept same for brevity, it uses Redux state which is fine for merging)
            async function performMerge() {
                const contextJSON = sessionStorage.getItem('merge_context');
                let targetView = 'front';
                let currentViewObjects = [];
                let fullHistory = {};

                if (contextJSON) {
                    try {
                        const context = JSON.parse(contextJSON);
                        if (Date.now() - context.timestamp < 3600000) {
                            targetView = context.view;
                            fullHistory = context.viewStates || {};
                            currentViewObjects = fullHistory[targetView] || [];
                        }
                    } catch (e) { console.error("Restore failed", e); }
                    sessionStorage.removeItem('merge_context');
                }

                let incomingObjects = [];
                try {
                    const designRef = doc(db, `users/${userId}/designs`, mergeId);
                    const designSnap = await getDoc(designRef);
                    if (designSnap.exists()) {
                        const design = designSnap.data();
                        const raw = Array.isArray(design.canvasData) ? design.canvasData : (design.canvasData?.front || []);

                        if (raw.length > 0) {
                            incomingObjects = raw.map(obj => ({
                                ...obj,
                                id: uuidv4(),
                                customId: uuidv4(),
                                props: { ...obj.props, left: (obj.props.left || 0) + 30, top: (obj.props.top || 0) + 30 }
                            }));
                        }
                    }
                } catch (e) { console.error(e); }

                const finalObjectsForView = [...currentViewObjects, ...incomingObjects];
                const finalHistory = {
                    ...fullHistory,
                    [targetView]: finalObjectsForView
                };

                setCurrentView(targetView);
                setViewStates(finalHistory);
                dispatch(setCanvasObjects(finalObjectsForView));

                window.history.replaceState({}, document.title);
            }
            performMerge();
        }
        else if (urlDesignId && editingDesignId !== urlDesignId && !editCartId) {
            async function loadDesign() {
                try {
                    const designRef = doc(db, `users/${userId}/designs`, urlDesignId);
                    const designSnap = await getDoc(designRef);

                    if (designSnap.exists()) {
                        const design = designSnap.data();
                        setCurrentDesign(design);
                        setEditingDesignId(design.id);

                        if (design.type === 'PRODUCT' && design.productConfig) {
                            const savedStates = design.canvasData || {};
                            setViewStates(savedStates);

                            // ✅ NEW: Restore Canvas JSON States
                            if (design.canvasViewStates) {
                                setCanvasViewStates(design.canvasViewStates);
                            }

                            const activeView = design.productConfig.activeView || 'front';
                            setCurrentView(activeView);
                            const activeObjects = savedStates[activeView] || [];
                            dispatch(setCanvasObjects(activeObjects));
                        } else {
                            const objects = design.canvasData || [];
                            dispatch(setCanvasObjects(objects));
                        }
                    }
                } catch (e) { console.error("Error loading design", e); }
            }
            loadDesign();
        }

    }, [urlDesignId, location.state, userId, dispatch, editCartId]);


    useEffect(() => {
        if (currentDesign?.productConfig && !editCartId) {
            const params = new URLSearchParams(searchParams);
            const { productId, variantColor, variantSize } = currentDesign.productConfig;

            let changed = false;
            if (productId && params.get('product') !== productId) { params.set('product', productId); changed = true; }
            if (variantColor && params.get('color') !== variantColor) { params.set('color', variantColor); changed = true; }
            if (variantSize && params.get('size') !== variantSize) { params.set('size', variantSize); changed = true; }
            if (!params.get('region')) { params.set('region', urlRegion); changed = true; }

            if (changed) setSearchParams(params, { replace: true });
        }
    }, [currentDesign, setSearchParams, urlRegion, editCartId]);


    useEffect(() => {
        if (productData.canvas_size) {
            const area = productData.canvas_size?.[currentView] || productData.canvas_size;
            setCanvasDims({ width: area.width || 4500, height: area.height || 5400 });
        }
    }, [productData, currentView]);

    useEffect(() => {
        function calculateScale() {
            if (!containerRef.current) return;
            const realWidth = productData.print_areas?.[currentView]?.width || 4500;
            const realHeight = productData.print_areas?.[currentView]?.height || 5400;
            const availableWidth = containerRef.current.clientWidth;
            const availableHeight = containerRef.current.clientHeight;
            const widthRatio = (availableWidth * 0.85) / realWidth;
            const heightRatio = (availableHeight * 0.85) / realHeight;
            setScaleFactor(Math.min(widthRatio, heightRatio));
        }
        calculateScale();
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
    }, [productData, currentView]);

    // Merge and Replace Template
    const handleMergeTemplate = (template) => {
        if (!template || !template.canvasData) return;

        // Use existing merge logic: Generate new IDs and Offset
        const newObjects = template.canvasData.map(obj => ({
            ...obj,
            id: uuidv4(),
            customId: uuidv4(),
            props: {
                ...obj.props,
                left: (obj.props.left || 0) + 30, // Slight offset
                top: (obj.props.top || 0) + 30
            }
        }));

        const currentObjects = store.getState().canvas.present;
        dispatch(setCanvasObjects([...currentObjects, ...newObjects]));
        setActivePanel(null);
    };

    // 2. HANDLE REPLACE TEMPLATE (Start Fresh)
    const handleReplaceTemplate = (template) => {
        if (!template || !template.canvasData) return;

        if (window.confirm("This will replace your current design. Continue?")) {
            // A. Load the Objects
            dispatch(setCanvasObjects(template.canvasData));

            // B. CRITICAL: Clear the ID so it saves as NEW
            setEditingDesignId(null);
            setCurrentDesign(null);

            // Optional: Close sidebar
            setActivePanel(null);
        }
    };

    // --- Canvas Utils (Reduced for speed) ---

    const getCleanDataURL = (targetWidth = 1200, isSave = false) => {
        // Used ONLY for 3D Preview / Manual actions, NOT for Cart/Checkout
        if (!fabricCanvas) return null;
        const originalBg = fabricCanvas.backgroundColor;
        const originalClip = fabricCanvas.clipPath;
        const originalVpt = fabricCanvas.viewportTransform;
        if (!isSave) {
            if (productData.title?.includes("Mug")) {
                fabricCanvas.backgroundColor = "#FFFFFF";
            } else {
                fabricCanvas.backgroundColor = null;
            }
        }

        fabricCanvas.clipPath = null;
        const borderObj = fabricCanvas.getObjects().find(obj => obj.customId === 'print-area-border' || obj.id === 'print-area-border');
        if (borderObj) borderObj.visible = false;

        const currentWidth = fabricCanvas.width;
        const multiplier = targetWidth / currentWidth;

        fabricCanvas.renderAll();

        const dataUrl = fabricCanvas.toDataURL({
            format: 'png',
            quality: 0.8,
            multiplier: multiplier,
            enableRetinaScaling: true
        });

        fabricCanvas.backgroundColor = originalBg;
        fabricCanvas.clipPath = originalClip;
        if (originalVpt) fabricCanvas.setViewportTransform(originalVpt);
        if (borderObj) borderObj.visible = true;
        fabricCanvas.requestRenderAll();

        return dataUrl;
    };

    const captureCurrentCanvas = () => {
        const url = getCleanDataURL(1200);
        if (!url) return null;
        const arr = url.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        const blob = new Blob([u8arr], { type: mime });
        return { blob, url: URL.createObjectURL(blob) };
    }

    const handleSwitchView = async (newView) => {
        if (!fabricCanvas || newView === currentView) return;

        // 1. Capture Redux State (For Editor Reloads)
        const currentReduxState = store.getState().canvas.present;
        setViewStates(prev => ({ ...prev, [currentView]: currentReduxState }));

        const currentJSON = fabricCanvas.toObject(['customId', 'textStyle', 'textEffect', 'radius', 'effectValue', 'selectable', 'lockMovementX', 'lockMovementY', 'print_src', 'originalWidth', 'originalHeight']);

        // 🛑 THE RESPONSIVE ZOOM FIX
        const currentZoom = fabricCanvas.getZoom() || 1;
        currentJSON.width = Math.round(fabricCanvas.width / currentZoom);
        currentJSON.height = Math.round(fabricCanvas.height / currentZoom);

        currentJSON.objects = (currentJSON.objects || []).map((obj) => removeUndefined(obj));
        setCanvasViewStates(prev => ({ ...prev, [currentView]: currentJSON }));

        // 3. Switch View
        setCurrentView(newView);
        const nextObjects = viewStates[newView] || [];
        dispatch(setCanvasObjects(nextObjects));
        dispatch(setHistory({ past: [], present: nextObjects, future: [] }));
    };

    const handleColorChange = (colorName) => {
        const hex = COLOR_MAP[colorName] || colorName;
        setCanvasBg(hex);
        if (fabricCanvas) {
            fabricCanvas.backgroundColor = hex;
            fabricCanvas.requestRenderAll();
        }
    };

    useEffect(() => {
        const checkAdmin = async () => {
            if (!user) {
                setIsAdmin(false);
                return;
            }
            try {
                // Force refresh to get latest claims
                const tokenResult = await user.getIdTokenResult();
                setIsAdmin(!!tokenResult.claims.admin);
            } catch (e) {
                console.error("Admin check failed", e);
                setIsAdmin(false);
            }
        };

        checkAdmin();
    }, [user]);

    const handleGeneratePreview = () => {
        if (!fabricCanvas) return;
        setIsGeneratingPreview(true);
        setTimeout(() => {
            const currentSnapshot = captureCurrentCanvas();
            setDesignTextures(prev => ({ ...prev, [currentView]: currentSnapshot }));
            setIsPreviewOpen(true);
            setIsGeneratingPreview(false);
        }, 50);
    };

    // --------------------------------------------------
    // ✅ ULTRA-FAST PAYLOAD GENERATOR (No Browser Crashing)
    // --------------------------------------------------
    const generateOrderPayload = async () => {
        const currentReduxState = store.getState().canvas.present;
        const tempViewStates = { ...viewStates, [currentView]: currentReduxState };

        // 2. Snapshot CURRENT Fabric JSON (The Print Reality)
        let currentCanvasJson = null;
        if (fabricCanvas) {
            currentCanvasJson = fabricCanvas.toObject(['customId', 'textStyle', 'textEffect', 'radius', 'effectValue', 'selectable', 'lockMovementX', 'lockMovementY', 'print_src', 'originalWidth', 'originalHeight']);

            // 🛑 THE RESPONSIVE ZOOM FIX
            // Divide physical width by zoom to get the true logical dimensions (e.g. 420x560)
            const currentZoom = fabricCanvas.getZoom() || 1;
            currentCanvasJson.width = Math.round(fabricCanvas.width / currentZoom);
            currentCanvasJson.height = Math.round(fabricCanvas.height / currentZoom);

            currentCanvasJson.objects = (currentCanvasJson.objects || []).map((obj) => removeUndefined(obj));
        }

        const tempCanvasViewStates = { ...canvasViewStates, [currentView]: currentCanvasJson };

        // Upload local images to Firebase
        async function updateImgSrc(objects = []) {
            return Promise.all(
                objects.map(async (obj) => {
                    if (obj.type.toLowerCase() !== 'image') return obj;
                    if (!obj.src) return obj;

                    const isLocalImage = obj.src.startsWith('blob:') || obj.src.startsWith('data:');
                    if (!isLocalImage) return obj;

                    const imgSrc = await uploadToStorage(obj.src, `images/${Date.now()}_${uuidv4()}`);
                    return { ...obj, src: imgSrc, print_src: imgSrc };
                })
            );
        }

        async function updateAllSides(design) {
            const result = {};
            for (const side in design) {
                const sideJson = design[side];
                if (sideJson && sideJson.objects) {
                    sideJson.objects = await updateImgSrc(sideJson.objects);
                }
                result[side] = sideJson;
            }
            return result;
        }

        const updatedCanvasJsonViews = await updateAllSides(tempCanvasViewStates);
        const baseImage = productData.image || productData.mockups?.front || "/assets/placeholder.png";
        const colorName = Object.keys(COLOR_MAP).find(key => COLOR_MAP[key] === canvasBg);

        return {
            designId: editingDesignId || `temp_${Date.now()}`,
            title: productData.title || "Custom T-Shirt",
            productId: productData.id,
            variant: { color: colorName, size: selectedSize },
            quantity: quantity,
            price: currentPrice || 0,
            currency: currencyInfo,
            thumbnail: baseImage,
            highResGenerated: false,
            designData: {
                viewStates: tempViewStates,
                canvasViewStates: updatedCanvasJsonViews,
                currentView: currentView
            },
            createdAt: new Date().toISOString()
        };
    };

    const handleAddToCart = async () => {
        if (!userId) { navigation('/auth'); return; }
        setIsAddingToCart(true);
        try {
            const payload = await generateOrderPayload();
            if (isEditMode && editCartId) {
                await updateItemContent(editCartId, payload);
                alert("Cart Updated!");
                navigation('/cart');
            } else {
                await addItem(payload);
            }
        } catch (error) {
            console.error(error);
            alert("Error saving design");
        } finally {
            setIsAddingToCart(false);
        }
    };

    const handleBuyNow = async () => {
        if (!userId) { navigation('/auth'); return; }
        setIsSaving(true);
        try {
            const payload = await generateOrderPayload(); // Sync function now
            // Store payload in LocalStorage for checkout page
            localStorage.setItem('directBuyItem', JSON.stringify(payload));
            navigation('/checkout?mode=direct');
        } catch (e) {
            console.error("Buy Now Error", e);
            alert("Error proceeding to checkout.");
        } finally {
            setIsSaving(false);
        }
    };

    // ... (Rest of component remains unchanged)
    const BrandDisplay = (
        <div className="header-brand toolbar-brand" onClick={() => navigation('/dashboard')} style={{ cursor: 'pointer' }}>
            <div className="logo-circle ring-1 ring-white/20 shadow-lg shadow-orange-500/20">
                <img src="/assets/LOGO.png" alt="TRYAM" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h1 style={{ color: 'white' }}>TRYAM</h1>
        </div>
    );

    return (
        <div className="main-app-container selection:bg-orange-500 selection:text-white">
            <div className="fixed inset-0 -z-10 w-full h-full bg-[#0f172a]">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-600/10 blur-[100px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            </div>

            {/* ================= DESKTOP LAYOUT ================= */}
            {!isMobile && (
                <div className="main full-height-main">
                    <MainToolbar
                        activePanel={activePanel}
                        onSelectTool={(tool) => { setActivePanel(prev => prev === tool ? null : tool); }}
                        setSelectedId={setSelectedId}
                        setActiveTool={setActiveTool}
                        navigation={navigation}
                        brandDisplay={BrandDisplay}
                        fabricCanvas={fabricCanvas}
                        productId={urlProductId || currentDesign?.productConfig?.productId}
                        urlColor={urlColor || currentDesign?.productConfig?.variantColor}
                        urlSize={urlSize || currentDesign?.productConfig?.variantSize}
                        dpiIssues={dpiIssuesList}
                        isAdmin={isAdmin}
                        storageFolder={`users/${user.uid}/designs/${editingDesignId}/images`}
                    />

                    {/* Conditional Check */}
                    <div className={`sidebar-container-desktop ${isSidebarOpen ? 'open' : 'closed'}`}>
                        <ContextualSidebar activePanel={activePanel} setActivePanel={setActivePanel} addText={addText} addHeading={addHeading} addSubheading={addSubheading}
                            handleLoadSavedDesign={handleLoadSavedDesign} fabricCanvas={fabricCanvas}
                            setSelectedId={setSelectedId}
                            setActiveTool={setActiveTool}
                            productId={urlProductId || currentDesign?.productConfig?.productId || (productData ? productData.id : null)}
                            onMergeDesign={handleMergeDesign}
                            userId={userId}
                            onMergeTemplate={handleMergeTemplate}
                            onReplaceTemplate={handleReplaceTemplate}
                        />
                    </div>

                    <main className="preview-area relative bg-transparent flex items-center justify-center overflow-hidden gap-2" ref={containerRef}>
                        {productData.print_areas && Object.keys(productData.print_areas).length > 1 && (
                            <div className="absolute top-152 left-[40%] -translate-x-1/2 z-20 flex gap-2 bg-slate-800/80 p-1.5 rounded-full border border-white/10 shadow-lg backdrop-blur-md">
                                {Object.keys(productData.print_areas).map(view => (
                                    <button key={view} onClick={() => handleSwitchView(view)} className={`px-4 py-1 rounded-full text-xs font-bold capitalize transition-all ${currentView === view ? "bg-orange-600 text-white shadow-orange-900/50" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
                                        {view.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="top-bar consolidated-bar">
                            <div className="control-group">
                                <button title='Undo' className="top-bar-button" onClick={() => dispatch(undo())} disabled={!past.length} style={{ opacity: past.length ? '1' : '0.5' }}><Undo2 size={18} /></button>
                                <button title='Redo' className="top-bar-button" onClick={() => dispatch(redo())} disabled={!future.length} style={{ opacity: future.length ? '1' : '0.5' }}><Redo2 size={18} /></button>
                            </div>
                            <div className="control-group divider">
                                <button title='Delete' className="top-bar-button danger" onClick={() => removeObject(selectedId, setSelectedId, setActiveTool)} style={{ opacity: !selectedId ? '0.5' : '1' }}><FiTrash2 size={18} /></button>
                            </div>

                            <div className="control-group">
                                {fabricCanvas && (
                                    <>
                                        <SaveDesignButton
                                            canvas={store.getState().canvas}
                                            userId={userId}
                                            editingDesignId={editingDesignId}
                                            urlDesignId={urlDesignId}
                                            currentView={currentView}
                                            viewStates={viewStates}
                                            productData={{
                                                productId: urlProductId || currentDesign?.productConfig?.productId,
                                                color: urlColor || currentDesign?.productConfig?.variantColor,
                                                size: urlSize || currentDesign?.productConfig?.variantSize,
                                                print_areas: productData.print_areas
                                            }}
                                            currentObjects={canvasObjects}
                                            onGetSnapshot={getCleanDataURL}
                                            currentDesignName={currentDesign?.name}
                                            className="h-9 px-4 rounded-full flex items-center justify-center hover:text-orange-400 text-slate-200 text-xs font-bold shadow-lg transition-all"
                                            variant="ghost"
                                            fabricCanvas={fabricCanvas}
                                        />
                                        <button
                                            onClick={handlePaste}
                                            disabled={!clipboard || clipboard.length === 0}
                                            className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${!clipboard || clipboard.length === 0 ? 'opacity-40 cursor-not-allowed text-slate-500' : ' text-white-400 hover:text-indigo-300'}`}
                                            title="Paste"
                                        >
                                            <ClipboardPaste size={18} />
                                        </button>
                                        <ExportButton
                                            canvas={fabricCanvas}
                                            currentDesignName={currentDesign?.name || "Untitled Design"}
                                        />
                                        <SaveTemplateButton
                                            canvas={fabricCanvas}
                                            objects={canvasObjects}
                                        />
                                    </>
                                )}
                                {productData &&
                                    (<button title='Mockups' onClick={handleGeneratePreview} disabled={isGeneratingPreview || !fabricCanvas} className="flex items-center gap-2 rounded-xl px-3 py-2 bg-slate-800/50 hover:bg-slate-700 text-slate-200 border border-white/10 transition-all text-xs font-medium active:scale-95">
                                        {isGeneratingPreview ? <><Loader2 className="animate-spin" /> ...</> : <><Eye size={16} /></>}
                                    </button>)}
                            </div>
                        </div>

                        <CanvasEditor
                            setFabricCanvas={setFabricCanvas}
                            fabricCanvas={fabricCanvas}
                            canvasObjects={canvasObjects}
                            selectedId={selectedId}
                            setActiveTool={setActiveTool}
                            setSelectedId={setSelectedId}
                            printDimensions={canvasDims}
                            productId={productData.id}
                            activeView={currentView}
                        />
                    </main>

                    <aside className={`right-panel no-scrollbar ${(selectedId ? showProperties : showColorPanel) ? 'active' : ''}`}>
                        {selectedId ? (
                            <RightSidebarTabs id={selectedId} type={activeTool} object={canvasObjects.find((obj) => obj.id === selectedId)} updateObject={updateObject} removeObject={removeObject} addText={addText} fabricCanvas={fabricCanvas} setSelectedId={setSelectedId} updateDpiForObject={updateDpiForObject} printDimensions={{ w: productData?.print_areas?.[currentView].width, h: productData?.print_areas?.[currentView].height }} />
                        ) : (productData ? (
                            <div className="p-2 flex flex-col h-full overflow-y-auto">
                                <div className="mobile-panel-header">
                                    <span className="mobile-panel-title">Product Options</span>
                                    <button onClick={() => setShowColorPanel(false)} className="mobile-close-btn"><FiChevronDown size={24} /></button>
                                </div>
                                <div className="mb-8">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Color</h3>
                                    <div className="grid grid-cols-5 gap-2">
                                        {colors?.length > 0 ? colors.map((color) => {
                                            const hex = COLOR_MAP[color] || "#ccc";
                                            const isActive = canvasBg?.toLowerCase() === hex?.toLowerCase();
                                            return (
                                                <button key={color} onClick={() => handleColorChange(color)} className={`w-9 h-9 rounded-full border transition-all relative ${isActive ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-[#0f172a] scale-110" : "hover:scale-110 border-slate-600"}`} style={{ backgroundColor: hex }}>
                                                    {isActive && <FiCheckCircle className="text-orange-500 absolute -top-1 -right-1 bg-white rounded-full drop-shadow-md" />}
                                                </button>
                                            );
                                        }) : <p className="text-sm text-slate-500 col-span-5">No colors available</p>}
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Size</h3>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {sizes?.map((size) => (
                                            <button key={size} onClick={() => setSelectedSize(size)} className={`py-2 text-sm font-medium rounded-md border transition-all ${selectedSize === size ? "border-orange-500 bg-orange-500/10 text-orange-400 shadow-[0_0_10px_rgba(234,88,12,0.2)]" : "border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-slate-800"}`}>
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quantity</h3>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center border border-slate-700 rounded-md bg-slate-900/50">
                                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white"><FiMinus size={14} /></button>
                                            <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="w-12 text-center text-sm font-medium focus:outline-none bg-transparent text-white" />
                                            <button onClick={() => setQuantity(q => q + 1)} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white"><FiPlus size={14} /></button>
                                        </div>
                                        <div className="text-sm text-slate-400">{currencyInfo.symbol}{totalPrice} total</div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-6 border-t border-slate-700">
                                    <div className="flex justify-between items-end mb-4">
                                        <div className="flex justify-between items-end mb-4">
                                            <div>
                                                <p className="text-xs text-slate-400 mb-1">Total Price</p>
                                                <PriceDisplay
                                                    // We pass unit price * quantity = totalPrice
                                                    price={parseFloat(totalPrice)}
                                                    currency={currencyInfo.symbol}
                                                    productId={urlProductId || currentDesign?.productConfig?.productId || productData.id}
                                                    size="lg"
                                                />
                                            </div>

                                            {/* Optional: Show per-unit breakdown if quantity > 1 */}
                                            {quantity > 1 && (
                                                <div className="text-xs text-slate-500 mb-1 text-right">
                                                    {quantity} x {currencyInfo.symbol}{currentPrice}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-3 flex-col sm:flex-row">
                                        <Button onClick={handleAddToCart} disabled={isAddingToCart || !fabricCanvas} className={`flex-1 h-12 w-10 text-base text-white border border-slate-600 ${isEditMode ? "bg-blue-600 hover:bg-blue-700 border-blue-500" : "bg-slate-700 hover:bg-slate-600"}`}>
                                            {isAddingToCart ? <Loader2 className="animate-spin" /> : isEditMode ? <> <Save className="mr-2 h-4 w-4" /> Update Cart </> : <> <FiShoppingBag className="mr-2" /> Add to Cart </>}
                                        </Button>
                                        <Button onClick={handleBuyNow} disabled={isSaving || !fabricCanvas} className="flex-1 h-12 w-10 text-base bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-900/40 border-0">
                                            {isSaving ? <> <Loader2 className="animate-spin mr-2" /> Processing... </> : <> <FiShoppingCart className="mr-2" /> Buy Now </>}
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-center text-slate-500 mt-2">Secure checkout powered by Razorpay</p>
                                </div>
                            </div>
                        ) : (!fabricCanvas?.getActiveObject() &&
                            <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
                                <div className="w-20 h-20 rounded-2xl bg-slate-800/30 border border-white/5 flex items-center justify-center mb-4 relative overflow-hidden group">
                                    {/* Subtle Shine Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <FiLayers size={32} className="text-slate-600 group-hover:text-indigo-400 transition-colors duration-300" />
                                </div>

                                <h3 className="text-sm font-bold text-slate-300 mb-1 tracking-wide">No Selection</h3>
                                <p className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed">
                                    Click on any element in the canvas to customize its properties, style, and effects.
                                </p>
                            </div>
                        ))}
                    </aside>
                </div>
            )}

            {/* ================= MOBILE LAYOUT ================= */}
            {isMobile && (
                <MobileEditorLayout
                    // ... basic props ...
                    fabricCanvas={fabricCanvas}
                    selectedId={selectedId}
                    setSelectedId={setSelectedId}
                    activeTool={activeTool}
                    setActiveTool={setActiveTool}
                    setActivePanel={setActivePanel}
                    activePanel={activePanel} // Pass this!
                    navigation={navigation}
                    canvasObjects={canvasObjects}
                    updateDpiForObject={updateDpiForObject}
                    handlePaste={handlePaste}
                    clipboard={clipboard}

                    // --- 1. Pass Action Functions ---
                    onUndo={() => dispatch(undo())}
                    onRedo={() => dispatch(redo())}
                    canUndo={past.length > 0}
                    canRedo={future.length > 0}
                    saveButton={
                        <SaveDesignButton
                            canvas={store.getState().canvas}
                            userId={userId}
                            editingDesignId={editingDesignId}
                            // Use a specific class for mobile styling
                            className="h-9 px-4 rounded-full flex items-center justify-center text-orange-400 text-xs font-bold shadow-lg transition-all"
                            currentView={currentView}
                            viewStates={viewStates}
                            productData={{
                                productId: urlProductId || currentDesign?.productConfig?.productId,
                                color: urlColor || currentDesign?.productConfig?.variantColor,
                                size: urlSize || currentDesign?.productConfig?.variantSize,
                                print_areas: productData.print_areas
                            }}
                            fabricCanvas={fabricCanvas}
                            currentObjects={canvasObjects}
                            urlDesignId={urlDesignId}
                            onGetSnapshot={getCleanDataURL}
                            currentDesignName={currentDesign?.name}
                            variant="ghost"
                        // Optional: If your component has a 'label' prop, set it to "Save"
                        // Optional: If it has an 'iconOnly' prop for mobile, set it true
                        />
                    }
                    // --- 2. Pass Preview Function ---
                    onGeneratePreview={handleGeneratePreview}
                    isGeneratingPreview={isGeneratingPreview}
                    updateObject={updateObject}
                    currentDesignName={currentDesign?.name || "Untitled Design"}
                    storageFolder={`users/${user.uid}/designs/${editingDesignId}/images`}

                    // --- 3. Pass View Switcher Props ---
                    currentView={currentView}
                    onSwitchView={handleSwitchView}
                    availableViews={productData?.print_areas ? Object.keys(productData.print_areas) : ['front', 'back']}
                    dpiIssues={dpiIssuesList} // 👈 Pass the List
                    // --- 4. Pass Product Logic (The Big One) ---
                    productProps={{
                        id: urlProductId || currentDesign?.productConfig?.productId,
                        product: productData,
                        selectedColor: canvasBg || currentDesign?.productConfig?.variantColor, // Or your local state for color
                        setColor: handleColorChange,
                        selectedSize: selectedSize || currentDesign?.productConfig?.variantSize, // Or local state
                        setSize: setSelectedSize, // Your existing size setter
                        quantity: quantity,
                        printDimensions: { w: productData?.print_areas?.[currentView].width || 4500, h: productData?.print_areas?.[currentView].height || 5400 },
                        setQuantity: setQuantity,
                        onAddToCart: handleAddToCartSafe,
                        onBuyNow: handleBuyNowSafe,
                        isAddingToCart: isAddingToCart,
                        isSaving: isSaving,
                        totalPrice: totalPrice,
                        currencySymbol: currencyInfo.symbol,
                        colors: colors,
                        sizes: sizes
                    }}
                >
                    <CanvasEditor
                        setFabricCanvas={setFabricCanvas}
                        fabricCanvas={fabricCanvas}
                        canvasObjects={canvasObjects}
                        selectedId={selectedId}
                        setActiveTool={setActiveTool}
                        setSelectedId={setSelectedId}
                        printDimensions={canvasDims}
                        productId={productData.id}
                        activeView={currentView}
                        isMobile={isMobile}
                    />
                    <div
                        className={`sidebar-backdrop-mobile ${isSidebarOpen ? 'open' : ''}`}
                        onClick={() => setActivePanel(null)}
                    />

                    {/* 2. Drawer (Slides up/down) */}
                    <div className={`sidebar-container-mobile ${isSidebarOpen ? 'open' : ''}`}>
                        {/* Drag Handle Visual */}
                        <div className="w-full flex justify-center pt-3 pb-1 bg-[#1e293b]" onClick={() => setActivePanel(null)}>
                            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                        </div>

                        <div className="flex-1 w-full h-full overflow-y-auto">
                            <ContextualSidebar
                                activePanel={activePanel}
                                setActivePanel={setActivePanel}
                                addText={addText}
                                addHeading={addHeading}
                                addSubheading={addSubheading}
                                productId={urlProductId || currentDesign?.productConfig?.productId}
                                handleLoadSavedDesign={handleLoadSavedDesign}
                                fabricCanvas={fabricCanvas}
                                setSelectedId={setSelectedId}
                                setActiveTool={setActiveTool}
                                selectedId={selectedId}
                                userId={userId}
                                onMergeDesign={handleMergeDesign}
                                onMergeTemplate={handleMergeTemplate}
                                onReplaceTemplate={handleReplaceTemplate}
                            />
                        </div>
                    </div>
                </MobileEditorLayout>
            )}

            <ThreeDPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                textures={designTextures}
                onAddToCart={handleAddToCart}
                isSaving={isSaving}
                productId={urlProductId || currentDesign?.productConfig?.productId}
                productData={productData}
                productCategory={productData.category}
                selectedColor={canvasBg}
            />
        </div>
    );
}