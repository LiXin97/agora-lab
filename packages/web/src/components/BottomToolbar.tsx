import type { AgentRuntimeStatus } from '@agora-lab/core';

interface AgentInfo {
  name: string;
  role: string;
  status: AgentRuntimeStatus;
}

interface Props {
  agents: AgentInfo[];
  selectedAgent: string | null;
  zoom: number;
  connected: boolean;
  onSelectAgent: (name: string) => void;
  onZoom: (dir: 1 | -1) => void;
  onResetCamera: () => void;
}

export function BottomToolbar({ agents, selectedAgent, zoom, connected, onSelectAgent, onZoom, onResetCamera }: Props) {
  return (
    <div className="shell-toolbar lab-toolbar">
      <div className="lab-toolbar__section">
        <span className="lab-toolbar__status-dot" data-connected={connected ? 'true' : 'false'} />
        <div className="lab-toolbar__status-copy">
          <div className="lab-toolbar__status-label">{connected ? 'Connected' : 'Disconnected'}</div>
          <div className="lab-toolbar__meta">{agents.length} agents visible</div>
        </div>
      </div>

      <div className="lab-toolbar__agents" aria-label="Agent quick select">
        {agents.length === 0 ? (
          <span className="lab-toolbar__meta">Waiting for agents…</span>
        ) : (
          agents.map(agent => (
            <button
              key={agent.name}
              type="button"
              onClick={() => onSelectAgent(agent.name)}
              className="lab-toolbar__agent-button"
              data-selected={selectedAgent === agent.name ? 'true' : 'false'}
            >
              {agent.name}
            </button>
          ))
        )}
      </div>

      <div className="lab-toolbar__section lab-toolbar__controls">
        <button type="button" onClick={onResetCamera} className="lab-toolbar__control-button" title="Reset camera">
          Reset
        </button>
        <button type="button" onClick={() => onZoom(-1)} className="lab-toolbar__icon-button" aria-label="Zoom out">
          −
        </button>
        <span className="lab-toolbar__zoom">{zoom}×</span>
        <button type="button" onClick={() => onZoom(1)} className="lab-toolbar__icon-button" aria-label="Zoom in">
          +
        </button>
      </div>
    </div>
  );
}
