import { describe, it, expect } from 'vitest';
import { syncCharactersToAgents } from '../src/engine/characterSync.js';
import { createCharacter, setCharacterState } from '../src/engine/characters.js';
import { createLabLayout } from '../src/engine/layout.js';

/** Use 'student' role so alice receives a desk slot in the layout. */
const layout = createLabLayout([{ role: 'student', name: 'alice' }]);

function meetingCharacter(name: string): ReturnType<typeof createCharacter> & { deskX?: number; deskY?: number } {
  const ch = createCharacter(name, name, 'student', 0, 2, 2);
  return setCharacterState(ch, 'meeting') as typeof ch;
}

// ---------------------------------------------------------------------------
// Desk-coordinate refresh on exit / desk-return paths
// ---------------------------------------------------------------------------

/**
 * Build a layout with a different desk position than the character's stored
 * deskX/deskY.  The synced result must carry the refreshed coordinates.
 */
function layoutWithDesk(name: string, chairX: number, chairY: number): ReturnType<typeof createLabLayout> {
  const base = createLabLayout([{ role: 'student', name }]);
  // Override the first (and only) desk position so we control exact coords.
  const desk = base.deskPositions.find(d => d.name === name)!;
  desk.chairX = chairX;
  desk.chairY = chairY;
  return base;
}

describe('syncCharactersToAgents – desk coord refresh on exit / desk-return', () => {
  it('refreshes deskX/deskY on the returned character when exiting meeting via working', () => {
    const ch = meetingCharacter('alice');
    // Give the character stale desk coords (99, 99)
    const stale = { ...ch, deskX: 99, deskY: 99 };
    const freshLayout = layoutWithDesk('alice', 3, 4);
    const result = syncCharactersToAgents(
      [stale],
      [{ name: 'alice', role: 'student', status: 'working' }],
      freshLayout,
    );
    const freshDesk = freshLayout.deskPositions.find(d => d.name === 'alice')!;
    expect(result[0].deskX).toBe(freshDesk.chairX);
    expect(result[0].deskY).toBe(freshDesk.chairY);
  });

  it('refreshes deskX/deskY on the returned character when exiting meeting via review', () => {
    const ch = meetingCharacter('alice');
    const stale = { ...ch, deskX: 99, deskY: 99 };
    const freshLayout = layoutWithDesk('alice', 3, 4);
    const result = syncCharactersToAgents(
      [stale],
      [{ name: 'alice', role: 'student', status: 'review' }],
      freshLayout,
    );
    const freshDesk = freshLayout.deskPositions.find(d => d.name === 'alice')!;
    expect(result[0].deskX).toBe(freshDesk.chairX);
    expect(result[0].deskY).toBe(freshDesk.chairY);
  });

  it('refreshes deskX/deskY on the returned character when exiting meeting via ready', () => {
    const ch = meetingCharacter('alice');
    const stale = { ...ch, deskX: 99, deskY: 99 };
    const freshLayout = layoutWithDesk('alice', 3, 4);
    const result = syncCharactersToAgents(
      [stale],
      [{ name: 'alice', role: 'student', status: 'ready' }],
      freshLayout,
    );
    const freshDesk = freshLayout.deskPositions.find(d => d.name === 'alice')!;
    expect(result[0].deskX).toBe(freshDesk.chairX);
    expect(result[0].deskY).toBe(freshDesk.chairY);
  });

  it('refreshes deskX/deskY on the returned character when exiting meeting via assigned', () => {
    const ch = meetingCharacter('alice');
    const stale = { ...ch, deskX: 99, deskY: 99 };
    const freshLayout = layoutWithDesk('alice', 3, 4);
    const result = syncCharactersToAgents(
      [stale],
      [{ name: 'alice', role: 'student', status: 'assigned' }],
      freshLayout,
    );
    const freshDesk = freshLayout.deskPositions.find(d => d.name === 'alice')!;
    expect(result[0].deskX).toBe(freshDesk.chairX);
    expect(result[0].deskY).toBe(freshDesk.chairY);
  });
});

describe('syncCharactersToAgents – meeting exit', () => {
  it('transitions character out of meeting to walk when status becomes "working"', () => {
    const ch = meetingCharacter('alice');
    const result = syncCharactersToAgents([ch], [{ name: 'alice', role: 'student', status: 'working' }], layout);
    expect(result[0].state).not.toBe('meeting');
  });

  it('transitions character out of meeting to walk when status becomes "review"', () => {
    const ch = meetingCharacter('alice');
    const result = syncCharactersToAgents([ch], [{ name: 'alice', role: 'student', status: 'review' }], layout);
    expect(result[0].state).not.toBe('meeting');
  });

  it('transitions character out of meeting to walk when status becomes "ready"', () => {
    const ch = meetingCharacter('alice');
    const result = syncCharactersToAgents([ch], [{ name: 'alice', role: 'student', status: 'ready' }], layout);
    expect(result[0].state).not.toBe('meeting');
  });

  it('transitions character out of meeting to walk when status becomes "assigned"', () => {
    const ch = meetingCharacter('alice');
    const result = syncCharactersToAgents([ch], [{ name: 'alice', role: 'student', status: 'assigned' }], layout);
    expect(result[0].state).not.toBe('meeting');
  });

  it('keeps character in meeting state while status remains "meeting"', () => {
    const ch = meetingCharacter('alice');
    const result = syncCharactersToAgents([ch], [{ name: 'alice', role: 'student', status: 'meeting' }], layout);
    // Already in meeting; no re-trigger so character should stay put (return ch)
    expect(result[0].state).toBe('meeting');
  });

  it('transitions character out of meeting to idle when status becomes "offline"', () => {
    const ch = meetingCharacter('alice');
    const result = syncCharactersToAgents([ch], [{ name: 'alice', role: 'student', status: 'offline' }], layout);
    expect(result[0].state).toBe('idle');
  });
});
