import { FabricText } from 'fabric';
import { resolveFillForFabric } from '../utils/gradientUtils';

export default function StraightText(obj) {
  if (!obj || !obj.props) return;
  
  const props = obj.props;

  // 🛡️ THE FIX: Guarantee a string is passed to Fabric, fallback to a space if empty
  const safeText = props.text !== undefined && props.text !== null 
    ? String(props.text) 
    : " "; 

  return new FabricText(safeText, {
    ...props,
    fill: resolveFillForFabric(props.fill),
    stroke: resolveFillForFabric(props.stroke),
    customType: 'text',
    customId: obj.id
  });
}