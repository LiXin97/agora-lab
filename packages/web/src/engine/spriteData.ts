import type { SpriteData } from './sprites.js';
import { recolorSprite } from './sprites.js';

// ─── FLOOR TILES (16×16) ────────────────────────────────────────────────────

export const FLOOR_WOOD: SpriteData = [
  // row 0
  ['#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72'],
  // row 1
  ['#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72'],
  // row 2
  ['#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72'],
  // row 3 — grain line
  ['#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62'],
  // row 4
  ['#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882'],
  // row 5
  ['#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882'],
  // row 6 — knot
  ['#B89B72','#B89B72','#A08A62','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882'],
  // row 7 — grain line
  ['#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62'],
  // row 8
  ['#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72'],
  // row 9
  ['#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72'],
  // row 10
  ['#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72'],
  // row 11 — grain line
  ['#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62','#A08A62'],
  // row 12
  ['#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882'],
  // row 13
  ['#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882'],
  // row 14 — knot
  ['#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#A08A62','#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882'],
  // row 15
  ['#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882','#B89B72','#B89B72','#B89B72','#B89B72','#C4A882','#C4A882','#C4A882','#C4A882'],
];

export const FLOOR_TILE: SpriteData = [
  // row 0 — grid line
  ['#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0'],
  // row 1
  ['#9898A0','#D8D8E0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#9898A0','#D8D8E0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0'],
  ['#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0'],
  ['#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0'],
  ['#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0'],
  ['#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0'],
  ['#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0'],
  ['#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0'],
  // row 8 — grid line
  ['#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0','#9898A0'],
  ['#9898A0','#D8D8E0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#9898A0','#D8D8E0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0'],
  ['#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0'],
  ['#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0'],
  ['#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0'],
  ['#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0'],
  ['#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0'],
  ['#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#9898A0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0','#C8C8D0'],
];

export const FLOOR_CARPET: SpriteData = (() => {
  const B = '#2A3A5A';
  const D = '#253555';
  const L = '#2F4060';
  const rows: SpriteData = [];
  for (let r = 0; r < 16; r++) {
    const row: string[] = [];
    for (let c = 0; c < 16; c++) {
      const block = (Math.floor(r / 4) + Math.floor(c / 4)) % 3;
      row.push(block === 0 ? B : block === 1 ? D : L);
    }
    rows.push(row);
  }
  return rows;
})();

export const FLOOR_DARK_WOOD: SpriteData = [
  ['#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A'],
  ['#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A'],
  ['#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A'],
  ['#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32'],
  ['#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A'],
  ['#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A'],
  ['#7A5A3A','#7A5A3A','#6B4A32','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A'],
  ['#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32'],
  ['#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A'],
  ['#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A'],
  ['#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A'],
  ['#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32','#6B4A32'],
  ['#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A'],
  ['#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A'],
  ['#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#6B4A32','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A'],
  ['#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A','#7A5A3A','#7A5A3A','#7A5A3A','#7A5A3A','#8B6B4A','#8B6B4A','#8B6B4A','#8B6B4A'],
];

// ─── WALL (16×32) ────────────────────────────────────────────────────────────

export const WALL_STONE: SpriteData = [
  // rows 0-15: wall cap / top
  ['#5A5A7A','#5A5A7A','#5A5A7A','#5A5A7A','#5A5A7A','#5A5A7A','#5A5A7A','#5A5A7A','#5A5A7A','#5A5A7A','#5A5A7A','#5A5A7A','#5A5A7A','#5A5A7A','#5A5A7A','#5A5A7A'],
  ['#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A'],
  ['#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A'],
  ['#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A'],
  ['#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A'],
  ['#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A'],
  ['#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A'],
  ['#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A'],
  ['#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A'],
  ['#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A'],
  ['#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A'],
  ['#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A'],
  ['#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A'],
  ['#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A'],
  ['#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A','#4A4A6A'],
  // row 15 — shadow at cap bottom
  ['#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C'],
  // rows 16-31: wall face
  ['#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C'],
  ['#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C'],
  ['#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C'],
  ['#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#252540','#3A3A5C','#3A3A5C','#252540','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#252540','#3A3A5C','#3A3A5C'],
  // row 20 — mortar
  ['#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A'],
  ['#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#252540','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#252540','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#252540','#3A3A5C'],
  ['#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C'],
  ['#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C'],
  ['#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C'],
  ['#3A3A5C','#252540','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#252540','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#252540','#3A3A5C','#3A3A5C','#3A3A5C','#252540'],
  // row 26 — mortar
  ['#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A','#2E2E4A'],
  ['#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#252540','#3A3A5C','#3A3A5C','#252540','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#252540','#3A3A5C','#3A3A5C'],
  ['#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C'],
  ['#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C'],
  ['#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C'],
  ['#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C','#3A3A5C'],
];

// ─── FURNITURE ───────────────────────────────────────────────────────────────

// DESK_FRONT 32×16
export const DESK_FRONT: SpriteData = (() => {
  const T = '#8B6B4A'; // top surface
  const E = '#6B4A32'; // edge
  const D = '#4A3220'; // dark detail / leg
  const _ = '';
  const rows: SpriteData = [];
  for (let r = 0; r < 16; r++) {
    const row: string[] = [];
    for (let c = 0; c < 32; c++) {
      if (r === 0) row.push(T);
      else if (r === 1) row.push(T);
      else if (r === 2) row.push(E); // darker line
      else if (r <= 4) row.push(T);
      else if (r === 5) row.push(E); // front edge top
      else if (r <= 9) row.push(E); // front panel
      else {
        // legs at corners rows 10-15
        const isLeg = (c <= 2) || (c >= 29);
        row.push(isLeg ? D : _);
        continue;
      }
      // already pushed above via continue-less path
    }
    rows.push(row);
  }
  return rows;
})();

// MONITOR_ON 16×16
export const MONITOR_ON: SpriteData = (() => {
  const F = '#2A2A3A'; // frame
  const S = '#4A8AB8'; // screen base
  const B = '#6AAAD8'; // bright center
  const ST = '#4A4A5A';// stand
  const _ = '';
  return [
    [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F],
    [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F],
    [F,F,S,S,S,S,S,S,S,S,S,S,S,S,F,F],
    [F,F,S,S,S,S,S,S,S,S,S,S,S,S,F,F],
    [F,F,S,S,B,B,B,B,B,B,B,B,S,S,F,F],
    [F,F,S,S,B,B,B,B,B,B,B,B,S,S,F,F],
    [F,F,S,S,B,B,B,B,B,B,B,B,S,S,F,F],
    [F,F,S,S,B,B,B,B,B,B,B,B,S,S,F,F],
    [F,F,S,S,B,B,B,B,B,B,B,B,S,S,F,F],
    [F,F,S,S,B,B,B,B,B,B,B,B,S,S,F,F],
    [F,F,S,S,S,S,S,S,S,S,S,S,S,S,F,F],
    [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F],
    [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F],
    [_,_,_,_,_,_,ST,ST,ST,ST,_,_,_,_,_,_],
    [_,_,_,_,_,ST,ST,ST,ST,ST,ST,_,_,_,_,_],
    [_,_,_,_,ST,ST,ST,ST,ST,ST,ST,ST,_,_,_,_],
  ];
})();

// CHAIR_FRONT 16×16
export const CHAIR_FRONT: SpriteData = (() => {
  const W = '#6B4A32'; // wood seat/back
  const A = '#5A4A3A'; // armrest
  const P = '#4A4A5A'; // pedestal/base
  const _ = '';
  return [
    [_,_,_,_,W,W,W,W,W,W,W,W,_,_,_,_],  // row 0 backrest top
    [_,_,_,_,W,W,W,W,W,W,W,W,_,_,_,_],
    [_,_,_,_,W,W,W,W,W,W,W,W,_,_,_,_],
    [_,_,_,_,W,W,W,W,W,W,W,W,_,_,_,_],  // row 3 backrest bottom
    [_,_,A,A,W,W,W,W,W,W,W,W,A,A,_,_],  // row 4 seat top + armrests
    [_,_,A,A,W,W,W,W,W,W,W,W,A,A,_,_],
    [_,_,A,A,W,W,W,W,W,W,W,W,A,A,_,_],
    [_,_,A,A,W,W,W,W,W,W,W,W,A,A,_,_],
    [_,_,_,_,W,W,W,W,W,W,W,W,_,_,_,_],  // row 8 seat bottom
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,P,P,P,P,_,_,_,_,_,_],  // row 12 pedestal
    [_,_,_,_,_,_,P,P,P,P,_,_,_,_,_,_],
    [_,_,_,_,_,_,P,P,P,P,_,_,_,_,_,_],
    [_,_,_,_,_,_,P,P,P,P,_,_,_,_,_,_],
  ];
})();

// BOOKSHELF 16×32
export const BOOKSHELF: SpriteData = (() => {
  const F = '#5A4A3A'; // frame
  const _ = '';
  const bookColors = ['#C44D4D','#4A8AB8','#5A8A5A','#C4A040','#7A5AB8','#8A6A4A'];
  const rows: SpriteData = [];
  for (let r = 0; r < 32; r++) {
    const row: string[] = [];
    for (let c = 0; c < 16; c++) {
      // frame: outer 1px border + vertical sides
      if (c === 0 || c === 15) { row.push(F); continue; }
      // shelf lines
      if (r === 0 || r === 1 || r === 10 || r === 11 || r === 20 || r === 21 || r === 31) { row.push(F); continue; }
      // books between shelves
      const bookIdx = Math.floor((c - 1) / 2) % bookColors.length;
      row.push(bookColors[bookIdx]);
    }
    rows.push(row);
  }
  return rows;
})();

// ROUND_TABLE 32×32
export const ROUND_TABLE: SpriteData = (() => {
  const T = '#8B6B4A';
  const G = '#7A5A3A'; // grain ring
  const L = '#6B4A32'; // pedestal
  const _ = '';
  const rows: SpriteData = [];
  for (let r = 0; r < 32; r++) {
    const row: string[] = [];
    for (let c = 0; c < 32; c++) {
      // ellipse: center (15.5,11), rx=13, ry=8
      const dx = (c - 15.5) / 13;
      const dy = (r - 11) / 8;
      const d2 = dx * dx + dy * dy;
      if (d2 <= 1.0) {
        // grain ring at d2 ~0.65
        const dRing = Math.abs(Math.sqrt(d2) - 0.75);
        row.push(dRing < 0.08 ? G : T);
      } else if (r >= 14 && r <= 28 && c >= 13 && c <= 18) {
        row.push(L); // pedestal
      } else {
        row.push(_);
      }
    }
    rows.push(row);
  }
  return rows;
})();

// WHITEBOARD 48×16
export const WHITEBOARD: SpriteData = (() => {
  const W = '#E8E8E8';
  const Fr = '#AAAAAA';
  const Tr = '#6A6A7A'; // tray
  const R = '#CC4444';
  const B = '#4466CC';
  const G = '#44AA44';
  const rows: SpriteData = [];
  for (let r = 0; r < 16; r++) {
    const row: string[] = [];
    for (let c = 0; c < 48; c++) {
      if (r === 0 || r === 14 || c === 0 || c === 47) { row.push(Fr); continue; }
      if (r === 15) { row.push(Tr); continue; }
      // scribble lines
      if (r === 4 && c >= 6 && c <= 20) { row.push(R); continue; }
      if (r === 7 && c >= 10 && c <= 28) { row.push(B); continue; }
      if (r === 10 && c >= 8 && c <= 22) { row.push(G); continue; }
      row.push(W);
    }
    rows.push(row);
  }
  return rows;
})();

// PROJECTOR_SCREEN 48×16
export const PROJECTOR_SCREEN: SpriteData = (() => {
  const S = '#D0D0D0';
  const Fr = '#AAAAAA';
  const P = '#A0C0E0'; // projected content
  const rows: SpriteData = [];
  for (let r = 0; r < 16; r++) {
    const row: string[] = [];
    for (let c = 0; c < 48; c++) {
      if (r === 0 || r === 15 || c === 0 || c === 47) { row.push(Fr); continue; }
      if (r >= 3 && r <= 12 && c >= 10 && c <= 37) { row.push(P); continue; }
      row.push(S);
    }
    rows.push(row);
  }
  return rows;
})();

// COFFEE_MACHINE 16×16
export const COFFEE_MACHINE: SpriteData = (() => {
  const Bd = '#3A3A3A'; // body
  const Btn = '#C44D4D'; // red button
  const Cup = '#E8E8E8'; // cup
  const H = '#BBBBBB'; // handle
  const _ = '';
  return [
    [_,_,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,_,_],
    [_,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,_],
    [_,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,_],
    [_,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,_],
    [_,Bd,Bd,Bd,Bd,Btn,Btn,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,_], // button row
    [_,Bd,Bd,Bd,Bd,Btn,Btn,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,_],
    [_,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,_],
    [_,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,_],
    [_,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,_],
    [_,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,_],
    [_,_,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,Bd,_,_],
    [_,_,_,_,Cup,Cup,Cup,Cup,Cup,_,_,_,_,_,_,_],  // cup
    [_,_,_,_,Cup,Cup,Cup,Cup,Cup,H,_,_,_,_,_,_],  // handle
    [_,_,_,_,Cup,Cup,Cup,Cup,Cup,H,_,_,_,_,_,_],
    [_,_,_,_,Cup,Cup,Cup,Cup,Cup,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  ];
})();

// PLANT 16×32
export const PLANT: SpriteData = (() => {
  const Pot = '#B86A3A';
  const Rim = '#9A5530';
  const Soil = '#4A3220';
  const Ld = '#3A7A3A';
  const Lm = '#4A8A4A';
  const Ll = '#5AAA5A';
  const _ = '';

  // Build foliage using simple pattern
  const foliage: string[][] = [];
  for (let r = 0; r < 22; r++) {
    const row: string[] = new Array(16).fill('');
    foliage.push(row);
  }
  // Draw leaf clusters (circles)
  const clusters: [number, number, number, string][] = [
    [5, 8, 4, Ld],
    [3, 5, 3, Lm],
    [3, 11, 3, Lm],
    [6, 3, 3, Lm],
    [6, 13, 3, Lm],
    [8, 8, 5, Ll],
    [10, 5, 3, Ld],
    [10, 11, 3, Ld],
    [12, 8, 4, Lm],
    [15, 6, 3, Ll],
    [15, 10, 3, Ll],
    [18, 8, 3, Ld],
  ];
  for (const [cr, cc, radius, color] of clusters) {
    for (let r = Math.max(0, cr - radius); r <= Math.min(21, cr + radius); r++) {
      for (let c = Math.max(0, cc - radius); c <= Math.min(15, cc + radius); c++) {
        const dr = r - cr, dc = c - cc;
        if (dr * dr + dc * dc <= radius * radius) {
          foliage[r][c] = color;
        }
      }
    }
  }

  const rows: SpriteData = [...foliage];
  // row 21: soil
  rows.push([_,_,_,_,_,Soil,Soil,Soil,Soil,Soil,Soil,_,_,_,_,_]);
  // row 22: pot rim (wider)
  rows.push([_,_,_,_,Rim,Rim,Rim,Rim,Rim,Rim,Rim,Rim,_,_,_,_]);
  // rows 23-31: pot body
  for (let r = 23; r < 32; r++) {
    const width = Math.round(6 + (r - 23) * 0.2);
    const start = Math.max(0, 8 - width);
    const end = Math.min(15, 7 + width);
    const row: string[] = new Array(16).fill('');
    for (let c = start; c <= end; c++) row[c] = Pot;
    rows.push(row);
  }
  return rows;
})();

// SOFA 32×16
export const SOFA: SpriteData = (() => {
  const Bk = '#4A3A5A'; // backrest
  const Cu = '#5A4A6A'; // cushion
  const Ar = '#3A2A4A'; // armrest side
  const H = '#6A5A7A'; // highlight top
  const _ = '';
  return [
    [Ar,Ar,H, H, H, H, H, H, H, H, H, H, H, H, H, H, H, H, H, H, H, H, H, H, H, H, H, H, H, H,Ar,Ar],
    [Ar,Ar,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Ar,Ar],
    [Ar,Ar,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Ar,Ar],
    [Ar,Ar,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Ar,Ar],
    [Ar,Ar,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Ar,Ar],
    [Ar,Ar,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Bk,Ar,Ar],
    [Ar,Ar,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Ar,Ar],
    [Ar,Ar,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Ar,Ar],
    [Ar,Ar,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Ar,Ar],
    [Ar,Ar,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Ar,Ar],
    [Ar,Ar,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Ar,Ar],
    [Ar,Ar,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Ar,Ar],
    [Ar,Ar,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Cu,Ar,Ar],
    [Ar,Ar,Ar,Ar,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,Ar,Ar,Ar,Ar],
    [Ar,Ar,Ar,Ar,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,Ar,Ar,Ar,Ar],
    [Ar,Ar,Ar,Ar,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,Ar,Ar,Ar,Ar],
  ];
})();

// DOOR 16×32
export const DOOR: SpriteData = (() => {
  const Fr = '#6B4A32'; // frame
  const Pn = '#8B6B4A'; // panel
  const Gn = '#6A5A3A'; // grain (plank lines)
  const Hd = '#C4A040'; // handle
  const _ = '';
  const rows: SpriteData = [];
  for (let r = 0; r < 32; r++) {
    const row: string[] = [];
    for (let c = 0; c < 16; c++) {
      if (c <= 1 || c >= 14 || r === 0 || r === 31) { row.push(Fr); continue; }
      // plank lines every 5 rows
      if (r % 5 === 0) { row.push(Gn); continue; }
      // handle
      if (r === 16 && c === 12) { row.push(Hd); continue; }
      if (r === 17 && c === 12) { row.push(Hd); continue; }
      row.push(Pn);
    }
    rows.push(row);
  }
  return rows;
})();

// ─── CHARACTERS (16×32) ──────────────────────────────────────────────────────

// Helper: create empty 16×32 grid
function emptyChar(): string[][] {
  return Array.from({ length: 32 }, () => new Array(16).fill(''));
}

// Clone a 2D array
function cloneSprite(s: SpriteData): string[][] {
  return s.map(row => [...row]);
}

// Pixel-set helper: set pixel if in bounds
function px(grid: string[][], r: number, c: number, color: string) {
  if (r >= 0 && r < grid.length && c >= 0 && c < (grid[0]?.length ?? 0)) {
    grid[r][c] = color;
  }
}

// Draw filled rect
function rect(grid: string[][], r0: number, c0: number, r1: number, c1: number, color: string) {
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++)
      px(grid, r, c, color);
}

// Outline a rect with color
function outlineRect(grid: string[][], r0: number, c0: number, r1: number, c1: number, color: string) {
  for (let c = c0; c <= c1; c++) { px(grid, r0, c, color); px(grid, r1, c, color); }
  for (let r = r0; r <= r1; r++) { px(grid, r, c0, color); px(grid, r, c1, color); }
}

// CHAR_IDLE_DOWN
export const CHAR_IDLE_DOWN: SpriteData = (() => {
  const OL = '#1A1A2A'; // outline
  const SK = '#F5D0A9'; // skin
  const HR = '#4A3728'; // hair
  const SH = '#2C5F8A'; // shirt blue
  const PT = '#3D3D3D'; // pants
  const BO = '#2A2A2A'; // boots
  const WH = '#FFFFFF'; // white eye highlight
  const EY = '#1A1A1A'; // eye
  const g = emptyChar();

  // Head region rows 2-9 (10px wide centered = cols 3-12)
  rect(g, 2, 3, 9, 12, SK);
  // Hair rows 2-4
  rect(g, 2, 3, 4, 12, HR);
  // Eyes row 6: cols 5, 10
  px(g, 6, 5, EY); px(g, 6, 10, EY);
  // Eye highlights
  px(g, 5, 6, WH); px(g, 5, 11, WH);
  // Nose row 7 center
  px(g, 7, 8, '#D4A574');
  // Mouth row 8
  px(g, 8, 6, '#C08060'); px(g, 8, 9, '#C08060');

  // Body rows 10-21, shirt 12px wide cols 2-13
  rect(g, 10, 2, 21, 13, SH);
  // Arms cols 1-2 and 13-14 rows 10-20
  rect(g, 10, 1, 20, 2, SH);
  rect(g, 10, 13, 20, 14, SH);
  // Hands rows 19-21
  rect(g, 19, 1, 21, 2, SK);
  rect(g, 19, 13, 21, 14, SK);

  // Legs rows 22-28: two legs cols 4-6 and 9-11
  rect(g, 22, 4, 28, 6, PT);
  rect(g, 22, 9, 28, 11, PT);

  // Shoes rows 29-31: slightly wider
  rect(g, 29, 3, 31, 7, BO);
  rect(g, 29, 8, 31, 12, BO);

  // Outline: trace outer edge
  // Head outline
  outlineRect(g, 1, 2, 10, 13, OL);
  // Body outline
  outlineRect(g, 9, 1, 22, 14, OL);
  // Leg outlines
  outlineRect(g, 21, 3, 29, 7, OL);
  outlineRect(g, 21, 8, 29, 12, OL);
  // Shoe outlines
  outlineRect(g, 28, 2, 32, 8, OL);
  outlineRect(g, 28, 7, 32, 13, OL);

  return g;
})();

// CHAR_WALK1_DOWN — right leg forward, left leg back
export const CHAR_WALK1_DOWN: SpriteData = (() => {
  const OL = '#1A1A2A';
  const SK = '#F5D0A9';
  const HR = '#4A3728';
  const SH = '#2C5F8A';
  const PT = '#3D3D3D';
  const BO = '#2A2A2A';
  const WH = '#FFFFFF';
  const EY = '#1A1A1A';
  const g = emptyChar();

  rect(g, 2, 3, 9, 12, SK);
  rect(g, 2, 3, 4, 12, HR);
  px(g, 6, 5, EY); px(g, 6, 10, EY);
  px(g, 5, 6, WH); px(g, 5, 11, WH);
  px(g, 7, 8, '#D4A574');
  px(g, 8, 6, '#C08060'); px(g, 8, 9, '#C08060');
  rect(g, 10, 2, 21, 13, SH);
  rect(g, 10, 1, 20, 2, SH);
  rect(g, 10, 13, 20, 14, SH);
  rect(g, 19, 1, 21, 2, SK);
  rect(g, 19, 13, 21, 14, SK);

  // left leg back (shifted up 1px = rows 21-27)
  rect(g, 21, 4, 27, 6, PT);
  rect(g, 28, 3, 30, 7, BO);
  // right leg forward (shifted down 1px = rows 23-29)
  rect(g, 23, 9, 29, 11, PT);
  rect(g, 30, 8, 31, 12, BO);

  outlineRect(g, 1, 2, 10, 13, OL);
  outlineRect(g, 9, 1, 22, 14, OL);
  outlineRect(g, 20, 3, 28, 7, OL);
  outlineRect(g, 22, 8, 30, 12, OL);

  return g;
})();

// CHAR_WALK2_DOWN — opposite of walk1
export const CHAR_WALK2_DOWN: SpriteData = (() => {
  const OL = '#1A1A2A';
  const SK = '#F5D0A9';
  const HR = '#4A3728';
  const SH = '#2C5F8A';
  const PT = '#3D3D3D';
  const BO = '#2A2A2A';
  const WH = '#FFFFFF';
  const EY = '#1A1A1A';
  const g = emptyChar();

  rect(g, 2, 3, 9, 12, SK);
  rect(g, 2, 3, 4, 12, HR);
  px(g, 6, 5, EY); px(g, 6, 10, EY);
  px(g, 5, 6, WH); px(g, 5, 11, WH);
  px(g, 7, 8, '#D4A574');
  px(g, 8, 6, '#C08060'); px(g, 8, 9, '#C08060');
  rect(g, 10, 2, 21, 13, SH);
  rect(g, 10, 1, 20, 2, SH);
  rect(g, 10, 13, 20, 14, SH);
  rect(g, 19, 1, 21, 2, SK);
  rect(g, 19, 13, 21, 14, SK);

  // left leg forward
  rect(g, 23, 4, 29, 6, PT);
  rect(g, 30, 3, 31, 7, BO);
  // right leg back
  rect(g, 21, 9, 27, 11, PT);
  rect(g, 28, 8, 30, 12, BO);

  outlineRect(g, 1, 2, 10, 13, OL);
  outlineRect(g, 9, 1, 22, 14, OL);
  outlineRect(g, 22, 8, 28, 12, OL);
  outlineRect(g, 22, 3, 30, 7, OL);

  return g;
})();

// CHAR_TYPE1_DOWN — sitting, arms raised
export const CHAR_TYPE1_DOWN: SpriteData = (() => {
  const OL = '#1A1A2A';
  const SK = '#F5D0A9';
  const HR = '#4A3728';
  const SH = '#2C5F8A';
  const PT = '#3D3D3D';
  const WH = '#FFFFFF';
  const EY = '#1A1A1A';
  const g = emptyChar();

  rect(g, 2, 3, 9, 12, SK);
  rect(g, 2, 3, 4, 12, HR);
  px(g, 6, 5, EY); px(g, 6, 10, EY);
  px(g, 5, 6, WH); px(g, 5, 11, WH);
  px(g, 7, 8, '#D4A574');
  px(g, 8, 6, '#C08060'); px(g, 8, 9, '#C08060');

  // body shorter
  rect(g, 10, 2, 18, 13, SH);
  // arms raised at rows 10-14
  rect(g, 10, 0, 14, 2, SH);
  rect(g, 10, 13, 14, 15, SH);
  // hands at row 11 reaching forward
  rect(g, 11, 0, 13, 1, SK);
  rect(g, 11, 14, 13, 15, SK);

  // no legs below row 24
  rect(g, 19, 4, 23, 11, PT);

  outlineRect(g, 1, 2, 10, 13, OL);
  outlineRect(g, 9, 0, 19, 15, OL);

  return g;
})();

// CHAR_TYPE2_DOWN — typing frame 2 (arms 1px shift)
export const CHAR_TYPE2_DOWN: SpriteData = (() => {
  const OL = '#1A1A2A';
  const SK = '#F5D0A9';
  const HR = '#4A3728';
  const SH = '#2C5F8A';
  const PT = '#3D3D3D';
  const WH = '#FFFFFF';
  const EY = '#1A1A1A';
  const g = emptyChar();

  rect(g, 2, 3, 9, 12, SK);
  rect(g, 2, 3, 4, 12, HR);
  px(g, 6, 5, EY); px(g, 6, 10, EY);
  px(g, 5, 6, WH); px(g, 5, 11, WH);
  px(g, 7, 8, '#D4A574');
  px(g, 8, 6, '#C08060'); px(g, 8, 9, '#C08060');

  rect(g, 10, 2, 18, 13, SH);
  // arms slightly lower
  rect(g, 11, 0, 15, 2, SH);
  rect(g, 11, 13, 15, 15, SH);
  rect(g, 12, 0, 14, 1, SK);
  rect(g, 12, 14, 14, 15, SK);

  rect(g, 19, 4, 23, 11, PT);

  outlineRect(g, 1, 2, 10, 13, OL);
  outlineRect(g, 9, 0, 19, 15, OL);

  return g;
})();

// CHAR_IDLE_UP — back view
export const CHAR_IDLE_UP: SpriteData = (() => {
  const OL = '#1A1A2A';
  const HR = '#4A3728';
  const SH = '#2C5F8A';
  const PT = '#3D3D3D';
  const BO = '#2A2A2A';
  const SK = '#F5D0A9'; // neck/nape
  const g = emptyChar();

  // Head — all hair (back view)
  rect(g, 2, 3, 9, 12, HR);
  // nape of neck
  rect(g, 9, 6, 10, 9, SK);
  // Body
  rect(g, 10, 2, 21, 13, SH);
  rect(g, 10, 1, 20, 2, SH);
  rect(g, 10, 13, 20, 14, SH);
  // No visible hands
  // Legs
  rect(g, 22, 4, 28, 6, PT);
  rect(g, 22, 9, 28, 11, PT);
  // Shoes
  rect(g, 29, 3, 31, 7, BO);
  rect(g, 29, 8, 31, 12, BO);

  outlineRect(g, 1, 2, 10, 13, OL);
  outlineRect(g, 9, 1, 22, 14, OL);
  outlineRect(g, 21, 3, 29, 7, OL);
  outlineRect(g, 21, 8, 29, 12, OL);
  outlineRect(g, 28, 2, 32, 8, OL);
  outlineRect(g, 28, 7, 32, 13, OL);

  return g;
})();

// CHAR_IDLE_RIGHT — side profile
export const CHAR_IDLE_RIGHT: SpriteData = (() => {
  const OL = '#1A1A2A';
  const SK = '#F5D0A9';
  const HR = '#4A3728';
  const SH = '#2C5F8A';
  const PT = '#3D3D3D';
  const BO = '#2A2A2A';
  const WH = '#FFFFFF';
  const EY = '#1A1A1A';
  const g = emptyChar();

  // Head narrower, right side profile (cols 5-12)
  rect(g, 2, 5, 9, 12, SK);
  rect(g, 2, 5, 4, 12, HR);
  // one eye at col 11
  px(g, 6, 11, EY);
  px(g, 5, 12, WH);
  // nose
  px(g, 7, 12, '#D4A574');

  // Body narrower (cols 4-11)
  rect(g, 10, 4, 21, 11, SH);
  // one arm visible (right side) cols 12-13 rows 10-20
  rect(g, 10, 12, 20, 13, SH);
  rect(g, 19, 12, 21, 13, SK);

  // Single leg (side view) cols 6-9
  rect(g, 22, 6, 28, 9, PT);
  rect(g, 29, 5, 31, 10, BO);

  outlineRect(g, 1, 4, 10, 13, OL);
  outlineRect(g, 9, 3, 22, 14, OL);
  outlineRect(g, 21, 5, 29, 10, OL);
  outlineRect(g, 28, 4, 32, 11, OL);

  return g;
})();

// Walk/type variants for up and right (reuse down animation logic, similar shapes)
export const CHAR_WALK1_UP: SpriteData = (() => {
  const g = cloneSprite(CHAR_IDLE_UP);
  const PT = '#3D3D3D';
  const BO = '#2A2A2A';
  const OL = '#1A1A2A';
  // clear legs/shoes
  rect(g, 21, 3, 31, 12, '');
  // left leg back
  rect(g, 21, 4, 27, 6, PT);
  rect(g, 28, 3, 30, 7, BO);
  // right leg forward
  rect(g, 23, 9, 29, 11, PT);
  rect(g, 30, 8, 31, 12, BO);
  outlineRect(g, 20, 3, 28, 7, OL);
  outlineRect(g, 22, 8, 30, 12, OL);
  return g;
})();

export const CHAR_WALK2_UP: SpriteData = (() => {
  const g = cloneSprite(CHAR_IDLE_UP);
  const PT = '#3D3D3D';
  const BO = '#2A2A2A';
  const OL = '#1A1A2A';
  rect(g, 21, 3, 31, 12, '');
  rect(g, 23, 4, 29, 6, PT);
  rect(g, 30, 3, 31, 7, BO);
  rect(g, 21, 9, 27, 11, PT);
  rect(g, 28, 8, 30, 12, BO);
  outlineRect(g, 22, 3, 30, 7, OL);
  outlineRect(g, 20, 8, 28, 12, OL);
  return g;
})();

export const CHAR_TYPE1_UP: SpriteData = (() => {
  const g = cloneSprite(CHAR_IDLE_UP);
  const SH = '#2C5F8A';
  const PT = '#3D3D3D';
  const SK = '#F5D0A9';
  const OL = '#1A1A2A';
  // arms raised
  rect(g, 10, 0, 14, 2, SH);
  rect(g, 10, 13, 14, 15, SH);
  rect(g, 11, 0, 13, 1, SK);
  rect(g, 11, 14, 13, 15, SK);
  // no legs below 24
  rect(g, 22, 3, 31, 12, '');
  rect(g, 19, 4, 23, 11, PT);
  outlineRect(g, 9, 0, 19, 15, OL);
  return g;
})();

export const CHAR_TYPE2_UP: SpriteData = (() => {
  const g = cloneSprite(CHAR_IDLE_UP);
  const SH = '#2C5F8A';
  const PT = '#3D3D3D';
  const SK = '#F5D0A9';
  const OL = '#1A1A2A';
  rect(g, 11, 0, 15, 2, SH);
  rect(g, 11, 13, 15, 15, SH);
  rect(g, 12, 0, 14, 1, SK);
  rect(g, 12, 14, 14, 15, SK);
  rect(g, 22, 3, 31, 12, '');
  rect(g, 19, 4, 23, 11, PT);
  outlineRect(g, 9, 0, 19, 15, OL);
  return g;
})();

export const CHAR_WALK1_RIGHT: SpriteData = (() => {
  const g = cloneSprite(CHAR_IDLE_RIGHT);
  const PT = '#3D3D3D';
  const BO = '#2A2A2A';
  const OL = '#1A1A2A';
  rect(g, 21, 4, 31, 11, '');
  // forward leg
  rect(g, 23, 6, 29, 9, PT);
  rect(g, 30, 5, 31, 10, BO);
  outlineRect(g, 22, 5, 30, 10, OL);
  return g;
})();

export const CHAR_WALK2_RIGHT: SpriteData = (() => {
  const g = cloneSprite(CHAR_IDLE_RIGHT);
  const PT = '#3D3D3D';
  const BO = '#2A2A2A';
  const OL = '#1A1A2A';
  rect(g, 21, 4, 31, 11, '');
  rect(g, 21, 6, 27, 9, PT);
  rect(g, 28, 5, 30, 10, BO);
  outlineRect(g, 20, 5, 28, 10, OL);
  return g;
})();

export const CHAR_TYPE1_RIGHT: SpriteData = (() => {
  const g = cloneSprite(CHAR_IDLE_RIGHT);
  const SH = '#2C5F8A';
  const PT = '#3D3D3D';
  const SK = '#F5D0A9';
  const OL = '#1A1A2A';
  rect(g, 10, 12, 14, 15, SH);
  rect(g, 11, 14, 13, 15, SK);
  rect(g, 22, 4, 31, 11, '');
  rect(g, 19, 6, 23, 9, PT);
  outlineRect(g, 9, 3, 19, 15, OL);
  return g;
})();

export const CHAR_TYPE2_RIGHT: SpriteData = (() => {
  const g = cloneSprite(CHAR_IDLE_RIGHT);
  const SH = '#2C5F8A';
  const PT = '#3D3D3D';
  const SK = '#F5D0A9';
  const OL = '#1A1A2A';
  rect(g, 11, 12, 15, 15, SH);
  rect(g, 12, 14, 14, 15, SK);
  rect(g, 22, 4, 31, 11, '');
  rect(g, 19, 6, 23, 9, PT);
  outlineRect(g, 9, 3, 19, 15, OL);
  return g;
})();

// ─── CHARACTER SPRITES OBJECT ─────────────────────────────────────────────────

export const CHARACTER_SPRITES = {
  down: {
    idle: CHAR_IDLE_DOWN,
    walk: [CHAR_WALK1_DOWN, CHAR_WALK2_DOWN] as SpriteData[],
    type: [CHAR_TYPE1_DOWN, CHAR_TYPE2_DOWN] as SpriteData[],
  },
  up: {
    idle: CHAR_IDLE_UP,
    walk: [CHAR_WALK1_UP, CHAR_WALK2_UP] as SpriteData[],
    type: [CHAR_TYPE1_UP, CHAR_TYPE2_UP] as SpriteData[],
  },
  right: {
    idle: CHAR_IDLE_RIGHT,
    walk: [CHAR_WALK1_RIGHT, CHAR_WALK2_RIGHT] as SpriteData[],
    type: [CHAR_TYPE1_RIGHT, CHAR_TYPE2_RIGHT] as SpriteData[],
  },
  // left = flip right horizontally at render time
};

// ─── PALETTE MAPS ─────────────────────────────────────────────────────────────

export const PALETTE_MAPS: Record<string, string>[] = [
  // palette 0: base (blue shirt, brown hair, light skin) — identity map
  {},
  // palette 1: red shirt, black hair, light skin
  {
    '#2C5F8A': '#C44D4D',
    '#4A3728': '#1A1A1A',
  },
  // palette 2: green shirt, dark brown hair, medium skin
  {
    '#2C5F8A': '#5A8A5A',
    '#4A3728': '#2D1B0E',
    '#F5D0A9': '#D4A574',
    '#E8C49A': '#C8955A',
  },
  // palette 3: purple shirt, blonde hair, light skin
  {
    '#2C5F8A': '#7A5AB8',
    '#4A3728': '#8B6914',
  },
  // palette 4: teal shirt, dark brown hair, warm skin
  {
    '#2C5F8A': '#5A7A8A',
    '#4A3728': '#3D2B1F',
    '#F5D0A9': '#E8C49A',
  },
  // palette 5: khaki shirt, gray hair, light skin
  {
    '#2C5F8A': '#8A7A5A',
    '#4A3728': '#6B6B6B',
  },
];

// ─── CHARACTER PALETTES ───────────────────────────────────────────────────────

// All base sprites in order: idle_down, walk1_down, walk2_down, type1_down, type2_down,
//                             idle_up, walk1_up, walk2_up, type1_up, type2_up,
//                             idle_right, walk1_right, walk2_right, type1_right, type2_right
const BASE_CHAR_SPRITES: SpriteData[] = [
  CHAR_IDLE_DOWN, CHAR_WALK1_DOWN, CHAR_WALK2_DOWN, CHAR_TYPE1_DOWN, CHAR_TYPE2_DOWN,
  CHAR_IDLE_UP, CHAR_WALK1_UP, CHAR_WALK2_UP, CHAR_TYPE1_UP, CHAR_TYPE2_UP,
  CHAR_IDLE_RIGHT, CHAR_WALK1_RIGHT, CHAR_WALK2_RIGHT, CHAR_TYPE1_RIGHT, CHAR_TYPE2_RIGHT,
];

export const CHARACTER_PALETTES: SpriteData[][] = PALETTE_MAPS.map(
  (palMap) => BASE_CHAR_SPRITES.map((sprite) => recolorSprite(sprite, palMap))
);
