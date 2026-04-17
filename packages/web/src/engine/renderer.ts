import { TILE_SIZE } from './types.js';
import { drawTile, drawFurniture, drawCharacter, CHARACTER_PALETTES } from './assets.js';
import { drawParticles } from './particles.js';
import { drawAmbientLighting } from './lighting.js';
import type { RenderState } from './render-policy.js';

const BUBBLE_ACCENT: Record<RenderState['bubbles'][number]['style'], string> = {
  question: '#67b8ff',
  decision: '#53d0a2',
  critique: '#f17b7b',
  status: '#d6b25d',
};

export function render(ctx: CanvasRenderingContext2D, state: RenderState) {
  const { grid, furniture, characters, camera, bubbles, selectedCharacterId, cols, rows } = state;
  const zoom = camera.zoom;
  const cssWidth = ctx.canvas.clientWidth || ctx.canvas.width;
  const cssHeight = ctx.canvas.clientHeight || ctx.canvas.height;
  const dpr = cssWidth > 0 ? ctx.canvas.width / cssWidth : 1;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(-camera.x, -camera.y);

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      drawTile(ctx, grid[y][x].type, x, y, zoom);
    }
  }

  interface Renderable {
    y: number;
    draw: () => void;
  }

  const renderables: Renderable[] = [];

  for (const furnitureItem of furniture) {
    renderables.push({
      y: (furnitureItem.y + furnitureItem.height) * TILE_SIZE,
      draw: () => drawFurniture(
        ctx,
        furnitureItem.type,
        furnitureItem.x,
        furnitureItem.y,
        furnitureItem.width,
        furnitureItem.height,
        zoom,
      ),
    });
  }

  for (const character of characters) {
    const palette = CHARACTER_PALETTES[character.paletteIndex % CHARACTER_PALETTES.length];
    renderables.push({
      y: character.y + TILE_SIZE * 2,
      draw: () => {
        const shadowX = character.x * zoom + TILE_SIZE * zoom / 2;
        const shadowY = (character.y + TILE_SIZE * 2) * zoom;
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = 'rgba(0,0,0,0.24)';
        ctx.beginPath();
        ctx.ellipse(shadowX, shadowY, TILE_SIZE * zoom * 0.4, TILE_SIZE * zoom * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        drawCharacter(ctx, character.x, character.y, palette, character.direction, character.state, character.animFrame, zoom);
        if (character.id === selectedCharacterId) {
          ctx.save();
          ctx.strokeStyle = '#7fc3ff';
          ctx.lineWidth = Math.max(1, zoom * 0.75);
          ctx.strokeRect(
            character.x * zoom + zoom,
            character.y * zoom + zoom,
            TILE_SIZE * zoom - zoom * 2,
            TILE_SIZE * 2 * zoom - zoom * 2,
          );
          ctx.restore();
        }
      },
    });
  }

  renderables.sort((left, right) => left.y - right.y);
  for (const renderable of renderables) {
    renderable.draw();
  }

  if ((state.particleCount ?? 0) > 0) {
    drawParticles(ctx, camera.x / zoom, camera.y / zoom, zoom);
  }

  const now = Date.now();
  for (const bubble of bubbles) {
    if (now > bubble.expiresAt) continue;
    const character = characters.find(item => item.id === bubble.characterId);
    if (!character) continue;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const screenX = character.x * zoom - camera.x + TILE_SIZE * zoom / 2;
    const screenY = character.y * zoom - camera.y - zoom * 11;
    const text = bubble.text.slice(0, 30);
    const textWidth = Math.max(56, text.length * zoom * 3.6);
    const padding = zoom * 3;
    const bubbleX = screenX - textWidth / 2 - padding;
    const bubbleY = screenY - zoom * 6;
    const bubbleWidth = textWidth + padding * 2;
    const bubbleHeight = zoom * 8;

    ctx.fillStyle = 'rgba(7, 12, 18, 0.9)';
    ctx.fillRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
    ctx.strokeStyle = BUBBLE_ACCENT[bubble.style];
    ctx.lineWidth = Math.max(1, zoom * 0.5);
    ctx.strokeRect(
      bubbleX + ctx.lineWidth / 2,
      bubbleY + ctx.lineWidth / 2,
      bubbleWidth - ctx.lineWidth,
      bubbleHeight - ctx.lineWidth,
    );

    ctx.fillStyle = '#f4f7fb';
    ctx.font = `${Math.max(10, zoom * 4.6)}px ui-monospace, SFMono-Regular, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(text, screenX, screenY - zoom * 0.8);

    ctx.fillStyle = 'rgba(7, 12, 18, 0.9)';
    ctx.beginPath();
    ctx.moveTo(screenX - zoom * 2, screenY + zoom * 2);
    ctx.lineTo(screenX + zoom * 2, screenY + zoom * 2);
    ctx.lineTo(screenX, screenY + zoom * 4.8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();

  if (state.ambientLighting) {
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawAmbientLighting(ctx, cssWidth, cssHeight);
    ctx.restore();
  }
}
