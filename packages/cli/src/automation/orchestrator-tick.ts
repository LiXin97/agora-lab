import type { AgentMessage, KanbanBoard, KanbanTask, Meeting } from '@agora-lab/core';

export interface OrchestratorTickInput {
  board: KanbanBoard;
  meeting: Meeting | null;
  messages: AgentMessage[];
  nowMs: number;
  /** In-progress task is "stuck" once updatedAt is older than this. */
  stuckTaskMs?: number;
  /** Meeting in same phase longer than this is "stalled". */
  stalledMeetingMs?: number;
}

export interface StuckTask {
  id: string;
  title: string;
  status: 'in_progress' | 'review';
  assignee?: string;
  ageMs: number;
}

export interface OrchestratorSummary {
  /** True if anything in this summary is worth supervisor attention. */
  hasSignal: boolean;
  inProgressCount: number;
  reviewCount: number;
  doneCount: number;
  todoCount: number;
  assignedCount: number;
  stuckTasks: StuckTask[];
  reviewColumnEmptyForMs: number | null;
  msSinceLastTaskUpdate: number | null;
  msSinceLastMessage: number | null;
  meetingPhase: string | null;
  meetingPhaseAgeMs: number | null;
  /** Pairs (assignee, blocking-task-id) where someone is blocked by another's task. */
  blockingChain: string[];
}

const DEFAULT_STUCK_TASK_MS = 2 * 60 * 60 * 1000;
const DEFAULT_STALLED_MEETING_MS = 60 * 60 * 1000;

export function buildOrchestratorSummary(input: OrchestratorTickInput): OrchestratorSummary {
  const { board, meeting, messages, nowMs } = input;
  const stuckMs = input.stuckTaskMs ?? DEFAULT_STUCK_TASK_MS;
  const stalledMeetingMs = input.stalledMeetingMs ?? DEFAULT_STALLED_MEETING_MS;

  const counts = { todo: 0, assigned: 0, in_progress: 0, review: 0, done: 0 };
  let latestTaskUpdateMs: number | null = null;
  const stuckTasks: StuckTask[] = [];

  for (const t of board.tasks) {
    counts[t.status]++;
    const updatedMs = Date.parse(t.updatedAt);
    if (!Number.isNaN(updatedMs)) {
      if (latestTaskUpdateMs === null || updatedMs > latestTaskUpdateMs) {
        latestTaskUpdateMs = updatedMs;
      }
      if ((t.status === 'in_progress' || t.status === 'review') && nowMs - updatedMs >= stuckMs) {
        stuckTasks.push({
          id: t.id,
          title: t.title,
          status: t.status,
          assignee: t.assignee,
          ageMs: nowMs - updatedMs,
        });
      }
    }
  }

  // "Review empty" is only meaningful if there's something flowing — i.e. tasks
  // exist and at least one is in_progress. An empty board shouldn't trigger it.
  let reviewColumnEmptyForMs: number | null = null;
  if (counts.review === 0 && counts.in_progress > 0 && latestTaskUpdateMs !== null) {
    reviewColumnEmptyForMs = nowMs - latestTaskUpdateMs;
  }

  let latestMessageMs: number | null = null;
  for (const m of messages) {
    const ms = Date.parse(m.timestamp);
    if (!Number.isNaN(ms) && (latestMessageMs === null || ms > latestMessageMs)) {
      latestMessageMs = ms;
    }
  }

  const meetingPhase = meeting?.phase ?? null;
  let meetingPhaseAgeMs: number | null = null;
  if (meeting) {
    // We don't track per-phase transition times, so fall back to meeting age.
    // Stale-phase detection becomes "meeting alive but no recent task/message
    // activity" — combined with msSinceLastTaskUpdate this is enough signal.
    const created = Date.parse(meeting.createdAt);
    if (!Number.isNaN(created)) meetingPhaseAgeMs = nowMs - created;
  }

  const blockingChain = computeBlockingChain(board.tasks);

  const meetingStalled =
    meeting !== null && meetingPhaseAgeMs !== null && meetingPhaseAgeMs >= stalledMeetingMs;

  const hasSignal =
    stuckTasks.length > 0 ||
    reviewColumnEmptyForMs !== null ||
    meetingStalled;

  return {
    hasSignal,
    inProgressCount: counts.in_progress,
    reviewCount: counts.review,
    doneCount: counts.done,
    todoCount: counts.todo,
    assignedCount: counts.assigned,
    stuckTasks,
    reviewColumnEmptyForMs,
    msSinceLastTaskUpdate: latestTaskUpdateMs === null ? null : nowMs - latestTaskUpdateMs,
    msSinceLastMessage: latestMessageMs === null ? null : nowMs - latestMessageMs,
    meetingPhase,
    meetingPhaseAgeMs,
    blockingChain,
  };
}

function computeBlockingChain(tasks: KanbanTask[]): string[] {
  // Heuristic: any in_progress task assigned to agent X whose body/title mentions
  // another in_progress task ID is recorded as "X blocked by #ID". We don't
  // require explicit dependency metadata — just surface signal so the supervisor
  // can investigate. Cheap and string-based; intentionally not graph-correct.
  const inProgressIds = new Set(tasks.filter((t) => t.status === 'in_progress').map((t) => t.id));
  const chain: string[] = [];
  for (const t of tasks) {
    if (t.status !== 'in_progress' || !t.assignee) continue;
    const haystack = `${t.title}\n${t.body ?? ''}`;
    for (const otherId of inProgressIds) {
      if (otherId === t.id) continue;
      const re = new RegExp(`#${otherId}\\b`);
      if (re.test(haystack)) chain.push(`${t.assignee}@#${t.id} → #${otherId}`);
    }
  }
  return chain;
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h${rem}m`;
}

export function renderOrchestratorPrompt(s: OrchestratorSummary): string {
  const lines: string[] = [];
  lines.push('[Lab orchestrator tick — you are the supervisor]');
  lines.push('');
  lines.push('Global state snapshot (the runtime aggregated this for you — single agents cannot see time-axis signal):');
  lines.push(
    `- Kanban: todo=${s.todoCount} assigned=${s.assignedCount} in_progress=${s.inProgressCount} review=${s.reviewCount} done=${s.doneCount}`,
  );
  if (s.msSinceLastTaskUpdate !== null) {
    lines.push(`- Last task state change: ${formatDuration(s.msSinceLastTaskUpdate)} ago`);
  }
  if (s.msSinceLastMessage !== null) {
    lines.push(`- Last message in shared/messages/: ${formatDuration(s.msSinceLastMessage)} ago`);
  }
  if (s.reviewColumnEmptyForMs !== null) {
    lines.push(
      `- ⚠ Review column has been empty for ${formatDuration(s.reviewColumnEmptyForMs)} despite ${s.inProgressCount} in_progress task(s) — no one is moving work to review.`,
    );
  }
  if (s.meetingPhase) {
    lines.push(
      `- Active meeting in phase ${s.meetingPhase}${s.meetingPhaseAgeMs !== null ? ` (created ${formatDuration(s.meetingPhaseAgeMs)} ago)` : ''}`,
    );
  }
  if (s.stuckTasks.length > 0) {
    lines.push('');
    lines.push('Stuck tasks (in_progress / review with no update in >2h):');
    for (const t of s.stuckTasks) {
      lines.push(`  • #${t.id} (${t.assignee ?? 'unassigned'}, ${t.status}, ${formatDuration(t.ageMs)} stale) — ${t.title}`);
    }
  }
  if (s.blockingChain.length > 0) {
    lines.push('');
    lines.push('Possible blocking chain (string-match heuristic — verify):');
    for (const link of s.blockingChain) lines.push(`  • ${link}`);
  }
  lines.push('');
  lines.push('Action policy:');
  lines.push('  1. Identify the root blocker. If it is your own task, execute it now — do not "stand down".');
  lines.push('  2. If a stuck task needs reassignment, decomposition, or de-prioritization, do it via `agora kanban` commands.');
  lines.push('  3. If you genuinely have no action, write a short status note to shared/messages/supervisor_to_user_<ts>_status.md explaining what is blocked and why, then go idle. Do NOT silently idle.');
  lines.push('  4. Do not reply to this tick — act.');
  return lines.join('\n');
}
