import type { DecisionEntry, SystemHealth } from '../../hooks/useDashboardSelectors.js';

interface Props {
  health: SystemHealth;
  decisions: DecisionEntry[];
}

export function StatusBar({ health, decisions }: Props) {
  const lastDecision = decisions.length > 0 ? decisions[decisions.length - 1] : null;

  return (
    <footer className="dashboard-status-bar" data-testid="status-bar">
      {/* Connection health chip */}
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{
            background: health.connected ? 'var(--status-ok)' : 'var(--status-err)',
            boxShadow: health.connected
              ? '0 0 0 3px var(--status-ok-ring)'
              : '0 0 0 3px var(--status-err-ring)',
          }}
        />
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {health.connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Quick stats */}
      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>{health.agentCount} agent{health.agentCount !== 1 ? 's' : ''}</span>
        <span>{health.activeCount} active</span>
        <span>{health.taskDone}/{health.taskTotal} tasks done</span>
      </div>

      {/* Latest decision */}
      <div className="flex-1 min-w-0 px-4">
        {lastDecision ? (
          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--status-ok)' }} className="mr-1">✓</span>
            <span style={{ color: 'var(--text-secondary)' }}>{lastDecision.from}:</span>{' '}
            {lastDecision.content.slice(0, 100)}
          </div>
        ) : (
          <div className="text-xs" style={{ color: 'var(--text-disabled)' }}>No decisions yet</div>
        )}
      </div>
    </footer>
  );
}
