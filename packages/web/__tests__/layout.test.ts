import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createLabLayout, getDeskPositions, getMeetingPositions } from '../src/engine/layout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const labViewSrc = readFileSync(join(__dirname, '../src/views/LabView.tsx'), 'utf8');
const toolbarSrc = readFileSync(join(__dirname, '../src/components/BottomToolbar.tsx'), 'utf8');
const sidebarSrc = readFileSync(join(__dirname, '../src/components/AgentSidebar.tsx'), 'utf8');
const kanbanSrc = readFileSync(join(__dirname, '../src/components/KanbanOverlay.tsx'), 'utf8');
const meetingSrc = readFileSync(join(__dirname, '../src/components/MeetingOverlay.tsx'), 'utf8');
const css = readFileSync(join(__dirname, '../src/index.css'), 'utf8');

describe('createLabLayout', () => {
  it('creates grid with correct dimensions (no agents)', () => {
    const layout = createLabLayout();
    // No reviewers → just lab building + small border
    expect(layout.cols).toBeGreaterThanOrEqual(17);
    expect(layout.rows).toBeGreaterThanOrEqual(18);
    expect(layout.grid.length).toBe(layout.rows);
    expect(layout.grid[0].length).toBe(layout.cols);
  });

  it('creates desk positions for agents', () => {
    const agents = [
      { role: 'supervisor', name: 'prof' },
      { role: 'student', name: 'alice' },
      { role: 'student', name: 'bob' },
      { role: 'paper-reviewer', name: 'rev1' },
    ];
    const layout = createLabLayout(agents);
    expect(layout.deskPositions.length).toBe(4);
    const names = layout.deskPositions.map(d => d.name);
    expect(names).toContain('prof');
    expect(names).toContain('alice');
    expect(names).toContain('rev1');
  });

  it('has walls on borders', () => {
    const layout = createLabLayout();
    expect(layout.grid[0][0].type).toBe('wall');
    expect(layout.grid[0][12].type).toBe('wall');
  });

  it('has furniture', () => {
    const layout = createLabLayout();
    expect(layout.furniture.length).toBeGreaterThan(0);
  });

  it('has interactive whiteboard and meeting table', () => {
    const layout = createLabLayout();
    const whiteboard = layout.furniture.find(f => f.interactive === 'kanban');
    const meeting = layout.furniture.find(f => f.interactive === 'meeting');
    expect(whiteboard).toBeDefined();
    expect(meeting).toBeDefined();
  });

  it('scales workspace with agent count', () => {
    const small = createLabLayout([{ role: 'student', name: 's1' }]);
    const large = createLabLayout(
      Array.from({ length: 10 }, (_, i) => ({ role: 'student', name: `s${i}` }))
    );
    expect(large.rows).toBeGreaterThanOrEqual(small.rows);
  });
});

describe('getDeskPositions', () => {
  it('returns desk positions by role', () => {
    const desks = getDeskPositions();
    expect(desks.supervisor).toBeDefined();
    expect(desks.students.length).toBeGreaterThanOrEqual(3);
    expect(desks.staff.length).toBeGreaterThanOrEqual(1);
    expect(desks.reviewers.length).toBeGreaterThanOrEqual(1);
  });
});

describe('getMeetingPositions', () => {
  it('returns positions around round table', () => {
    const positions = getMeetingPositions();
    expect(positions.length).toBeGreaterThanOrEqual(4);
  });
});

describe('low-motion lab layout wiring', () => {
  it('LabView uses stage layout wrappers for toolbar and sidebar placement', () => {
    expect(labViewSrc).toMatch(/lab-layout/);
    expect(labViewSrc).toMatch(/lab-stage__surface/);
    expect(labViewSrc).toMatch(/lab-stage__toolbar/);
  });

  it('LabView memoizes layout generation against roster-only changes', () => {
    expect(labViewSrc).toMatch(/const rosterSignature = useMemo/);
    expect(labViewSrc).toMatch(/const layout = useMemo<LabLayout>/);
  });

  it('toolbar, sidebar, and overlays use scoped lab layout classes instead of fixed positioning', () => {
    expect(toolbarSrc).toMatch(/lab-toolbar/);
    expect(toolbarSrc).not.toMatch(/fixed bottom-0 left-0 right-0/);
    expect(sidebarSrc).toMatch(/lab-sidebar/);
    expect(sidebarSrc).not.toMatch(/fixed right-0/);
    expect(kanbanSrc).toMatch(/lab-overlay-backdrop/);
    expect(meetingSrc).toMatch(/lab-overlay-backdrop/);
  });

  it('index.css defines responsive lab layout and reduced-motion safeguards', () => {
    expect(css).toMatch(/\.lab-layout--with-sidebar/);
    expect(css).toMatch(/\.lab-overlay-backdrop\s*\{/);
    expect(css).toMatch(/@media \(max-width: 1200px\)[\s\S]*\.lab-layout--with-sidebar/);
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
  });
});
