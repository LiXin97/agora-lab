import type { KanbanBoard, KanbanTask, TaskStatus, TaskPriority } from './types.js';

// Matches the HEADER line of a task: `- [P1] #001 <title-first-line>`.
// Title may continue across following lines (body). Assignee metadata and the
// `<!-- created:... updated:... -->` comment can appear anywhere in the block,
// typically on the final line of a multi-line body (see addTask/heredoc form).
const TASK_HEADER_RE = /^- \[(P[0-3])\] #(\d{3}) (.*)$/;
const ASSIGNEE_RE = /\(assignee:\s*([^)]+)\)/;
const META_RE = /<!--\s*created:(\S+)\s+updated:(\S+)\s*-->/;

const STATUS_HEADERS: Record<string, TaskStatus> = {
  'Backlog': 'todo',   // legacy compatibility
  'Todo': 'todo',
  'Assigned': 'assigned',
  'In Progress': 'in_progress',
  'Review': 'review',
  'Done': 'done',
};

const STATUS_TO_HEADER: Record<TaskStatus, string> = {
  todo: 'Todo',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const CURRENT_TASK_PRIORITY: readonly TaskStatus[] = ['review', 'in_progress', 'assigned'];

export function parseKanbanBoard(markdown: string): KanbanBoard {
  const tasks: KanbanTask[] = [];
  let currentStatus: TaskStatus | null = null;

  const lines = markdown.split('\n');

  const flushTask = (headerMatch: RegExpMatchArray, bodyLines: string[]): KanbanTask => {
    // Reassemble the whole block, strip assignee/meta for clean title+body.
    const full = [headerMatch[3], ...bodyLines].join('\n').trim();
    const assigneeMatch = full.match(ASSIGNEE_RE);
    const metaMatch = full.match(META_RE);
    const cleaned = full
      .replace(ASSIGNEE_RE, '')
      .replace(META_RE, '')
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    // Title = first non-empty line; body = the rest.
    const cleanedLines = cleaned.split('\n');
    const title = (cleanedLines[0] ?? '').trim();
    const body = cleanedLines.slice(1).join('\n').trim() || undefined;
    const now = new Date().toISOString();
    return {
      id: headerMatch[2],
      priority: headerMatch[1] as TaskPriority,
      title,
      body,
      assignee: assigneeMatch?.[1].trim() || undefined,
      status: currentStatus!,
      createdAt: metaMatch?.[1] || now,
      updatedAt: metaMatch?.[2] || now,
    };
  };

  let pendingHeader: RegExpMatchArray | null = null;
  let pendingBody: string[] = [];

  const commit = () => {
    if (pendingHeader && currentStatus) {
      tasks.push(flushTask(pendingHeader, pendingBody));
    }
    pendingHeader = null;
    pendingBody = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith('## ')) {
      commit();
      const heading = trimmed.slice(3).trim();
      currentStatus = STATUS_HEADERS[heading] ?? null;
      continue;
    }

    const headerMatch = trimmed.match(TASK_HEADER_RE);
    if (currentStatus && headerMatch) {
      commit();
      pendingHeader = headerMatch;
      pendingBody = [];
      continue;
    }

    if (pendingHeader) {
      // Continuation line. Stop at the next `- [P?]` header (already handled
      // above) or a new `## ` section. Blank lines are kept — they matter for
      // separating Deliverable / Acceptance Criteria blocks when we render the
      // task back out.
      pendingBody.push(line);
    }
  }
  commit();

  return { tasks };
}

export function serializeKanbanBoard(board: KanbanBoard): string {
  const grouped: Record<TaskStatus, KanbanTask[]> = {
    todo: [], assigned: [], in_progress: [], review: [], done: [],
  };
  for (const t of board.tasks) {
    grouped[t.status].push(t);
  }

  const lines: string[] = ['# Research Task Board', ''];
  for (const status of ['todo', 'assigned', 'in_progress', 'review', 'done'] as TaskStatus[]) {
    lines.push(`## ${STATUS_TO_HEADER[status]}`);
    for (const t of grouped[status]) {
      const trailer = `${t.assignee ? ` (assignee: ${t.assignee})` : ''} <!-- created:${t.createdAt} updated:${t.updatedAt} -->`;
      if (t.body && t.body.trim().length > 0) {
        lines.push(`- [${t.priority}] #${t.id} ${t.title}`);
        lines.push('');
        lines.push(t.body);
        // Append assignee + meta to the last non-empty line of the body, so a
        // subsequent parse re-attaches them. Line-internal edits via Edit tool
        // rely on stable trailing metadata, so tack them onto the final line.
        const last = lines.pop() ?? '';
        lines.push(`${last}${trailer}`);
      } else {
        lines.push(`- [${t.priority}] #${t.id} ${t.title}${trailer}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function nextId(board: KanbanBoard): string {
  let max = 0;
  for (const t of board.tasks) {
    const n = parseInt(t.id, 10);
    if (n > max) max = n;
  }
  return String(max + 1).padStart(3, '0');
}

export function addTask(
  board: KanbanBoard,
  opts: { title: string; priority: TaskPriority; assignee?: string; body?: string },
): KanbanBoard {
  const now = new Date().toISOString();
  // If caller passed a multi-line title (as the CLI does when `-T` receives a
  // heredoc), split into title + body so the header regex is always clean.
  let title = opts.title;
  let body = opts.body;
  if (title.includes('\n')) {
    const parts = title.split('\n');
    title = (parts[0] ?? '').trim();
    const rest = parts.slice(1).join('\n').trim();
    body = body ? `${rest}\n\n${body}` : rest || undefined;
  }
  const task: KanbanTask = {
    id: nextId(board),
    title,
    body: body && body.trim().length > 0 ? body.trim() : undefined,
    priority: opts.priority,
    assignee: opts.assignee,
    status: opts.assignee ? 'assigned' : 'todo',
    createdAt: now,
    updatedAt: now,
  };
  return { tasks: [...board.tasks, task] };
}

function findTask(board: KanbanBoard, taskId: string): KanbanTask {
  const t = board.tasks.find((t) => t.id === taskId);
  if (!t) throw new Error(`Task #${taskId} not found`);
  return t;
}

export function moveTask(board: KanbanBoard, taskId: string, newStatus: TaskStatus): KanbanBoard {
  const task = findTask(board, taskId);
  if (newStatus === 'in_progress' && !task.assignee) {
    throw new Error(`Task #${taskId} cannot enter in_progress without an assignee`);
  }
  const now = new Date().toISOString();
  return {
    tasks: board.tasks.map((t) => {
      if (t.id !== taskId) return t;

      if (newStatus === 'todo') {
        const { assignee: _removedAssignee, ...todoTask } = t;
        return { ...todoTask, status: newStatus, updatedAt: now };
      }

      return { ...t, status: newStatus, updatedAt: now };
    }),
  };
}

export function assignTask(board: KanbanBoard, taskId: string, assignee?: string): KanbanBoard {
  findTask(board, taskId);
  const now = new Date().toISOString();
  const normalizedAssignee = assignee?.trim();
  return {
    tasks: board.tasks.map((t) => {
      if (t.id !== taskId) return t;

      const updatedTask = { ...t, updatedAt: now };
      if (normalizedAssignee) {
        const newStatus = t.status === 'todo' ? 'assigned' : t.status;
        return { ...updatedTask, assignee: normalizedAssignee, status: newStatus };
      }

      const newStatus = t.status === 'assigned' ? 'todo' : t.status;
      const { assignee: _removedAssignee, ...unassignedTask } = updatedTask;
      return { ...unassignedTask, status: newStatus };
    }),
  };
}

/**
 * Returns the most relevant active task for an assignee using the shared
 * guided-dispatch priority chain and most-recent update time as the tiebreaker.
 */
export function pickCurrentTask(tasks: KanbanTask[]): KanbanTask | undefined {
  for (const status of CURRENT_TASK_PRIORITY) {
    const matchingTasks = tasks
      .filter((task) => task.status === status)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    if (matchingTasks.length > 0) {
      return matchingTasks[0];
    }
  }
  return undefined;
}
