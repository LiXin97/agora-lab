import { useMemo } from 'react';
import type { LabState } from './useLabState.js';
import type { AgentRuntimeStatus, KanbanTask, TaskStatus, AgentMessage } from '@agora-lab/core';
import {
  TASK_STATUS_ORDER,
  TASK_STATUS_LABEL,
  isActiveWorkStatus,
  pickCurrentTask,
} from '../status-meta.js';

// --- Derived types ---

export interface AgentSummary {
  name: string;
  role: string;
  status: AgentRuntimeStatus;
  /** All tasks assigned to this agent. */
  taskCount: number;
  /** Tasks the agent has been dispatched but not yet started (status = 'assigned'). */
  assignedCount: number;
  /** Tasks currently being executed (status = 'in_progress'). */
  inProgressCount: number;
  /** Tasks awaiting review sign-off (status = 'review'). */
  reviewCount: number;
  /**
   * The single most relevant task for this agent right now, following dispatch
   * priority: review > in_progress > assigned.
   * Null when the agent has no tasks in an active-work status (todo/done excluded).
   */
  currentTask: KanbanTask | null;
}

export interface KanbanColumn {
  status: TaskStatus;
  label: string;
  tasks: KanbanTask[];
}

export interface MeetingSummary {
  id: string;
  phase: string;
  phaseIndex: number;
  totalPhases: number;
  participants: string[];
  decisionMaker: string;
}

export interface DecisionEntry {
  from: string;
  content: string;
  timestamp: string;
}

export interface SystemHealth {
  connected: boolean;
  agentCount: number;
  /**
   * Agents with an active work status (assigned | working | meeting | review).
   * `ready` agents are idle and NOT counted as active work.
   */
  activeCount: number;
  /** Agents with status = 'ready' (session up, no task dispatched yet). */
  readyCount: number;
  taskTotal: number;
  taskDone: number;
}

export interface DashboardModel {
  agentSummaries: AgentSummary[];
  kanbanColumns: KanbanColumn[];
  meetingSummary: MeetingSummary | null;
  recentMessages: AgentMessage[];
  decisionLog: DecisionEntry[];
  systemHealth: SystemHealth;
}

// --- Constants ---

const MEETING_PHASES = ['PREPARE', 'CROSS_READ', 'CHALLENGE', 'RESPOND', 'DECISION'] as const;

// --- Selectors (pure functions, testable) ---

export { pickCurrentTask } from '../status-meta.js';

export function selectAgentSummaries(state: LabState): AgentSummary[] {
  return state.agents.map(a => {
    const tasks = state.kanban.tasks.filter(t => t.assignee === a.name);
    let assignedCount = 0;
    let inProgressCount = 0;
    let reviewCount = 0;
    for (const t of tasks) {
      if (t.status === 'assigned') assignedCount++;
      else if (t.status === 'in_progress') inProgressCount++;
      else if (t.status === 'review') reviewCount++;
    }
    return {
      name: a.name,
      role: a.role,
      status: a.status,
      taskCount: tasks.length,
      assignedCount,
      inProgressCount,
      reviewCount,
      currentTask: pickCurrentTask(tasks),
    };
  });
}

export function selectKanbanColumns(state: LabState): KanbanColumn[] {
  const buckets: Record<TaskStatus, KanbanTask[]> = {
    todo: [], assigned: [], in_progress: [], review: [], done: [],
  };
  for (const t of state.kanban.tasks) buckets[t.status].push(t);
  return TASK_STATUS_ORDER.map(status => ({
    status,
    label: TASK_STATUS_LABEL[status],
    tasks: buckets[status],
  }));
}

export function selectMeetingSummary(state: LabState): MeetingSummary | null {
  if (!state.meeting) return null;
  const phaseIndex = MEETING_PHASES.indexOf(state.meeting.phase);
  return {
    id: state.meeting.id,
    phase: state.meeting.phase,
    phaseIndex: phaseIndex >= 0 ? phaseIndex : 0,
    totalPhases: MEETING_PHASES.length,
    participants: state.meeting.participants,
    decisionMaker: state.meeting.decisionMaker,
  };
}

export function selectRecentMessages(state: LabState, limit = 20): AgentMessage[] {
  return state.messages.slice(-limit);
}

export function selectDecisionLog(state: LabState): DecisionEntry[] {
  return state.messages
    .filter(m => m.type === 'decision')
    .map(m => ({ from: m.from, content: m.content, timestamp: m.timestamp }));
}

export function selectSystemHealth(state: LabState, connected: boolean): SystemHealth {
  return {
    connected,
    agentCount: state.agents.length,
    activeCount: state.agents.filter(a => isActiveWorkStatus(a.status)).length,
    readyCount: state.agents.filter(a => a.status === 'ready').length,
    taskTotal: state.kanban.tasks.length,
    taskDone: state.kanban.tasks.filter(t => t.status === 'done').length,
  };
}

// --- Hook (memoised selectors for React) ---

export function useDashboardSelectors(state: LabState, connected: boolean): DashboardModel {
  const agentSummaries = useMemo(() => selectAgentSummaries(state), [state.agents, state.kanban]);
  const kanbanColumns = useMemo(() => selectKanbanColumns(state), [state.kanban]);
  const meetingSummary = useMemo(() => selectMeetingSummary(state), [state.meeting]);
  const recentMessages = useMemo(() => selectRecentMessages(state), [state.messages]);
  const decisionLog = useMemo(() => selectDecisionLog(state), [state.messages]);
  const systemHealth = useMemo(() => selectSystemHealth(state, connected), [state.agents, state.kanban, connected]);

  return { agentSummaries, kanbanColumns, meetingSummary, recentMessages, decisionLog, systemHealth };
}
