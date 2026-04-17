import { useState } from 'react';
import type { Meeting, MeetingPhase } from '@agora-lab/core';

interface AgentInfo {
  name: string;
  role: string;
  status: string;
}

interface Props {
  meeting: Meeting | null;
  agents: AgentInfo[];
  send: (event: unknown) => void;
  onClose: () => void;
}

const PHASES: MeetingPhase[] = ['PREPARE', 'CROSS_READ', 'CHALLENGE', 'RESPOND', 'DECISION'];

export function MeetingOverlay({ meeting, agents, send, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [decisionMaker, setDecisionMaker] = useState('');

  function toggleParticipant(name: string) {
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleCreate() {
    if (selected.size < 2 || !decisionMaker) return;
    send({ type: 'meeting:create', participants: [...selected], decisionMaker });
    setSelected(new Set());
    setDecisionMaker('');
  }

  return (
    <div className="lab-overlay-backdrop" data-kind="meeting" onClick={onClose}>
      <section className="shell-panel lab-overlay-panel lab-overlay-panel--meeting" onClick={event => event.stopPropagation()}>
        <div className="lab-overlay__header">
          <div>
            <div className="lab-overlay__eyebrow">Review room</div>
            <h2 className="lab-overlay__title">Meeting Console</h2>
            <p className="lab-overlay__subtitle">
              Coordinate synchronous review while keeping the lab surface calm and readable.
            </p>
          </div>
          <button type="button" onClick={onClose} className="shell-close-btn" aria-label="Close meeting console">
            ✕
          </button>
        </div>

        <div className="lab-overlay__body">
          {!meeting ? (
            <div className="meeting-overlay__stack">
              <p className="meeting-overlay__helper">
                No active meeting. Select participants and designate a decision maker to begin.
              </p>

              <div>
                <div className="meeting-overlay__subheading">Participants</div>
                <div className="meeting-overlay__participants">
                  {agents.map(agent => (
                    <button
                      key={agent.name}
                      type="button"
                      onClick={() => toggleParticipant(agent.name)}
                      className="meeting-overlay__participant"
                      data-selected={selected.has(agent.name) ? 'true' : 'false'}
                    >
                      {agent.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="meeting-overlay__subheading">Decision maker</div>
                <select
                  value={decisionMaker}
                  onChange={event => setDecisionMaker(event.target.value)}
                  className="shell-select font-mono text-sm px-3 py-2 w-full"
                >
                  <option value="">Select…</option>
                  {[...selected].map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>

              <button
                type="button"
                onClick={handleCreate}
                disabled={selected.size < 2 || !decisionMaker}
                className="lab-action-button"
              >
                Create Meeting
              </button>
            </div>
          ) : (
            <div className="meeting-overlay__stack">
              <div className="meeting-overlay__meta">Meeting ID: {meeting.id}</div>

              <div className="meeting-phase-strip">
                {PHASES.map((phase, index) => {
                  const currentIndex = PHASES.indexOf(meeting.phase);
                  const done = index < currentIndex;
                  const active = index === currentIndex;

                  return (
                    <div
                      key={phase}
                      className="meeting-phase-strip__item"
                      data-active={active ? 'true' : 'false'}
                      data-done={done ? 'true' : 'false'}
                    >
                      <span className="meeting-phase-strip__dot" />
                      <span>{phase.replace('_', ' ')}</span>
                    </div>
                  );
                })}
              </div>

              <div className="meeting-overlay__details">
                <div>Participants: {meeting.participants.join(', ')}</div>
                <div>Decision Maker: {meeting.decisionMaker}</div>
              </div>

              {meeting.phase !== 'DECISION' && (
                <button
                  type="button"
                  onClick={() => send({ type: 'meeting:advance', meetingId: meeting.id })}
                  className="lab-action-button"
                  style={{
                    background: 'var(--status-warn)',
                    borderColor: 'var(--status-warn)',
                    color: 'var(--warn-text)',
                  }}
                >
                  Advance Phase
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
