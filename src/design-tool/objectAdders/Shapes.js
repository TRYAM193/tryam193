// src/objectAdders/Shapes.js
import { Rect, Circle, Triangle, Polygon, Line, Path } from 'fabric';
import {
  getStarPoints, getPolygonPoints, getTrianglePoints, getRoundedPathFromPoints,
  getArrowPoints, getDiamondPoints, getTrapezoidPoints, getLightningPoints, getHeartPath, getBubblePath
} from '../utils/shapeUtils';
import { resolveFillForFabric } from '../utils/gradientUtils';

export default function ShapeAdder(obj) {
  if (!obj) return null;
  const { type, props, id } = obj;

  const options = {
    ...props,
    fill: resolveFillForFabric(props.fill),
    stroke: resolveFillForFabric(props.stroke),
    customId: id,
    originX: 'center',
    originY: 'center',
    objectCaching: false, // Helps with crisp rendering during updates
  };

  const radius = props.radius || 0; // Check if radius is passed

  let points = [];
  let isPathBased = false;
  let customPath = null;

  // Generate points based on type
  if (type === 'star') {
    points = getStarPoints(5, 50, 25);
    isPathBased = true;
  } else if (type === 'pentagon') {
    points = getPolygonPoints(5, 50);
    isPathBased = true;
  } else if (type === 'hexagon') {
    points = getPolygonPoints(6, 50);
    isPathBased = true;
  } else if (type === 'triangle') {
    // Standard triangle doesn't support radius, so we use points -> path if needed
    if (radius > 0) {
      points = getTrianglePoints(100, 100);
      isPathBased = true;
    }
  } else if (type === 'arrow') {
    points = getArrowPoints(100, 100);
    isPathBased = true;
  }
  else if (type === 'diamond') {
    points = getDiamondPoints(100, 150);
    isPathBased = true;
  }
  else if (type === 'trapezoid') {
    points = getTrapezoidPoints(100, 80);
    isPathBased = true;
  }if (type === 'lightning') { 
    points = getLightningPoints(50, 100); 
    isPathBased = true; 
  }
  else if (type === 'heart') {
    customPath = getHeartPath(100, 90);
  }
  else if (type === 'bubble') {
    customPath = getBubblePath(120, 80);
  }

  // 1. Handle Custom Paths (Heart, Bubble) - No radius math needed
  if (customPath) {
    return new Path(customPath, { ...options });
  }

  // RETURN LOGIC
  if (isPathBased) {
    // Generate SVG path string with curves
    const pathData = getRoundedPathFromPoints(points, radius);
    return new Path(pathData, {
      ...options,
      // If converting from Polygon, we might need to adjust offsets, 
      // but Path usually centers itself around the data.
    });
  }

  // Fallback for standard shapes (or if Radius is 0 for Triangle)
  switch (type) {
    case 'rect': return new Rect(options);
    case 'circle': return new Circle(options);
    case 'triangle': return new Triangle(options);
    case 'line':
      return new Line([0, 0, 100, 0], {
        ...options,
        stroke: options.stroke || options.fill || '#000000',
        strokeWidth: options.strokeWidth || 4,
        fill: null
      });
    default: return null;
  }
}