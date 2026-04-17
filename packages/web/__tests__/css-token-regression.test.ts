/**
 * css-token-regression.test.ts
 *
 * Regression guards for CSS token consistency and z-index layering rules.
 * These tests read source files directly — they act as lint-level guardrails
 * ensuring hardcoded values never creep back in.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcDir = join(__dirname, '..', 'src');

// ─── Issue 1: App chrome must sit above shell overlays ────────────────────────

describe('app-chrome z-index layering', () => {
  const css = readFileSync(join(srcDir, 'index.css'), 'utf8');

  it('.shell-overlay-backdrop declares z-index: 50', () => {
    // Extract the .shell-overlay-backdrop rule block
    const match = css.match(/\.shell-overlay-backdrop\s*\{([^}]+)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toContain('z-index: 50');
  });

  it('.app-chrome has an explicit z-index higher than the overlay backdrop (50)', () => {
    // Extract .app-chrome rule block (not sub-classes)
    const match = css.match(/\.app-chrome\s*\{([^}]+)\}/);
    expect(match).not.toBeNull();
    const block = match![1];
    const zMatch = block.match(/z-index\s*:\s*(\d+)/);
    expect(zMatch).not.toBeNull();
    expect(parseInt(zMatch![1], 10)).toBeGreaterThan(50);
  });

  it('.app-chrome is positioned (sticky or relative/absolute/fixed) so z-index takes effect', () => {
    const match = css.match(/\.app-chrome\s*\{([^}]+)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/position\s*:/);
  });
});

// ─── Issue 2: No hardcoded colour literals in MeetingOverlay ─────────────────

describe('MeetingOverlay token hygiene', () => {
  const overlay = readFileSync(
    join(srcDir, 'components', 'MeetingOverlay.tsx'),
    'utf8',
  );

  it('does not contain the hardcoded hex #0f172a', () => {
    expect(overlay).not.toContain('#0f172a');
  });

  it('uses var(--warn-text) for text on warn-coloured backgrounds', () => {
    expect(overlay).toContain('var(--warn-text)');
  });
});

// ─── Issue 2b: --warn-text token is defined in the CSS ───────────────────────

describe('--warn-text token exists in index.css', () => {
  const css = readFileSync(join(srcDir, 'index.css'), 'utf8');

  it('defines --warn-text in :root', () => {
    // Matches '--warn-text: ...' inside the :root block
    expect(css).toMatch(/--warn-text\s*:/);
  });
});

// ─── Issue 3: lab-overlay-panel modifiers are fully defined ──────────────────

describe('lab-overlay-panel modifier completeness', () => {
  const css = readFileSync(join(srcDir, 'index.css'), 'utf8');

  it('defines .lab-overlay-panel--wide (used in KanbanOverlay)', () => {
    expect(css).toMatch(/\.lab-overlay-panel--wide\s*\{/);
  });

  it('defines .lab-overlay-panel--meeting (used in MeetingOverlay)', () => {
    expect(css).toMatch(/\.lab-overlay-panel--meeting\s*\{/);
  });
});

// ─── Issue 4: Overlay components must not carry dead shell-overlay-backdrop ──

describe('overlay backdrop class contract', () => {
  const kanbanSrc = readFileSync(join(srcDir, 'components', 'KanbanOverlay.tsx'), 'utf8');
  const meetingSrc = readFileSync(join(srcDir, 'components', 'MeetingOverlay.tsx'), 'utf8');

  it('KanbanOverlay uses lab-overlay-backdrop (scoped, not shell-overlay-backdrop)', () => {
    expect(kanbanSrc).toContain('lab-overlay-backdrop');
    expect(kanbanSrc).not.toContain('shell-overlay-backdrop');
  });

  it('MeetingOverlay uses lab-overlay-backdrop (scoped, not shell-overlay-backdrop)', () => {
    expect(meetingSrc).toContain('lab-overlay-backdrop');
    expect(meetingSrc).not.toContain('shell-overlay-backdrop');
  });
});

// ─── Issue 5: image-rendering: pixelated belongs only on .lab-canvas ─────────

describe('image-rendering scope', () => {
  const css = readFileSync(join(srcDir, 'index.css'), 'utf8');

  it('.lab-canvas rule includes image-rendering: pixelated', () => {
    const match = css.match(/\.lab-canvas\s*\{([^}]+)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toContain('image-rendering: pixelated');
  });

  it('.lab-view rule does NOT include image-rendering: pixelated', () => {
    // Extract only the .lab-view blocks (not .lab-canvas)
    const labViewMatches = [...css.matchAll(/\.lab-view\s*\{([^}]+)\}/g)];
    expect(labViewMatches.length).toBeGreaterThan(0);
    for (const m of labViewMatches) {
      expect(m[1]).not.toContain('image-rendering');
    }
  });

  it('.lab-view has no duplicate top-level rule block (responsive @media overrides are allowed)', () => {
    // Strip @media blocks to find only top-level rules
    const withoutMedia = css.replace(/@media[^{]*\{[\s\S]*?\n\}/g, '');
    const topLevelLabViews = [...withoutMedia.matchAll(/\.lab-view\s*\{/g)];
    expect(topLevelLabViews.length).toBe(1);
  });
});
