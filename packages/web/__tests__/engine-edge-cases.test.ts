import { describe, it, expect } from 'vitest';
import { createGrid, isWalkable, findPath } from '../src/engine/tileMap.js';
import { createLabLayout } from '../src/engine/layout.js';
import { createCharacter, updateCharacter, setCharacterTarget, setCharacterState } from '../src/engine/characters.js';
import { createCamera, centerCamera, zoomCamera, followCharacter, screenToGrid } from '../src/engine/camera.js';
import { shouldRedraw, shouldRedrawCanvas, type RenderState, type RenderViewport } from '../src/engine/render-policy.js';
import { TILE_SIZE } from '../src/engine/types.js';
import type { FurnitureInstance } from '../src/engine/types.js';

describe('pathfinding in actual lab layout', () => {
  const agents = [
    { role: 'supervisor', name: 'prof' },
    { role: 'student', name: 'alice' },
    { role: 'student', name: 'bob' },
    { role: 'research-staff', name: 'staff1' },
    { role: 'paper-reviewer', name: 'rev1' },
  ];
  const layout = createLabLayout(agents);
  const { grid, furniture } = layout;

  it('grid has doors (walkable tiles within walls)', () => {
    let doorCount = 0;
    for (let y = 0; y < layout.rows; y++) {
      for (let x = 0; x < layout.cols; x++) {
        if (grid[y][x].type === 'door') {
          expect(grid[y][x].walkable).toBe(true);
          doorCount++;
        }
      }
    }
    expect(doorCount).toBeGreaterThanOrEqual(3);
  });

  describe('desk reachability', () => {
    it('desk chair positions are on walkable tiles', () => {
      for (const desk of layout.deskPositions) {
        const tile = grid[desk.chairY]?.[desk.chairX];
        expect(tile).toBeDefined();
        expect(tile.walkable).toBe(true);
      }
    });

    it('students can reach each other', () => {
      const studentDesks = layout.deskPositions.filter((_, i) => {
        const a = agents[i];
        return a && a.role === 'student';
      });
      if (studentDesks.length < 2) return;
      const d0 = studentDesks[0];
      const d1 = studentDesks[1];
      const path = findPath(grid, furniture, d0.chairX, d0.chairY, d1.chairX, d1.chairY);
      expect(path).not.toBeNull();
    });
  });

  it('meeting positions are walkable', () => {
    for (const pos of layout.meetingPositions) {
      expect(isWalkable(grid, pos.x, pos.y, furniture)).toBe(true);
    }
  });
});

describe('character FSM edge cases', () => {
  it('setCharacterTarget to current position returns idle', () => {
    const grid = createGrid(10, 10, 'floor_wood');
    let ch = createCharacter('s', 'sup', 'supervisor', 0, 3, 3);
    ch = setCharacterTarget(ch, 3, 3, grid, []);
    expect(ch.state).toBe('idle');
  });

  it('updateCharacter with idle state does not move', () => {
    let ch = createCharacter('s', 'sup', 'supervisor', 0, 5, 5);
    const startX = ch.x;
    const startY = ch.y;
    ch = updateCharacter(ch, 100);
    expect(ch.x).toBe(startX);
    expect(ch.y).toBe(startY);
  });

  it('updateCharacter with work state does not move', () => {
    let ch = createCharacter('s', 'sup', 'supervisor', 0, 5, 5);
    ch = setCharacterState(ch, 'work');
    const startX = ch.x;
    ch = updateCharacter(ch, 1000);
    expect(ch.x).toBe(startX);
  });

  it('animation frame cycles correctly', () => {
    let ch = createCharacter('s', 'sup', 'supervisor', 0, 0, 0);
    ch = updateCharacter(ch, 200);
    expect(ch.animFrame).toBe(1);
    ch = updateCharacter(ch, 200);
    expect(ch.animFrame).toBe(2);
    ch = updateCharacter(ch, 200);
    expect(ch.animFrame).toBe(0);
  });

  it('character reaches exact target position', () => {
    const grid = createGrid(10, 10, 'floor_wood');
    let ch = createCharacter('s', 'sup', 'supervisor', 0, 0, 0);
    ch = setCharacterTarget(ch, 2, 0, grid, []);
    for (let i = 0; i < 2000; i++) {
      ch = updateCharacter(ch, 16);
    }
    expect(ch.state).toBe('idle');
    expect(ch.x).toBe(2 * TILE_SIZE);
    expect(ch.y).toBe(0);
  });
});

describe('camera edge cases', () => {
  it('zoom clamps to min 1', () => {
    let cam = createCamera();
    cam = zoomCamera(cam, -1);
    cam = zoomCamera(cam, -1);
    cam = zoomCamera(cam, -1);
    expect(cam.zoom).toBe(1);
  });

  it('zoom clamps to max 4', () => {
    let cam = createCamera();
    cam = zoomCamera(cam, 1);
    cam = zoomCamera(cam, 1);
    cam = zoomCamera(cam, 1);
    expect(cam.zoom).toBe(4);
  });

  it('screenToGrid at zoom 1', () => {
    const cam = { x: 0, y: 0, zoom: 1 };
    const result = screenToGrid(cam, TILE_SIZE * 3.5, TILE_SIZE * 2.5);
    expect(result).toEqual({ x: 3, y: 2 });
  });

  it('screenToGrid at zoom 4', () => {
    const cam = { x: 0, y: 0, zoom: 4 };
    const result = screenToGrid(cam, TILE_SIZE * 4 * 2.5, TILE_SIZE * 4 * 1.5);
    expect(result).toEqual({ x: 2, y: 1 });
  });

  it('screenToGrid with camera offset', () => {
    const cam = { x: TILE_SIZE * 2, y: TILE_SIZE * 2, zoom: 2 };
    const result = screenToGrid(cam, 0, 0);
    expect(result).toEqual({ x: 1, y: 1 });
  });

  it('followCharacter converges toward target', () => {
    const ch = createCharacter('s', 'sup', 'supervisor', 0, 10, 10);
    let cam = createCamera();
    const canvasW = 800;
    const canvasH = 600;
    for (let i = 0; i < 100; i++) {
      cam = followCharacter(cam, ch, canvasW, canvasH);
    }
    const expectedX = ch.x * cam.zoom - canvasW / 2 + (TILE_SIZE * cam.zoom) / 2;
    const expectedY = ch.y * cam.zoom - canvasH / 2 + (TILE_SIZE * cam.zoom) / 2;
    expect(Math.abs(cam.x - expectedX)).toBeLessThan(1);
    expect(Math.abs(cam.y - expectedY)).toBeLessThan(1);
  });
});

describe('findPath edge cases', () => {
  it('handles single-step path', () => {
    const grid = createGrid(5, 5, 'floor_wood');
    const path = findPath(grid, [], 0, 0, 1, 0);
    expect(path).toEqual([{ x: 1, y: 0 }]);
  });

  it('handles path around furniture', () => {
    const grid = createGrid(5, 5, 'floor_wood');
    const furniture: FurnitureInstance[] = [{ type: 'desk', x: 1, y: 0, width: 1, height: 1 }];
    const path = findPath(grid, furniture, 0, 0, 2, 0);
    expect(path).not.toBeNull();
    expect(path!.some(p => p.y === 1)).toBe(true);
  });
});

function createRenderState(overrides: Partial<RenderState> = {}): RenderState {
  const grid = createGrid(4, 4, 'floor_wood');
  return {
    grid,
    furniture: [],
    characters: [],
    camera: { x: 0, y: 0, zoom: 2 },
    bubbles: [],
    selectedCharacterId: null,
    cols: 4,
    rows: 4,
    ambientLighting: false,
    particleCount: 0,
    overlayMode: 'none',
    ...overrides,
  };
}

describe('render policy edge cases', () => {
  const viewport: RenderViewport = { width: 800, height: 600, dpr: 1 };

  it('does not redraw when state snapshots are equivalent', () => {
    const previous = createRenderState();
    const next = { ...previous };
    expect(shouldRedraw(previous, next)).toBe(false);
  });

  it('redraws when overlay state changes', () => {
    const previous = createRenderState();
    const next = { ...previous, overlayMode: 'meeting' as const };
    expect(shouldRedraw(previous, next)).toBe(true);
  });

  it('redraws when the camera changes', () => {
    const previous = createRenderState();
    const next = { ...previous, camera: { ...previous.camera, x: 24 } };
    expect(shouldRedraw(previous, next)).toBe(true);
  });

  it('forces canvas redraw when viewport changes', () => {
    const state = createRenderState();
    expect(shouldRedrawCanvas(state, state, viewport, { ...viewport, width: 1024 })).toBe(true);
  });

  it('skips canvas redraw when viewport and scene are unchanged', () => {
    const state = createRenderState();
    expect(shouldRedrawCanvas(state, state, viewport, viewport)).toBe(false);
  });
});

// ─── centerCamera regression: real stage size produces different result ───────

describe('centerCamera initial centering regression', () => {
  const DEFAULT_STAGE = { width: 1280, height: 720 };
  const REAL_STAGE = { width: 950, height: 580 };
  const cols = 24;
  const rows = 18;
  const zoom = 2;

  it('centerCamera with default stage size produces a different offset than with real stage size', () => {
    const camDefault = centerCamera(cols, rows, DEFAULT_STAGE.width, DEFAULT_STAGE.height, zoom);
    const camReal = centerCamera(cols, rows, REAL_STAGE.width, REAL_STAGE.height, zoom);
    // If real size differs from default, the camera positions must differ too.
    // This documents why re-centering on first real measurement is necessary.
    expect(camDefault.x).not.toBe(camReal.x);
    expect(camDefault.y).not.toBe(camReal.y);
  });

  it('centerCamera uses stage dimensions correctly: x offset grows when stage gets narrower', () => {
    // Narrower stage → left edge moves further right to stay centered → x is larger
    const camWide = centerCamera(cols, rows, 1280, 720, zoom);
    const camNarrow = centerCamera(cols, rows, 800, 720, zoom);
    expect(camNarrow.x).toBeGreaterThan(camWide.x);
  });

  it('centerCamera preserves zoom when centering', () => {
    const cam = centerCamera(cols, rows, REAL_STAGE.width, REAL_STAGE.height, zoom);
    expect(cam.zoom).toBe(zoom);
  });
});
