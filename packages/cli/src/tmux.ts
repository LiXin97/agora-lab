import { dirname } from 'node:path';
import { execa } from 'execa';
import { buildAgentSessionName, buildAgoraSessionName } from '@agora-lab/core';
import type { AgentBackend } from '@agora-lab/core';

export { buildAgentSessionName, buildAgoraSessionName } from '@agora-lab/core';

export function buildSessionName(_labName: string, agentName: string, labDir: string): string {
  return buildAgentSessionName(dirname(labDir), agentName);
}

const KICKOFF_PROMPT =
  'You have just been launched by the Agora lab runtime. Read your CLAUDE.md and follow its Session Start Checklist now: read KANBAN.md, scan shared/messages/ for unread messages addressed to you, check shared/meetings/, then act. Do not wait for further instructions.';

export function buildStartCommand(backend: AgentBackend, workspacePath: string): string {
  // The tmux pane is started with `-c <workspacePath>` (see createTmuxSession),
  // so the backend CLI inherits the correct cwd for CLAUDE.md auto-discovery.
  // The positional arg passed here is the agent's first user prompt — a kickoff
  // instruction that tells the agent to follow its Session Start Checklist
  // instead of waiting for user input.
  switch (backend) {
    case 'claude-code':
      return `claude --dangerously-skip-permissions '${KICKOFF_PROMPT}'`;
    case 'codex':
      return `codex '${KICKOFF_PROMPT}'`;
    case 'copilot':
      return `github-copilot-cli "${workspacePath}"`;
    case 'gemini':
      return `gemini '${KICKOFF_PROMPT}'`;
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
  // Claude Code's TUI uses bracketed paste: `send-keys -l` writes the text inside
  // a paste block, and if the Enter key arrives before the terminal processes the
  // paste-end sequence, Claude interprets the Enter as part of the pasted content
  // (newline inside the block) rather than as a submit. Pause briefly so paste
  // mode closes, then submit.
  await new Promise((resolve) => setTimeout(resolve, 150));
  await execa('tmux', ['send-keys', '-t', sessionName, 'Enter']);
}

// Returns true if the Claude/Codex CLI pane is mid-inference and cannot accept
// a new prompt. Detected by the presence of an ACTIVE spinner line on the tail
// of the pane — a spinner glyph followed by a present-participle verb ending
// with a Unicode ellipsis ("Germinating…", "Thinking…", etc.). Idle markers
// like "✻ Brewed for 46s" (past tense + "for Xs") must NOT match, otherwise
// the watchdog treats every settled pane as perpetually busy and never injects.
export async function isPaneBusy(sessionName: string): Promise<boolean> {
  try {
    const { stdout } = await execa('tmux', ['capture-pane', '-t', sessionName, '-p', '-S', '-8']);
    // Active spinner line looks like: "✻ Germinating… (12s · ↑ …)" — always has
    // the ellipsis glyph "…" after the verb. The static summary line uses
    // "for <N>s" instead and never has "…".
    return /[✽✻✶✳]\s+\w+…/.test(stdout);
  } catch {
    return false;
  }
}
