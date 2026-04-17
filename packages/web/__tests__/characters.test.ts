import { describe, it, expect } from 'vitest';
import { createCharacter, updateCharacter, setCharacterTarget, setCharacterState } from '../src/engine/characters.js';
import { needsAnimation } from '../src/engine/render-policy.js';
import { createGrid } from '../src/engine/tileMap.js';
import { TILE_SIZE } from '../src/engine/types.js';

function createRenderState(characters: ReturnType<typeof createCharacter>[]) {
  const grid = createGrid(6, 6, 'floor_wood');
  return {
    grid,
    furniture: [],
    characters,
    camera: { x: 0, y: 0, zoom: 2 },
    bubbles: [],
    selectedCharacterId: null,
    cols: 6,
    rows: 6,
    ambientLighting: false,
    particleCount: 0,
    overlayMode: 'none' as const,
  };
}

describe('createCharacter', () => {
  it('creates character at grid position', () => {
    const ch = createCharacter('supervisor', 'supervisor', 'supervisor', 0, 5, 3);
    expect(ch.x).toBe(5 * TILE_SIZE);
    expect(ch.y).toBe(3 * TILE_SIZE);
    expect(ch.state).toBe('idle');
    expect(ch.direction).toBe('down');
  });
});

describe('setCharacterTarget', () => {
  it('sets walk state with path', () => {
    const grid = createGrid(10, 10, 'floor_wood');
    let ch = createCharacter('s', 'sup', 'supervisor', 0, 0, 0);
    ch = setCharacterTarget(ch, 3, 0, grid, []);
    expect(ch.state).toBe('walk');
    expect(ch.path).not.toBeNull();
    expect(ch.path!.length).toBeGreaterThan(0);
  });

  it('stays idle when target unreachable', () => {
    const grid = createGrid(3, 3, 'floor_wood');
    grid[0][1] = { type: 'wall', walkable: false };
    grid[1][0] = { type: 'wall', walkable: false };
    grid[1][1] = { type: 'wall', walkable: false };
    let ch = createCharacter('s', 'sup', 'supervisor', 0, 0, 0);
    ch = setCharacterTarget(ch, 2, 2, grid, []);
    expect(ch.state).toBe('idle');
  });
});

describe('setCharacterState', () => {
  it('transitions to work state', () => {
    let ch = createCharacter('s', 'sup', 'supervisor', 0, 5, 3);
    ch = setCharacterState(ch, 'work');
    expect(ch.state).toBe('work');
  });

  it('transitions to meeting state', () => {
    let ch = createCharacter('s', 'sup', 'supervisor', 0, 5, 3);
    ch = setCharacterState(ch, 'meeting');
    expect(ch.state).toBe('meeting');
  });
});

describe('updateCharacter', () => {
  it('moves character along path', () => {
    const grid = createGrid(10, 10, 'floor_wood');
    let ch = createCharacter('s', 'sup', 'supervisor', 0, 0, 0);
    ch = setCharacterTarget(ch, 3, 0, grid, []);
    const startX = ch.x;
    for (let i = 0; i < 100; i++) {
      ch = updateCharacter(ch, 16);
    }
    expect(ch.x).toBeGreaterThan(startX);
  });

  it('returns to idle after reaching target', () => {
    const grid = createGrid(10, 10, 'floor_wood');
    let ch = createCharacter('s', 'sup', 'supervisor', 0, 0, 0);
    ch = setCharacterTarget(ch, 1, 0, grid, []);
    for (let i = 0; i < 500; i++) {
      ch = updateCharacter(ch, 16);
    }
    expect(ch.state).toBe('idle');
  });
});

describe('needsAnimation', () => {
  it('stays false for idle characters with no ambient effects', () => {
    const ch = createCharacter('s', 'sup', 'supervisor', 0, 1, 1);
    expect(needsAnimation(createRenderState([ch]))).toBe(false);
  });

  it('returns true while a character is walking', () => {
    const grid = createGrid(10, 10, 'floor_wood');
    let ch = createCharacter('s', 'sup', 'supervisor', 0, 0, 0);
    ch = setCharacterTarget(ch, 3, 0, grid, []);
    expect(needsAnimation(createRenderState([ch]))).toBe(true);
  });

  it('returns false again after movement completes', () => {
    const grid = createGrid(10, 10, 'floor_wood');
    let ch = createCharacter('s', 'sup', 'supervisor', 0, 0, 0);
    ch = setCharacterTarget(ch, 1, 0, grid, []);
    for (let i = 0; i < 500; i++) {
      ch = updateCharacter(ch, 16);
    }
    expect(ch.state).toBe('idle');
    expect(needsAnimation(createRenderState([ch]))).toBe(false);
  });
});
