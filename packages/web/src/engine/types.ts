export const TILE_SIZE = 16;

export type TileType = 'floor_wood' | 'floor_tile' | 'floor_carpet' | 'floor_dark_wood' | 'wall' | 'door' | 'empty';

export interface Tile {
  type: TileType;
  walkable: boolean;
}

export type FurnitureType = 'desk' | 'chair' | 'bookshelf' | 'whiteboard' | 'projector' | 'round_table' | 'coffee_machine' | 'plant' | 'door_frame' | 'monitor' | 'sofa';

export interface FurnitureInstance {
  type: FurnitureType;
  x: number;
  y: number;
  width: number;
  height: number;
  interactive?: 'kanban' | 'meeting';
}

export type CharacterState = 'idle' | 'walk' | 'work' | 'sitting' | 'meeting';
export type Direction = 'down' | 'up' | 'left' | 'right';

export interface Character {
  id: string;
  name: string;
  role: string;
  paletteIndex: number;
  state: CharacterState;
  direction: Direction;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  path?: Array<{ x: number; y: number }>;
  pathIndex?: number;
  animFrame: number;
  animTimer: number;
  deskX?: number;
  deskY?: number;
}

export interface SpeechBubble {
  characterId: string;
  text: string;
  style: 'question' | 'decision' | 'critique' | 'status';
  expiresAt: number;
  createdAt: number;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  followTarget?: string;
}
