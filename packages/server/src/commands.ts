import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import YAML from 'yaml';
import lockfile from 'proper-lockfile';
import {
  addTask,
  advancePhase,
  assignTask,
  createMeeting,
  parseKanbanBoard,
  serializeKanbanBoard,
  moveTask,
} from '@agora-lab/core';
import type { KanbanTask, LabConfig, Meeting } from '@agora-lab/core';
import type { ClientEvent } from './events.js';
import { stageTaskAssignmentDispatch } from './dispatch.js';
import { loadLabConfig } from './runtime.js';

const MEETING_ID_RE = /^mtg-[\w-]+$/;

export interface CommandDeps {
  stageTaskAssignment?: typeof stageTaskAssignmentDispatch;
}

async function withKanbanLock<T>(
  kanbanPath: string,
  fn: (content: string) => Promise<T>,
): Promise<T> {
  const release = await lockfile.lock(kanbanPath, {
    retries: { retries: 10, minTimeout: 50, maxTimeout: 1000 },
  });
  try {
    return await fn(await readFile(kanbanPath, 'utf-8'));
  } finally {
    await release();
  }
}

export async function handleCommand(
  labDir: string,
  event: ClientEvent,
  deps: CommandDeps = {},
): Promise<string> {
  const config = await loadLabConfig(labDir);
  const kanbanPath = join(labDir, config.communication.kanbanFile);
  const stageDispatch = deps.stageTaskAssignment ?? stageTaskAssignmentDispatch;

  switch (event.type) {
    case 'kanban:add': {
      return withKanbanLock(kanbanPath, async (content) => {
        const board = parseKanbanBoard(content);
        const assignee = event.assignee?.trim() || undefined;
        const updated = addTask(board, {
          title: event.title,
          priority: event.priority,
          assignee,
        });
        const newTask = updated.tasks[updated.tasks.length - 1];
        if (!newTask) {
          throw new Error('Failed to create task.');
        }

        await persistBoardUpdate(
          labDir,
          config,
          kanbanPath,
          content,
          updated,
          newTask.assignee ? newTask : null,
          stageDispatch,
        );
        return newTask.assignee
          ? `Added and dispatched task #${newTask.id}: ${newTask.title} -> ${newTask.assignee}`
          : `Added task #${newTask.id}: ${newTask.title}`;
      });
    }
    case 'kanban:move': {
      return withKanbanLock(kanbanPath, async (content) => {
        const board = parseKanbanBoard(content);
        const updated = moveTask(board, event.id, event.status);
        await writeFileAtomically(kanbanPath, serializeKanbanBoard(updated));
        return `Moved task #${event.id} to ${event.status}`;
      });
    }
    case 'kanban:assign': {
      return withKanbanLock(kanbanPath, async (content) => {
        const board = parseKanbanBoard(content);
        const updated = assignTask(board, event.id, event.assignee?.trim() || undefined);
        const task = findTask(updated, event.id);

        await persistBoardUpdate(labDir, config, kanbanPath, content, updated, task.assignee ? task : null, stageDispatch);
        return task.assignee
          ? `Assigned task #${task.id} to ${task.assignee}`
          : `Cleared assignee for task #${task.id}`;
      });
    }
    case 'meeting:create': {
      const reviewerParticipants = event.participants.filter(
        (name) => config.agents[name]?.role === 'paper-reviewer',
      );
      if (reviewerParticipants.length > 0) {
        throw new Error(
          `Paper reviewers cannot join group meetings: ${reviewerParticipants.join(', ')}`,
        );
      }
      const meeting = createMeeting({
        participants: event.participants,
        decisionMaker: event.decisionMaker,
      });
      const meetingDir = join(labDir, config.communication.meetingDir, meeting.id);
      await mkdir(meetingDir, { recursive: true });
      await writeFile(join(meetingDir, 'meeting.yaml'), YAML.stringify(meeting));
      return `Created meeting ${meeting.id}`;
    }
    case 'meeting:advance': {
      if (!MEETING_ID_RE.test(event.meetingId)) {
        throw new Error('Invalid meeting ID');
      }
      const meetingsRoot = resolve(join(labDir, config.communication.meetingDir));
      const meetingDir = resolve(join(meetingsRoot, event.meetingId));
      if (!meetingDir.startsWith(meetingsRoot + sep)) {
        throw new Error('Invalid meeting ID');
      }
      const raw = await readFile(join(meetingDir, 'meeting.yaml'), 'utf-8');
      const meeting = YAML.parse(raw) as Meeting;
      const updated = advancePhase(meeting);
      await writeFile(join(meetingDir, 'meeting.yaml'), YAML.stringify(updated));
      return `Advanced meeting ${event.meetingId} to ${updated.phase}`;
    }
  }
}

function findTask(board: { tasks: KanbanTask[] }, taskId: string): KanbanTask {
  const task = board.tasks.find((candidate) => candidate.id === taskId);
  if (!task) {
    throw new Error(`Task #${taskId} not found.`);
  }
  return task;
}

async function persistBoardUpdate(
  labDir: string,
  config: LabConfig,
  kanbanPath: string,
  originalBoardContent: string,
  updatedBoard: { tasks: KanbanTask[] },
  dispatchTask: KanbanTask | null,
  stageDispatch: typeof stageTaskAssignmentDispatch,
): Promise<void> {
  const nextBoardContent = serializeKanbanBoard(updatedBoard);

  if (!dispatchTask) {
    await writeFileAtomically(kanbanPath, nextBoardContent);
    return;
  }

  const stagedDispatch = await stageDispatch(labDir, config, dispatchTask);
  let boardWritten = false;

  try {
    await writeFileAtomically(kanbanPath, nextBoardContent);
    boardWritten = true;
    await stagedDispatch.finalize();
  } catch (error) {
    const cleanupErrors: unknown[] = [];
    try {
      await stagedDispatch.discard();
    } catch (discardError) {
      cleanupErrors.push(discardError);
    }
    if (boardWritten) {
      try {
        await writeFileAtomically(kanbanPath, originalBoardContent);
      } catch (rollbackError) {
        cleanupErrors.push(rollbackError);
      }
    }
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [error, ...cleanupErrors],
        'Dispatch persistence failed and cleanup did not complete.',
      );
    }
    throw error;
  }
}

async function writeFileAtomically(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(tempPath, content);
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}
