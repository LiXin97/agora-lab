import type { Camera, Character, FurnitureInstance, SpeechBubble, Tile } from './types.js';

export type RenderOverlayMode = 'none' | 'kanban' | 'meeting';

export interface RenderState {
  grid: Tile[][];
  furniture: FurnitureInstance[];
  characters: Character[];
  camera: Camera;
  bubbles: SpeechBubble[];
  selectedCharacterId: string | null;
  cols: number;
  rows: number;
  ambientLighting?: boolean;
  particleCount?: number;
  overlayMode?: RenderOverlayMode;
}

export interface RenderViewport {
  width: number;
  height: number;
  dpr: number;
}

function characterSignature(character: Character) {
  return [
    character.id,
    character.state,
    character.direction,
    character.x,
    character.y,
    character.animFrame,
    character.pathIndex,
    character.targetX,
    character.targetY,
  ].join(':');
}

function bubbleSignature(bubble: SpeechBubble) {
  return [
    bubble.characterId,
    bubble.style,
    bubble.text,
    bubble.createdAt,
    bubble.expiresAt,
  ].join(':');
}

function cameraChanged(previous: Camera, next: Camera): boolean {
  return previous.x !== next.x || previous.y !== next.y || previous.zoom !== next.zoom;
}

function viewportChanged(previous: RenderViewport | null, next: RenderViewport): boolean {
  if (!previous) {
    return true;
  }

  return previous.width !== next.width || previous.height !== next.height || previous.dpr !== next.dpr;
}

function collectionChanged<T>(
  previous: T[],
  next: T[],
  getSignature: (item: T) => string,
): boolean {
  if (previous.length !== next.length) {
    return true;
  }

  for (let index = 0; index < previous.length; index += 1) {
    if (getSignature(previous[index]) !== getSignature(next[index])) {
      return true;
    }
  }

  return false;
}

function isCharacterMoving(character: Character): boolean {
  if (character.state !== 'walk') {
    return false;
  }

  if (character.path && character.pathIndex !== undefined) {
    return character.pathIndex < character.path.length;
  }

  if (character.targetX === undefined || character.targetY === undefined) {
    return true;
  }

  return character.x !== character.targetX || character.y !== character.targetY;
}

export function needsAnimation(state: RenderState): boolean {
  return state.characters.some(isCharacterMoving) || (state.particleCount ?? 0) > 0;
}

export function shouldRedraw(previous: RenderState | null, next: RenderState): boolean {
  if (!previous) {
    return true;
  }

  if (
    previous.grid !== next.grid ||
    previous.furniture !== next.furniture ||
    previous.cols !== next.cols ||
    previous.rows !== next.rows ||
    previous.selectedCharacterId !== next.selectedCharacterId ||
    previous.ambientLighting !== next.ambientLighting ||
    previous.particleCount !== next.particleCount ||
    previous.overlayMode !== next.overlayMode ||
    cameraChanged(previous.camera, next.camera)
  ) {
    return true;
  }

  if (collectionChanged(previous.characters, next.characters, characterSignature)) {
    return true;
  }

  if (collectionChanged(previous.bubbles, next.bubbles, bubbleSignature)) {
    return true;
  }

  return false;
}

export function shouldRedrawCanvas(
  previousState: RenderState | null,
  nextState: RenderState,
  previousViewport: RenderViewport | null,
  nextViewport: RenderViewport,
): boolean {
  return viewportChanged(previousViewport, nextViewport) || shouldRedraw(previousState, nextState);
}
