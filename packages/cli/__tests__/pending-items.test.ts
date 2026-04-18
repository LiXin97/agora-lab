import { describe, expect, it, vi } from 'vitest';

vi.mock('@agora-lab/core', async () => import('../../core/src/index.ts'));

import { buildPendingAgentPrompt } from '../src/automation/pending-items.js';
import type { AgentMessage, KanbanTask } from '@agora-lab/core';

const BASE_TASK: KanbanTask = {
  id: '001',
  title: 'Run baseline',
  priority: 'P1',
  status: 'assigned',
  assignee: 'student-a',
  createdAt: '2026-04-17T00:00:00Z',
  updatedAt: '2026-04-17T00:00:00Z',
};

const BASE_MSG: AgentMessage = {
  from: 'agora',
  to: 'student-a',
  type: 'status',
  timestamp: '2026-04-17T00:00:00Z',
  status: 'unread',
  content: 'Hello',
};

describe('buildPendingAgentPrompt', () => {
  it('emits a supervisor kickoff prompt exactly once when no kickoff has been recorded', async () => {
    const result = await buildPendingAgentPrompt({
      agentName: 'supervisor',
      unreadMessages: [],
      assignedTasks: [],
      runtimeState: { version: 2 },
      meeting: null,
    });
    expect(result?.prompt).toContain('You are the supervisor. Start the first planning cycle now.');
    expect(result?.signature).toContain('kickoff');
  });

  it('summarizes unread messages and assigned tasks for a student', async () => {
    const result = await buildPendingAgentPrompt({
      agentName: 'student-a',
      unreadMessages: [{ from: 'agora', to: 'student-a', type: 'status', timestamp: '2026-04-17T00:00:00Z', status: 'unread', content: 'Task #001 has been assigned to you.' }],
      assignedTasks: [{ id: '001', title: 'Run baseline', priority: 'P1', status: 'assigned', assignee: 'student-a', createdAt: '2026-04-17T00:00:00Z', updatedAt: '2026-04-17T00:00:00Z' }],
      runtimeState: { version: 2, supervisorKickoffSentAt: '2026-04-17T00:00:00Z' },
      meeting: null,
    });
    expect(result?.prompt).toContain('Unread messages: 1');
    expect(result?.prompt).toContain('Task #001');
  });

  it('returns null when student has no unread, no tasks, no meeting', async () => {
    const result = await buildPendingAgentPrompt({
      agentName: 'student-a',
      unreadMessages: [],
      assignedTasks: [],
      runtimeState: { version: 2, supervisorKickoffSentAt: '2026-04-17T00:00:00Z' },
      meeting: null,
    });
    expect(result).toBeNull();
  });

  it('suppresses kickoff after supervisorKickoffSentAt is set and returns null when nothing else pending', async () => {
    const result = await buildPendingAgentPrompt({
      agentName: 'supervisor',
      unreadMessages: [],
      assignedTasks: [],
      runtimeState: { version: 2, supervisorKickoffSentAt: '2026-04-17T00:00:00Z' },
      meeting: null,
    });
    expect(result).toBeNull();
  });

  it('still emits kickoff when supervisor has other work but kickoff not yet sent', async () => {
    const result = await buildPendingAgentPrompt({
      agentName: 'supervisor',
      unreadMessages: [{ ...BASE_MSG, to: 'supervisor' }],
      assignedTasks: [{ ...BASE_TASK, assignee: 'supervisor' }],
      runtimeState: { version: 2 },
      meeting: null,
    });
    expect(result?.signature).toContain('kickoff');
    expect(result?.marksKickoffSent).toBe(true);
  });

  it('meeting-only wakeup mentions the meeting id in the prompt', async () => {
    const result = await buildPendingAgentPrompt({
      agentName: 'student-a',
      unreadMessages: [],
      assignedTasks: [],
      runtimeState: { version: 2, supervisorKickoffSentAt: '2026-04-17T00:00:00Z' },
      meeting: {
        id: 'mtg-42',
        phase: 'PREPARE',
        participants: ['student-a'],
        decisionMaker: 'supervisor',
        artifacts: { perspectives: {}, judgments: {}, critiques: {}, responses: {} },
        createdAt: '2026-04-17T00:00:00Z',
      },
    });
    expect(result).not.toBeNull();
    expect(result?.prompt).toContain('Active meeting: mtg-42');
  });

  it('produces distinct signatures when meeting phase changes (re-injects on advance)', async () => {
    const base = {
      agentName: 'student-a' as const,
      unreadMessages: [],
      assignedTasks: [],
      runtimeState: { version: 2 as const, supervisorKickoffSentAt: '2026-04-17T00:00:00Z' },
    };
    const prepare = await buildPendingAgentPrompt({
      ...base,
      meeting: {
        id: 'mtg-42',
        phase: 'PREPARE',
        participants: ['student-a'],
        decisionMaker: 'supervisor',
        artifacts: { perspectives: {}, judgments: {}, critiques: {}, responses: {} },
        createdAt: '2026-04-17T00:00:00Z',
      },
    });
    const challenge = await buildPendingAgentPrompt({
      ...base,
      meeting: {
        id: 'mtg-42',
        phase: 'CHALLENGE',
        participants: ['student-a'],
        decisionMaker: 'supervisor',
        artifacts: { perspectives: {}, judgments: {}, critiques: {}, responses: {} },
        createdAt: '2026-04-17T00:00:00Z',
      },
    });
    expect(prepare?.signature).not.toBe(challenge?.signature);
  });

  it('produces identical signatures for identical inputs supplied in different order', async () => {
    const msg1: AgentMessage = { ...BASE_MSG, timestamp: '2026-04-17T01:00:00Z', content: 'first' };
    const msg2: AgentMessage = { ...BASE_MSG, timestamp: '2026-04-17T02:00:00Z', content: 'second' };
    const task1: KanbanTask = { ...BASE_TASK, id: '001' };
    const task2: KanbanTask = { ...BASE_TASK, id: '002' };

    const base = {
      agentName: 'student-a' as const,
      runtimeState: { version: 2 as const, supervisorKickoffSentAt: '2026-04-17T00:00:00Z' },
      meeting: null,
    };

    const result1 = await buildPendingAgentPrompt({
      ...base,
      unreadMessages: [msg1, msg2],
      assignedTasks: [task1, task2],
    });
    const result2 = await buildPendingAgentPrompt({
      ...base,
      unreadMessages: [msg2, msg1],
      assignedTasks: [task2, task1],
    });
    expect(result1?.signature).toBe(result2?.signature);
  });

  it('filters messages not addressed to this agent or not status=unread', async () => {
    const result = await buildPendingAgentPrompt({
      agentName: 'student-a',
      unreadMessages: [
        { ...BASE_MSG, to: 'student-b' },
        { ...BASE_MSG, to: 'student-a', status: 'read' },
        { ...BASE_MSG, to: 'student-a', status: 'unread', timestamp: '2026-04-17T03:00:00Z' },
      ],
      assignedTasks: [],
      runtimeState: { version: 2, supervisorKickoffSentAt: '2026-04-17T00:00:00Z' },
      meeting: null,
    });
    expect(result?.prompt).toContain('Unread messages: 1');
  });
});
