import { dirname } from 'node:path';
import { execa } from 'execa';
import { buildAgentSessionName, buildAgoraSessionName } from '@agora-lab/core';
import type { AgentBackend } from '@agora-lab/core';

export { buildAgentSessionName, buildAgoraSessionName } from '@agora-lab/core';

export function buildSessionName(_labName: string, agentName: string, labDir: string): string {
  return buildAgentSessionName(dirname(labDir), agentName);
}

export function buildStartCommand(backend: AgentBackend, workspacePath: string): string {
  switch (backend) {
    case 'claude-code':
      return `claude --dangerously-skip-permissions "${workspacePath}"`;
    case 'codex':
      return `codex "${workspacePath}"`;
    case 'copilot':
      return `github-copilot-cli "${workspacePath}"`;
    case 'gemini':
      return `gemini "${workspacePath}"`;
  }
}

export async function createTmuxSession(sessionName: string, command: string, cwd: string): Promise<void> {
  await execa('tmux', ['new-session', '-d', '-s', sessionName, '-c', cwd, command]);
}

export async function killTmuxSession(sessionName: string): Promise<void> {
  try {
    await execa('tmux', ['kill-session', '-t', sessionName]);
  } catch { /* session may not exist */ }
}

export async function hasTmuxSession(sessionName: string): Promise<boolean> {
  try {
    await execa('tmux', ['has-session', '-t', sessionName]);
    return true;
  } catch {
    return false;
  }
}

export async function listTmuxSessions(prefix: string): Promise<string[]> {
  try {
    const { stdout } = await execa('tmux', ['list-sessions', '-F', '#{session_name}']);
    return stdout.split('\n').filter(s => s.startsWith(prefix));
  } catch {
    return [];
  }
}

export function buildWatchdogSessionName(labDir: string): string {
  return `${buildAgoraSessionName(dirname(labDir))}-runtime`;
}

export async function sendTmuxInput(sessionName: string, input: string): Promise<void> {
  await execa('tmux', ['send-keys', '-t', sessionName, '-l', '--', input]);
  await execa('tmux', ['send-keys', '-t', sessionName, 'Enter']);
}
