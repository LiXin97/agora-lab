import { useState } from 'react';
import type { KanbanColumn } from '../../hooks/useDashboardSelectors.js';
import {
  TASK_STATUS_ACCENT,
  TASK_STATUS_BADGE,
  TASK_STATUS_ORDER,
  TASK_STATUS_LABEL,
} from '../../status-meta.js';

interface AgentInfo {
  name: string;
  role: string;
  status: string;
}

interface Props {
  columns: KanbanColumn[];
  agents: AgentInfo[];
  selectedAgent: string | null;
  send: (event: unknown) => void;
}

const PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;

function createAssignEvent(id: string, assignee: string) {
  const normalizedAssignee = assignee.trim();
  return normalizedAssignee
    ? { type: 'kanban:assign', id, assignee: normalizedAssignee }
    : { type: 'kanban:assign', id };
}

export function KanbanWorkbench({ columns, agents, selectedAgent, send }: Props) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<string>('P1');
  const [assignee, setAssignee] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    send({ type: 'kanban:add', title: title.trim(), priority, assignee: assignee || undefined });
    setTitle('');
    setAssignee('');
  }

  return (
    <section className="dashboard-panel flex flex-col h-full" data-testid="kanban-workbench">
      <div className="flex items-center justify-between">
        <h2 className="panel-heading">Task Board</h2>
        {selectedAgent && (
          <div className="mr-3 rounded-full border border-indigo-400/25 bg-indigo-500/10 px-2.5 py-1 text-[11px] text-indigo-300">
            Focus: {selectedAgent}
          </div>
        )}
      </div>

      {/* Add task form — dispatch semantics: assignee = dispatch target */}
      <form onSubmit={handleAdd} className="flex gap-2 px-3 pb-3 items-end flex-wrap">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="New task..."
          className="flex-1 min-w-[140px] bg-white/5 text-slate-100 text-sm rounded-md px-3 py-1.5 border border-white/10 focus:border-indigo-400 focus:outline-none placeholder:text-slate-600"
        />
        <select
          value={priority}
          onChange={e => setPriority(e.target.value)}
          className="bg-white/5 text-slate-300 text-sm rounded-md px-2 py-1.5 border border-white/10"
        >
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={assignee}
          onChange={e => setAssignee(e.target.value)}
          className="bg-white/5 text-slate-300 text-sm rounded-md px-2 py-1.5 border border-white/10"
        >
          <option value="">Unassigned</option>
          {agents.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
        </select>
        <button type="submit" className="btn-primary text-sm px-3 py-1.5">+ Dispatch</button>
      </form>

      {/* Kanban columns */}
      <div className="flex-1 flex gap-3 px-3 pb-3 overflow-x-auto min-h-0">
        {columns.map(col => (
          <div
            key={col.status}
            className={`min-w-[220px] flex-1 flex flex-col rounded-lg border-t-2 ${TASK_STATUS_ACCENT[col.status]} bg-white/[0.02] overflow-hidden`}
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-xs font-semibold text-slate-300">{col.label}</span>
              <span className={`text-[10px] font-medium rounded-full px-1.5 py-0.5 ${TASK_STATUS_BADGE[col.status]}`}>
                {col.tasks.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 px-2 pb-2">
              {col.tasks.length === 0 ? (
                <div className="rounded-md border border-dashed border-white/8 px-3 py-4 text-xs text-slate-600">
                  No tasks in {col.label.toLowerCase()}.
                </div>
              ) : (
                col.tasks.map(task => {
                  const isOpen = expanded.has(task.id);
                  const hasBody = !!task.body && task.body.trim().length > 0;
                  return (
                  <div
                    key={task.id}
                    className={`rounded-md p-2.5 group transition-colors ${
                      selectedAgent && task.assignee === selectedAgent
                        ? 'bg-indigo-500/12 ring-1 ring-indigo-400/30'
                        : 'bg-white/5 hover:bg-white/8'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => hasBody && toggleExpanded(task.id)}
                      className={`w-full flex items-start justify-between text-left ${hasBody ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <span className="text-xs font-medium kanban-task-title leading-tight flex-1">
                        {hasBody && <span className="text-slate-500 mr-1">{isOpen ? '▾' : '▸'}</span>}
                        {task.title}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1 flex-shrink-0">#{task.id}</span>
                    </button>
                    {isOpen && hasBody && (
                      <pre className="mt-2 whitespace-pre-wrap text-[11px] kanban-task-body bg-black/10 rounded p-2 leading-relaxed">
                        {task.body}
                      </pre>
                    )}
                    <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                      <span className={`font-medium ${task.priority === 'P0' ? 'text-red-400' : task.priority === 'P1' ? 'text-amber-400' : 'text-slate-500'}`}>
                        {task.priority}
                      </span>
                      {task.assignee && <span className="text-indigo-400">{task.assignee}</span>}
                    </div>
                    <div className="mt-2 flex gap-1">
                      <select
                        value={task.status}
                        onChange={e => send({ type: 'kanban:move', id: task.id, status: e.target.value })}
                        className="bg-white/5 text-slate-300 text-[11px] rounded px-1 py-0.5 border border-white/10 flex-1"
                      >
                        {TASK_STATUS_ORDER.map(s => <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>)}
                      </select>
                      <select
                        value={task.assignee || ''}
                        onChange={e => send(createAssignEvent(task.id, e.target.value))}
                        className="bg-white/5 text-slate-300 text-[11px] rounded px-1 py-0.5 border border-white/10 flex-1"
                        title="Dispatch to agent"
                      >
                        <option value="">—</option>
                        {agents.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                      </select>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
