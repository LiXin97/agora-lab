import type { AgentMessage, AgentRuntimeStatus, KanbanBoard } from '@agora-lab/core';
import { buildMessageKey } from '../utils/message.js';
import {
  AGENT_STATUS_DOT,
  AGENT_STATUS_LABEL,
  AGENT_STATUS_DESCRIPTION,
  TASK_STATUS_LABEL,
  agentStatusGroup,
  pickCurrentTask,
} from '../status-meta.js';

interface AgentInfo {
  name: string;
  role: string;
  status: AgentRuntimeStatus;
}

interface Props {
  agent: AgentInfo | undefined;
  kanban: KanbanBoard;
  messages: AgentMessage[];
  onClose: () => void;
}

export function AgentSidebar({ agent, kanban, messages, onClose }: Props) {
  if (!agent) return null;

  const tasks = kanban.tasks.filter(task => task.assignee === agent.name);
  const currentTask = pickCurrentTask(tasks);
  const recentMessages = messages
    .filter(message => message.from === agent.name || message.to === agent.name)
    .slice(-5)
    .reverse();
  const group = agentStatusGroup(agent.status);

  return (
    <aside className="shell-sidebar lab-sidebar">
      <div className="lab-sidebar__header">
        <div>
          <div className="lab-sidebar__eyebrow">Agent detail</div>
          <h2 className="lab-sidebar__title">{agent.name}</h2>
          <p className="lab-sidebar__subtitle">{agent.role}</p>
        </div>
        <button type="button" onClick={onClose} className="shell-close-btn" aria-label="Close agent detail">
          ✕
        </button>
      </div>

      <div className="lab-sidebar__content">
        <section className="lab-sidebar__section">
          <div className="lab-sidebar__status-row">
            <span className={`lab-sidebar__status-dot w-2.5 h-2.5 rounded-full ${AGENT_STATUS_DOT[agent.status]}`} />
            <div>
              <div className="lab-sidebar__section-title">{AGENT_STATUS_LABEL[agent.status]}</div>
              <div className="lab-sidebar__helper">{AGENT_STATUS_DESCRIPTION[agent.status]}</div>
            </div>
          </div>
        </section>

        {currentTask && group === 'active' && (
          <section className="lab-sidebar__section lab-sidebar__section--accent shell-active-task">
            <div className="lab-sidebar__eyebrow">Current task</div>
            <div className="lab-sidebar__section-title">{currentTask.title}</div>
            <div className="lab-sidebar__helper">
              {currentTask.priority} · {TASK_STATUS_LABEL[currentTask.status]}
            </div>
          </section>
        )}

        <section className="lab-sidebar__section">
          <div className="lab-sidebar__section-heading">
            <span className="lab-sidebar__section-title">Assigned tasks</span>
            <span className="lab-sidebar__badge">{tasks.length}</span>
          </div>
          {tasks.length === 0 ? (
            <p className="lab-sidebar__helper">No assigned tasks</p>
          ) : (
            <div className="lab-sidebar__list">
              {tasks.map(task => (
                <div key={task.id} className="lab-sidebar__item">
                  <div className="lab-sidebar__item-title">#{task.id} {task.title}</div>
                  <div className="lab-sidebar__helper">{task.priority} · {TASK_STATUS_LABEL[task.status]}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lab-sidebar__section">
          <div className="lab-sidebar__section-heading">
            <span className="lab-sidebar__section-title">Recent messages</span>
            <span className="lab-sidebar__badge">{recentMessages.length}</span>
          </div>
          {recentMessages.length === 0 ? (
            <p className="lab-sidebar__helper">No recent messages</p>
          ) : (
            <div className="lab-sidebar__list">
              {recentMessages.map(message => (
                <div key={buildMessageKey(message)} className="lab-sidebar__item">
                  <div className="lab-sidebar__item-title">{message.from} → {message.to}</div>
                  <div className="lab-sidebar__helper line-clamp-2">{message.content}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
