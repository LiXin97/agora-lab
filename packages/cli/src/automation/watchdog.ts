import type { RuntimeState } from '@agora-lab/core';
import { buildSessionName } from '../tmux.js';
import type { PendingPrompt } from './pending-items.js';

export interface WatchdogDeps {
  hasTmuxSession: (sessionName: string) => Promise<boolean>;
  sendTmuxInput: (sessionName: string, input: string) => Promise<void>;
}

export interface WatchdogCycleInput {
  agentNames: string[];
  labDir: string;
  runtimeState: RuntimeState;
  pendingByAgent: Record<string, PendingPrompt | undefined>;
  deps: WatchdogDeps;
}

export async function runWatchdogCycle(input: WatchdogCycleInput): Promise<RuntimeState> {
  const nextState: RuntimeState = {
    ...input.runtimeState,
    agentAutomation: { ...(input.runtimeState.agentAutomation ?? {}) },
  };

  for (const agentName of input.agentNames) {
    const pending = input.pendingByAgent[agentName];
    if (!pending) continue;

    const previous = nextState.agentAutomation?.[agentName]?.lastPromptSignature;
    if (previous === pending.signature) continue;

    const sessionName = buildSessionName('unused', agentName, input.labDir);
    if (!(await input.deps.hasTmuxSession(sessionName))) continue;

    await input.deps.sendTmuxInput(sessionName, pending.prompt);
    nextState.agentAutomation![agentName] = {
      lastPromptSignature: pending.signature,
      lastInjectedAt: new Date().toISOString(),
    };
    if (pending.marksKickoffSent) {
      nextState.supervisorKickoffSentAt = new Date().toISOString();
    }
  }

  return nextState;
}
