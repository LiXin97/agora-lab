import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { LabConfig, TaskPriority, TaskStatus } from '@agora-lab/core';
import { loadServerModule } from '../server-runtime.js';

type KanbanCommandEvent =
  | { type: 'kanban:add'; title: string; priority: TaskPriority; assignee?: string }
  | { type: 'kanban:move'; id: string; status: TaskStatus }
  | { type: 'kanban:assign'; id: string; assignee?: string };

export async function kanbanListCommand(labDir: string, config: LabConfig): Promise<string> {
  const kanbanPath = join(labDir, config.communication.kanbanFile);
  const md = await readFile(kanbanPath, 'utf-8');
  return md;
}

export async function kanbanAddCommand(
  labDir: string,
  _config: LabConfig,
  opts: { title: string; priority: TaskPriority; assignee?: string },
): Promise<string> {
  return runServerCommand(labDir, {
    type: 'kanban:add',
    title: opts.title,
    priority: opts.priority,
    assignee: opts.assignee,
  });
}

export async function kanbanMoveCommand(
  labDir: string,
  _config: LabConfig,
  opts: { id: string; status: TaskStatus },
): Promise<string> {
  return runServerCommand(labDir, {
    type: 'kanban:move',
    id: opts.id,
    status: opts.status,
  });
}

export async function kanbanAssignCommand(
  labDir: string,
  _config: LabConfig,
  opts: { id: string; assignee?: string },
): Promise<string> {
  return runServerCommand(labDir, {
    type: 'kanban:assign',
    id: opts.id,
    assignee: opts.assignee?.trim() || undefined,
  });
}

async function runServerCommand(labDir: string, event: KanbanCommandEvent): Promise<string> {
  const { handleCommand } = await loadServerModule();
  return handleCommand(labDir, event);
}
