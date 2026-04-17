import type { KanbanBoard, KanbanTask, TaskStatus, TaskPriority } from './types.js';

const TASK_RE = /^- \[(P[0-3])\] #(\d{3}) (.+?)(?:\s*\(assignee:\s*(.+?)\))?(?:\s*<!--\s*created:(\S+)\s+updated:(\S+)\s*-->)?$/;

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

  for (const line of markdown.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      const heading = trimmed.slice(3).trim();
      currentStatus = STATUS_HEADERS[heading] ?? null;
      continue;
    }
    if (currentStatus && trimmed.startsWith('- [')) {
      const m = trimmed.match(TASK_RE);
      if (m) {
        const now = new Date().toISOString();
        tasks.push({
          id: m[2],
          priority: m[1] as TaskPriority,
          title: m[3],
          assignee: m[4] || undefined,
          status: currentStatus,
          createdAt: m[5] || now,
          updatedAt: m[6] || now,
        });
      }
    }
  }
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
      let line = `- [${t.priority}] #${t.id} ${t.title}`;
      if (t.assignee) line += ` (assignee: ${t.assignee})`;
      line += ` <!-- created:${t.createdAt} updated:${t.updatedAt} -->`;
      lines.push(line);
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
  opts: { title: string; priority: TaskPriority; assignee?: string },
): KanbanBoard {
  const now = new Date().toISOString();
  const task: KanbanTask = {
    id: nextId(board),
    title: opts.title,
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
  findTask(board, taskId);
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
