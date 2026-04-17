import { z } from 'zod';
import type { AgentRuntimeFacts, AgentRuntimeStatus, KanbanBoard, Meeting, RuntimeState, TaskPriority } from './types.js';
import { addTask } from './kanban.js';

const RuntimeStateSchema = z.object({
  version: z.number(),
  starterSeededAt: z.string().optional(),
  supervisorKickoffSentAt: z.string().optional(),
  agentAutomation: z.record(z.object({
    lastPromptSignature: z.string().optional(),
    lastInjectedAt: z.string().optional(),
  })).optional(),
});

export function parseRuntimeState(json: string): RuntimeState {
  const parsed = RuntimeStateSchema.parse(JSON.parse(json));
  return {
    ...parsed,
    agentAutomation: parsed.agentAutomation ?? {},
  };
}

export function serializeRuntimeState(state: RuntimeState): string {
  return JSON.stringify(state, null, 2);
}

export function buildStarterTasks(
  researchTopic: string,
): Array<{ title: string; priority: TaskPriority }> {
  return [
    { title: `Clarify research objective and success criteria for: ${researchTopic}`, priority: 'P1' },
    { title: 'Collect related work and key references', priority: 'P1' },
    { title: 'Propose experiment or validation directions', priority: 'P2' },
    { title: 'Prepare implementation or benchmark setup', priority: 'P2' },
    { title: 'Define review and evaluation checkpoints', priority: 'P2' },
  ];
}

export function seedStarterTasks(
  board: KanbanBoard,
  state: RuntimeState,
  researchTopic: string,
  now: string = new Date().toISOString(),
): { board: KanbanBoard; state: RuntimeState } {
  if (state.starterSeededAt) {
    return { board, state };
  }
  const starters = buildStarterTasks(researchTopic);
  let updatedBoard = board;
  for (const t of starters) {
    updatedBoard = addTask(updatedBoard, { title: t.title, priority: t.priority });
  }
  return {
    board: updatedBoard,
    state: { ...state, starterSeededAt: now },
  };
}

export function deriveAgentStatus(facts: AgentRuntimeFacts): AgentRuntimeStatus {
  if (!facts.hasSession) return 'offline';
  if (facts.inMeeting) return 'meeting';
  if (facts.hasReviewTask) return 'review';
  if (facts.hasInProgressTask) return 'working';
  if (facts.hasAssignedTask) return 'assigned';
  return 'ready';
}

export async function collectAgentFacts(
  agentName: string,
  board: KanbanBoard,
  latestMeeting: Meeting | null,
  isSessionRunning: () => Promise<boolean>,
): Promise<AgentRuntimeFacts> {
  let assignedCount = 0;
  let inProgressCount = 0;
  let reviewCount = 0;

  for (const task of board.tasks) {
    if (task.assignee !== agentName) continue;
    if (task.status === 'assigned') assignedCount += 1;
    if (task.status === 'in_progress') inProgressCount += 1;
    if (task.status === 'review') reviewCount += 1;
  }

  const inMeeting =
    latestMeeting != null &&
    latestMeeting.phase !== 'DECISION' &&
    latestMeeting.participants.includes(agentName);

  return {
    hasSession: await isSessionRunning(),
    inMeeting,
    hasReviewTask: reviewCount > 0,
    hasInProgressTask: inProgressCount > 0,
    hasAssignedTask: assignedCount > 0,
  };
}
