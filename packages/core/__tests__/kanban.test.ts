import { describe, it, expect } from 'vitest';
import {
  parseKanbanBoard,
  serializeKanbanBoard,
  addTask,
  moveTask,
  assignTask,
  pickCurrentTask,
} from '../src/kanban.js';

const SAMPLE_BOARD = `# Research Task Board

## Backlog
- [P1] #001 Literature survey on attention (assignee: student-a) <!-- created:2026-04-10T10:00:00Z updated:2026-04-10T10:00:00Z -->

## In Progress

## Review

## Done
`;

describe('kanban', () => {
  it('parses a valid board (legacy Backlog maps to todo)', () => {
    const board = parseKanbanBoard(SAMPLE_BOARD);
    expect(board.tasks).toHaveLength(1);
    expect(board.tasks[0]).toMatchObject({
      id: '001',
      priority: 'P1',
      title: 'Literature survey on attention',
      assignee: 'student-a',
      status: 'todo',
    });
  });

  it('parses an empty board', () => {
    const board = parseKanbanBoard('# Research Task Board\n\n## Backlog\n\n## In Progress\n\n## Review\n\n## Done\n');
    expect(board.tasks).toHaveLength(0);
  });

  it('adds an unassigned task as todo', () => {
    const board = parseKanbanBoard(SAMPLE_BOARD);
    const updated = addTask(board, { title: 'New task', priority: 'P2' });
    expect(updated.tasks).toHaveLength(2);
    const added = updated.tasks[1];
    expect(added.id).toBe('002');
    expect(added.status).toBe('todo');
    expect(added.priority).toBe('P2');
  });

  it('adds a pre-assigned task as assigned', () => {
    const board = parseKanbanBoard(SAMPLE_BOARD);
    const updated = addTask(board, { title: 'New task', priority: 'P2', assignee: 'bob' });
    expect(updated.tasks).toHaveLength(2);
    const added = updated.tasks[1];
    expect(added.status).toBe('assigned');
    expect(added.assignee).toBe('bob');
  });

  it('moves a task', () => {
    const board = parseKanbanBoard(SAMPLE_BOARD);
    const updated = moveTask(board, '001', 'in_progress');
    expect(updated.tasks[0].status).toBe('in_progress');
  });

  it('moving a task back to todo clears any stale assignee', () => {
    const board = parseKanbanBoard(`# Research Task Board

## Todo

## Assigned
- [P1] #001 Re-scope task (assignee: student-a) <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:00:00Z -->

## In Progress

## Review

## Done
`);

    const updated = moveTask(board, '001', 'todo');

    expect(updated.tasks[0]).toMatchObject({
      id: '001',
      status: 'todo',
    });
    expect(updated.tasks[0].assignee).toBeUndefined();
  });

  it('throws on moveTask with unknown id', () => {
    const board = parseKanbanBoard(SAMPLE_BOARD);
    expect(() => moveTask(board, '999', 'done')).toThrow('Task #999 not found');
  });

  it('refuses to move an unassigned task into in_progress', () => {
    const board = addTask({ tasks: [] }, { title: 'Orphan task', priority: 'P2' });
    expect(board.tasks[0].assignee).toBeUndefined();
    expect(() => moveTask(board, board.tasks[0].id, 'in_progress'))
      .toThrow(/cannot enter in_progress without an assignee/);
  });

  it('assigns a task', () => {
    const board = parseKanbanBoard(SAMPLE_BOARD);
    const updated = assignTask(board, '001', 'student-b');
    expect(updated.tasks[0].assignee).toBe('student-b');
  });

  it('clears an assignee', () => {
    const board = parseKanbanBoard(SAMPLE_BOARD);
    const updated = assignTask(board, '001');
    expect(updated.tasks[0].assignee).toBeUndefined();
    expect(serializeKanbanBoard(updated)).not.toContain('(assignee:');
  });

  it('roundtrips parse/serialize', () => {
    const board = parseKanbanBoard(SAMPLE_BOARD);
    const md = serializeKanbanBoard(board);
    const board2 = parseKanbanBoard(md);
    expect(board2.tasks).toEqual(board.tasks);
  });

  it('assign transitions: todo -> assigned -> todo', () => {
    const board = addTask({ tasks: [] }, { title: 'Test task', priority: 'P1' });
    expect(board.tasks[0].status).toBe('todo');

    const assigned = assignTask(board, board.tasks[0].id, 'alice');
    expect(assigned.tasks[0].status).toBe('assigned');
    expect(assigned.tasks[0].assignee).toBe('alice');

    const cleared = assignTask(assigned, assigned.tasks[0].id);
    expect(cleared.tasks[0].status).toBe('todo');
    expect(cleared.tasks[0].assignee).toBeUndefined();
  });

  it('assignTask does not change status for in_progress/review/done tasks', () => {
    const board = addTask({ tasks: [] }, { title: 'Active task', priority: 'P2', assignee: 'alice' });
    const inProgress = moveTask(board, board.tasks[0].id, 'in_progress');

    const withAssignee = assignTask(inProgress, inProgress.tasks[0].id, 'bob');
    expect(withAssignee.tasks[0].status).toBe('in_progress');

    const cleared = assignTask(withAssignee, withAssignee.tasks[0].id);
    expect(cleared.tasks[0].status).toBe('in_progress');
  });

  it('pickCurrentTask prefers the most recently updated task within the same status', () => {
    const board = parseKanbanBoard(`# Research Task Board

## Todo

## Assigned

## In Progress
- [P1] #001 Earlier task (assignee: student-a) <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:05:00Z -->
- [P1] #002 Later task (assignee: student-a) <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:10:00Z -->

## Review

## Done
`);

    expect(pickCurrentTask(board.tasks)?.id).toBe('002');
  });

  it('parses multi-line task body with Acceptance Criteria and extracts assignee anywhere in the block', () => {
    const md = `# Research Task Board

## Todo

## Assigned
- [P1] #001 Short single-line task. (assignee: student-a) <!-- created:2026-04-17T14:00:00Z updated:2026-04-17T14:00:00Z -->
- [P1] #002 Literature scan: prior work on small-LM arithmetic failure causes.

Deliverable: student-b/workspace/lit/related_work.md

Acceptance Criteria:
- [ ] >=12 papers covered
- [ ] Cites at least 3 papers from 2024-2026 (assignee: student-b) <!-- created:2026-04-17T14:00:00Z updated:2026-04-17T14:00:00Z -->

## In Progress

## Review

## Done
`;
    const board = parseKanbanBoard(md);
    expect(board.tasks).toHaveLength(2);

    const t1 = board.tasks.find((t) => t.id === '001')!;
    expect(t1.title).toBe('Short single-line task.');
    expect(t1.body).toBeUndefined();
    expect(t1.assignee).toBe('student-a');

    const t2 = board.tasks.find((t) => t.id === '002')!;
    expect(t2.title).toBe('Literature scan: prior work on small-LM arithmetic failure causes.');
    expect(t2.assignee).toBe('student-b');
    expect(t2.body).toContain('Acceptance Criteria:');
    expect(t2.body).toContain('>=12 papers covered');
    expect(t2.body).toContain('Deliverable:');
    // assignee / meta stripped from body
    expect(t2.body).not.toContain('assignee:');
    expect(t2.body).not.toContain('<!--');
  });

  it('serializes multi-line task body and round-trips cleanly', () => {
    const source = `# Research Task Board

## Todo

## Assigned
- [P1] #002 Literature scan.

Deliverable: path/to/doc.md

Acceptance Criteria:
- [ ] >=12 papers
- [ ] cites 3 recent (assignee: student-b) <!-- created:2026-04-17T14:00:00Z updated:2026-04-17T14:00:00Z -->

## In Progress

## Review

## Done
`;
    const board = parseKanbanBoard(source);
    const reparsed = parseKanbanBoard(serializeKanbanBoard(board));
    expect(reparsed.tasks).toEqual(board.tasks);
  });
});
