import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  parseKanbanBoard,
  parseRuntimeState,
  seedStarterTasks,
  serializeKanbanBoard,
  serializeRuntimeState,
} from '@agora-lab/core';
import type { LabConfig, RuntimeState } from '@agora-lab/core';

const DEFAULT_RUNTIME_STATE: RuntimeState = { version: 2, agentAutomation: {} };

export async function ensureLabRuntime(
  labDir: string,
  config: LabConfig,
): Promise<{ seeded: boolean }> {
  const runtimePath = join(labDir, 'runtime.json');
  const kanbanPath = join(labDir, config.communication.kanbanFile);

  const board = parseKanbanBoard(await readFile(kanbanPath, 'utf-8'));
  const { state: initialState, existed: runtimeExisted } = await readRuntimeState(runtimePath);

  let nextBoard = board;
  let nextState = initialState;
  let seeded = false;
  let needsRuntimeWrite = !runtimeExisted;

  if (!initialState.starterSeededAt) {
    if (board.tasks.length === 0) {
      const seededState = seedStarterTasks(board, initialState, config.researchTopic);
      nextBoard = seededState.board;
      nextState = seededState.state;
      seeded = true;
      await writeFileAtomically(kanbanPath, serializeKanbanBoard(nextBoard));
    } else {
      // Board is pre-populated; record the no-seed decision so we don't re-evaluate on every start
      nextState = { ...initialState, starterSeededAt: new Date().toISOString() };
    }
    needsRuntimeWrite = true;
  }

  if (needsRuntimeWrite) {
    await writeFileAtomically(runtimePath, serializeRuntimeState(nextState));
  }

  return { seeded };
}

export { collectAgentFacts } from '@agora-lab/core';

async function readRuntimeState(
  runtimePath: string,
): Promise<{ state: RuntimeState; existed: boolean }> {
  try {
    return {
      state: parseRuntimeState(await readFile(runtimePath, 'utf-8')),
      existed: true,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        state: { ...DEFAULT_RUNTIME_STATE },
        existed: false,
      };
    }
    throw error;
  }
}

async function writeFileAtomically(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(tempPath, content);
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}
