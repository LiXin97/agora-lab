export type SpriteData = string[][];

const cache = new WeakMap<SpriteData, Map<number, HTMLCanvasElement>>();

export function renderSpriteToCanvas(sprite: SpriteData, zoom: number): HTMLCanvasElement {
  let zoomMap = cache.get(sprite);
  if (!zoomMap) {
    zoomMap = new Map();
    cache.set(sprite, zoomMap);
  }
  let canvas = zoomMap.get(zoom);
  if (canvas) return canvas;

  const rows = sprite.length;
  const cols = sprite[0]?.length ?? 0;
  canvas = document.createElement('canvas');
  canvas.width = cols * zoom;
  canvas.height = rows * zoom;
  const ctx = canvas.getContext('2d')!;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const color = sprite[r][c];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(c * zoom, r * zoom, zoom, zoom);
    }
  }

  zoomMap.set(zoom, canvas);
  return canvas;
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteData,
  x: number,
  y: number,
  zoom: number,
  flipH = false,
): void {
  const cached = renderSpriteToCanvas(sprite, zoom);
  if (flipH) {
    ctx.save();
    ctx.translate(x + cached.width, y);
    ctx.scale(-1, 1);
    ctx.drawImage(cached, 0, 0);
    ctx.restore();
  } else {
    ctx.drawImage(cached, x, y);
  }
}

/** Recolor a sprite by mapping old colors to new colors */
export function recolorSprite(sprite: SpriteData, colorMap: Record<string, string>): SpriteData {
  return sprite.map(row => row.map(c => colorMap[c] ?? c));
}
