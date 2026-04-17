/**
 * status-meta.ts — canonical web-facing metadata for guided-dispatch semantics.
 *
 * This is the single source of truth for task status and agent runtime status
 * labels, ordering, colours, and grouping helpers used across the web layer.
 * Import from here instead of repeating ad-hoc maps in individual components.
 */

import type { AgentRuntimeStatus, KanbanTask, TaskStatus } from '@agora-lab/core';

// ---------------------------------------------------------------------------
// Task status metadata
// ---------------------------------------------------------------------------

export const TASK_STATUS_ORDER: readonly TaskStatus[] = [
  'todo',
  'assigned',
  'in_progress',
  'review',
  'done',
];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Todo',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

/** Top-border accent class for Kanban column headers (Dashboard). */
export const TASK_STATUS_ACCENT: Record<TaskStatus, string> = {
  todo: 'border-slate-500',
  assigned: 'border-purple-500',
  in_progress: 'border-blue-500',
  review: 'border-amber-500',
  done: 'border-emerald-500',
};

/** Count-badge background + text classes for Kanban column headers (Dashboard). */
export const TASK_STATUS_BADGE: Record<TaskStatus, string> = {
  todo: 'bg-slate-500/15 text-slate-400',
  assigned: 'bg-purple-500/15 text-purple-400',
  in_progress: 'bg-blue-500/15 text-blue-400',
  review: 'bg-amber-500/15 text-amber-400',
  done: 'bg-emerald-500/15 text-emerald-400',
};

/**
 * Theme-aware header classes for Kanban column headers (KanbanOverlay).
 * Uses opacity-scaled backgrounds + border accent so both light and dark
 * themes look correct. Replaces the old TASK_STATUS_BG solid-dark classes.
 */
export const TASK_STATUS_HEADER: Record<TaskStatus, string> = {
  todo: 'border-l-4 border-slate-500 bg-slate-500/10',
  assigned: 'border-l-4 border-purple-500 bg-purple-500/10',
  in_progress: 'border-l-4 border-blue-500 bg-blue-500/10',
  review: 'border-l-4 border-amber-500 bg-amber-500/10',
  done: 'border-l-4 border-emerald-500 bg-emerald-500/10',
};

// ---------------------------------------------------------------------------
// Agent runtime status metadata
// ---------------------------------------------------------------------------

export const AGENT_STATUS_ORDER: readonly AgentRuntimeStatus[] = [
  'offline',
  'ready',
  'assigned',
  'working',
  'meeting',
  'review',
];

export const AGENT_STATUS_LABEL: Record<AgentRuntimeStatus, string> = {
  offline: 'Offline',
  ready: 'Ready',
  assigned: 'Assigned',
  working: 'Working',
  meeting: 'Meeting',
  review: 'Review',
};

/** One-liner describing what the status means in guided-dispatch terms. */
export const AGENT_STATUS_DESCRIPTION: Record<AgentRuntimeStatus, string> = {
  offline: 'No active session',
  ready: 'Idle — awaiting dispatch',
  assigned: 'Task dispatched, intake in progress',
  working: 'Actively executing assigned task',
  meeting: 'In a collaborative review meeting',
  review: 'Reviewing research output',
};

/** Filled dot background class (for status indicators). */
export const AGENT_STATUS_DOT: Record<AgentRuntimeStatus, string> = {
  offline: 'bg-slate-600',
  ready: 'bg-blue-400',
  assigned: 'bg-cyan-400',
  working: 'bg-emerald-400',
  meeting: 'bg-amber-400',
  review: 'bg-purple-400',
};

/** Ring class used around status dots (for roster cards). */
export const AGENT_STATUS_RING: Record<AgentRuntimeStatus, string> = {
  offline: 'ring-slate-600/30',
  ready: 'ring-blue-400/30',
  assigned: 'ring-cyan-400/30',
  working: 'ring-emerald-400/30',
  meeting: 'ring-amber-400/30',
  review: 'ring-purple-400/30',
};

// ---------------------------------------------------------------------------
// Dispatch-semantics helpers
// ---------------------------------------------------------------------------

const CURRENT_TASK_PRIORITY: readonly TaskStatus[] = ['review', 'in_progress', 'assigned'];

/**
 * Statuses that represent an agent doing real work in the dispatch pipeline.
 * `ready` is NOT included — a ready agent is idle, awaiting dispatch.
 * `offline` is NOT included — no session exists.
 */
export const ACTIVE_WORK_STATUSES: ReadonlySet<AgentRuntimeStatus> = new Set([
  'assigned',
  'working',
  'meeting',
  'review',
]);

/** Returns true when the agent is actively doing work (not offline or idle-ready). */
export function isActiveWorkStatus(status: AgentRuntimeStatus): boolean {
  return ACTIVE_WORK_STATUSES.has(status);
}

/**
 * Returns a short roster-group label for a given status.
 * Used to visually separate idle-ready from active agents.
 */
export function agentStatusGroup(
  status: AgentRuntimeStatus,
): 'offline' | 'available' | 'active' {
  if (status === 'offline') return 'offline';
  if (status === 'ready') return 'available';
  return 'active';
}

/**
 * Returns the single most relevant active task for an agent following dispatch
 * priority: review > in_progress > assigned, with updatedAt as the tiebreaker
 * inside the same status lane.
 * Returns null when the agent has no tasks in an active-work status.
 * todo/done tasks are intentionally excluded — they are not "current".
 */
export function pickCurrentTask(tasks: KanbanTask[]): KanbanTask | null {
  for (const status of CURRENT_TASK_PRIORITY) {
    const matchingTasks = tasks
      .filter((task) => task.status === status)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    if (matchingTasks.length > 0) {
      return matchingTasks[0];
    }
  }
  return null;
}
