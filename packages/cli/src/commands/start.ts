import { dirname, join } from 'node:path';
import { listAgentDirs } from '@agora-lab/core';

const shellQuote = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;
import type { LabConfig } from '@agora-lab/core';
import {
  buildSessionName,
  buildStartCommand,
  buildWatchdogSessionName,
  createTmuxSession,
  hasTmuxSession,
} from '../tmux.js';
import { ensureLabRuntime } from '../runtime.js';

export async function startCommand(labDir: string, config: LabConfig): Promise<string> {
  const runtime = await ensureLabRuntime(labDir, config);
  const agents = await listAgentDirs(labDir);

  const results: string[] = [];
  if (runtime.seeded) {
    results.push('starter tasks: seeded');
  }
  if (agents.length === 0) {
    results.push('No agents to start.');
    return results.join('\n');
  }

  for (const name of agents) {
    const agentConfig = config.agents[name];
    if (!agentConfig) {
      results.push(`${name}: skipped (no config)`);
      continue;
    }
    const sessionName = buildSessionName(config.labName, name, labDir);
    if (await hasTmuxSession(sessionName)) {
      results.push(`${name}: already running`);
      continue;
    }
    const workspacePath = join(labDir, 'agents', name, 'workspace');
    const cmd = buildStartCommand(agentConfig.backend, workspacePath);
    await createTmuxSession(sessionName, cmd, workspacePath);
    results.push(`${name}: started (${sessionName})`);
  }

  const watchdogSession = buildWatchdogSessionName(labDir);
  if (!(await hasTmuxSession(watchdogSession))) {
    const projectDir = dirname(labDir);
    const cliEntry = process.argv[1] ?? join(projectDir, 'packages', 'cli', 'dist', 'index.js');
    const watchdogCmd = `node ${shellQuote(cliEntry)} runtime-watchdog --lab-dir ${shellQuote(labDir)}`;
    await createTmuxSession(watchdogSession, watchdogCmd, projectDir);
    results.push('runtime watchdog: started');
  } else {
    results.push('runtime watchdog: already running');
  }

  return results.join('\n');
}
