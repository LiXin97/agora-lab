import type { Tile, TileType, FurnitureInstance } from './types.js';

export function createGrid(cols: number, rows: number, defaultType: TileType): Tile[][] {
  const walkable = defaultType !== 'wall' && defaultType !== 'empty';
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ type: defaultType, walkable }))
  );
}

export function isWalkable(grid: Tile[][], x: number, y: number, furniture: FurnitureInstance[]): boolean {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return false;
  if (!grid[y][x].walkable) return false;
  for (const f of furniture) {
    if (f.type === 'chair') continue; // chairs don't block movement
    if (x >= f.x && x < f.x + f.width && y >= f.y && y < f.y + f.height) return false;
  }
  return true;
}

interface Point { x: number; y: number }

export function findPath(
  grid: Tile[][],
  furniture: FurnitureInstance[],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): Point[] | null {
  if (startX === endX && startY === endY) return [];

  const key = (x: number, y: number) => `${x},${y}`;

  const visited = new Set<string>();
  const parent = new Map<string, Point>();
  const queue: Point[] = [{ x: startX, y: startY }];
  visited.add(key(startX, startY));

  const dirs = [
    { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === endX && current.y === endY) {
      const path: Point[] = [];
      let node: Point | undefined = current;
      while (node && !(node.x === startX && node.y === startY)) {
        path.unshift(node);
        node = parent.get(key(node.x, node.y));
      }
      return path;
    }

    for (const { dx, dy } of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const nk = key(nx, ny);
      const atEnd = nx === endX && ny === endY;
      const passable = atEnd ? isWalkable(grid, nx, ny, []) : isWalkable(grid, nx, ny, furniture);
      if (!visited.has(nk) && passable) {
        visited.add(nk);
        parent.set(nk, current);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return null;
}
