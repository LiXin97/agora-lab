import type {
  DecisionEntry,
  KanbanColumn,
  MeetingSummary,
  SystemHealth,
} from '../../hooks/useDashboardSelectors.js';
import { formatTimestampLabel } from '../../utils/message.js';

interface Props {
  decisions: DecisionEntry[];
  health: SystemHealth;
  columns: KanbanColumn[];
  meetingSummary: MeetingSummary | null;
}

const MEETING_PHASE_LABELS: Record<string, string> = {
  PREPARE: 'Prepare',
  CROSS_READ: 'Cross Read',
  CHALLENGE: 'Challenge',
  RESPOND: 'Respond',
  DECISION: 'Decision',
};

interface StatCardProps {
  label: string;
  value: string;
  detail: string;
  accentClass: string;
}

function StatCard({ label, value, detail, accentClass }: StatCardProps) {
  return (
    <div className="rounded-lg border border-white/6 bg-white/[0.03] px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-1 text-base font-semibold ${accentClass}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}

export function DecisionHealthPanel({ decisions, health, columns, meetingSummary }: Props) {
  const recentDecisions = decisions.slice(-4).reverse();
  const completionRate = health.taskTotal === 0
    ? 0
    : Math.round((health.taskDone / health.taskTotal) * 100);
  const meetingLabel = meetingSummary
    ? MEETING_PHASE_LABELS[meetingSummary.phase] ?? meetingSummary.phase
    : 'Idle';

  return (
    <section
      className="grid gap-px border-t border-white/5 bg-white/5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]"
      data-testid="decision-health-panel"
    >
      <div className="bg-[#0b0d13] min-h-0">
        <h2 className="panel-heading">Decision Log</h2>
        <div className="px-3 pb-3">
          {recentDecisions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/8 bg-white/[0.02] px-3 py-4 text-sm text-slate-500">
              No decisions recorded yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentDecisions.map((decision) => (
                <li
                  key={`${decision.timestamp}-${decision.from}-${decision.content}`}
                  className="rounded-lg border border-white/6 bg-white/[0.03] px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-emerald-400">{decision.from}</span>
                    <span className="text-slate-600">{formatTimestampLabel(decision.timestamp)}</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">{decision.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-[#0b0d13] min-h-0">
        <h2 className="panel-heading">System Health</h2>
        <div className="space-y-3 px-3 pb-3">
          <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-4">
            <StatCard
              label="Connection"
              value={health.connected ? 'Live' : 'Offline'}
              detail={health.connected ? 'Realtime sync active' : 'Retrying websocket'}
              accentClass={health.connected ? 'text-emerald-400' : 'text-rose-400'}
            />
            <StatCard
              label="Agents"
              value={`${health.activeCount}/${health.agentCount}`}
              detail={
                health.readyCount > 0
                  ? `${health.readyCount} ready · ${health.activeCount} active`
                  : 'active / total'
              }
              accentClass="text-slate-100"
            />
            <StatCard
              label="Task Flow"
              value={`${health.taskDone}/${health.taskTotal}`}
              detail={`${completionRate}% complete`}
              accentClass="text-indigo-300"
            />
            <StatCard
              label="Meeting"
              value={meetingLabel}
              detail={
                meetingSummary
                  ? `${meetingSummary.participants.length} participants`
                  : 'No active review'
              }
              accentClass={meetingSummary ? 'text-amber-300' : 'text-slate-400'}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {columns.map((column) => (
              <div
                key={column.status}
                className="rounded-lg border border-white/6 bg-white/[0.03] px-3 py-2"
              >
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  {column.label}
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-100">
                  {column.tasks.length}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
