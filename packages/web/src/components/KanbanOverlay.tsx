import { useState } from 'react';
import type { KanbanBoard } from '@agora-lab/core';
import {
  TASK_STATUS_ORDER,
  TASK_STATUS_LABEL,
  TASK_STATUS_HEADER,
} from '../status-meta.js';

interface AgentInfo {
  name: string;
  role: string;
  status: string;
}

interface Props {
  board: KanbanBoard;
  agents: AgentInfo[];
  send: (event: unknown) => void;
  onClose: () => void;
}

const PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;

function createAssignEvent(id: string, assignee: string) {
  const normalizedAssignee = assignee.trim();
  return normalizedAssignee
    ? { type: 'kanban:assign', id, assignee: normalizedAssignee }
    : { type: 'kanban:assign', id };
}

export function KanbanOverlay({ board, agents, send, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<string>('P1');
  const [assignee, setAssignee] = useState('');

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    send({ type: 'kanban:add', title: title.trim(), priority, assignee: assignee || undefined });
    setTitle('');
    setAssignee('');
  }

  return (
    <div className="lab-overlay-backdrop" data-kind="kanban" onClick={onClose}>
      <section className="shell-panel lab-overlay-panel lab-overlay-panel--wide" onClick={event => event.stopPropagation()}>
        <div className="lab-overlay__header">
          <div>
            <div className="lab-overlay__eyebrow">Shared board</div>
            <h2 className="lab-overlay__title">Research Task Board</h2>
            <p className="lab-overlay__subtitle">
              Dispatch work, rebalance ownership, and keep active tasks visible without losing the surrounding lab.
            </p>
          </div>
          <button type="button" onClick={onClose} className="shell-close-btn" aria-label="Close task board">
            ✕
          </button>
        </div>

        <div className="lab-overlay__body">
          <form onSubmit={handleAdd} className="overlay-form">
            <input
              type="text"
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Dispatch a new task"
              className="shell-input overlay-form__grow font-mono text-sm px-3 py-2"
            />
            <select
              value={priority}
              onChange={event => setPriority(event.target.value)}
              className="shell-select font-mono text-sm px-3 py-2"
            >
              {PRIORITIES.map(level => <option key={level} value={level}>{level}</option>)}
            </select>
            <select
              value={assignee}
              onChange={event => setAssignee(event.target.value)}
              className="shell-select font-mono text-sm px-3 py-2"
            >
              <option value="">Unassigned</option>
              {agents.map(agent => <option key={agent.name} value={agent.name}>{agent.name}</option>)}
            </select>
            <button type="submit" className="lab-action-button">Dispatch</button>
          </form>

          <div className="overlay-column-grid">
            {TASK_STATUS_ORDER.map(status => {
              const tasks = board.tasks.filter(task => task.status === status);
              return (
                <section key={status} className="overlay-column">
                  <div className={`overlay-column__header ${TASK_STATUS_HEADER[status]}`}>
                    <span>{TASK_STATUS_LABEL[status]}</span>
                    <span>{tasks.length}</span>
                  </div>
                  <div className="overlay-column__body">
                    {tasks.length === 0 ? (
                      <div className="overlay-column__empty">No tasks in this lane.</div>
                    ) : tasks.map(task => (
                      <div key={task.id} className="overlay-task-card">
                        <div className="overlay-task-card__title">[{task.priority}] #{task.id}</div>
                        <div className="overlay-task-card__body">{task.title}</div>
                        {task.assignee && <div className="overlay-task-card__assignee">{task.assignee}</div>}
                        <div className="overlay-task-card__controls">
                          <select
                            value={status}
                            onChange={event => send({ type: 'kanban:move', id: task.id, status: event.target.value })}
                            className="shell-select font-mono text-xs px-2 py-1 flex-1"
                          >
                            {TASK_STATUS_ORDER.map(nextStatus => <option key={nextStatus} value={nextStatus}>{TASK_STATUS_LABEL[nextStatus]}</option>)}
                          </select>
                          <select
                            value={task.assignee || ''}
                            onChange={event => send(createAssignEvent(task.id, event.target.value))}
                            className="shell-select font-mono text-xs px-2 py-1 flex-1"
                            title="Dispatch to agent"
                          >
                            <option value="">—</option>
                            {agents.map(agent => <option key={agent.name} value={agent.name}>{agent.name}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
