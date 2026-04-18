import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { stringify, parse } from 'yaml';
import {
  createMeeting,
  advancePhase,
  listAgentDirs,
} from '@agora-lab/core';
import type { LabConfig, Meeting } from '@agora-lab/core';

export function meetingDir(labDir: string, config: LabConfig): string {
  return join(labDir, config.communication.meetingDir);
}

function meetingFile(labDir: string, config: LabConfig, id: string): string {
  return join(meetingDir(labDir, config), id, 'meeting.yaml');
}

async function loadMeeting(labDir: string, config: LabConfig, id: string): Promise<Meeting> {
  const content = await readFile(meetingFile(labDir, config, id), 'utf-8');
  return parse(content) as Meeting;
}

async function saveMeeting(labDir: string, config: LabConfig, meeting: Meeting): Promise<void> {
  const dir = join(meetingDir(labDir, config), meeting.id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'meeting.yaml'), stringify(meeting));
}

export async function meetingNewCommand(labDir: string, config: LabConfig): Promise<string> {
  const allAgents = await listAgentDirs(labDir);
  const participants = allAgents.filter((name) => config.agents[name]?.role !== 'paper-reviewer');
  if (participants.length < config.meeting.minParticipants) {
    throw new Error(
      `Need at least ${config.meeting.minParticipants} non-reviewer agents, have ${participants.length}`,
    );
  }
  const meeting = createMeeting({
    participants,
    decisionMaker: config.meeting.decisionMaker,
  });
  await saveMeeting(labDir, config, meeting);
  return `Created meeting ${meeting.id} with ${participants.length} participants. Phase: PREPARE`;
}

export async function meetingStatusCommand(
  labDir: string,
  config: LabConfig,
  id?: string,
): Promise<string> {
  if (id) {
    const m = await loadMeeting(labDir, config, id);
    return `Meeting ${m.id}\n  Phase: ${m.phase}\n  Participants: ${m.participants.join(', ')}\n  Decision maker: ${m.decisionMaker}`;
  }
  // List all meetings
  const mDir = meetingDir(labDir, config);
  try {
    const entries = await readdir(mDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    if (dirs.length === 0) return 'No meetings found.';
    const lines: string[] = [];
    for (const d of dirs) {
      const m = await loadMeeting(labDir, config, d);
      lines.push(`${m.id} — ${m.phase} (${m.participants.length} participants)`);
    }
    return lines.join('\n');
  } catch {
    return 'No meetings found.';
  }
}

export async function meetingAdvanceCommand(
  labDir: string,
  config: LabConfig,
  id: string,
): Promise<string> {
  const meeting = await loadMeeting(labDir, config, id);
  const advanced = advancePhase(meeting);
  await saveMeeting(labDir, config, advanced);
  return `Meeting ${id} advanced to phase: ${advanced.phase}`;
}
