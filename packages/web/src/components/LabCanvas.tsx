import { useRef, useEffect, useCallback, useState } from 'react';
import type { RenderState, RenderViewport } from '../engine/render-policy.js';
import { shouldRedrawCanvas } from '../engine/render-policy.js';
import { render } from '../engine/renderer.js';
import type { FurnitureInstance } from '../engine/types.js';
import { TILE_SIZE } from '../engine/types.js';
import { screenToGrid } from '../engine/camera.js';

interface Props {
  renderState: RenderState;
  onClickCharacter: (id: string) => void;
  onClickFurniture: (f: FurnitureInstance) => void;
  onClickEmpty: () => void;
  onPan: (dx: number, dy: number) => void;
  onZoom: (dir: 1 | -1) => void;
}

function shouldDrawFrame(
  previousState: RenderState | null,
  nextState: RenderState,
  previousViewport: RenderViewport | null,
  nextViewport: RenderViewport,
) {
  return shouldRedrawCanvas(previousState, nextState, previousViewport, nextViewport);
}

export function LabCanvas({ renderState, onClickCharacter, onClickFurniture, onClickEmpty, onPan, onZoom }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const previousRenderStateRef = useRef<RenderState | null>(null);
  const previousViewportRef = useRef<RenderViewport | null>(null);
  const [viewport, setViewport] = useState<RenderViewport>({ width: 0, height: 0, dpr: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const dpr = window.devicePixelRatio || 1;

      setViewport(previous => (
        previous.width === width && previous.height === height && previous.dpr === dpr
          ? previous
          : { width, height, dpr }
      ));
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(canvas);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewport.width === 0 || viewport.height === 0) return;

    if (!shouldDrawFrame(previousRenderStateRef.current, renderState, previousViewportRef.current, viewport)) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelWidth = Math.round(viewport.width * viewport.dpr);
    const pixelHeight = Math.round(viewport.height * viewport.dpr);

    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    render(ctx, renderState);

    previousRenderStateRef.current = renderState;
    previousViewportRef.current = viewport;
  }, [renderState, viewport]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    dragging.current = true;
    didDrag.current = false;
    lastMouse.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (dragging.current) {
      const dx = lastMouse.current.x - event.clientX;
      const dy = lastMouse.current.y - event.clientY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag.current = true;
      lastMouse.current = { x: event.clientX, y: event.clientY };
      onPan(dx, dy);
    }
  }, [onPan]);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (didDrag.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const grid = screenToGrid(renderState.camera, screenX, screenY);

    for (const character of renderState.characters) {
      const characterGridX = Math.floor(character.x / TILE_SIZE);
      const characterGridY = Math.floor(character.y / TILE_SIZE);
      if (grid.x === characterGridX && (grid.y === characterGridY || grid.y === characterGridY + 1)) {
        onClickCharacter(character.id);
        return;
      }
    }

    for (const furniture of renderState.furniture) {
      if (
        furniture.interactive &&
        grid.x >= furniture.x &&
        grid.x < furniture.x + furniture.width &&
        grid.y >= furniture.y &&
        grid.y < furniture.y + furniture.height
      ) {
        onClickFurniture(furniture);
        return;
      }
    }

    onClickEmpty();
  }, [renderState, onClickCharacter, onClickFurniture, onClickEmpty]);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    onZoom(event.deltaY < 0 ? 1 : -1);
  }, [onZoom]);

  return (
    <canvas
      ref={canvasRef}
      className="lab-canvas"
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(event) => event.preventDefault()}
    />
  );
}
