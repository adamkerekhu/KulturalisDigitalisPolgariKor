export type Rectangle = { x: number; y: number; w: number; h: number };
export type Location = Rectangle & { name: string; sub: string; color: number; icon: string; solid?: boolean };
export const WORLD = { width: 2000, height: 2000 };
export const roads: Rectangle[] = [
  { x: 479, y: 0, w: 269, h: 2600 },
  { x: 0, y: 194, w: 1300, h: 121 },
  { x: 0, y: 625, w: 1300, h: 118 },
  { x: 0, y: 1100, w: 1300, h: 120 },
  { x: 0, y: 1870, w: 1300, h: 118 },
  { x: 0, y: 2339, w: 1300, h: 120 }
];
export const blocks: Rectangle[] = [
  { x: 75, y: 360, w: 285, h: 195 }, { x: 845, y: 365, w: 295, h: 190 },
  { x: 65, y: 790, w: 300, h: 208 }, { x: 845, y: 790, w: 295, h: 205 },
  { x: 70, y: 1500, w: 300, h: 265 }, { x: 905, y: 1505, w: 255, h: 255 },
  { x: 75, y: 2050, w: 290, h: 180 }, { x: 866, y: 2050, w: 290, h: 185 },
  { x: 75, y: 20, w: 290, h: 120 }, { x: 840, y: 15, w: 310, h: 130 }
];
export const locations: Location[] = [
  { name: 'MESTER GYROS', sub: 'GYROS · KEBAB', x: 750, y: 345, w: 206, h: 118, color: 0xd99b49, icon: '🥙' },
  { name: 'DOHÁNYBOLT', sub: 'TOBACCO SHOP', x: 750, y: 950, w: 205, h: 135, color: 0x88aa97, icon: '🚬' },
  { name: 'MAESTRO PUB', sub: 'MAIN BASE', x: 750, y: 1325, w: 205, h: 147, color: 0xeeb55f, icon: '🍺' },
  { name: 'SPAR', sub: 'SUPERMARKET', x: 235, y: 1322, w: 205, h: 140, color: 0xcb6b61, icon: '🛒' },
  { name: 'MOL BUBI', sub: 'BICYCLE STATION', x: 755, y: 1660, w: 182, h: 88, color: 0x72b987, icon: '🚲', solid: false }
];
export const colliders: Rectangle[] = [...blocks, ...locations.filter(l => l.solid !== false)];
// Schematic v0.2 map; coordinates are NOT verified geographic positions.
