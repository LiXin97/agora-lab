import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultConfig, serializeKanbanBoard, serializeLabConfig } from '@agora-lab/core';
import { handleCommand } from '../../server/src/commands.js';
import { kanbanAssignCommand } from '../src/commands/kanban.js';

const TEST_ROOT = join(tmpdir(), 'agora-kanban-command');
let mockHandleCommand = async (...args: Parameters<typeof handleCommand>) => handleCommand(...args);

vi.mock('../src/server-runtime.js', () => ({
  loadServerModule: async () => ({
    handleCommand: async (...args: Parameters<typeof handleCommand>) => mockHandleCommand(...args),
  }),
}));

describe('kanbanAssignCommand', () => {
  afterEach(async () => {
    await rm(TEST_ROOT, { recursive: true, force: true });
    mockHandleCommand = async (...args: Parameters<typeof handleCommand>) => handleCommand(...args);
  });

  it('assigns an existing todo task to an agent and moves it into Assigned', async () => {
    let routedEvent: Parameters<typeof handleCommand>[1] | undefined;
    mockHandleCommand = async (...args: Parameters<typeof handleCommand>) => {
      routedEvent = args[1];
      return handleCommand(...args);
    };

    const labDir = join(TEST_ROOT, `lab-${Date.now()}`);
    const config = createDefaultConfig('Assign Lab', 'dispatch recovery');
    await mkdir(join(labDir, 'shared', 'messages'), { recursive: true });
    await writeFile(join(labDir, 'lab.yaml'), serializeLabConfig(config));
    await writeFile(
      join(labDir, 'shared', 'KANBAN.md'),
      serializeKanbanBoard({
        tasks: [{
          id: '001',
          title: 'Dispatch me',
          priority: 'P1',
          status: 'todo',
          createdAt: '2026-04-17T00:00:00Z',
          updatedAt: '2026-04-17T00:00:00Z',
        }],
      }),
    );

    const result = await kanbanAssignCommand(labDir, config, { id: '001', assignee: 'student-a' });
    const board = await readFile(join(labDir, 'shared', 'KANBAN.md'), 'utf-8');

    expect(routedEvent).toEqual({ type: 'kanban:assign', id: '001', assignee: 'student-a' });
    expect(result).toContain('Assigned task #001 to student-a');
    expect(board).toContain('(assignee: student-a)');
    expect(board).toContain('## Assigned');
  });

  it('clears an assignee when omitted', async () => {
    let routedEvent: Parameters<typeof handleCommand>[1] | undefined;
    mockHandleCommand = async (...args: Parameters<typeof handleCommand>) => {
      routedEvent = args[1];
      return handleCommand(...args);
    };

    const labDir = join(TEST_ROOT, `lab-${Date.now()}`);
    const config = createDefaultConfig('Assign Lab', 'dispatch recovery');
    await mkdir(join(labDir, 'shared', 'messages'), { recursive: true });
    await writeFile(join(labDir, 'lab.yaml'), serializeLabConfig(config));
    await writeFile(
      join(labDir, 'shared', 'KANBAN.md'),
      serializeKanbanBoard({
        tasks: [{
          id: '001',
          title: 'Dispatch me',
          priority: 'P1',
          status: 'assigned',
          assignee: 'student-a',
          createdAt: '2026-04-17T00:00:00Z',
          updatedAt: '2026-04-17T00:00:00Z',
        }],
      }),
    );

    const result = await kanbanAssignCommand(labDir, config, { id: '001' });
    const board = await readFile(join(labDir, 'shared', 'KANBAN.md'), 'utf-8');

    expect(routedEvent).toEqual({ type: 'kanban:assign', id: '001', assignee: undefined });
    expect(result).toContain('Cleared assignee for task #001');
    expect(board).not.toContain('(assignee:');
    expect(board).toContain('## Todo');
  });
});
