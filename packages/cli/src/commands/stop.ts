import { dirname } from 'node:path';
import type { LabConfig } from '@agora-lab/core';
import {
  buildAgoraSessionName,
  buildWatchdogSessionName,
  killTmuxSession,
  listTmuxSessions,
} from '../tmux.js';

export async function stopCommand(labDir: string, config: LabConfig): Promise<string> {
  const watchdogSession = buildWatchdogSessionName(labDir);
  const prefix = `${buildAgoraSessionName(dirname(labDir))}-`;
  const sessions = await listTmuxSessions(prefix);
  if (sessions.length === 0) return 'No Agora sessions to stop.';
  const results: string[] = [];
  for (const sessionName of sessions) {
    await killTmuxSession(sessionName);
    if (sessionName === watchdogSession) {
      results.push('runtime watchdog: stopped');
    } else {
      const agentName = sessionName.slice(prefix.length);
      if (config.agents[agentName]) {
        results.push(`${agentName}: stopped`);
      } else {
        results.push(`stale session: ${sessionName}`);
      }
    }
  }
  return results.join('\n');
}
