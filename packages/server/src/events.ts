import type {
  AgentMessage,
  AgentRuntimeStatus,
  AgentRole,
  KanbanBoard,
  LabConfig,
  Meeting,
  MeetingPhase,
  TaskPriority,
  TaskStatus,
} from '@agora-lab/core';

export interface AgentInfo {
  name: string;
  role: AgentRole;
  status: AgentRuntimeStatus;
  currentTask?: string;
}

export type ServerEvent =
  | { type: 'lab:config'; data: LabConfig }
  | { type: 'agent:list'; data: AgentInfo[] }
  | { type: 'agent:status'; agent: string; status: AgentRuntimeStatus }
  | { type: 'kanban:update'; data: KanbanBoard }
  | { type: 'meeting:update'; data: Meeting | null }
  | { type: 'meeting:phase'; meetingId: string; phase: MeetingPhase }
  | { type: 'message:new'; data: AgentMessage };

export function createLabConfigEvent(config: LabConfig): ServerEvent {
  return { type: 'lab:config', data: config };
}

export function createKanbanUpdateEvent(board: KanbanBoard): ServerEvent {
  return { type: 'kanban:update', data: board };
}

export function createAgentListEvent(agents: AgentInfo[]): ServerEvent {
  return { type: 'agent:list', data: agents };
}

export function createMeetingUpdateEvent(meeting: Meeting | null): ServerEvent {
  return { type: 'meeting:update', data: meeting };
}

export function createMessageEvent(msg: AgentMessage): ServerEvent {
  return { type: 'message:new', data: msg };
}

export function serializeEvent(event: ServerEvent): string {
  return JSON.stringify(event);
}

// --- Client → Server events ---

export type ClientEvent =
  | { type: 'kanban:add'; title: string; priority: TaskPriority; assignee?: string }
  | { type: 'kanban:move'; id: string; status: TaskStatus }
  | { type: 'kanban:assign'; id: string; assignee?: string }
  | { type: 'meeting:create'; participants: string[]; decisionMaker: string }
  | { type: 'meeting:advance'; meetingId: string };

const TASK_PRIORITIES = new Set<TaskPriority>(['P0', 'P1', 'P2', 'P3']);
const TASK_STATUSES = new Set<TaskStatus>(['todo', 'assigned', 'in_progress', 'review', 'done']);

function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && TASK_PRIORITIES.has(value as TaskPriority);
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && TASK_STATUSES.has(value as TaskStatus);
}

export function parseClientEvent(raw: string): ClientEvent | null {
  try {
    const data = JSON.parse(raw);
    if (typeof data?.type !== 'string') return null;
    switch (data.type) {
      case 'kanban:add':
        if (typeof data.title !== 'string' || !isTaskPriority(data.priority)) return null;
        if (data.assignee !== undefined && typeof data.assignee !== 'string') return null;
        {
          const assignee = typeof data.assignee === 'string' ? data.assignee.trim() : undefined;
          return assignee
            ? { type: 'kanban:add', title: data.title, priority: data.priority, assignee }
            : { type: 'kanban:add', title: data.title, priority: data.priority };
        }
      case 'kanban:move':
        if (typeof data.id !== 'string' || !isTaskStatus(data.status)) return null;
        return { type: 'kanban:move', id: data.id, status: data.status };
      case 'kanban:assign':
        if (typeof data.id !== 'string') return null;
        if (data.assignee !== undefined && typeof data.assignee !== 'string') return null;
        {
          const assignee = typeof data.assignee === 'string' ? data.assignee.trim() : undefined;
          return assignee
            ? { type: 'kanban:assign', id: data.id, assignee }
            : { type: 'kanban:assign', id: data.id };
        }
      case 'meeting:create':
        if (!Array.isArray(data.participants) || typeof data.decisionMaker !== 'string') return null;
        if (!data.participants.every((p: unknown) => typeof p === 'string')) return null;
        return { type: 'meeting:create', participants: data.participants, decisionMaker: data.decisionMaker };
      case 'meeting:advance':
        if (typeof data.meetingId !== 'string') return null;
        return { type: 'meeting:advance', meetingId: data.meetingId };
      default:
        return null;
    }
  } catch { return null; }
}
