import type { AgentSummary } from '../../hooks/useDashboardSelectors.js';
import {
  AGENT_STATUS_DOT,
  AGENT_STATUS_RING,
  AGENT_STATUS_LABEL,
  AGENT_STATUS_DESCRIPTION,
  AGENT_STATUS_ORDER,
  agentStatusGroup,
} from '../../status-meta.js';

interface Props {
  agents: AgentSummary[];
  selectedAgent: string | null;
  onSelectAgent: (name: string | null) => void;
}

export function AgentRosterPanel({ agents, selectedAgent, onSelectAgent }: Props) {
  return (
    <section className="dashboard-panel flex flex-col h-full" data-testid="agent-roster">
      <h2 className="panel-heading">Agents</h2>

      {agents.length === 0 ? (
        <p className="text-slate-500 text-sm px-3 py-2">No agents connected</p>
      ) : (
        <ul className="flex-1 overflow-y-auto space-y-1 px-3 pb-3">
          {agents.map(a => {
            const selected = a.name === selectedAgent;
            const group = agentStatusGroup(a.status);
            return (
              <li key={a.name}>
                <button
                  onClick={() => onSelectAgent(selected ? null : a.name)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                    selected
                      ? 'bg-indigo-500/15 ring-1 ring-indigo-400/40'
                      : 'hover:bg-white/5'
                  }`}
                  title={AGENT_STATUS_DESCRIPTION[a.status]}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${AGENT_STATUS_DOT[a.status]} ring-2 ${AGENT_STATUS_RING[a.status]}`}
                    />
                    <span className="text-sm font-medium agent-name truncate">{a.name}</span>
                    {group === 'available' && (
                      <span className="ml-auto text-[10px] text-blue-400/70">idle</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-400 pl-[18px]">
                    <span>{a.role}</span>
                    <span className="text-slate-500">{AGENT_STATUS_LABEL[a.status]}</span>
                    {a.currentTask && group === 'active' && (
                      <span className="truncate text-slate-400" title={a.currentTask.title}>
                        · {a.currentTask.title}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Status summary footer */}
      <div className="border-t border-white/5 px-3 py-2 grid grid-cols-3 gap-1 text-center text-xs text-slate-500">
        {AGENT_STATUS_ORDER.map(s => {
          const count = agents.filter(a => a.status === s).length;
          return (
            <div key={s}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${AGENT_STATUS_DOT[s]} mr-1`} />
              {count} {AGENT_STATUS_LABEL[s].toLowerCase()}
            </div>
          );
        })}
      </div>
    </section>
  );
}
