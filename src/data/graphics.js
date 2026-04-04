export const GRAPHICS_CATEGORIES = [
  { id: 'badges', name: 'Badges', icon: '🛡️' },
  { id: 'flames', name: 'Flames', icon: '🔥' },
  { id: 'nature', name: 'Nature', icon: '🌿' },
  { id: 'shapes', name: 'Shapes', icon: '📐' },
  { id: 'retro', name: 'Retro', icon: '🕹️' },
  { id: 'sports', name: 'Sports', icon: '🏀' }
];

export const GRAPHICS_LIBRARY = {
  badges: [
    {
      id: 'badge-1',
      name: 'Vintage Emblem',
      svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#2c3e50"/><circle cx="50" cy="50" r="35" fill="none" stroke="#e67e22" stroke-width="2"/><path d="M 30 50 L 50 30 L 70 50 L 50 70 Z" fill="#e74c3c"/></svg>`
    },
    {
      id: 'badge-2',
      name: 'Royal Crest',
      svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M20 20 L80 20 L80 60 Q50 90 20 60 Z" fill="#1a365d"/><path d="M50 30 L55 45 L70 45 L60 55 L65 70 L50 60 L35 70 L40 55 L30 45 L45 45 Z" fill="#fbbf24"/></svg>`
    },
    {
      id: 'badge-3',
      name: 'Warrior Shield',
      svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 10 Q80 15 80 50 Q80 85 50 95 Q20 85 20 50 Q20 15 50 10" fill="#4a5568"/><path d="M50 20 Q70 25 70 50 Q70 75 50 85 Q30 75 30 50 Q30 25 50 20" fill="#2d3748"/><path d="M45 40 L55 40 L55 65 L45 65 Z" fill="#e53e3e"/></svg>`
    }
  ],
  flames: [
    {
      id: 'flame-1',
      name: 'Fireball',
      svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 10 C 20 40, 20 70, 50 90 C 80 70, 80 40, 50 10 Z" fill="#e74c3c"/><path d="M50 30 C 35 50, 35 70, 50 85 C 65 70, 65 50, 50 30 Z" fill="#f1c40f"/></svg>`
    },
    {
      id: 'flame-2',
      name: 'Speed Streak',
      svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 50 Q40 40 90 50 Q40 60 10 50" fill="#f59e0b"/><path d="M20 45 Q45 40 80 45 Q45 50 20 45" fill="#ef4444" opacity="0.8"/></svg>`
    }
  ],
  nature: [
    {
      id: 'nature-1',
      name: 'Laurel Wreath',
      svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M 20 80 Q 10 50 50 20" fill="none" stroke="#27ae60" stroke-width="4"/><path d="M 80 80 Q 90 50 50 20" fill="none" stroke="#27ae60" stroke-width="4"/><circle cx="50" cy="80" r="5" fill="#c0392b"/></svg>`
    },
    {
      id: 'nature-2',
      name: 'Mountain Peak',
      svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 80 L50 20 L90 80 Z" fill="#2d3748"/><path d="M40 35 L50 20 L60 35 L55 30 L50 35 L45 30 Z" fill="white"/></svg>`
    },
    {
      id: 'nature-3',
      name: 'Palm Leaf',
      svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 90 Q50 50 90 10 M50 90 Q40 50 10 20 M50 90 Q60 50 80 30" stroke="#059669" stroke-width="3" fill="none"/></svg>`
    }
  ],
  shapes: [
    {
      id: 'shape-1',
      name: 'Sunburst',
      svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#f1c40f"/><circle cx="50" cy="50" r="30" fill="#e67e22"/><circle cx="50" cy="50" r="15" fill="#e74c3c"/></svg>`
    },
    {
      id: 'shape-2',
      name: 'Abstract Geo',
      svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="20,20 80,20 50,80" fill="#9b59b6"/><polygon points="20,80 80,80 50,20" fill="#8e44ad" opacity="0.7"/><circle cx="50" cy="50" r="15" fill="#f1c40f"/></svg>`
    }
  ],
  retro: [
    {
      id: 'retro-1',
      name: 'Arcade Joy',
      svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="20" y="30" width="60" height="40" rx="10" fill="#4c51bf"/><circle cx="35" cy="50" r="8" fill="#f56565"/><rect x="55" y="45" width="20" height="10" fill="#48bb78"/></svg>`
    },
    {
      id: 'retro-2',
      name: 'Synthwave Sun',
      svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fd3d93"/><stop offset="100%" stop-color="#ffeb3b"/></linearGradient></defs><circle cx="50" cy="50" r="40" fill="url(#g)"/><rect x="10" y="55" width="80" height="2" fill="#1a202c"/><rect x="10" y="65" width="80" height="4" fill="#1a202c"/><rect x="10" y="75" width="80" height="6" fill="#1a202c"/></svg>`
    }
  ],
  sports: [
    {
      id: 'sport-1',
      name: 'Basketball',
      svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#ed8936"/><path d="M10 50 Q50 50 90 50 M50 10 Q50 50 50 90 M20 20 Q50 50 80 80 M80 20 Q50 50 20 80" stroke="#2d3748" stroke-width="2" fill="none"/></svg>`
    }
  ]
};
