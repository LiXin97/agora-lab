import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  parseRuntimeState,
  serializeRuntimeState,
} from '@agora-lab/core';
import type { LabConfig, RuntimeState } from '@agora-lab/core';
import { loadServerModule } from '../server-runtime.js';
import { hasTmuxSession, sendTmuxInput, isPaneBusy } from '../tmux.js';
import { buildPendingAgentPrompt } from './pending-items.js';
import { buildOrchestratorSummary, renderOrchestratorPrompt } from './orchestrator-tick.js';
import { runWatchdogCycle } from './watchdog.js';

/** Bucket size for orchestrator-tick dedup: same signal within this window won't re-inject. */
const ORCHESTRATOR_BUCKET_MS = 30 * 60 * 1000;

export interface RuntimeWatchdogOptions {
  intervalMs: number;
}

export interface RuntimeCycleDeps {
  hasTmuxSession: (sessionName: string) => Promise<boolean>;
  sendTmuxInput: (sessionName: string, text: string) => Promise<void>;
  isPaneBusy?: (sessionName: string) => Promise<boolean>;
}

export async function runRuntimeCycle(
  labDir: string,
  config: LabConfig,
  runtimeState: RuntimeState,
  deps: RuntimeCycleDeps = { hasTmuxSession, sendTmuxInput, isPaneBusy },
): Promise<RuntimeState> {
  const agentNames = Object.keys(config.agents);
  const { loadKanbanBoard, loadLatestMeeting, loadRecentMessages } = await loadServerModule();

  const [board, meeting, messages] = await Promise.all([
    loadKanbanBoard(labDir, config),
    loadLatestMeeting(labDir, config),
    loadRecentMessages(labDir, config, 200),
  ]);

  const pendingByAgent: Record<string, NonNullable<ReturnType<typeof buildPendingAgentPrompt>>> = {};
  for (const agentName of agentNames) {
    const unreadMessages = messages.filter(
      (m) => m.to === agentName && m.status === 'unread',
    );
    const assignedTasks = board.tasks.filter(
      (t) => t.assignee === agentName && (t.status === 'assigned' || t.status === 'in_progress'),
    );
    const pending = buildPendingAgentPrompt({
      agentName,
      unreadMessages,
      assignedTasks,
      runtimeState,
      meeting,
    });
    if (pending) pendingByAgent[agentName] = pending;
  }

  // L2 orchestrator overlay: fires when supervisor would otherwise NOT receive a
  // fresh injection this cycle — either no pending at all, or pending whose
  // signature matches `lastPromptSignature` (the watchdog will skip it). The
  // common deadlock has supervisor's own task in_progress but unchanged: pending
  // exists, signature unchanged, no injection ever fires. Without this overlay
  // L2 would be preempted by that stale pending and never trigger.
  // Overlay only when summary.hasSignal (stuck task / empty-review-with-active /
  // stalled meeting). Dedup via 30min bucket signature.
  if (agentNames.includes('supervisor')) {
    const supervisorPending = pendingByAgent.supervisor;
    const lastSig = runtimeState.agentAutomation?.supervisor?.lastPromptSignature;
    const wouldInject = supervisorPending && supervisorPending.signature !== lastSig;
    if (!wouldInject) {
      const nowMs = Date.now();
      const summary = buildOrchestratorSummary({ board, meeting, messages, nowMs });
      if (summary.hasSignal) {
        const bucket = Math.floor(nowMs / ORCHESTRATOR_BUCKET_MS);
        pendingByAgent.supervisor = {
          prompt: renderOrchestratorPrompt(summary),
          signature: `orchestrator:${bucket}:${summary.stuckTasks.map((t) => t.id).join(',')}:${summary.reviewColumnEmptyForMs !== null ? 'rev' : ''}:${summary.meetingPhase ?? ''}`,
        };
      }
    }
  }

  return runWatchdogCycle({
    agentNames,
    labDir,
    runtimeState,
    pendingByAgent,
    deps,
  });
}

export async function runRuntimeWatchdog(
  labDir: string,
  config: LabConfig,
  options: RuntimeWatchdogOptions,
): Promise<void> {
  const { intervalMs } = options;
  const runtimePath = join(labDir, 'runtime.json');
  let running = true;
  let wake: (() => void) | null = null;

  const shutdown = () => {
    running = false;
    if (wake) wake();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  try {
    while (running) {
      try {
        const runtimeState = await readRuntimeState(runtimePath);
        const nextState = await runRuntimeCycle(labDir, config, runtimeState);
        await writeRuntimeStateAtomically(runtimePath, nextState);
      } catch (err) {
        console.error('[runtime-watchdog] cycle failed:', err);
      }

      if (!running) break;
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => { wake = null; resolve(); }, intervalMs);
        wake = () => { clearTimeout(timer); wake = null; resolve(); };
      });
    }
  } finally {
    process.off('SIGTERM', shutdown);
    process.off('SIGINT', shutdown);
  }
}

async function readRuntimeState(runtimePath: string): Promise<RuntimeState> {
  try {
    return parseRuntimeState(await readFile(runtimePath, 'utf-8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { version: 2, agentAutomation: {} };
    }
    throw error;
  }
}

async function writeRuntimeStateAtomically(filePath: string, state: RuntimeState): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(tempPath, serializeRuntimeState(state));
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}
