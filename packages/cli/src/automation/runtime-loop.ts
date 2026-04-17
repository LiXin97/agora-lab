import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  parseRuntimeState,
  serializeRuntimeState,
} from '@agora-lab/core';
import type { LabConfig, RuntimeState } from '@agora-lab/core';
import { ensureLabRuntime } from '../runtime.js';
import { hasTmuxSession, sendTmuxInput } from '../tmux.js';
import { buildPendingAgentPrompt } from './pending-items.js';
import { runWatchdogCycle } from './watchdog.js';

export interface RuntimeWatchdogOptions {
  intervalMs: number;
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
        const agentNames = Object.keys(config.agents);

        const pendingByAgent: Record<string, ReturnType<typeof buildPendingAgentPrompt>> = {};
        for (const agentName of agentNames) {
          // TODO: integrate collectAgentFacts, listAgentMessages, and meeting lookup
          // for a fully data-driven prompt. For now stub with empty inputs so the
          // loop scaffolding and start/stop wiring is exercised end-to-end.
          const pending = buildPendingAgentPrompt({
            agentName,
            unreadMessages: [],
            assignedTasks: [],
            runtimeState,
            meeting: null,
          });
          if (pending) pendingByAgent[agentName] = pending;
        }

        const nextState = await runWatchdogCycle({
          agentNames,
          labDir,
          runtimeState,
          pendingByAgent: pendingByAgent as Record<string, NonNullable<ReturnType<typeof buildPendingAgentPrompt>>>,
          deps: { hasTmuxSession, sendTmuxInput },
        });

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
