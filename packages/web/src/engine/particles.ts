export interface Particle {
  x: number; y: number;
  dx: number; dy: number;
  life: number; maxLife: number;
  color: string; size: number;
}

const particles: Particle[] = [];

export function spawnParticles(x: number, y: number, color: string, count: number): void {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      dx: (Math.random() - 0.5) * 2,
      dy: (Math.random() - 0.5) * 2 - 1,
      life: 1, maxLife: 0.5 + Math.random() * 0.5,
      color, size: 1 + Math.random() * 2,
    });
  }
}

export function updateParticles(dt: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.dx * dt * 60;
    p.y += p.dy * dt * 60;
    p.life -= dt / p.maxLife;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, zoom: number): void {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    const sx = (p.x - cameraX) * zoom;
    const sy = (p.y - cameraY) * zoom;
    ctx.fillRect(sx, sy, p.size * zoom, p.size * zoom);
  }
  ctx.globalAlpha = 1;
}

export function getParticles(): readonly Particle[] { return particles; }
