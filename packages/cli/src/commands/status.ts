import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import chalk from 'chalk';
import { parse } from 'yaml';
import { deriveAgentStatus, listAgentDirs, parseKanbanBoard } from '@agora-lab/core';
import type { KanbanBoard, LabConfig, Meeting, TaskStatus } from '@agora-lab/core';
import { buildSessionName, hasTmuxSession } from '../tmux.js';
import { collectAgentFacts } from '../runtime.js';
import { meetingDir } from './meeting.js';

const STATUS_COLORS = {
  offline: chalk.gray,
  ready: chalk.green,
  assigned: chalk.blue,
  working: chalk.yellow,
  meeting: chalk.magenta,
  review: chalk.cyan,
} as const;

async function loadLatestMeeting(labDir: string, config: LabConfig): Promise<Meeting | null> {
  try {
    const mDir = meetingDir(labDir, config);
    const entries = await readdir(mDir, { withFileTypes: true });
    const results = await Promise.allSettled(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const raw = await readFile(join(mDir, entry.name, 'meeting.yaml'), 'utf-8');
          return parse(raw) as Meeting;
        }),
    );
    const meetings = results
      .filter((r): r is PromiseFulfilledResult<Meeting> => r.status === 'fulfilled')
      .map((r) => r.value);

    return meetings.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;
  } catch {
    return null;
  }
}

export async function statusCommand(labDir: string, config: LabConfig): Promise<string> {
  const lines: string[] = [];

  lines.push(chalk.bold(`Lab: ${config.labName}`));
  lines.push(`Topic: ${config.researchTopic}`);
  lines.push('');

  // Agents
  lines.push(chalk.bold('Agents:'));
  const agentNames = await listAgentDirs(labDir);
  let board: KanbanBoard = { tasks: [] };
  let hasBoard = false;
  try {
    const kanbanPath = join(labDir, config.communication.kanbanFile);
    board = parseKanbanBoard(await readFile(kanbanPath, 'utf-8'));
    hasBoard = true;
  } catch { /* fall back to empty board for agent status */ }

  const latestMeeting = await loadLatestMeeting(labDir, config);
  for (const name of agentNames) {
    const agentConfig = config.agents[name];
    const role = agentConfig?.role ?? 'unknown';
    const sessionName = buildSessionName(config.labName, name, labDir);
    const facts = await collectAgentFacts(name, board, latestMeeting, () => hasTmuxSession(sessionName));
    const status = deriveAgentStatus(facts);
    lines.push(`  ${name} (${role}) — ${STATUS_COLORS[status](status)}`);
  }
  if (agentNames.length === 0) {
    lines.push('  (none)');
  }
  lines.push('');

  // Kanban summary
  lines.push(chalk.bold('Kanban:'));
  if (hasBoard) {
    const counts: Record<TaskStatus, number> = {
      todo: 0,
      assigned: 0,
      in_progress: 0,
      review: 0,
      done: 0,
    };
    for (const task of board.tasks) {
      counts[task.status] += 1;
    }
    lines.push(
      `  Todo: ${counts.todo}  Assigned: ${counts.assigned}  In Progress: ${counts.in_progress}  Review: ${counts.review}  Done: ${counts.done}`,
    );
  } else {
    lines.push('  (no kanban board found)');
  }

  return lines.join('\n');
}
