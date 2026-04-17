import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseMessage } from '@agora-lab/core';
import type { LabConfig, KanbanBoard, Meeting, AgentMessage } from '@agora-lab/core';
import type { AgentInfo, ServerEvent } from './events.js';
import { createLabConfigEvent, createKanbanUpdateEvent, createAgentListEvent, createMeetingUpdateEvent, createMessageEvent } from './events.js';
import { buildAgentList, loadKanbanBoard, loadLabConfig, loadLatestMeeting, loadRecentMessages } from './runtime.js';
import chokidar from 'chokidar';

export interface LabFullState {
  config: LabConfig;
  agents: AgentInfo[];
  kanban: KanbanBoard;
  meeting: Meeting | null;
  messages: AgentMessage[];
}

export async function buildFullState(labDir: string): Promise<LabFullState> {
  const config = await loadLabConfig(labDir);
  const [kanban, meeting, messages] = await Promise.all([
    loadKanbanBoard(labDir, config),
    loadLatestMeeting(labDir, config),
    loadRecentMessages(labDir, config),
  ]);
  const agents = await buildAgentList(labDir, config, kanban, meeting);

  return { config, agents, kanban, meeting, messages };
}

export function getFullStateEvents(state: LabFullState): ServerEvent[] {
  return [
    createLabConfigEvent(state.config),
    createAgentListEvent(state.agents),
    createKanbanUpdateEvent(state.kanban),
    createMeetingUpdateEvent(state.meeting),
    ...state.messages.map(m => createMessageEvent(m)),
  ];
}

export type EventCallback = (event: ServerEvent) => void;

export function watchLabDir(labDir: string, onEvent: EventCallback): () => void {
  const watcher = chokidar.watch(join(labDir, 'shared'), {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });
  const agentWatcher = chokidar.watch(join(labDir, 'agents'), {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });
  let lastAgentSnapshot = '';

  async function emitAgentList() {
    try {
      const config = await loadLabConfig(labDir);
      const [board, meeting] = await Promise.all([
        loadKanbanBoard(labDir, config),
        loadLatestMeeting(labDir, config),
      ]);
      const agents = await buildAgentList(labDir, config, board, meeting);
      const snapshot = JSON.stringify(agents);
      if (snapshot !== lastAgentSnapshot) {
        lastAgentSnapshot = snapshot;
        onEvent(createAgentListEvent(agents));
      }
    } catch {
      // Ignore transient read errors while files are mid-write.
    }
  }

  async function emitKanbanAndAgents() {
    try {
      const config = await loadLabConfig(labDir);
      const board = await loadKanbanBoard(labDir, config);
      onEvent(createKanbanUpdateEvent(board));
      const meeting = await loadLatestMeeting(labDir, config);
      const agents = await buildAgentList(labDir, config, board, meeting);
      lastAgentSnapshot = JSON.stringify(agents);
      onEvent(createAgentListEvent(agents));
    } catch {
      // Ignore transient read errors while files are mid-write.
    }
  }

  async function emitMeetingAndAgents() {
    try {
      const config = await loadLabConfig(labDir);
      const [board, meeting] = await Promise.all([
        loadKanbanBoard(labDir, config),
        loadLatestMeeting(labDir, config),
      ]);
      onEvent(createMeetingUpdateEvent(meeting));
      const agents = await buildAgentList(labDir, config, board, meeting);
      lastAgentSnapshot = JSON.stringify(agents);
      onEvent(createAgentListEvent(agents));
    } catch {
      // Ignore transient read errors while files are mid-write.
    }
  }

  async function emitMessage(filePath: string) {
    try {
      if (!filePath.endsWith('.md') || !filePath.includes('/messages/')) return;
      const content = await readFile(filePath, 'utf-8');
      onEvent(createMessageEvent(parseMessage(content)));
    } catch {
      // Ignore malformed or half-written message files.
    }
  }

  watcher.on('change', async (filePath) => {
    if (filePath.endsWith('KANBAN.md')) {
      await emitKanbanAndAgents();
      return;
    }
    if (filePath.endsWith('meeting.yaml')) {
      await emitMeetingAndAgents();
      return;
    }
    await emitMessage(filePath);
  });

  watcher.on('add', async (filePath) => {
    if (filePath.endsWith('meeting.yaml')) {
      await emitMeetingAndAgents();
      return;
    }
    await emitMessage(filePath);
  });

  const configWatcher = chokidar.watch(join(labDir, 'lab.yaml'), {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });
  configWatcher.on('change', async () => {
    try {
      const config = await loadLabConfig(labDir);
      onEvent(createLabConfigEvent(config));
      const [board, meeting] = await Promise.all([
        loadKanbanBoard(labDir, config),
        loadLatestMeeting(labDir, config),
      ]);
      const agents = await buildAgentList(labDir, config, board, meeting);
      lastAgentSnapshot = JSON.stringify(agents);
      onEvent(createAgentListEvent(agents));
    } catch {
      /* ignore */
    }
  });

  agentWatcher.on('addDir', async (dirPath) => {
    if (dirPath !== join(labDir, 'agents')) {
      await emitAgentList();
    }
  });
  agentWatcher.on('unlinkDir', async (dirPath) => {
    if (dirPath !== join(labDir, 'agents')) {
      await emitAgentList();
    }
  });

  const pollHandle = setInterval(() => {
    void emitAgentList();
  }, 2000);

  return () => {
    clearInterval(pollHandle);
    void watcher.close();
    void configWatcher.close();
    void agentWatcher.close();
  };
}
