import { describe, it, expect } from 'vitest';
import {
  selectAgentSummaries,
  selectKanbanColumns,
  selectMeetingSummary,
  selectRecentMessages,
  selectDecisionLog,
  selectSystemHealth,
  pickCurrentTask,
} from '../src/hooks/useDashboardSelectors.js';
import {
  isActiveWorkStatus,
  agentStatusGroup,
  TASK_STATUS_ORDER,
  TASK_STATUS_LABEL,
  AGENT_STATUS_ORDER,
  pickCurrentTask as pickCurrentTaskFromMeta,
} from '../src/status-meta.js';
import type { LabState } from '../src/hooks/useLabState.js';
import type { KanbanTask, Meeting, AgentMessage, MeetingPhase } from '@agora-lab/core';

function makeState(overrides: Partial<LabState> = {}): LabState {
  return {
    config: null,
    agents: [],
    kanban: { tasks: [] },
    meeting: null,
    messages: [],
    selectedAgent: null,
    expandedPanel: null,
    ...overrides,
  };
}

function makeTask(overrides: Partial<KanbanTask> = {}): KanbanTask {
  return {
    id: '1',
    title: 'Test task',
    priority: 'P1',
    status: 'todo',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeMessage(overrides: Partial<AgentMessage> = {}): AgentMessage {
  return {
    from: 'alice',
    to: 'bob',
    type: 'status',
    timestamp: '2025-01-01T00:00:00Z',
    status: 'unread',
    content: 'Hello',
    ...overrides,
  };
}

describe('selectAgentSummaries', () => {
  it('returns empty array when no agents', () => {
    expect(selectAgentSummaries(makeState())).toEqual([]);
  });

  it('computes task counts per agent', () => {
    const state = makeState({
      agents: [
        { name: 'alice', role: 'supervisor', status: 'working' },
        { name: 'bob', role: 'student', status: 'offline' },
      ],
      kanban: {
        tasks: [
          makeTask({ id: '1', assignee: 'alice', status: 'in_progress' }),
          makeTask({ id: '2', assignee: 'alice', status: 'assigned' }),
          makeTask({ id: '3', assignee: 'bob', status: 'done' }),
        ],
      },
    });

    const summaries = selectAgentSummaries(state);
    expect(summaries).toHaveLength(2);

    const alice = summaries.find(s => s.name === 'alice')!;
    expect(alice.taskCount).toBe(2);
    expect(alice.assignedCount).toBe(1);
    expect(alice.inProgressCount).toBe(1);
    expect(alice.reviewCount).toBe(0);
    expect(alice.status).toBe('working');

    const bob = summaries.find(s => s.name === 'bob')!;
    expect(bob.taskCount).toBe(1);
    expect(bob.inProgressCount).toBe(0);
  });

  it('exposes currentTask following dispatch priority (review > in_progress > assigned)', () => {
    const state = makeState({
      agents: [{ name: 'alice', role: 'supervisor', status: 'review' }],
      kanban: {
        tasks: [
          makeTask({ id: '1', assignee: 'alice', status: 'todo' }),
          makeTask({ id: '2', assignee: 'alice', status: 'in_progress' }),
          makeTask({ id: '3', assignee: 'alice', status: 'review' }),
        ],
      },
    });
    const [alice] = selectAgentSummaries(state);
    expect(alice.currentTask?.id).toBe('3'); // review wins
    expect(alice.reviewCount).toBe(1);
  });

  it('returns currentTask = null when agent has no tasks', () => {
    const state = makeState({
      agents: [{ name: 'alice', role: 'supervisor', status: 'ready' }],
      kanban: { tasks: [] },
    });
    const [alice] = selectAgentSummaries(state);
    expect(alice.currentTask).toBeNull();
    expect(alice.taskCount).toBe(0);
  });

  it('picks in_progress over assigned when no review task', () => {
    const state = makeState({
      agents: [{ name: 'bob', role: 'student', status: 'working' }],
      kanban: {
        tasks: [
          makeTask({ id: '1', assignee: 'bob', status: 'assigned' }),
          makeTask({ id: '2', assignee: 'bob', status: 'in_progress' }),
        ],
      },
    });
    const [bob] = selectAgentSummaries(state);
    expect(bob.currentTask?.id).toBe('2');
  });

  it('returns currentTask = null when agent has only todo tasks', () => {
    const state = makeState({
      agents: [{ name: 'alice', role: 'supervisor', status: 'ready' }],
      kanban: {
        tasks: [
          makeTask({ id: '1', assignee: 'alice', status: 'todo' }),
        ],
      },
    });
    const [alice] = selectAgentSummaries(state);
    expect(alice.currentTask).toBeNull();
  });

  it('returns currentTask = null when agent has only done tasks', () => {
    const state = makeState({
      agents: [{ name: 'alice', role: 'supervisor', status: 'ready' }],
      kanban: {
        tasks: [
          makeTask({ id: '1', assignee: 'alice', status: 'done' }),
        ],
      },
    });
    const [alice] = selectAgentSummaries(state);
    expect(alice.currentTask).toBeNull();
  });

  it('returns currentTask = null when agent has both todo and done tasks but no active tasks', () => {
    const state = makeState({
      agents: [{ name: 'alice', role: 'supervisor', status: 'ready' }],
      kanban: {
        tasks: [
          makeTask({ id: '1', assignee: 'alice', status: 'todo' }),
          makeTask({ id: '2', assignee: 'alice', status: 'done' }),
        ],
      },
    });
    const [alice] = selectAgentSummaries(state);
    expect(alice.currentTask).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// pickCurrentTask (exported pure helper, also used by AgentSidebar)
// ---------------------------------------------------------------------------

describe('pickCurrentTask', () => {
  it('returns null for empty task list', () => {
    expect(pickCurrentTask([])).toBeNull();
  });

  it('returns null when all tasks are todo or done', () => {
    expect(pickCurrentTask([
      makeTask({ id: '1', status: 'todo' }),
      makeTask({ id: '2', status: 'done' }),
    ])).toBeNull();
  });

  it('prefers review over in_progress and assigned', () => {
    expect(pickCurrentTask([
      makeTask({ id: 'a', status: 'assigned' }),
      makeTask({ id: 'b', status: 'in_progress' }),
      makeTask({ id: 'c', status: 'review' }),
    ])?.id).toBe('c');
  });

  it('prefers in_progress over assigned', () => {
    expect(pickCurrentTask([
      makeTask({ id: 'a', status: 'assigned' }),
      makeTask({ id: 'b', status: 'in_progress' }),
    ])?.id).toBe('b');
  });

  it('returns assigned task when it is the only active task', () => {
    expect(pickCurrentTask([
      makeTask({ id: 'a', status: 'assigned' }),
      makeTask({ id: 'z', status: 'done' }),
    ])?.id).toBe('a');
  });

  it('ignores todo/done even when active tasks exist alongside them', () => {
    const result = pickCurrentTask([
      makeTask({ id: 't', status: 'todo' }),
      makeTask({ id: 'i', status: 'in_progress' }),
      makeTask({ id: 'd', status: 'done' }),
    ]);
    expect(result?.id).toBe('i');
  });

  it('prefers the most recently updated task within the same active status', () => {
    expect(pickCurrentTask([
      makeTask({ id: 'older', status: 'in_progress', updatedAt: '2026-01-01T00:01:00Z' }),
      makeTask({ id: 'newer', status: 'in_progress', updatedAt: '2026-01-01T00:02:00Z' }),
    ])?.id).toBe('newer');
  });
});

describe('selectKanbanColumns', () => {
  it('returns 5 columns in correct order', () => {
    const cols = selectKanbanColumns(makeState());
    expect(cols).toHaveLength(5);
    expect(cols.map(c => c.status)).toEqual(['todo', 'assigned', 'in_progress', 'review', 'done']);
  });

  it('partitions tasks into correct columns', () => {
    const state = makeState({
      kanban: {
        tasks: [
          makeTask({ id: '1', status: 'todo' }),
          makeTask({ id: '2', status: 'in_progress' }),
          makeTask({ id: '3', status: 'in_progress' }),
          makeTask({ id: '4', status: 'done' }),
        ],
      },
    });

    const cols = selectKanbanColumns(state);
    expect(cols[0].tasks).toHaveLength(1); // todo
    expect(cols[1].tasks).toHaveLength(0); // assigned
    expect(cols[2].tasks).toHaveLength(2); // in_progress
    expect(cols[3].tasks).toHaveLength(0); // review
    expect(cols[4].tasks).toHaveLength(1); // done
  });
});

describe('selectMeetingSummary', () => {
  it('returns null when no meeting', () => {
    expect(selectMeetingSummary(makeState())).toBeNull();
  });

  it('derives phase index correctly', () => {
    const meeting: Meeting = {
      id: 'm1',
      phase: 'CHALLENGE' as MeetingPhase,
      participants: ['alice', 'bob'],
      decisionMaker: 'alice',
      artifacts: { perspectives: {}, judgments: {}, critiques: {}, responses: {} },
      createdAt: '2025-01-01T00:00:00Z',
    };
    const summary = selectMeetingSummary(makeState({ meeting }));
    expect(summary).not.toBeNull();
    expect(summary!.phaseIndex).toBe(2); // CHALLENGE is index 2
    expect(summary!.totalPhases).toBe(5);
    expect(summary!.participants).toEqual(['alice', 'bob']);
  });
});

describe('selectRecentMessages', () => {
  it('returns last N messages', () => {
    const msgs = Array.from({ length: 30 }, (_, i) =>
      makeMessage({ content: `msg-${i}` }),
    );
    const recent = selectRecentMessages(makeState({ messages: msgs }), 10);
    expect(recent).toHaveLength(10);
    expect(recent[0].content).toBe('msg-20');
    expect(recent[9].content).toBe('msg-29');
  });

  it('returns all messages if fewer than limit', () => {
    const msgs = [makeMessage({ content: 'only one' })];
    const recent = selectRecentMessages(makeState({ messages: msgs }));
    expect(recent).toHaveLength(1);
  });
});

describe('selectDecisionLog', () => {
  it('filters only decision messages', () => {
    const state = makeState({
      messages: [
        makeMessage({ type: 'status', content: 'working' }),
        makeMessage({ type: 'decision', from: 'alice', content: 'Approved X' }),
        makeMessage({ type: 'question', content: 'Why?' }),
        makeMessage({ type: 'decision', from: 'bob', content: 'Rejected Y' }),
      ],
    });

    const log = selectDecisionLog(state);
    expect(log).toHaveLength(2);
    expect(log[0].from).toBe('alice');
    expect(log[1].content).toBe('Rejected Y');
  });
});

describe('selectSystemHealth', () => {
  it('counts only active-work statuses — excludes offline and ready', () => {
    const state = makeState({
      agents: [
        { name: 'a', role: 'supervisor', status: 'working' },
        { name: 'b', role: 'student', status: 'offline' },
        { name: 'c', role: 'student', status: 'meeting' },
        { name: 'd', role: 'student', status: 'ready' },    // idle — NOT active
        { name: 'e', role: 'student', status: 'assigned' },
        { name: 'f', role: 'student', status: 'review' },
      ],
      kanban: {
        tasks: [
          makeTask({ id: '1', status: 'done' }),
          makeTask({ id: '2', status: 'done' }),
          makeTask({ id: '3', status: 'in_progress' }),
          makeTask({ id: '4', status: 'assigned' }),
        ],
      },
    });

    const health = selectSystemHealth(state, true);
    expect(health.connected).toBe(true);
    expect(health.agentCount).toBe(6);
    // working(1) + meeting(1) + assigned(1) + review(1) = 4; offline and ready excluded
    expect(health.activeCount).toBe(4);
    // only the one 'ready' agent
    expect(health.readyCount).toBe(1);
    expect(health.taskTotal).toBe(4);
    expect(health.taskDone).toBe(2);
  });

  it('ready agents do NOT inflate activeCount', () => {
    const state = makeState({
      agents: [
        { name: 'x', role: 'student', status: 'ready' },
        { name: 'y', role: 'student', status: 'ready' },
      ],
      kanban: { tasks: [] },
    });
    const health = selectSystemHealth(state, true);
    expect(health.activeCount).toBe(0);
    expect(health.readyCount).toBe(2);
  });

  it('reflects disconnected state', () => {
    const health = selectSystemHealth(makeState(), false);
    expect(health.connected).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// status-meta helpers
// ---------------------------------------------------------------------------

describe('isActiveWorkStatus', () => {
  it('returns true for dispatch-pipeline statuses', () => {
    expect(isActiveWorkStatus('assigned')).toBe(true);
    expect(isActiveWorkStatus('working')).toBe(true);
    expect(isActiveWorkStatus('meeting')).toBe(true);
    expect(isActiveWorkStatus('review')).toBe(true);
  });

  it('returns false for offline and ready', () => {
    expect(isActiveWorkStatus('offline')).toBe(false);
    expect(isActiveWorkStatus('ready')).toBe(false);
  });
});

describe('agentStatusGroup', () => {
  it('groups offline agents as "offline"', () => {
    expect(agentStatusGroup('offline')).toBe('offline');
  });

  it('groups ready agents as "available"', () => {
    expect(agentStatusGroup('ready')).toBe('available');
  });

  it('groups dispatch-pipeline agents as "active"', () => {
    expect(agentStatusGroup('assigned')).toBe('active');
    expect(agentStatusGroup('working')).toBe('active');
    expect(agentStatusGroup('meeting')).toBe('active');
    expect(agentStatusGroup('review')).toBe('active');
  });
});

describe('TASK_STATUS_ORDER and labels', () => {
  it('has exactly 5 statuses in correct order', () => {
    expect(TASK_STATUS_ORDER).toEqual(['todo', 'assigned', 'in_progress', 'review', 'done']);
  });

  it('every status has a label', () => {
    for (const s of TASK_STATUS_ORDER) {
      expect(TASK_STATUS_LABEL[s]).toBeTruthy();
    }
  });
});

describe('AGENT_STATUS_ORDER', () => {
  it('has exactly 6 statuses including all guided-dispatch states', () => {
    expect(AGENT_STATUS_ORDER).toEqual(['offline', 'ready', 'assigned', 'working', 'meeting', 'review']);
  });
});

// ---------------------------------------------------------------------------
// pickCurrentTask availability from status-meta (pure utility, not hook layer)
// ---------------------------------------------------------------------------

describe('pickCurrentTask from status-meta', () => {
  it('is exported from status-meta.ts as a stable non-hook utility', () => {
    expect(typeof pickCurrentTaskFromMeta).toBe('function');
  });

  it('behaves identically to the selector-layer re-export', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'assigned' }),
      makeTask({ id: 'b', status: 'in_progress' }),
    ];
    expect(pickCurrentTaskFromMeta(tasks)?.id).toBe(pickCurrentTask(tasks)?.id);
  });
});
