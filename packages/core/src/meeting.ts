import type { Meeting, MeetingPhase, MeetingArtifacts } from './types.js';

const PHASES: MeetingPhase[] = ['PREPARE', 'CROSS_READ', 'CHALLENGE', 'RESPOND', 'DECISION'];

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
      return participants.every((p) => p in artifacts.judgments);
    case 'CHALLENGE':
      return Object.keys(artifacts.critiques).length > 0;
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
