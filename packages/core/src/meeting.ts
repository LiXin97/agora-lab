import type { Meeting, MeetingPhase, MeetingArtifacts } from './types.js';

export const PHASES: MeetingPhase[] = ['PREPARE', 'CROSS_READ', 'CHALLENGE', 'RESPOND', 'DECISION'];

export function getMeetingPhaseIndex(phase: MeetingPhase): number {
  return PHASES.indexOf(phase);
}

export function createMeeting(opts: { participants: string[]; decisionMaker: string }): Meeting {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return {
    id: `mtg-${ts}-${rand}`,
    phase: 'PREPARE',
    participants: opts.participants,
    decisionMaker: opts.decisionMaker,
    artifacts: { perspectives: {}, judgments: {}, critiques: {}, responses: {} },
    createdAt: new Date().toISOString(),
  };
}

export function canAdvance(meeting: Meeting): boolean {
  const { phase, participants, artifacts, decisionMaker } = meeting;
  switch (phase) {
    case 'PREPARE':
      return participants.every((p) => p in artifacts.perspectives);
    case 'CROSS_READ':
      // CROSS_READ has no phase-gated artifact (skill uses out-of-band `-ack-read`).
      // Advancement is the supervisor's judgment call once perspectives have been read.
      return true;
    case 'CHALLENGE':
      // Require a substantive critique set: at least one critique per non-DM participant
      // (or, in tiny meetings, simply more critiques than participants).
      return Object.keys(artifacts.critiques).length >= Math.max(1, participants.length - 1);
    case 'RESPOND': {
      const nonDM = participants.filter((p) => p !== decisionMaker);
      return nonDM.every((p) => p in artifacts.responses);
    }
    case 'DECISION':
      return false;
    default:
      return false;
  }
}

export function advancePhase(meeting: Meeting): Meeting {
  if (!canAdvance(meeting)) throw new Error('Cannot advance');
  const idx = getMeetingPhaseIndex(meeting.phase);
  return { ...meeting, phase: PHASES[idx + 1] };
}
