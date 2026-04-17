/**
 * lab-canvas-class.test.ts
 *
 * Regression test: verifies that the LabCanvas component applies the
 * `.lab-canvas` CSS class to the actual <canvas> element so that the
 * pixel-art rendering rules in index.css take effect.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const src = readFileSync(join(__dirname, '../src/components/LabCanvas.tsx'), 'utf8');

describe('LabCanvas — .lab-canvas class wiring', () => {
  it('the <canvas> element className includes "lab-canvas"', () => {
    // Match the canvas JSX element's className attribute
    const canvasJSX = src.match(/<canvas[\s\S]*?\/>/);
    expect(canvasJSX, 'could not find <canvas ... /> in LabCanvas.tsx').not.toBeNull();
    expect(
      canvasJSX![0],
      '<canvas> className must include "lab-canvas" to activate pixel-art CSS rules',
    ).toMatch(/lab-canvas/);
  });

  it('the .lab-canvas CSS rule exists in index.css', () => {
    const css = readFileSync(join(__dirname, '../src/index.css'), 'utf8');
    expect(css).toMatch(/\.lab-canvas\s*\{/);
  });
});
