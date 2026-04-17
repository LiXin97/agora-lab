export function drawAmbientLighting(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const hour = new Date().getHours();
  let r: number, g: number, b: number, a: number;

  if (hour >= 6 && hour < 18) {
    // Daytime: warm yellow
    r = 255; g = 220; b = 150; a = 0.04;
  } else if (hour >= 18 && hour < 21) {
    // Evening: orange
    r = 255; g = 150; b = 80; a = 0.08;
  } else {
    // Night: cool blue
    r = 50; g = 80; b = 180; a = 0.08;
  }

  ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
  ctx.fillRect(0, 0, width, height);
}
