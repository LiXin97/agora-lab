import { TILE_SIZE } from './types.js';
import type { Character, CharacterState, Direction, Tile, FurnitureInstance } from './types.js';
import { findPath } from './tileMap.js';

const WALK_SPEED = 1.5;
const ANIM_FRAME_DURATION = 200;

export function createCharacter(
  id: string,
  name: string,
  role: string,
  paletteIndex: number,
  gridX: number,
  gridY: number,
): Character {
  return {
    id,
    name,
    role,
    paletteIndex,
    state: 'idle',
    direction: 'down',
    x: gridX * TILE_SIZE,
    y: gridY * TILE_SIZE,
    animFrame: 0,
    animTimer: 0,
  };
}

export function setCharacterTarget(
  ch: Character,
  gridX: number,
  gridY: number,
  grid: Tile[][],
  furniture: FurnitureInstance[],
): Character {
  const startGridX = Math.floor(ch.x / TILE_SIZE);
  const startGridY = Math.floor(ch.y / TILE_SIZE);
  const path = findPath(grid, furniture, startGridX, startGridY, gridX, gridY);
  if (!path || path.length === 0) return { ...ch, state: 'idle' };
  return {
    ...ch,
    state: 'walk',
    path,
    pathIndex: 0,
    targetX: gridX * TILE_SIZE,
    targetY: gridY * TILE_SIZE,
  };
}

export function setCharacterState(ch: Character, state: CharacterState): Character {
  return { ...ch, state, animFrame: 0, animTimer: 0 };
}

function directionFromDelta(dx: number, dy: number): Direction {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

export function updateCharacter(ch: Character, deltaMs: number): Character {
  let updated = { ...ch };

  updated.animTimer += deltaMs;
  if (updated.animTimer >= ANIM_FRAME_DURATION) {
    updated.animTimer -= ANIM_FRAME_DURATION;
    updated.animFrame = (updated.animFrame + 1) % 3;
  }

  if (updated.state === 'walk' && updated.path && updated.pathIndex !== undefined) {
    const target = updated.path[updated.pathIndex];
    const targetPx = target.x * TILE_SIZE;
    const targetPy = target.y * TILE_SIZE;
    const dx = targetPx - updated.x;
    const dy = targetPy - updated.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < WALK_SPEED) {
      updated.x = targetPx;
      updated.y = targetPy;
      updated.pathIndex++;
      if (updated.pathIndex >= updated.path.length) {
        updated.state = 'idle';
        updated.path = undefined;
        updated.pathIndex = undefined;
        updated.targetX = undefined;
        updated.targetY = undefined;
      }
    } else {
      updated.direction = directionFromDelta(dx, dy);
      updated.x += (dx / dist) * WALK_SPEED;
      updated.y += (dy / dist) * WALK_SPEED;
    }
  }

  return updated;
}
