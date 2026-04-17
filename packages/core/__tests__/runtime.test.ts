import { describe, it, expect, vi } from 'vitest';
import { parseKanbanBoard, serializeKanbanBoard, addTask } from '../src/kanban.js';
import {
  parseRuntimeState,
  serializeRuntimeState,
  buildStarterTasks,
  seedStarterTasks,
  collectAgentFacts,
  deriveAgentStatus,
} from '../src/runtime.js';
import { buildAgoraSessionName, buildAgentSessionName } from '../src/session.js';
import type { RuntimeState } from '../src/types.js';

describe('runtime', () => {
  it('parses legacy Backlog header as todo', () => {
    const board = parseKanbanBoard(
      '# Research Task Board\n\n## Backlog\n- [P1] #001 Some task <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:00:00Z -->\n\n## In Progress\n\n## Review\n\n## Done\n',
    );
    expect(board.tasks[0].status).toBe('todo');
  });

  it('serializes Assigned section header', () => {
    const board = addTask({ tasks: [] }, { title: 'Dispatch me', priority: 'P1', assignee: 'alice' });
    expect(board.tasks[0].status).toBe('assigned');
    const md = serializeKanbanBoard(board);
    expect(md).toContain('## Assigned');
  });

  it('seeds starter tasks only once', () => {
    const state: RuntimeState = { version: 1 };
    const result = seedStarterTasks({ tasks: [] }, state, 'quantum ML', '2026-01-01T00:00:00Z');
    expect(result.state.starterSeededAt).toBe('2026-01-01T00:00:00Z');
    expect(result.board.tasks.length).toBeGreaterThan(0);

    const count = result.board.tasks.length;
    const result2 = seedStarterTasks(result.board, result.state, 'quantum ML', '2026-01-01T00:00:00Z');
    expect(result2.board.tasks).toHaveLength(count);
  });

  it('derives agent status with correct precedence (meeting > review > working > assigned > ready > offline)', () => {
    expect(
      deriveAgentStatus({ hasSession: true, inMeeting: true, hasReviewTask: true, hasInProgressTask: true, hasAssignedTask: true }),
    ).toBe('meeting');
    expect(
      deriveAgentStatus({ hasSession: true, inMeeting: false, hasReviewTask: true, hasInProgressTask: true, hasAssignedTask: true }),
    ).toBe('review');
    expect(
      deriveAgentStatus({ hasSession: true, inMeeting: false, hasReviewTask: false, hasInProgressTask: true, hasAssignedTask: true }),
    ).toBe('working');
    expect(
      deriveAgentStatus({ hasSession: true, inMeeting: false, hasReviewTask: false, hasInProgressTask: false, hasAssignedTask: true }),
    ).toBe('assigned');
    expect(
      deriveAgentStatus({ hasSession: true, inMeeting: false, hasReviewTask: false, hasInProgressTask: false, hasAssignedTask: false }),
    ).toBe('ready');
    expect(
      deriveAgentStatus({ hasSession: false, inMeeting: false, hasReviewTask: false, hasInProgressTask: false, hasAssignedTask: false }),
    ).toBe('offline');
  });

  it('builds deterministic session names from lab path', () => {
    const sessionName = buildAgoraSessionName('/home/user/labs/my-lab');

    expect(sessionName).toMatch(/^agora-my-lab-[0-9a-f]{6}$/);
    expect(buildAgoraSessionName('/home/user/labs/my-lab/')).toBe(sessionName);
    expect(buildAgoraSessionName('my-lab')).toMatch(/^agora-my-lab-[0-9a-f]{6}$/);
  });

  it('keeps same-basename labs unique by hashing the full path', () => {
    expect(buildAgoraSessionName('/home/alice/my-lab')).not.toBe(buildAgoraSessionName('/home/bob/my-lab'));
  });

  it('builds agent session names with the shared agent suffix', () => {
    const sessionName = buildAgentSessionName('/home/user/labs/my-lab', 'Agent Name!');

    expect(sessionName).toMatch(/^agora-my-lab-[0-9a-f]{6}-agent-name-$/);
    expect(buildAgentSessionName('/home/user/labs/my-lab', 'AgentA')).toMatch(/^agora-my-lab-[0-9a-f]{6}-agenta$/);
  });

  it('serializes runtime state as pretty JSON', () => {
    const state: RuntimeState = { version: 1, starterSeededAt: '2026-01-01T00:00:00Z' };
    const json = serializeRuntimeState(state);
    expect(json).toBe(JSON.stringify(state, null, 2));
    expect(json).toContain('\n');
  });

  it('parses runtime state from JSON', () => {
    const raw = JSON.stringify({ version: 1, starterSeededAt: '2026-01-01T00:00:00Z' });
    const state = parseRuntimeState(raw);
    expect(state.version).toBe(1);
    expect(state.starterSeededAt).toBe('2026-01-01T00:00:00Z');
  });

  it('parseRuntimeState throws on invalid input', () => {
    expect(() => parseRuntimeState('{"version":"not-a-number"}')).toThrow();
    expect(() => parseRuntimeState('not json')).toThrow();
  });

  it('parses legacy runtime.json and upgrades missing automation fields', () => {
    const state = parseRuntimeState('{"version":1,"starterSeededAt":"2026-04-17T00:00:00Z"}');
    expect(state.supervisorKickoffSentAt).toBeUndefined();
    expect(state.agentAutomation).toEqual({});
    expect(state.starterSeededAt).toBe('2026-04-17T00:00:00Z');
    expect(state.version).toBe(1);
  });

  it('buildStarterTasks returns exactly 5 tasks', () => {
    const tasks = buildStarterTasks('agent coordination');
    expect(tasks).toHaveLength(5);
    for (const t of tasks) {
      expect(t).toHaveProperty('title');
      expect(t).toHaveProperty('priority');
    }
  });

  it('collects agent facts from board and meeting state', async () => {
    const board = parseKanbanBoard(`# Research Task Board

## Todo

## Assigned
- [P1] #001 Read papers (assignee: alice) <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:00:00Z -->

## In Progress
- [P1] #002 Run experiments (assignee: alice) <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:00:00Z -->

## Review
- [P1] #003 Draft writeup (assignee: alice) <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:00:00Z -->

## Done
`);

    const isSessionRunning = vi.fn().mockResolvedValue(true);

    await expect(
      collectAgentFacts('alice', board, {
        id: 'mtg-1',
        phase: 'PREPARE',
        participants: ['alice'],
        decisionMaker: 'alice',
        artifacts: { perspectives: {}, judgments: {}, critiques: {}, responses: {} },
        createdAt: '2026-01-01T00:00:00Z',
      }, isSessionRunning),
    ).resolves.toEqual({
      hasSession: true,
      inMeeting: true,
      hasReviewTask: true,
      hasInProgressTask: true,
      hasAssignedTask: true,
    });
    expect(isSessionRunning).toHaveBeenCalledOnce();
  });
});
