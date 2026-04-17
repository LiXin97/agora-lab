import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createMessage, messageFileName, serializeMessage } from '@agora-lab/core';
import type { KanbanTask, LabConfig } from '@agora-lab/core';

export interface StagedDispatch {
  finalize: () => Promise<string>;
  discard: () => Promise<void>;
}

/**
 * Writes a task-assignment instruction artifact into the assignee's message channel.
 * This immediate helper is used by tests and direct callers that do not need staged
 * dispatch semantics.
 */
export async function dispatchTaskToAgent(
  labDir: string,
  config: LabConfig,
  task: KanbanTask,
  assignee: string,
): Promise<void> {
  const staged = await stageTaskAssignmentDispatch(labDir, config, { ...task, assignee });
  await staged.finalize();
}

export async function stageTaskAssignmentDispatch(
  labDir: string,
  config: LabConfig,
  task: KanbanTask,
): Promise<StagedDispatch> {
  if (!task.assignee) {
    throw new Error(`Cannot dispatch task #${task.id} without an assignee.`);
  }

  const message = createMessage({
    from: 'agora',
    to: task.assignee,
    type: 'status',
    content: buildAssignmentDispatchContent(task),
  });

  const messageRoot = join(labDir, config.communication.messageDir);
  await mkdir(messageRoot, { recursive: true });

  const finalPath = join(messageRoot, messageFileName(message));
  const stagedPath = `${finalPath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(stagedPath, serializeMessage(message), { flag: 'wx' });

  return {
    async finalize() {
      await rename(stagedPath, finalPath);
      return finalPath;
    },
    async discard() {
      await rm(stagedPath, { force: true });
    },
  };
}

function buildAssignmentDispatchContent(task: KanbanTask): string {
  const lines = [
    `Task #${task.id} has been assigned to you.`,
    '',
    `Title: ${task.title}`,
    `Priority: ${task.priority}`,
    `Status: Assigned`,
  ];

  if (task.artifact) {
    lines.push(`Artifact: ${task.artifact}`);
  }
  if (task.escalation) {
    lines.push(`Escalation: ${task.escalation}`);
  }

  lines.push('', 'Please review the task details and move it to In Progress when you begin working.');
  return lines.join('\n');
}
