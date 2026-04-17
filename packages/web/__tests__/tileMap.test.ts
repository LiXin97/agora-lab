import { describe, it, expect } from 'vitest';
import { createGrid, isWalkable, findPath } from '../src/engine/tileMap.js';
import type { Tile, FurnitureInstance } from '../src/engine/types.js';

describe('createGrid', () => {
  it('creates grid with given dimensions', () => {
    const grid = createGrid(10, 8, 'floor_wood');
    expect(grid.length).toBe(8);
    expect(grid[0].length).toBe(10);
    expect(grid[0][0].type).toBe('floor_wood');
    expect(grid[0][0].walkable).toBe(true);
  });
});

describe('isWalkable', () => {
  it('returns true for floor tiles', () => {
    const grid = createGrid(5, 5, 'floor_wood');
    expect(isWalkable(grid, 2, 2, [])).toBe(true);
  });

  it('returns false for wall tiles', () => {
    const grid = createGrid(5, 5, 'floor_wood');
    grid[1][1] = { type: 'wall', walkable: false };
    expect(isWalkable(grid, 1, 1, [])).toBe(false);
  });

  it('returns false for out of bounds', () => {
    const grid = createGrid(5, 5, 'floor_wood');
    expect(isWalkable(grid, -1, 0, [])).toBe(false);
    expect(isWalkable(grid, 5, 0, [])).toBe(false);
  });

  it('returns false for furniture tiles', () => {
    const grid = createGrid(5, 5, 'floor_wood');
    const furniture: FurnitureInstance[] = [{ type: 'desk', x: 2, y: 2, width: 1, height: 1 }];
    expect(isWalkable(grid, 2, 2, furniture)).toBe(false);
  });
});

describe('findPath', () => {
  it('finds straight path in open grid', () => {
    const grid = createGrid(5, 5, 'floor_wood');
    const path = findPath(grid, [], 0, 0, 4, 0);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);
    expect(path![path!.length - 1]).toEqual({ x: 4, y: 0 });
  });

  it('finds path around obstacle', () => {
    const grid = createGrid(5, 5, 'floor_wood');
    grid[0][2] = { type: 'wall', walkable: false };
    const path = findPath(grid, [], 0, 0, 4, 0);
    expect(path).not.toBeNull();
    expect(path!.some(p => p.x === 2 && p.y === 0)).toBe(false);
  });

  it('returns null when no path exists', () => {
    const grid = createGrid(3, 3, 'floor_wood');
    grid[0][1] = { type: 'wall', walkable: false };
    grid[1][0] = { type: 'wall', walkable: false };
    grid[1][1] = { type: 'wall', walkable: false };
    const path = findPath(grid, [], 0, 0, 2, 2);
    expect(path).toBeNull();
  });

  it('returns empty path when start equals end', () => {
    const grid = createGrid(5, 5, 'floor_wood');
    const path = findPath(grid, [], 2, 2, 2, 2);
    expect(path).toEqual([]);
  });
});
