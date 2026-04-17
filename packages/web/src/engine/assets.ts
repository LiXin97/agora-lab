import { TILE_SIZE } from './types.js';
import type { TileType, FurnitureType, Direction, CharacterState } from './types.js';

export const CHARACTER_PALETTES = [
  { skin: '#f5d0a9', hair: '#4a3728', shirt: '#2c5f8a', pants: '#3d3d3d' },
  { skin: '#f5d0a9', hair: '#1a1a1a', shirt: '#c44d4d', pants: '#4a4a5a' },
  { skin: '#d4a574', hair: '#2d1b0e', shirt: '#5a8a5a', pants: '#3d3d4d' },
  { skin: '#f5d0a9', hair: '#8b6914', shirt: '#7a5ab8', pants: '#3d3d3d' },
  { skin: '#e8c49a', hair: '#3d2b1f', shirt: '#5a7a8a', pants: '#4a4a4a' },
  { skin: '#f5d0a9', hair: '#6b6b6b', shirt: '#8a7a5a', pants: '#3d3d3d' },
];

// Deterministic hash for pixel-level variation (no Math.random)
function pixelHash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) & 0xff;
}

export function drawTile(ctx: CanvasRenderingContext2D, type: TileType, x: number, y: number, zoom: number) {
  const px = Math.floor(x * TILE_SIZE * zoom);
  const py = Math.floor(y * TILE_SIZE * zoom);
  const sz = Math.floor(TILE_SIZE * zoom);
  const z = zoom;

  switch (type) {
    case 'floor_wood': {
      // Base plank color alternating
      const baseColor = (x + y) % 2 === 0 ? '#c4a882' : '#b89b72';
      ctx.fillStyle = baseColor;
      ctx.fillRect(px, py, sz, sz);
      // Wood grain lines (2-3 horizontal lines slightly darker)
      ctx.fillStyle = (x + y) % 2 === 0 ? '#a8896a' : '#9a8260';
      const grainSpacing = Math.floor(sz / 4);
      for (let i = 1; i <= 3; i++) {
        const gy = Math.floor(py + grainSpacing * i);
        ctx.fillRect(px + Math.floor(z), gy, sz - Math.floor(z * 2), Math.max(1, Math.floor(z)));
      }
      // Wood knots: small 1px dots at deterministic positions
      const knotCount = (pixelHash(x, y) % 2) + 1;
      ctx.fillStyle = '#8a6a4a';
      for (let k = 0; k < knotCount; k++) {
        const kx = Math.floor(px + 4 * z + (pixelHash(x + k * 7, y + k * 3) % Math.floor(sz - 8 * z)));
        const ky = Math.floor(py + 4 * z + (pixelHash(x + k * 5, y + k * 11) % Math.floor(sz - 8 * z)));
        ctx.fillRect(kx, ky, Math.max(1, Math.floor(z)), Math.max(1, Math.floor(z)));
      }
      break;
    }
    case 'floor_tile': {
      const isAlt = (x + y) % 2 === 0;
      ctx.fillStyle = isAlt ? '#d0d0d0' : '#c0c0c0';
      ctx.fillRect(px, py, sz, sz);
      // 1px grid line between tiles (slightly darker border)
      ctx.fillStyle = '#a8a8a8';
      ctx.fillRect(px, py, sz, Math.max(1, Math.floor(z)));
      ctx.fillRect(px, py, Math.max(1, Math.floor(z)), sz);
      // Subtle sheen highlight on alternate tiles
      if (isAlt) {
        ctx.fillStyle = '#e8e8e8';
        ctx.fillRect(px + Math.floor(z * 2), py + Math.floor(z * 2), Math.floor(sz * 0.4), Math.max(1, Math.floor(z)));
        ctx.fillRect(px + Math.floor(z * 2), py + Math.floor(z * 2), Math.max(1, Math.floor(z)), Math.floor(sz * 0.4));
      }
      break;
    }
    case 'floor_carpet': {
      // Base carpet color
      ctx.fillStyle = '#3a4a6a';
      ctx.fillRect(px, py, sz, sz);
      // Pixel noise: vary color per 2x2 block using hash
      const blockSz = Math.max(1, Math.floor(z * 2));
      for (let by = 0; by < sz; by += blockSz) {
        for (let bx = 0; bx < sz; bx += blockSz) {
          const wx = Math.floor(x * TILE_SIZE + bx / z);
          const wy = Math.floor(y * TILE_SIZE + by / z);
          const h = pixelHash(wx, wy);
          if (h % 4 === 0) {
            ctx.fillStyle = '#3f5278';
          } else if (h % 4 === 1) {
            ctx.fillStyle = '#354260';
            ctx.fillRect(Math.floor(px + bx), Math.floor(py + by), blockSz, blockSz);
          } else if (h % 4 === 2) {
            ctx.fillStyle = '#405075';
            ctx.fillRect(Math.floor(px + bx), Math.floor(py + by), blockSz, blockSz);
          }
          // else keep base color (skip redundant fill)
        }
      }
      break;
    }
    case 'wall': {
      // Stone/brick base — slightly varied stone color per tile
      const stoneVar = pixelHash(x, y) % 3;
      const stoneColors = ['#6b6b7b', '#636373', '#70706f'];
      ctx.fillStyle = stoneColors[stoneVar];
      ctx.fillRect(px, py, sz, sz);
      // Inner face slightly darker
      ctx.fillStyle = '#5a5a6a';
      ctx.fillRect(px + Math.floor(z), py + Math.floor(z), sz - Math.floor(z * 2), sz - Math.floor(z * 2));
      // Mortar lines: 2-3 horizontal lines
      ctx.fillStyle = '#48484a';
      const mortarH = Math.max(1, Math.floor(z));
      ctx.fillRect(px, Math.floor(py + sz * 0.35), sz, mortarH);
      ctx.fillRect(px, Math.floor(py + sz * 0.65), sz, mortarH);
      // Vertical offset mortar line (offset based on y parity)
      const vOff = y % 2 === 0 ? Math.floor(sz * 0.5) : Math.floor(sz * 0.25);
      ctx.fillRect(Math.floor(px + vOff), py, mortarH, Math.floor(sz * 0.35));
      break;
    }
    case 'door': {
      // Door frame border (darker)
      ctx.fillStyle = '#5a3a20';
      ctx.fillRect(px, py, sz, sz);
      // Door panel (wood color)
      ctx.fillStyle = '#8b6b4a';
      const frameW = Math.max(2, Math.floor(z * 2));
      ctx.fillRect(px + frameW, py + frameW, sz - frameW * 2, sz - frameW * 2);
      // Wood grain on door
      ctx.fillStyle = '#7a5c38';
      const grainW = Math.max(1, Math.floor(z));
      ctx.fillRect(px + frameW + grainW, Math.floor(py + sz * 0.3), sz - frameW * 2 - grainW * 2, grainW);
      ctx.fillRect(px + frameW + grainW, Math.floor(py + sz * 0.6), sz - frameW * 2 - grainW * 2, grainW);
      // Door handle dot
      ctx.fillStyle = '#d4a020';
      const handleSz = Math.max(2, Math.floor(z * 2));
      ctx.fillRect(Math.floor(px + sz * 0.72), Math.floor(py + sz * 0.5), handleSz, handleSz);
      break;
    }
    case 'floor_dark_wood': {
      const baseColor = (x + y) % 2 === 0 ? '#7a5a42' : '#6e5038';
      ctx.fillStyle = baseColor;
      ctx.fillRect(px, py, sz, sz);
      ctx.fillStyle = (x + y) % 2 === 0 ? '#5e4430' : '#523a28';
      const grainSpacing = Math.floor(sz / 4);
      for (let i = 1; i <= 3; i++) {
        const gy = Math.floor(py + grainSpacing * i);
        ctx.fillRect(px + Math.floor(z), gy, sz - Math.floor(z * 2), Math.max(1, Math.floor(z)));
      }
      break;
    }
    case 'empty': {
      // Outdoor grass
      const grassBase = (x + y) % 2 === 0 ? '#3a6b3a' : '#347034';
      ctx.fillStyle = grassBase;
      ctx.fillRect(px, py, sz, sz);
      // Grass texture variation
      const blockSz = Math.max(1, Math.floor(z * 2));
      for (let by = 0; by < sz; by += blockSz * 2) {
        for (let bx = 0; bx < sz; bx += blockSz * 2) {
          const h = pixelHash(x * 16 + Math.floor(bx / z), y * 16 + Math.floor(by / z));
          if (h % 5 === 0) {
            ctx.fillStyle = '#4a8a4a';
            ctx.fillRect(Math.floor(px + bx), Math.floor(py + by), blockSz, blockSz);
          } else if (h % 5 === 1) {
            ctx.fillStyle = '#2d5e2d';
            ctx.fillRect(Math.floor(px + bx), Math.floor(py + by), blockSz, blockSz);
          }
        }
      }
      break;
    }
  }
}

function sz(zoom: number) { return TILE_SIZE * zoom; }

// Helper: parse a hex color to RGB components
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

// Helper: darken a hex color by a fraction
function darkenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const dr = Math.max(0, Math.floor(r * (1 - amount)));
  const dg = Math.max(0, Math.floor(g * (1 - amount)));
  const db = Math.max(0, Math.floor(b * (1 - amount)));
  return '#' + [dr, dg, db].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function drawFurniture(ctx: CanvasRenderingContext2D, type: FurnitureType, x: number, y: number, w: number, h: number, zoom: number) {
  const px = Math.floor(x * TILE_SIZE * zoom);
  const py = Math.floor(y * TILE_SIZE * zoom);
  const sw = Math.floor(w * TILE_SIZE * zoom);
  const sh = Math.floor(h * TILE_SIZE * zoom);
  const z = zoom;

  switch (type) {
    case 'desk': {
      // Shadow underneath
      ctx.fillStyle = '#2a2010';
      ctx.fillRect(px + Math.floor(z * 2), py + sh - Math.floor(z * 2), sw - Math.floor(z * 4), Math.floor(z * 3));
      // Desk top wood surface
      ctx.fillStyle = '#8b6b4a';
      ctx.fillRect(px + Math.floor(z), py + Math.floor(z), sw - Math.floor(z * 2), sh - Math.floor(z * 2));
      // Wood grain on desk top
      ctx.fillStyle = '#7a5c38';
      const grainSz = Math.max(1, Math.floor(z));
      ctx.fillRect(px + Math.floor(z * 2), Math.floor(py + sh * 0.35), sw - Math.floor(z * 4), grainSz);
      ctx.fillRect(px + Math.floor(z * 2), Math.floor(py + sh * 0.6), sw - Math.floor(z * 4), grainSz);
      // Four legs at corners
      ctx.fillStyle = '#5a3f28';
      const legSz = Math.max(2, Math.floor(z * 2));
      const legH = Math.max(3, Math.floor(z * 3));
      ctx.fillRect(px + Math.floor(z), py + sh - legH, legSz, legH);
      ctx.fillRect(px + sw - Math.floor(z) - legSz, py + sh - legH, legSz, legH);
      ctx.fillRect(px + Math.floor(z), py + Math.floor(z), legSz, legH);
      ctx.fillRect(px + sw - Math.floor(z) - legSz, py + Math.floor(z), legSz, legH);
      // Monitor body
      ctx.fillStyle = '#2a2a2a';
      const monW = Math.floor(z * 8);
      const monH = Math.floor(z * 5);
      const monX = Math.floor(px + sw / 2 - monW / 2);
      const monY = Math.floor(py + z * 2);
      ctx.fillRect(monX, monY, monW, monH);
      // Monitor glowing screen (lighter center)
      ctx.fillStyle = '#3a6a9a';
      ctx.fillRect(monX + Math.floor(z), monY + Math.floor(z), monW - Math.floor(z * 2), monH - Math.floor(z * 2));
      ctx.fillStyle = '#5a9aca';
      ctx.fillRect(monX + Math.floor(z * 2), monY + Math.floor(z), Math.floor(z * 2), Math.floor(z * 2));
      break;
    }
    case 'chair': {
      // Swivel base line
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(Math.floor(px + sz(z) / 2 - z * 3), Math.floor(py + sz(z) - z * 2), Math.floor(z * 6), Math.max(1, Math.floor(z)));
      // Seat (slightly rounded by using a slightly inset rect)
      ctx.fillStyle = '#6b4a3a';
      ctx.fillRect(px + Math.floor(z * 2), py + Math.floor(z * 4), Math.floor(sz(z) - z * 4), Math.floor(sz(z) - z * 7));
      // Seat highlight
      ctx.fillStyle = '#7d5c4a';
      ctx.fillRect(px + Math.floor(z * 3), py + Math.floor(z * 5), Math.floor(sz(z) - z * 8), Math.max(1, Math.floor(z * 2)));
      // Backrest
      ctx.fillStyle = '#5a3a28';
      ctx.fillRect(px + Math.floor(z * 3), py + Math.floor(z), Math.floor(sz(z) - z * 6), Math.floor(z * 4));
      // Backrest top highlight
      ctx.fillStyle = '#6b4a38';
      ctx.fillRect(px + Math.floor(z * 4), py + Math.floor(z), Math.floor(sz(z) - z * 8), Math.max(1, Math.floor(z)));
      break;
    }
    case 'bookshelf': {
      // Shelf frame
      ctx.fillStyle = '#5a4a3a';
      ctx.fillRect(px + Math.floor(z), py, sw - Math.floor(z * 2), sh);
      // Shelf horizontal dividers
      ctx.fillStyle = '#3d2e20';
      const shelfCount = 3;
      for (let s = 1; s < shelfCount; s++) {
        ctx.fillRect(px + Math.floor(z), Math.floor(py + sh * s / shelfCount), sw - Math.floor(z * 2), Math.max(1, Math.floor(z)));
      }
      // Books with varied colors and heights
      const bookColors = ['#c44d4d', '#4a8ab8', '#5a8a5a', '#c4a040', '#8a4ab8', '#c47a4a', '#4abac4', '#c44a8a'];
      const bookCount = Math.min(8, Math.floor((sw - Math.floor(z * 4)) / Math.floor(z * 3)));
      for (let i = 0; i < bookCount; i++) {
        const bookH = Math.floor(sh * 0.25) + Math.floor(pixelHash(x + i, y) % Math.floor(sh * 0.1));
        const bookX = Math.floor(px + z * 2 + i * z * 3);
        const bookY = Math.floor(py + sh * 0.6 - bookH);
        ctx.fillStyle = bookColors[i % bookColors.length];
        ctx.fillRect(bookX, bookY, Math.floor(z * 2), bookH);
        // Book spine highlight
        ctx.fillStyle = darkenHex(bookColors[i % bookColors.length], 0.25);
        ctx.fillRect(bookX + Math.floor(z * 2) - Math.max(1, Math.floor(z)), bookY, Math.max(1, Math.floor(z)), bookH);
      }
      break;
    }
    case 'whiteboard': {
      // Outer frame border (slightly darker gray)
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(px + Math.floor(z), py, sw - Math.floor(z * 2), sh);
      // White board surface
      ctx.fillStyle = '#e8e8e8';
      const fW = Math.max(2, Math.floor(z * 2));
      ctx.fillRect(px + Math.floor(z) + fW, py + fW, sw - Math.floor(z * 2) - fW * 2, sh - fW * 2);
      // Marker lines/scribbles as content
      ctx.fillStyle = '#2266cc';
      ctx.fillRect(px + Math.floor(z * 4), Math.floor(py + sh * 0.25), Math.floor(sw * 0.4), Math.max(1, Math.floor(z)));
      ctx.fillStyle = '#cc2222';
      ctx.fillRect(px + Math.floor(z * 4), Math.floor(py + sh * 0.45), Math.floor(sw * 0.3), Math.max(1, Math.floor(z)));
      ctx.fillStyle = '#228833';
      ctx.fillRect(px + Math.floor(z * 4), Math.floor(py + sh * 0.65), Math.floor(sw * 0.5), Math.max(1, Math.floor(z)));
      // Marker tray at bottom
      ctx.fillStyle = '#888888';
      ctx.fillRect(px + Math.floor(z), py + sh - Math.floor(z * 3), sw - Math.floor(z * 2), Math.floor(z * 3));
      // Marker on tray
      ctx.fillStyle = '#2266cc';
      ctx.fillRect(px + Math.floor(z * 3), py + sh - Math.floor(z * 2), Math.floor(z * 4), Math.floor(z));
      break;
    }
    case 'projector': {
      // Body
      ctx.fillStyle = '#c8c8c8';
      ctx.fillRect(px + Math.floor(z), py, sw - Math.floor(z * 2), sh);
      // Inner detail
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(px + Math.floor(z * 2), py + Math.floor(z), sw - Math.floor(z * 4), sh - Math.floor(z * 2));
      // Lens dot
      ctx.fillStyle = '#204060';
      const lensX = px + Math.floor(z * 3);
      const lensY = Math.floor(py + sh / 2 - z * 2);
      const lensSz = Math.max(2, Math.floor(z * 4));
      ctx.fillRect(lensX, lensY, lensSz, lensSz);
      ctx.fillStyle = '#4080b0';
      ctx.fillRect(lensX + Math.floor(z), lensY + Math.floor(z), lensSz - Math.floor(z * 2), lensSz - Math.floor(z * 2));
      // Status LED
      ctx.fillStyle = '#00cc44';
      ctx.fillRect(px + sw - Math.floor(z * 4), py + Math.floor(z * 2), Math.max(1, Math.floor(z * 2)), Math.max(1, Math.floor(z * 2)));
      // Projected light cone above (semi-transparent triangle using solid blocks)
      ctx.fillStyle = '#ffffc0';
      const coneBase = Math.floor(sw * 0.6);
      const coneTop = Math.max(2, Math.floor(z * 2));
      const coneH = Math.floor(z * 6);
      for (let row = 0; row < coneH; row++) {
        const rowW = Math.floor(coneTop + (coneBase - coneTop) * row / coneH);
        const rowX = Math.floor(px + sw / 2 - rowW / 2);
        ctx.fillRect(rowX, py - coneH + row, rowW, Math.max(1, Math.floor(z)));
      }
      break;
    }
    case 'round_table': {
      // Shadow
      ctx.fillStyle = '#3a2a1a';
      ctx.beginPath();
      ctx.ellipse(
        Math.floor(px + sw / 2) + Math.floor(z),
        Math.floor(py + sh / 2) + Math.floor(z),
        Math.floor(sw / 2 - z * 0.5),
        Math.floor(sh / 2 - z * 0.5),
        0, 0, Math.PI * 2
      );
      ctx.fill();
      // Table surface
      ctx.fillStyle = '#8b6b4a';
      ctx.beginPath();
      ctx.ellipse(
        Math.floor(px + sw / 2),
        Math.floor(py + sh / 2),
        Math.floor(sw / 2 - z),
        Math.floor(sh / 2 - z),
        0, 0, Math.PI * 2
      );
      ctx.fill();
      // Wood grain ring
      ctx.fillStyle = '#7a5c38';
      ctx.beginPath();
      ctx.ellipse(
        Math.floor(px + sw / 2),
        Math.floor(py + sh / 2),
        Math.floor(sw / 4),
        Math.floor(sh / 4),
        0, 0, Math.PI * 2
      );
      ctx.stroke();
      // Highlight arc for 3D effect
      ctx.fillStyle = '#a07850';
      ctx.beginPath();
      ctx.ellipse(
        Math.floor(px + sw / 2) - Math.floor(z * 2),
        Math.floor(py + sh / 2) - Math.floor(z * 2),
        Math.floor(sw / 4),
        Math.floor(sh / 6),
        -0.5, 0, Math.PI
      );
      ctx.fill();
      break;
    }
    case 'coffee_machine': {
      const cs = Math.floor(sz(z));
      // Machine body
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(px + Math.floor(z * 2), py + Math.floor(z), cs - Math.floor(z * 4), cs - Math.floor(z * 2));
      // Machine detail panel
      ctx.fillStyle = '#282828';
      ctx.fillRect(px + Math.floor(z * 3), py + Math.floor(z * 2), cs - Math.floor(z * 6), Math.floor(z * 5));
      // Button / indicator
      ctx.fillStyle = '#c44d4d';
      ctx.fillRect(px + Math.floor(z * 4), py + Math.floor(z * 3), Math.floor(z * 2), Math.floor(z * 2));
      // Coffee cup icon
      ctx.fillStyle = '#e8d0a8';
      const cupX = Math.floor(px + cs / 2 - z * 3);
      const cupY = Math.floor(py + cs - z * 6);
      const cupW = Math.floor(z * 6);
      const cupH = Math.floor(z * 4);
      ctx.fillRect(cupX, cupY, cupW, cupH);
      // Cup handle
      ctx.fillStyle = '#c8b088';
      ctx.fillRect(cupX + cupW, cupY + Math.floor(z), Math.floor(z), Math.floor(z * 2));
      // Steam particles above cup
      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(cupX + Math.floor(z * 2), cupY - Math.floor(z * 3), Math.max(1, Math.floor(z)), Math.max(1, Math.floor(z)));
      ctx.fillRect(cupX + Math.floor(z * 4), cupY - Math.floor(z * 4), Math.max(1, Math.floor(z)), Math.max(1, Math.floor(z)));
      ctx.fillRect(cupX + Math.floor(z), cupY - Math.floor(z * 5), Math.max(1, Math.floor(z)), Math.max(1, Math.floor(z)));
      break;
    }
    case 'plant': {
      const ps = Math.floor(sz(z));
      // Pot terracotta color with rim
      ctx.fillStyle = '#c46a3a';
      ctx.fillRect(px + Math.floor(z * 3), py + ps - Math.floor(z * 5), Math.floor(z * 6), Math.floor(z * 5));
      // Pot rim (slightly lighter)
      ctx.fillStyle = '#d4804a';
      ctx.fillRect(px + Math.floor(z * 2), py + ps - Math.floor(z * 5), Math.floor(z * 8), Math.max(1, Math.floor(z * 2)));
      // Pot soil top
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(px + Math.floor(z * 3), py + ps - Math.floor(z * 5), Math.floor(z * 6), Math.max(1, Math.floor(z * 2)));
      // Foliage: multiple circles with 3 shades of green
      const greens = ['#4a8a4a', '#3a7a3a', '#5a9a5a'];
      // Main center foliage
      ctx.fillStyle = greens[1];
      ctx.beginPath();
      ctx.arc(Math.floor(px + ps / 2), Math.floor(py + ps / 2 - z * 3), Math.floor(z * 4), 0, Math.PI * 2);
      ctx.fill();
      // Left leaf cluster
      ctx.fillStyle = greens[0];
      ctx.beginPath();
      ctx.arc(Math.floor(px + ps / 2 - z * 3), Math.floor(py + ps / 2 - z * 1), Math.floor(z * 3), 0, Math.PI * 2);
      ctx.fill();
      // Right leaf cluster
      ctx.fillStyle = greens[2];
      ctx.beginPath();
      ctx.arc(Math.floor(px + ps / 2 + z * 3), Math.floor(py + ps / 2 - z * 1), Math.floor(z * 3), 0, Math.PI * 2);
      ctx.fill();
      // Top accent
      ctx.fillStyle = greens[2];
      ctx.beginPath();
      ctx.arc(Math.floor(px + ps / 2), Math.floor(py + ps / 2 - z * 5), Math.floor(z * 2), 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'monitor': {
      // Monitor body
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(px + Math.floor(z), py, sw - Math.floor(z * 2), sh - Math.floor(z * 3));
      // Screen
      ctx.fillStyle = '#3a6a9a';
      ctx.fillRect(px + Math.floor(z * 2), py + Math.floor(z), sw - Math.floor(z * 4), sh - Math.floor(z * 5));
      // Screen glow
      ctx.fillStyle = '#5a9aca';
      ctx.fillRect(px + Math.floor(z * 3), py + Math.floor(z * 2), Math.floor(z * 3), Math.floor(z * 2));
      // Stand
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(px + Math.floor(sw / 2 - z * 2), py + sh - Math.floor(z * 3), Math.floor(z * 4), Math.floor(z * 3));
      break;
    }
    case 'sofa': {
      // Shadow
      ctx.fillStyle = '#2a2a3a';
      ctx.fillRect(px + Math.floor(z), py + sh - Math.floor(z * 2), sw - Math.floor(z * 2), Math.floor(z * 2));
      // Base cushion
      ctx.fillStyle = '#5a4a6a';
      ctx.fillRect(px + Math.floor(z), py + Math.floor(z * 3), sw - Math.floor(z * 2), sh - Math.floor(z * 5));
      // Backrest
      ctx.fillStyle = '#4a3a5a';
      ctx.fillRect(px + Math.floor(z), py, sw - Math.floor(z * 2), Math.floor(z * 4));
      // Cushion highlight
      ctx.fillStyle = '#6a5a7a';
      ctx.fillRect(px + Math.floor(z * 3), py + Math.floor(z * 4), Math.floor(sw / 2 - z * 4), Math.floor(z * 2));
      // Arm rests
      ctx.fillStyle = '#4a3a5a';
      ctx.fillRect(px, py + Math.floor(z), Math.floor(z * 2), sh - Math.floor(z * 3));
      ctx.fillRect(px + sw - Math.floor(z * 2), py + Math.floor(z), Math.floor(z * 2), sh - Math.floor(z * 3));
      break;
    }
    case 'door_frame':
      ctx.fillStyle = '#8b6b4a';
      ctx.fillRect(px, py, Math.floor(z * 2), sh);
      ctx.fillRect(px + sw - Math.floor(z * 2), py, Math.floor(z * 2), sh);
      ctx.fillRect(px, py, sw, Math.floor(z * 2));
      break;
  }
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  palette: typeof CHARACTER_PALETTES[0],
  direction: Direction,
  state: CharacterState,
  animFrame: number,
  zoom: number,
) {
  const px = x * zoom;
  const py = y * zoom;
  const flip = direction === 'left';
  const z = zoom;

  // Sitting state: draw only upper body, offset down
  const isSitting = state === 'sitting';

  // Idle breathing / walk bob Y-offset
  let yOffset = 0;
  if (state === 'idle') {
    yOffset = Math.sin(Date.now() / 1000) * 1;
  } else if (state === 'walk') {
    yOffset = Math.abs(Math.sin(Date.now() / 150)) * 1;
  } else if (isSitting) {
    yOffset = 6 * zoom; // shift down to look seated
  }

  ctx.save();
  if (flip) {
    ctx.translate(px + TILE_SIZE * z, 0);
    ctx.scale(-1, 1);
    ctx.translate(-px, 0);
  }

  // Outline/border around character silhouette (very dark version of shirt color)
  const outlineColor = darkenHex(palette.shirt, 0.6);
  ctx.fillStyle = outlineColor;
  // Head outline
  ctx.fillRect(px + 3 * z, py + yOffset - z, 10 * z, 10 * z);
  // Body outline
  ctx.fillRect(px + 2 * z, py + 7 * z + yOffset, 12 * z, 12 * z);

  // Head
  ctx.fillStyle = palette.skin;
  ctx.fillRect(px + 4 * z, py + yOffset, 8 * z, 8 * z);
  // Hair
  ctx.fillStyle = palette.hair;
  ctx.fillRect(px + 4 * z, py + yOffset, 8 * z, 3 * z);
  // Shirt
  ctx.fillStyle = palette.shirt;
  ctx.fillRect(px + 3 * z, py + 8 * z + yOffset, 10 * z, 10 * z);
  // Arms
  ctx.fillRect(px + 1 * z, py + 9 * z + yOffset, 2 * z, 7 * z);
  ctx.fillRect(px + 13 * z, py + 9 * z + yOffset, 2 * z, 7 * z);

  if (state === 'work' && animFrame % 2 === 1) {
    ctx.fillStyle = palette.skin;
    ctx.fillRect(px + 13 * z, py + 7 * z + yOffset, 2 * z, 3 * z);
  }

  if (isSitting && animFrame % 2 === 1) {
    // Typing hand movement when sitting
    ctx.fillStyle = palette.skin;
    ctx.fillRect(px + 13 * z, py + 7 * z + yOffset, 2 * z, 3 * z);
    ctx.fillRect(px + 1 * z, py + 7 * z + yOffset, 2 * z, 3 * z);
  }

  // Legs (skip when sitting — they're under the desk)
  if (!isSitting) {
    ctx.fillStyle = palette.pants;
    const legOffset = state === 'walk' ? (animFrame % 3 - 1) * z : 0;
    ctx.fillRect(px + 4 * z, py + 18 * z + yOffset, 3 * z, 8 * z + legOffset);
    ctx.fillRect(px + 9 * z, py + 18 * z + yOffset, 3 * z, 8 * z - legOffset);

    // Shoes
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(px + 3 * z, py + 26 * z + legOffset + yOffset, 4 * z, 2 * z);
    ctx.fillRect(px + 9 * z, py + 26 * z - legOffset + yOffset, 4 * z, 2 * z);
  }

  // Eyes with white highlight dot
  if (direction === 'down' || direction === 'left' || direction === 'right') {
    // Dark pupil
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(px + 6 * z, py + 4 * z + yOffset, z, z);
    ctx.fillRect(px + 9 * z, py + 4 * z + yOffset, z, z);
    // White highlight dot (1px, offset to upper-right of pupil)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 6 * z + Math.max(1, Math.floor(z * 0.5)), py + 4 * z + yOffset, Math.max(1, Math.floor(z * 0.5)), Math.max(1, Math.floor(z * 0.5)));
    ctx.fillRect(px + 9 * z + Math.max(1, Math.floor(z * 0.5)), py + 4 * z + yOffset, Math.max(1, Math.floor(z * 0.5)), Math.max(1, Math.floor(z * 0.5)));
  }

  ctx.restore();
}
