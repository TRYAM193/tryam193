import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router'; // Ensure correct router import
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import * as fabric from 'fabric';
import { INITIAL_PRODUCTS } from '@/data/initialProducts'; 

export default function HeadlessRender() {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId');
    const view = searchParams.get('view') || 'front'; 

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (!orderId) return;

        // 🛑 LOCK: Track if this specific effect execution is still valid
        let isMounted = true; 
        let canvasInstance: fabric.Canvas | null = null;

        const loadDesign = async () => {
            try {
                // 1. Fetch Data
                const orderSnap = await getDoc(doc(db, 'orders', orderId));
                
                // 🛑 CHECK: If component unmounted while fetching, STOP.
                if (!isMounted) return; 

                if (!orderSnap.exists()) return;

                const orderData = orderSnap.data();
                const item = orderData.items[0];
                console.log(item.designData.canvasViewStates)
                // 2. Select Data Source
                const designJson = item.designData?.canvasViewStates?.[view] || item.designData?.viewStates?.[view];

                if (!designJson) {
                    console.error("No design JSON found for view:", view);
                    if (isMounted) setIsReady(true); 
                    return;
                }

                // 3. Sanitize JSON
                const sanitizedJson = designJson.map((obj: any) => {
                    if (['text', 'i-text', 'textbox', 'circle-text'].includes(obj.type) || obj.text !== undefined) {
                        if (typeof obj.text !== 'string') {
                            return { ...obj, text: "" }; 
                        }
                    }
                    return obj;
                });

                // 4. Dimensions Logic
                let originalWidth = 800;  
                let originalHeight = 930;

                if (item.productId) {
                    const product = INITIAL_PRODUCTS.find(p => p.id === item.productId);
                    if (product && product.canvas_size) {
                        originalWidth = product.canvas_size.width || originalWidth;
                        originalHeight = product.canvas_size.height || originalHeight;
                    }
                }

                const TARGET_WIDTH = 2400;
                const scaleFactor = TARGET_WIDTH / originalWidth;
                const TARGET_HEIGHT = originalHeight * scaleFactor;

                // 🛑 CHECK AGAIN before touching the DOM
                if (!isMounted || !canvasRef.current) return;

                // 5. Create Canvas (Safe now)
                const canvas = new fabric.Canvas(canvasRef.current, {
                    width: TARGET_WIDTH,
                    height: TARGET_HEIGHT,
                    backgroundColor: 'transparent'
                });

                canvasInstance = canvas; // Save for cleanup

                // 6. Load & Render
                canvas.loadFromJSON({ version: "6.9.0", objects: sanitizedJson }, async () => {
                    if (!isMounted) return; // Stop if unmounted during JSON load

                    await document.fonts.ready;

                    canvas.setZoom(scaleFactor);
                    canvas.setDimensions({ width: TARGET_WIDTH, height: TARGET_HEIGHT });
                    
                    canvas.renderAll();

                    // Signal ready
                    setIsReady(true);
                });

            } catch (error) {
                console.error("Headless Render Error:", error);
            }
        };

        loadDesign();

        // 🛑 CLEANUP
        return () => {
            isMounted = false; // Mark this effect as dead
            if (canvasInstance) {
                console.log("🧹 Disposing Headless Canvas");
                canvasInstance.dispose();
                canvasInstance = null;
            }
        };
    }, [orderId, view]);

    return (
        <div style={{ 
            background: 'transparent', 
            padding: 0, 
            margin: 0, 
            overflow: 'hidden',
            display: 'flex', 
            width: 'fit-content'
        }}>
            <canvas ref={canvasRef} />
            {isReady && <div id="render-complete-signal" style={{ display: 'none' }}>READY</div>}
        </div>
    );
}