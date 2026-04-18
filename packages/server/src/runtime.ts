import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import YAML from 'yaml';
import {
  buildAgentSessionName,
  collectAgentFacts,
  deriveAgentStatus,
  listAgentDirs,
  parseKanbanBoard,
  parseLabConfig,
  parseMessage,
  pickCurrentTask,
} from '@agora-lab/core';
import type { AgentMessage, KanbanBoard, LabConfig, Meeting } from '@agora-lab/core';
import type { AgentInfo } from './events.js';

const execFileAsync = promisify(execFile);

export type SessionChecker = (sessionName: string) => Promise<boolean>;

export async function loadLabConfig(labDir: string): Promise<LabConfig> {
  return parseLabConfig(await readFile(join(labDir, 'lab.yaml'), 'utf-8'));
}

export async function loadKanbanBoard(labDir: string, config: LabConfig): Promise<KanbanBoard> {
  try {
    return parseKanbanBoard(await readFile(join(labDir, config.communication.kanbanFile), 'utf-8'));
  } catch {
    return { tasks: [] };
  }
}

export async function loadLatestMeeting(labDir: string, config: LabConfig): Promise<Meeting | null> {
  try {
    const meetingsRoot = join(labDir, config.communication.meetingDir);
    const entries = await readdir(meetingsRoot, { withFileTypes: true });
    const results = await Promise.allSettled(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const raw = await readFile(join(meetingsRoot, entry.name, 'meeting.yaml'), 'utf-8');
          return YAML.parse(raw) as Meeting;
        }),
    );

    const meetings = results
      .filter((result): result is PromiseFulfilledResult<Meeting> => result.status === 'fulfilled')
      .map((result) => result.value);

    return meetings.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;
  } catch {
    return null;
  }
}

export async function loadRecentMessages(
  labDir: string,
  config: LabConfig,
  limit = 20,
): Promise<AgentMessage[]> {
  try {
    const messageRoot = join(labDir, config.communication.messageDir);
    const entries = await readdir(messageRoot, { withFileTypes: true });
    // Message filenames are timestamp-prefixed, so sorting lexically puts the
    // most recent last — we only need to read the tail.
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name)
      .sort()
      .slice(-limit);

    const results = await Promise.allSettled(
      files.map((file) => readFile(join(messageRoot, file), 'utf-8').then(parseMessage)),
    );
    const messages = results
      .filter((r): r is PromiseFulfilledResult<AgentMessage> => r.status === 'fulfilled')
      .map((r) => r.value);
    return messages
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
      .slice(-limit);
  } catch {
    return [];
  }
}

async function buildAgentInfoList(
  labDir: string,
  config: LabConfig,
  board: KanbanBoard,
  latestMeeting: Meeting | null,
  isSessionRunning: SessionChecker,
): Promise<AgentInfo[]> {
  const agentNames = await listAgentDirs(labDir);

  return Promise.all(
    agentNames.map(async (name) => {
      const sessionName = buildAgentSessionName(dirname(labDir), name);
      const facts = await collectAgentFacts(
        name,
        board,
        latestMeeting,
        () => isSessionRunning(sessionName),
      );

      return {
        name,
        role: config.agents[name]?.role ?? 'student',
        status: deriveAgentStatus(facts),
        currentTask: selectCurrentTask(name, board),
      };
    }),
  );
}

export async function buildAgentList(
  labDir: string,
  config: LabConfig,
  board: KanbanBoard,
  latestMeeting: Meeting | null,
  isSessionRunning: SessionChecker = hasTmuxSession,
): Promise<AgentInfo[]> {
  return buildAgentInfoList(labDir, config, board, latestMeeting, isSessionRunning);
}

async function hasTmuxSession(sessionName: string): Promise<boolean> {
  try {
    await execFileAsync('tmux', ['has-session', '-t', sessionName], {
      timeout: 2000,
    });
    return true;
  } catch {
    return false;
  }
}

function selectCurrentTask(agentName: string, board: KanbanBoard): string | undefined {
  return pickCurrentTask(board.tasks.filter((task) => task.assignee === agentName))?.title;
}
