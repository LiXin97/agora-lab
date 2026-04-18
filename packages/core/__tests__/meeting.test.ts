import { describe, it, expect } from 'vitest';
import { createMeeting, canAdvance, advancePhase, getMeetingPhaseIndex } from '../src/meeting.js';

describe('meeting', () => {
  it('creates a meeting', () => {
    const m = createMeeting({ participants: ['a', 'b', 'c'], decisionMaker: 'a' });
    expect(m.id).toMatch(/^mtg-/);
    expect(m.phase).toBe('PREPARE');
    expect(m.participants).toEqual(['a', 'b', 'c']);
  });

  it('getMeetingPhaseIndex returns correct index', () => {
    expect(getMeetingPhaseIndex('PREPARE')).toBe(0);
    expect(getMeetingPhaseIndex('DECISION')).toBe(4);
  });

  it('canAdvance returns false when prerequisites not met', () => {
    const m = createMeeting({ participants: ['a', 'b'], decisionMaker: 'a' });
    expect(canAdvance(m)).toBe(false);
  });

  it('canAdvance returns true when prerequisites met', () => {
    const m = createMeeting({ participants: ['a', 'b'], decisionMaker: 'a' });
    m.artifacts.perspectives = { a: 'x', b: 'y' };
    expect(canAdvance(m)).toBe(true);
  });

  it('advancePhase throws when cannot advance', () => {
    const m = createMeeting({ participants: ['a', 'b'], decisionMaker: 'a' });
    expect(() => advancePhase(m)).toThrow('Cannot advance');
  });

  it('full lifecycle', () => {
    let m = createMeeting({ participants: ['a', 'b', 'c'], decisionMaker: 'a' });

    // PREPARE -> CROSS_READ
    m.artifacts.perspectives = { a: 'pa', b: 'pb', c: 'pc' };
    m = advancePhase(m);
    expect(m.phase).toBe('CROSS_READ');

    // CROSS_READ -> CHALLENGE (no artifact gate; supervisor's call once perspectives read)
    m = advancePhase(m);
    expect(m.phase).toBe('CHALLENGE');

    // CHALLENGE -> RESPOND requires ≥ N-1 critiques (here: 2)
    m.artifacts.critiques = { b_on_a: 'x' };
    expect(canAdvance(m)).toBe(false);
    m.artifacts.critiques = { b_on_a: 'x', c_on_a: 'y' };
    m = advancePhase(m);
    expect(m.phase).toBe('RESPOND');

    // RESPOND -> DECISION (non-DM participants: b, c)
    m.artifacts.responses = { b: 'rb', c: 'rc' };
    m = advancePhase(m);
    expect(m.phase).toBe('DECISION');

    // DECISION is terminal
    expect(canAdvance(m)).toBe(false);
    expect(() => advancePhase(m)).toThrow('Cannot advance');
  });

  it('CROSS_READ advances without judgment artifacts (judgments are out-of-band)', () => {
    let m = createMeeting({ participants: ['a', 'b'], decisionMaker: 'a' });
    m.artifacts.perspectives = { a: 'pa', b: 'pb' };
    m = advancePhase(m);
    expect(m.phase).toBe('CROSS_READ');
    expect(canAdvance(m)).toBe(true); // no judgment dependency
  });
});
