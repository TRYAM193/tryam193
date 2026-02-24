import { v4 as uuidv4 } from 'uuid';
import { store } from '../redux/store';
import { setCanvasObjects } from '../redux/canvasSlice';

export default function addSvgToRedux(svgString) {
  const id = Date.now().toString(); // Consistent with your customId logic

  const newSvgObject = {
    id: id,
    type: 'svg',
    svgString: svgString,
    props: {
      left: 100,
      top: 100,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      fill: '#000000', // Default starting color
      opacity: 1,
    }
  };

  const currentObjects = store.getState().canvas.present;
  store.dispatch(setCanvasObjects([...currentObjects, newSvgObject]));
}