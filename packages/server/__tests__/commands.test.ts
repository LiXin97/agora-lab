import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('@agora-lab/core', async () => import('../../core/src/index.ts'));

import { handleCommand } from '../src/commands.js';
import { parseClientEvent } from '../src/events.js';
import { createDefaultConfig, parseMessage, serializeKanbanBoard, serializeLabConfig } from '@agora-lab/core';

describe('parseClientEvent', () => {
  it('parses valid JSON with type field', () => {
    const result = parseClientEvent('{"type":"kanban:add","title":"Test","priority":"P1"}');
    expect(result).toEqual({ type: 'kanban:add', title: 'Test', priority: 'P1' });
  });

  it('returns null for invalid JSON', () => {
    expect(parseClientEvent('not json')).toBeNull();
  });

  it('returns null for JSON without type', () => {
    expect(parseClientEvent('{"title":"Test"}')).toBeNull();
  });

  it('returns null for unknown type', () => {
    expect(parseClientEvent('{"type":"evil:inject","foo":"bar"}')).toBeNull();
  });

  it('returns null for kanban:add missing title', () => {
    expect(parseClientEvent('{"type":"kanban:add","priority":"P1"}')).toBeNull();
  });

  it('returns null for kanban:add missing priority', () => {
    expect(parseClientEvent('{"type":"kanban:add","title":"T"}')).toBeNull();
  });

  it('returns null for kanban:add non-string title', () => {
    expect(parseClientEvent('{"type":"kanban:add","title":42,"priority":"P1"}')).toBeNull();
  });

  it('returns null for kanban:add invalid priority', () => {
    expect(parseClientEvent('{"type":"kanban:add","title":"T","priority":"PX"}')).toBeNull();
  });

  it('returns null for kanban:move missing id', () => {
    expect(parseClientEvent('{"type":"kanban:move","status":"done"}')).toBeNull();
  });

  it('returns null for kanban:move missing status', () => {
    expect(parseClientEvent('{"type":"kanban:move","id":"1"}')).toBeNull();
  });

  it('returns null for kanban:move invalid status', () => {
    expect(parseClientEvent('{"type":"kanban:move","id":"1","status":"blocked"}')).toBeNull();
  });

  it('accepts kanban:assign without assignee to clear assignment', () => {
    expect(parseClientEvent('{"type":"kanban:assign","id":"1"}')).toEqual({
      type: 'kanban:assign',
      id: '1',
    });
  });

  it('returns null for meeting:create missing participants', () => {
    expect(parseClientEvent('{"type":"meeting:create","decisionMaker":"supervisor"}')).toBeNull();
  });

  it('returns null for meeting:create with non-array participants', () => {
    expect(parseClientEvent('{"type":"meeting:create","participants":"sup","decisionMaker":"sup"}')).toBeNull();
  });

  it('returns null for meeting:create with non-string participant entries', () => {
    expect(parseClientEvent('{"type":"meeting:create","participants":[1,2],"decisionMaker":"sup"}')).toBeNull();
  });

  it('returns null for meeting:advance missing meetingId', () => {
    expect(parseClientEvent('{"type":"meeting:advance"}')).toBeNull();
  });

  it('returns null for meeting:advance non-string meetingId', () => {
    expect(parseClientEvent('{"type":"meeting:advance","meetingId":123}')).toBeNull();
  });

  it('accepts kanban:add with optional assignee', () => {
    const result = parseClientEvent('{"type":"kanban:add","title":"T","priority":"P2","assignee":"alice"}');
    expect(result).not.toBeNull();
  });

  it('returns null for kanban:add with non-string assignee', () => {
    expect(parseClientEvent('{"type":"kanban:add","title":"T","priority":"P2","assignee":99}')).toBeNull();
  });

  it('normalizes blank assignee values to unassigned', () => {
    expect(parseClientEvent('{"type":"kanban:assign","id":"1","assignee":"   "}')).toEqual({
      type: 'kanban:assign',
      id: '1',
    });
  });

  it('accepts valid meeting:create', () => {
    const result = parseClientEvent('{"type":"meeting:create","participants":["a","b"],"decisionMaker":"a"}');
    expect(result).not.toBeNull();
  });

  it('accepts valid meeting:advance', () => {
    const result = parseClientEvent('{"type":"meeting:advance","meetingId":"mtg-123-abc"}');
    expect(result).not.toBeNull();
  });
});

describe('handleCommand', () => {
  let labDir: string;

  beforeEach(async () => {
    labDir = join(tmpdir(), `agora-test-${Date.now()}`);
    await mkdir(join(labDir, 'shared', 'messages'), { recursive: true });
    await mkdir(join(labDir, 'shared', 'meetings'), { recursive: true });
    await writeFile(join(labDir, 'lab.yaml'), serializeLabConfig(createDefaultConfig('Test Lab', 'Attention')));
    await writeFile(
      join(labDir, 'shared', 'KANBAN.md'),
      serializeKanbanBoard({ tasks: [] }),
    );
  });

  afterEach(async () => {
    await rm(labDir, { recursive: true, force: true });
  });

  it('kanban:add creates a task', async () => {
    await handleCommand(labDir, { type: 'kanban:add', title: 'My Task', priority: 'P1' });
    const md = await readFile(join(labDir, 'shared', 'KANBAN.md'), 'utf-8');
    expect(md).toContain('My Task');
    expect(md).toContain('P1');
  });

  it('kanban:add with assignee dispatches a task message', async () => {
    const result = await handleCommand(labDir, {
      type: 'kanban:add',
      title: 'Assigned Task',
      priority: 'P1',
      assignee: 'student-a',
    });

    const md = await readFile(join(labDir, 'shared', 'KANBAN.md'), 'utf-8');
    expect(md).toContain('## Assigned');
    expect(md).toContain('(assignee: student-a)');
    expect(result).toContain('dispatched');

    const files = await readdir(join(labDir, 'shared', 'messages'));
    const msgFile = files.find((file) => file.includes('_to_student-a_') && file.endsWith('.md'));
    expect(msgFile).toBeDefined();
    const message = parseMessage(await readFile(join(labDir, 'shared', 'messages', msgFile!), 'utf-8'));
    expect(message.from).toBe('agora');
    expect(message.to).toBe('student-a');
    expect(message.content).toContain('Task #');
    expect(message.content).toContain('Assigned Task');
  });

  it('kanban:add without assignee does not create a dispatch message artifact', async () => {
    await handleCommand(labDir, { type: 'kanban:add', title: 'No Assign Task', priority: 'P1' });

    const files = await readdir(join(labDir, 'shared', 'messages'));
    expect(files).toHaveLength(0);
  });

  it('kanban:move changes task status', async () => {
    await handleCommand(labDir, { type: 'kanban:add', title: 'Move Me', priority: 'P2', assignee: 'student-a' });
    const md1 = await readFile(join(labDir, 'shared', 'KANBAN.md'), 'utf-8');
    const idMatch = md1.match(/#(\d+)/);
    const id = idMatch![1];

    await handleCommand(labDir, { type: 'kanban:move', id, status: 'in_progress' });
    const md2 = await readFile(join(labDir, 'shared', 'KANBAN.md'), 'utf-8');
    expect(md2).toContain('## In Progress\n- [P2]');
  });

  it('kanban:move to todo clears the assignee', async () => {
    await handleCommand(labDir, {
      type: 'kanban:add',
      title: 'Reset Me',
      priority: 'P2',
      assignee: 'student-a',
    });
    const md1 = await readFile(join(labDir, 'shared', 'KANBAN.md'), 'utf-8');
    const idMatch = md1.match(/#(\d+)/);
    const id = idMatch![1];

    await handleCommand(labDir, { type: 'kanban:move', id, status: 'todo' });
    const md2 = await readFile(join(labDir, 'shared', 'KANBAN.md'), 'utf-8');

    expect(md2).toContain('## Todo\n- [P2]');
    expect(md2).not.toContain('(assignee: student-a)');
  });

  it('kanban:assign sets assignee', async () => {
    await handleCommand(labDir, { type: 'kanban:add', title: 'Assign Me', priority: 'P0' });
    const md1 = await readFile(join(labDir, 'shared', 'KANBAN.md'), 'utf-8');
    const idMatch = md1.match(/#(\d+)/);
    const id = idMatch![1];

    const result = await handleCommand(labDir, { type: 'kanban:assign', id, assignee: 'student-b' });
    const md2 = await readFile(join(labDir, 'shared', 'KANBAN.md'), 'utf-8');
    expect(md2).toContain('student-b');
    expect(md2).toContain('## Assigned');
    expect(result).toContain('Assigned task');

    const files = await readdir(join(labDir, 'shared', 'messages'));
    const msgFile = files.find((file) => file.includes('_to_student-b_') && file.endsWith('.md'));
    expect(msgFile).toBeDefined();
  });

  it('kanban:assign clears assignee when omitted', async () => {
    await handleCommand(labDir, {
      type: 'kanban:add',
      title: 'Unassign Me',
      priority: 'P1',
      assignee: 'student-a',
    });
    const md1 = await readFile(join(labDir, 'shared', 'KANBAN.md'), 'utf-8');
    const idMatch = md1.match(/#(\d+)/);
    const id = idMatch![1];
    const messagesBefore = await readdir(join(labDir, 'shared', 'messages'));

    await handleCommand(labDir, { type: 'kanban:assign', id });
    const md2 = await readFile(join(labDir, 'shared', 'KANBAN.md'), 'utf-8');
    expect(md2).not.toContain('(assignee: student-a)');
    expect(md2).toContain('Unassign Me');
    expect(md2).toContain('## Todo');
    const messagesAfter = await readdir(join(labDir, 'shared', 'messages'));
    expect(messagesAfter.length).toBe(messagesBefore.length);
  });

  it('rolls back assignment when dispatch finalization fails', async () => {
    await handleCommand(labDir, { type: 'kanban:add', title: 'Rollback Me', priority: 'P1' });
    const md1 = await readFile(join(labDir, 'shared', 'KANBAN.md'), 'utf-8');
    const idMatch = md1.match(/#(\d+)/);
    const id = idMatch![1];

    const discard = vi.fn().mockResolvedValue(undefined);
    const finalize = vi.fn().mockRejectedValue(new Error('dispatch finalize failed'));

    await expect(
      handleCommand(
        labDir,
        { type: 'kanban:assign', id, assignee: 'student-a' },
        {
          stageTaskAssignment: vi.fn().mockResolvedValue({ finalize, discard }),
        },
      ),
    ).rejects.toThrow('dispatch finalize failed');

    const md2 = await readFile(join(labDir, 'shared', 'KANBAN.md'), 'utf-8');
    expect(md2).not.toContain('(assignee: student-a)');
    expect(discard).toHaveBeenCalledOnce();
  });

  it('meeting:create creates meeting directory and yaml', async () => {
    const result = await handleCommand(labDir, {
      type: 'meeting:create',
      participants: ['supervisor', 'student-a'],
      decisionMaker: 'supervisor',
    });

    const meetingsDir = join(labDir, 'shared', 'meetings');
    const entries = await readdir(meetingsDir);
    const mtgDir = entries.find(e => e.startsWith('mtg-'));
    expect(mtgDir).toBeDefined();

    const yaml = await readFile(join(meetingsDir, mtgDir!, 'meeting.yaml'), 'utf-8');
    expect(yaml).toContain('supervisor');
    expect(yaml).toContain('student-a');
    expect(yaml).toContain('PREPARE');
    expect(result).toContain('Created meeting');
  });

  it('meeting:advance rejects path-traversal meeting IDs', async () => {
    await expect(
      handleCommand(labDir, { type: 'meeting:advance', meetingId: '../../../etc/passwd' }),
    ).rejects.toThrow('Invalid meeting ID');
  });

  it('meeting:advance rejects meeting IDs with slashes', async () => {
    await expect(
      handleCommand(labDir, { type: 'meeting:advance', meetingId: 'mtg-1/../../../etc' }),
    ).rejects.toThrow('Invalid meeting ID');
  });

  it('concurrent kanban:add operations preserve all tasks (locking)', async () => {
    const adds = Array.from({ length: 5 }, (_, i) =>
      handleCommand(labDir, { type: 'kanban:add', title: `Task ${i}`, priority: 'P2' }),
    );
    await Promise.all(adds);
    const md = await readFile(join(labDir, 'shared', 'KANBAN.md'), 'utf-8');
    for (let i = 0; i < 5; i++) {
      expect(md).toContain(`Task ${i}`);
    }
  }, 15_000);

  it('handleCommand returns summary strings', async () => {
    const addResult = await handleCommand(labDir, { type: 'kanban:add', title: 'Test Task', priority: 'P2', assignee: 'student-a' });
    expect(addResult).toContain('Added and dispatched task');

    const id = addResult.match(/#(\d+)/)?.[1];
    expect(id).toBeDefined();

    const moveResult = await handleCommand(labDir, { type: 'kanban:move', id: id!, status: 'in_progress' });
    expect(moveResult).toContain('Moved task');
  });
});
