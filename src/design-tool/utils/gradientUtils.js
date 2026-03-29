// src/design-tool/utils/gradientUtils.js
// Shared Fabric.js gradient utilities for both mobile and desktop
// IMPORTANT: buildGradient returns a plain object (Redux-safe).
//            Use applyGradientToFabric() to get a real fabric.Gradient for canvas use.

import { Gradient } from 'fabric';

/** 16 curated preset gradients */
export const GRADIENT_PRESETS = [
  { name: 'Sunset',  from: '#ff6b00', to: '#ee0979', angle: 135 },
  { name: 'Ocean',   from: '#0ea5e9', to: '#7c3aed', angle: 135 },
  { name: 'Fire',    from: '#fbbf24', to: '#ef4444', angle: 180 },
  { name: 'Forest',  from: '#22c55e', to: '#14532d', angle: 180 },
  { name: 'Candy',   from: '#f472b6', to: '#a855f7', angle: 135 },
  { name: 'Aurora',  from: '#06b6d4', to: '#6366f1', angle:  45 },
  { name: 'Dark',    from: '#334155', to: '#0f172a',  angle: 180 },
  { name: 'Gold',    from: '#fde68a', to: '#d97706', angle: 135 },
  { name: 'Rose',    from: '#fda4af', to: '#be123c', angle: 180 },
  { name: 'Mint',    from: '#bbf7d0', to: '#059669', angle: 180 },
  { name: 'Dusk',    from: '#c4b5fd', to: '#1e1b4b', angle: 135 },
  { name: 'Blaze',   from: '#fed7aa', to: '#9a3412', angle: 180 },
  { name: 'Ice',     from: '#e0f2fe', to: '#0284c7', angle: 180 },
  { name: 'Lemon',   from: '#fef9c3', to: '#ca8a04', angle: 180 },
  { name: 'Neon',    from: '#a3e635', to: '#1d4ed8', angle: 135 },
  { name: 'Stone',   from: '#f8fafc', to: '#64748b', angle: 180 },
];

/**
 * Convert an angle (degrees) to Fabric.js percentage-based gradient coords.
 */
export function angleToCoords(angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x1: 0.5 - Math.cos(rad) / 2,
    y1: 0.5 - Math.sin(rad) / 2,
    x2: 0.5 + Math.cos(rad) / 2,
    y2: 0.5 + Math.sin(rad) / 2,
  };
}

/**
 * Returns true if a value is a plain gradient data object (Redux-safe).
 */
export function isGradientData(fill) {
  return !!fill && typeof fill === 'object' && fill.__gradient === true;
}

/**
 * Build a PLAIN SERIALIZABLE gradient object for Redux storage.
 * Call applyGradientToFabric(result) when you need a real fabric.Gradient.
 */
export function buildGradient(type, angleDeg, fromColor, toColor) {
  if (type === 'radial') {
    return {
      __gradient: true,
      type: 'radial',
      gradientUnits: 'percentage',
      coords: { x1: 0.5, y1: 0.5, r1: 0, x2: 0.5, y2: 0.5, r2: 0.5 },
      colorStops: [
        { offset: 0, color: fromColor },
        { offset: 1, color: toColor },
      ],
    };
  }
  return {
    __gradient: true,
    type: 'linear',
    gradientUnits: 'percentage',
    coords: angleToCoords(angleDeg),
    colorStops: [
      { offset: 0, color: fromColor },
      { offset: 1, color: toColor },
    ],
  };
}

/**
 * Convert a plain gradient data object into a real fabric.Gradient instance 
 * for use with fabricCanvas. Always call this before passing fill to Fabric.
 */
export function applyGradientToFabric(gradientData) {
  if (!gradientData || !gradientData.__gradient) return gradientData;
  return new Gradient({
    type: gradientData.type,
    gradientUnits: gradientData.gradientUnits || 'percentage',
    coords: gradientData.coords,
    colorStops: gradientData.colorStops,
  });
}

/**
 * Resolve any fill value (string | plain gradient | fabric.Gradient instance)
 * to a fabric-ready value. Strings pass through; plain gradient data gets
 * converted; Gradient instances pass through unchanged.
 */
export function resolveFillForFabric(fill) {
  if (!fill) return fill;
  if (typeof fill === 'string') return fill;
  if (isGradientData(fill)) return applyGradientToFabric(fill);
  // Already a fabric.Gradient instance (legacy / migration path)
  return fill;
}

/**
 * Parse any fill value back to the editor's { mode, type, angle, from, to } state.
 * Handles: string, plain gradient data, legacy fabric.Gradient instance.
 */
export function parseGradientState(fill) {
  if (!fill || typeof fill === 'string') {
    return { mode: 'solid', type: 'linear', angle: 135, from: fill || '#ffffff', to: '#000000' };
  }

  // Plain serializable gradient object (our new format)
  if (isGradientData(fill)) {
    const stops = fill.colorStops || [];
    const from = stops[0]?.color || '#ffffff';
    const to   = stops[stops.length - 1]?.color || '#000000';
    const coords = fill.coords || {};
    let angle = 135;
    if (fill.type === 'linear' && coords.x1 !== undefined) {
      const rad = Math.atan2(coords.y2 - coords.y1, coords.x2 - coords.x1);
      angle = Math.round(((rad * 180) / Math.PI + 90 + 360) % 360);
    }
    return { mode: 'gradient', type: fill.type || 'linear', angle, from, to };
  }

  // Legacy fallback: fabric.Gradient class instance
  const stops = fill.colorStops || [];
  const from = stops[0]?.color || '#ffffff';
  const to   = stops[stops.length - 1]?.color || '#000000';
  const coords = fill.coords || {};
  let angle = 135;
  if (fill.type === 'linear' && coords.x1 !== undefined) {
    const rad = Math.atan2(coords.y2 - coords.y1, coords.x2 - coords.x1);
    angle = Math.round(((rad * 180) / Math.PI + 90 + 360) % 360);
  }
  return { mode: 'gradient', type: fill.type || 'linear', angle, from, to };
}

/**
 * Generate a CSS linear-gradient string for preview swatches.
 */
export function gradientToCSS(fromColor, toColor, angleDeg = 135) {
  return `linear-gradient(${angleDeg}deg, ${fromColor}, ${toColor})`;
}
