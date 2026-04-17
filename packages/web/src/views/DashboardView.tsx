import type { LabState } from '../hooks/useLabState.js';
import type { LabAction } from '../hooks/useLabState.js';
import type { DashboardModel } from '../hooks/useDashboardSelectors.js';
import { AgentRosterPanel } from '../components/dashboard/AgentRosterPanel.js';
import { KanbanWorkbench } from '../components/dashboard/KanbanWorkbench.js';
import { ActivityPanel } from '../components/dashboard/ActivityPanel.js';
import { DecisionHealthPanel } from '../components/dashboard/DecisionHealthPanel.js';

interface Props {
  state: LabState;
  dashboard: DashboardModel;
  send: (event: unknown) => void;
  dispatch: React.Dispatch<LabAction>;
}

export function DashboardView({ state, dashboard, send, dispatch }: Props) {
  const {
    agentSummaries,
    kanbanColumns,
    meetingSummary,
    recentMessages,
    decisionLog,
    systemHealth,
  } = dashboard;

  return (
    <div className="dashboard-workbench" data-testid="dashboard-view">
      <div className="dashboard-grid">
        {/* Left: Agent roster */}
        <div className="dashboard-left">
          <AgentRosterPanel
            agents={agentSummaries}
            selectedAgent={state.selectedAgent}
            onSelectAgent={(name) => dispatch({ type: 'ui:selectAgent', agent: name })}
          />
        </div>

        {/* Center: Kanban workbench */}
        <div className="dashboard-center">
          <KanbanWorkbench
            columns={kanbanColumns}
            agents={state.agents}
            selectedAgent={state.selectedAgent}
            send={send}
          />
        </div>

        {/* Right: Activity / Messages + Meeting */}
        <div className="dashboard-right">
          <ActivityPanel
            messages={recentMessages}
            meetingSummary={meetingSummary}
            meeting={state.meeting}
            agents={state.agents}
            selectedAgent={state.selectedAgent}
            send={send}
          />
        </div>
      </div>

      <DecisionHealthPanel
        decisions={decisionLog}
        health={systemHealth}
        columns={kanbanColumns}
        meetingSummary={meetingSummary}
      />
    </div>
  );
}
