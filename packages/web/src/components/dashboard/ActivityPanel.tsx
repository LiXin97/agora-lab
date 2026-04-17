import { useEffect, useState } from 'react';
import type { AgentMessage, Meeting } from '@agora-lab/core';
import type { MeetingSummary } from '../../hooks/useDashboardSelectors.js';
import { buildMessageKey } from '../../utils/message.js';

interface AgentInfo {
  name: string;
  role: string;
  status: string;
}

interface Props {
  messages: AgentMessage[];
  meetingSummary: MeetingSummary | null;
  meeting: Meeting | null;
  agents: AgentInfo[];
  selectedAgent: string | null;
  send: (event: unknown) => void;
}

const TYPE_COLOR: Record<string, string> = {
  question: 'text-blue-400',
  critique: 'text-rose-400',
  decision: 'text-emerald-400',
  status: 'text-slate-400',
  'meeting-perspective': 'text-amber-400',
};

const TYPE_LABEL: Record<string, string> = {
  question: '?',
  critique: '!',
  decision: '✓',
  status: '·',
  'meeting-perspective': '◉',
};

const MEETING_PHASES = ['PREPARE', 'CROSS_READ', 'CHALLENGE', 'RESPOND', 'DECISION'] as const;
const PHASE_LABELS: Record<string, string> = {
  PREPARE: 'Prepare',
  CROSS_READ: 'Cross Read',
  CHALLENGE: 'Challenge',
  RESPOND: 'Respond',
  DECISION: 'Decision',
};

export function ActivityPanel({ messages, meetingSummary, meeting, agents, selectedAgent, send }: Props) {
  const [meetingOpen, setMeetingOpen] = useState(Boolean(meetingSummary));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [decisionMaker, setDecisionMaker] = useState('');

  useEffect(() => {
    if (meetingSummary) {
      setMeetingOpen(true);
    }
  }, [meetingSummary?.id]);

  useEffect(() => {
    if (decisionMaker && !selected.has(decisionMaker)) {
      setDecisionMaker('');
    }
  }, [decisionMaker, selected]);

  function toggleParticipant(name: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  function handleCreate() {
    if (selected.size < 2 || !decisionMaker || !selected.has(decisionMaker)) return;
    send({ type: 'meeting:create', participants: [...selected], decisionMaker });
    setSelected(new Set());
    setDecisionMaker('');
  }

  const visibleMessages = selectedAgent
    ? messages.filter(m => m.from === selectedAgent || m.to === selectedAgent)
    : messages;

  return (
    <section className="dashboard-panel flex flex-col h-full" data-testid="activity-panel">
      {/* Meeting progress */}
      <div className="border-b border-white/5">
        <button
          className="panel-heading w-full flex items-center justify-between cursor-pointer"
          onClick={() => setMeetingOpen(!meetingOpen)}
        >
          <span>Meeting</span>
          <span className="text-[10px] text-slate-500">{meetingOpen ? '▾' : '▸'}</span>
        </button>

        {meetingOpen && (
          <div className="px-3 pb-3">
            {meetingSummary ? (
              <>
                {/* Phase progress */}
                <div className="flex gap-1 mb-2">
                  {MEETING_PHASES.map((phase, i) => {
                    const done = i < meetingSummary.phaseIndex;
                    const active = i === meetingSummary.phaseIndex;
                    return (
                      <div key={phase} className="flex-1 text-center">
                        <div className={`h-1.5 rounded-full ${done ? 'bg-emerald-500' : active ? 'bg-amber-400' : 'bg-white/10'}`} />
                        <span className={`text-[9px] mt-0.5 block ${active ? 'text-amber-400 font-semibold' : 'text-slate-600'}`}>
                          {PHASE_LABELS[phase]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-slate-400 space-y-0.5">
                  <div>Participants: {meetingSummary.participants.join(', ')}</div>
                  <div>Decision: {meetingSummary.decisionMaker}</div>
                </div>
                {meeting && meeting.phase !== 'DECISION' && (
                  <button
                    onClick={() => send({ type: 'meeting:advance', meetingId: meeting.id })}
                    className="btn-secondary text-xs px-2 py-1 mt-2 w-full"
                  >
                    Advance Review Phase
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">No active review meeting</p>
                <div>
                  <div className="text-[11px] text-slate-400 mb-1">Participants (2+):</div>
                  <div className="flex flex-wrap gap-1">
                    {agents.map(a => (
                      <button
                        key={a.name}
                        onClick={() => toggleParticipant(a.name)}
                        className={`text-[11px] rounded px-1.5 py-0.5 transition-colors ${
                          selected.has(a.name)
                            ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/30'
                            : 'bg-white/5 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
                {selected.size >= 2 && (
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1">Decision Maker:</div>
                    <select
                      value={decisionMaker}
                      onChange={e => setDecisionMaker(e.target.value)}
                      className="w-full bg-white/5 text-slate-300 text-xs rounded px-2 py-1 border border-white/10"
                    >
                      <option value="">Select...</option>
                      {[...selected].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                )}
                <button
                  onClick={handleCreate}
                  disabled={selected.size < 2 || !decisionMaker}
                  className="btn-primary text-xs px-2 py-1 w-full disabled:opacity-40"
                >
                  Start Review Meeting
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages feed */}
      <div className="flex items-center justify-between">
        <h2 className="panel-heading">Messages</h2>
        {selectedAgent && (
          <span className="mr-3 text-[11px] text-slate-500">
            Filtering for <span className="text-slate-300">{selectedAgent}</span>
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {visibleMessages.length === 0 ? (
          <p className="text-slate-500 text-xs py-2">No messages yet</p>
        ) : (
          [...visibleMessages].reverse().map((m) => (
            <div key={buildMessageKey(m)} className="bg-white/[0.03] rounded-md px-2.5 py-2 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className={`font-semibold ${TYPE_COLOR[m.type] ?? 'text-slate-400'}`}>
                  {TYPE_LABEL[m.type] ?? '·'}
                </span>
                <span className="text-slate-300 font-medium">{m.from}</span>
                <span className="text-slate-600">→</span>
                <span className="text-slate-400">{m.to}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{m.content}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
