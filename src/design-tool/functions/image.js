// src/design-tool/functions/image.js
import { store } from '../redux/store';
import { dispatchDelta } from '../redux/canvasSlice';

// 🛑 THE FIX: Define baseline styling props for images
const BASE_IMAGE_PROPS = {
    stroke: '#000000', strokeWidth: 0,
    shadowColor: '#000000', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
    radius: 0 // In case you add image rounding later
};

export default function addImage(obj) {
  const newImage = {
    id: obj.customId,
    type: 'image',
    props: {
      ...BASE_IMAGE_PROPS, // Inject the baseline defaults
      src: obj.getSrc(),
      left: obj.left,
      top: obj.top,
      width: obj.width,
      height: obj.height,
      opacity: obj.opacity !== undefined ? obj.opacity : 1,
      scaleX: obj.scaleX !== undefined ? obj.scaleX : 1,
      scaleY: obj.scaleY !== undefined ? obj.scaleY : 1,
      angle: obj.angle || 0,
    }
  }; 

  store.dispatch(dispatchDelta({
      type: 'ADD', targetId: newImage.id, before: null, after: newImage
  }));
}