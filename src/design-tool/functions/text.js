// src/design-tool/functions/text.js
import { store } from '../redux/store';
import { dispatchDelta } from '../redux/canvasSlice';
import { v4 as uuidv4 } from 'uuid';

// 🛑 THE FIX: Define EVERY property the sidebar can touch
const BASE_TEXT_PROPS = {
  angle: 0, opacity: 1, scaleX: 1, scaleY: 1,
  fill: '#000000', stroke: '#000000', strokeWidth: 0,
  shadowColor: '#000000', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
  fontWeight: 'normal', fontStyle: 'normal', underline: false, 
  textAlign: 'left', charSpacing: 0, textEffect: 'none', 
  radius: 150, arcAngle: 120, flagVelocity: 50
};

export default function Text(setSelectedId, setActiveTool) {
  
  function handleAddText(obj) {
    store.dispatch(dispatchDelta({
      type: 'ADD',
      targetId: obj.id,
      before: null,
      after: obj
    }));
    
    if (setActiveTool) setActiveTool(obj.type);
    if (setSelectedId) setSelectedId(obj.id);
  }

  const addText = () => {
    handleAddText({
      id: uuidv4(), type: 'text',
      props: { ...BASE_TEXT_PROPS, text: 'New Text', left: 200, top: 200, fontSize: 30, fontFamily: 'Arial' }
    });
  };

  const addHeading = () => {
    handleAddText({
      id: uuidv4(), type: 'text',
      props: { ...BASE_TEXT_PROPS, text: 'Heading', left: 200, top: 200, fontSize: 68, fontFamily: 'Helvetica Neue', fontWeight: 'bold' }
    });
  };

  const addSubheading = () => {
    handleAddText({
      id: uuidv4(), type: 'text',
      props: { ...BASE_TEXT_PROPS, text: 'Sub Heading', left: 200, top: 200, fontSize: 50, fontFamily: 'Helvetica Neue', fontWeight: 'bold' }
    });
  };

  return { addText, addHeading, addSubheading };
}