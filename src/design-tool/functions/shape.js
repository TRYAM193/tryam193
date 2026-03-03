// src/design-tool/functions/shape.js
import { store } from '../redux/store';
import { dispatchDelta } from '../redux/canvasSlice';
import { v4 as uuidv4 } from 'uuid';

// 🛑 THE FIX: Define EVERY property the sidebar can touch for shapes
const BASE_SHAPE_PROPS = {
    stroke: '#000000', strokeWidth: 0, opacity: 1,
    scaleX: 1, scaleY: 1, angle: 0,
    shadowColor: '#000000', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
    radius: 0, rx: 0, ry: 0
};

function addShape(type, props) {
    const newShape = {
        id: uuidv4(), 
        type,
        props: {
            left: 300, top: 300, fill: '#3b82f6',
            ...BASE_SHAPE_PROPS,
            ...props 
        }
    };
    
    store.dispatch(dispatchDelta({
        type: 'ADD', targetId: newShape.id, before: null, after: newShape
    }));
}

export const addRectangle = () => addShape('rect', { width: 100, height: 100, fill: '#6366f1' });
export const addCircle = () => addShape('circle', { radius: 50, width: 100, height: 100, fill: '#ec4899' });
export const addTriangle = () => addShape('triangle', { width: 100, height: 100, fill: '#10b981' });