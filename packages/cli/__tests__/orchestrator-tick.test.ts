import { describe, expect, it } from 'vitest';

import {
  buildOrchestratorSummary,
  formatDuration,
  renderOrchestratorPrompt,
} from '../src/automation/orchestrator-tick.js';
import type { KanbanBoard, KanbanTask, Meeting } from '@agora-lab/core';

const NOW = Date.parse('2026-04-18T12:00:00Z');

function task(over: Partial<KanbanTask>): KanbanTask {
  return {
    id: '001',
    title: 't',
    priority: 'P1',
    status: 'todo',
    createdAt: '2026-04-18T00:00:00Z',
    updatedAt: '2026-04-18T00:00:00Z',
    ...over,
  };
}

function board(tasks: KanbanTask[]): KanbanBoard {
  return { tasks };
}

describe('buildOrchestratorSummary', () => {
  it('counts tasks per status', () => {
    const s = buildOrchestratorSummary({
      board: board([
        task({ id: '1', status: 'todo' }),
        task({ id: '2', status: 'assigned' }),
        task({ id: '3', status: 'in_progress', updatedAt: new Date(NOW).toISOString() }),
        task({ id: '4', status: 'review', updatedAt: new Date(NOW).toISOString() }),
        task({ id: '5', status: 'done' }),
      ]),
      meeting: null,
      messages: [],
      nowMs: NOW,
    });
    expect(s.todoCount).toBe(1);
    expect(s.assignedCount).toBe(1);
    expect(s.inProgressCount).toBe(1);
    expect(s.reviewCount).toBe(1);
    expect(s.doneCount).toBe(1);
  });

  it('flags in_progress tasks older than stuckTaskMs', () => {
    const old = new Date(NOW - 3 * 60 * 60 * 1000).toISOString();
    const s = buildOrchestratorSummary({
      board: board([task({ id: '7', status: 'in_progress', assignee: 'a', updatedAt: old })]),
      meeting: null,
      messages: [],
      nowMs: NOW,
    });
    expect(s.stuckTasks).toHaveLength(1);
    expect(s.stuckTasks[0].id).toBe('7');
    expect(s.hasSignal).toBe(true);
  });

  it('does not flag review-empty when no in_progress tasks exist', () => {
    const s = buildOrchestratorSummary({
      board: board([task({ id: '1', status: 'todo' })]),
      meeting: null,
      messages: [],
      nowMs: NOW,
    });
    expect(s.reviewColumnEmptyForMs).toBeNull();
    expect(s.hasSignal).toBe(false);
  });

  it('flags review-empty when in_progress > 0 and review = 0', () => {
    const s = buildOrchestratorSummary({
      board: board([
        task({ id: '1', status: 'in_progress', updatedAt: new Date(NOW - 60_000).toISOString() }),
      ]),
      meeting: null,
      messages: [],
      nowMs: NOW,
    });
    expect(s.reviewColumnEmptyForMs).toBe(60_000);
    expect(s.hasSignal).toBe(true);
  });

  it('flags meeting stalled past stalledMeetingMs', () => {
    const meeting: Meeting = {
      id: 'm1',
      topic: 't',
      phase: 'CHALLENGE',
      participants: [],
      createdAt: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(),
    } as Meeting;
    const s = buildOrchestratorSummary({
      board: board([]),
      meeting,
      messages: [],
      nowMs: NOW,
      stalledMeetingMs: 60 * 60 * 1000,
    });
    expect(s.meetingPhaseAgeMs).toBe(2 * 60 * 60 * 1000);
    expect(s.hasSignal).toBe(true);
  });

  it('detects blocking chain via #ID string match', () => {
    const s = buildOrchestratorSummary({
      board: board([
        task({ id: '10', status: 'in_progress', assignee: 'student-a', body: 'depends on #11', updatedAt: new Date(NOW).toISOString() } as Partial<KanbanTask>),
        task({ id: '11', status: 'in_progress', assignee: 'student-b', updatedAt: new Date(NOW).toISOString() }),
      ]),
      meeting: null,
      messages: [],
      nowMs: NOW,
    });
    expect(s.blockingChain).toContain('student-a@#10 → #11');
  });

  it('returns null msSince* when no tasks/messages exist', () => {
    const s = buildOrchestratorSummary({
      board: board([]),
      meeting: null,
      messages: [],
      nowMs: NOW,
    });
    expect(s.msSinceLastTaskUpdate).toBeNull();
    expect(s.msSinceLastMessage).toBeNull();
    expect(s.hasSignal).toBe(false);
  });
});

describe('renderOrchestratorPrompt', () => {
  it('includes counts and action policy', () => {
    const s = buildOrchestratorSummary({
      board: board([
        task({ id: '1', status: 'in_progress', updatedAt: new Date(NOW - 60_000).toISOString() }),
      ]),
      meeting: null,
      messages: [],
      nowMs: NOW,
    });
    const text = renderOrchestratorPrompt(s);
    expect(text).toContain('supervisor');
    expect(text).toContain('Kanban: todo=0');
    expect(text).toContain('Action policy');
    expect(text).toContain('Do not reply to this tick');
  });
});

describe('formatDuration', () => {
  it('formats seconds, minutes, and hours+minutes', () => {
    expect(formatDuration(45_000)).toBe('45s');
    expect(formatDuration(5 * 60_000)).toBe('5m');
    expect(formatDuration(2 * 3600_000)).toBe('2h');
    expect(formatDuration(2 * 3600_000 + 15 * 60_000)).toBe('2h15m');
  });
});
