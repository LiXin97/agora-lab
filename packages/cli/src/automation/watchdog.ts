import type { RuntimeState } from '@agora-lab/core';
import { buildSessionName } from '../tmux.js';
import type { PendingPrompt } from './pending-items.js';

export const IDLE_HEARTBEAT_MS = 20 * 60 * 1000;

const HEARTBEAT_PROMPT =
  "Lab runtime heartbeat: you have been idle for a while. If you are genuinely waiting on an external dependency you've already escalated, ignore this. Otherwise re-run your Session Start Checklist now — re-read KANBAN.md, scan shared/messages/ for anything you missed, check shared/meetings/, and resume work. Do not reply to this ping; just act.";

export interface WatchdogDeps {
  hasTmuxSession: (sessionName: string) => Promise<boolean>;
  sendTmuxInput: (sessionName: string, input: string) => Promise<void>;
  isPaneBusy?: (sessionName: string) => Promise<boolean>;
}

export interface WatchdogCycleInput {
  agentNames: string[];
  labDir: string;
  runtimeState: RuntimeState;
  pendingByAgent: Record<string, PendingPrompt | undefined>;
  deps: WatchdogDeps;
  nowMs?: number;
  heartbeatMs?: number;
}

export async function runWatchdogCycle(input: WatchdogCycleInput): Promise<RuntimeState> {
  const nextState: RuntimeState = {
    ...input.runtimeState,
    agentAutomation: { ...(input.runtimeState.agentAutomation ?? {}) },
  };
  const now = input.nowMs ?? Date.now();
  const heartbeatMs = input.heartbeatMs ?? IDLE_HEARTBEAT_MS;

  for (const agentName of input.agentNames) {
    const pending = input.pendingByAgent[agentName];
    const previousEntry = nextState.agentAutomation?.[agentName];
    const sessionName = buildSessionName('unused', agentName, input.labDir);
    const signatureChanged = pending && previousEntry?.lastPromptSignature !== pending.signature;

    if (signatureChanged) {
      if (!(await input.deps.hasTmuxSession(sessionName))) continue;
      // Skip injection while the pane is mid-inference. Sending now would stack
      // into `[Pasted text]` blocks that never execute; we'll retry next cycle
      // once the agent's current turn ends. Signature is not recorded, so the
      // same prompt remains pending.
      if (input.deps.isPaneBusy && (await input.deps.isPaneBusy(sessionName))) continue;

      await input.deps.sendTmuxInput(sessionName, pending!.prompt);
      nextState.agentAutomation![agentName] = {
        lastPromptSignature: pending!.signature,
        lastInjectedAt: new Date(now).toISOString(),
      };
      if (pending!.marksKickoffSent) {
        nextState.supervisorKickoffSentAt = new Date(now).toISOString();
      }
      continue;
    }

    // Heartbeat fallback: signature unchanged (or no pending), but the agent
    // hasn't been pinged in a long time. Without this, an event-driven
    // signature-diff scheduler deadlocks the moment everyone goes idle —
    // no new messages → no signature change → no injection forever.
    const lastInjectedAt = previousEntry?.lastInjectedAt;
    if (!lastInjectedAt) continue;
    if (now - Date.parse(lastInjectedAt) < heartbeatMs) continue;

    if (!(await input.deps.hasTmuxSession(sessionName))) continue;
    if (input.deps.isPaneBusy && (await input.deps.isPaneBusy(sessionName))) continue;

    await input.deps.sendTmuxInput(sessionName, HEARTBEAT_PROMPT);
    nextState.agentAutomation![agentName] = {
      ...previousEntry,
      lastInjectedAt: new Date(now).toISOString(),
    };
  }

  return nextState;
}
