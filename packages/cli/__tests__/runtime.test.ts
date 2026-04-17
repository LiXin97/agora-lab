import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock to source so tests run without building the package first
vi.mock('@agora-lab/core', async () => import('../../core/src/index.ts'));

import { createDefaultConfig, parseKanbanBoard, serializeKanbanBoard } from '@agora-lab/core';
import type { Meeting } from '@agora-lab/core';
import { collectAgentFacts, ensureLabRuntime } from '../src/runtime.js';

const TEST_ROOT = join(process.cwd(), 'packages', 'cli', '__tests__', '__runtime_tmp__');

async function createLabFixture() {
  const labDir = join(
    TEST_ROOT,
    `runtime-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const config = createDefaultConfig('Test Lab', 'guided dispatch');
  await mkdir(join(labDir, 'shared', 'meetings'), { recursive: true });
  await writeFile(join(labDir, config.communication.kanbanFile), serializeKanbanBoard({ tasks: [] }));
  return { labDir, config };
}

afterEach(async () => {
  await rm(TEST_ROOT, { recursive: true, force: true });
});

describe('ensureLabRuntime', () => {
  it('seeds starter tasks only once and writes runtime.json', async () => {
    const { labDir, config } = await createLabFixture();

    const first = await ensureLabRuntime(labDir, config);
    expect(first).toEqual({ seeded: true });

    const firstBoard = parseKanbanBoard(
      await readFile(join(labDir, config.communication.kanbanFile), 'utf-8'),
    );
    const runtimePath = join(labDir, 'runtime.json');
    const firstRuntime = JSON.parse(await readFile(runtimePath, 'utf-8')) as {
      version: number;
      starterSeededAt?: string;
    };

    expect(firstBoard.tasks.length).toBeGreaterThan(0);
    expect(firstRuntime.version).toBe(2);
    expect(firstRuntime.starterSeededAt).toBeTruthy();

    const second = await ensureLabRuntime(labDir, config);
    expect(second).toEqual({ seeded: false });

    const secondBoard = parseKanbanBoard(
      await readFile(join(labDir, config.communication.kanbanFile), 'utf-8'),
    );
    const secondRuntime = JSON.parse(await readFile(runtimePath, 'utf-8')) as {
      version: number;
      starterSeededAt?: string;
    };

    expect(secondBoard.tasks).toHaveLength(firstBoard.tasks.length);
    expect(secondRuntime.starterSeededAt).toBe(firstRuntime.starterSeededAt);
  });

  it('writes version 2 and agentAutomation map when no runtime file exists', async () => {
    const { labDir, config } = await createLabFixture();

    await ensureLabRuntime(labDir, config);

    const runtimePath = join(labDir, 'runtime.json');
    const runtime = JSON.parse(await readFile(runtimePath, 'utf-8')) as {
      version: number;
      agentAutomation: Record<string, unknown>;
    };
    expect(runtime.version).toBe(2);
    expect(runtime.agentAutomation).toEqual({});
  });

  it('records starterSeededAt without seeding when board is pre-populated', async () => {
    const { labDir, config } = await createLabFixture();
    // Pre-populate the board so the seeding branch is skipped
    const prePopulated = `# Research Task Board\n\n## Todo\n- [P1] #001 Existing task (assignee: alice) <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:00:00Z -->\n\n## Assigned\n\n## In Progress\n\n## Review\n\n## Done\n`;
    await writeFile(join(labDir, config.communication.kanbanFile), prePopulated);

    const result = await ensureLabRuntime(labDir, config);
    expect(result).toEqual({ seeded: false });

    const runtimePath = join(labDir, 'runtime.json');
    const runtime = JSON.parse(await readFile(runtimePath, 'utf-8')) as {
      version: number;
      starterSeededAt?: string;
    };
    expect(runtime.starterSeededAt).toBeTruthy();

    // Second start must not re-evaluate (starterSeededAt already present)
    const second = await ensureLabRuntime(labDir, config);
    expect(second).toEqual({ seeded: false });
    const secondRuntime = JSON.parse(await readFile(runtimePath, 'utf-8')) as {
      starterSeededAt?: string;
    };
    expect(secondRuntime.starterSeededAt).toBe(runtime.starterSeededAt);
  });
});

describe('collectAgentFacts', () => {
  it('gathers assigned and in-progress facts from board state with an injected session checker', async () => {
    const board = parseKanbanBoard(`# Research Task Board

## Todo

## Assigned
- [P1] #001 Read papers (assignee: alice) <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:00:00Z -->

## In Progress
- [P1] #002 Run experiments (assignee: alice) <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:00:00Z -->
- [P1] #003 Review logs (assignee: bob) <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:00:00Z -->

## Review
- [P1] #004 Draft writeup (assignee: bob) <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:00:00Z -->

## Done
`);
    const latestMeeting: Meeting = {
      id: 'mtg-1',
      phase: 'PREPARE',
      participants: ['bob', 'carol'],
      decisionMaker: 'bob',
      artifacts: { perspectives: {}, judgments: {}, critiques: {}, responses: {} },
      createdAt: '2026-01-01T00:00:00Z',
    };
    const isSessionRunning = vi.fn().mockResolvedValue(true);

    const aliceFacts = await collectAgentFacts('alice', board, latestMeeting, isSessionRunning);

    expect(isSessionRunning).toHaveBeenCalledOnce();
    expect(aliceFacts).toEqual({
      hasSession: true,
      inMeeting: false,
      hasReviewTask: false,
      hasInProgressTask: true,
      hasAssignedTask: true,
    });
  });

  it('sets inMeeting=true when agent is a participant in an active (non-DECISION) meeting', async () => {
    const board = parseKanbanBoard(`# Research Task Board\n\n## Todo\n\n## Assigned\n\n## In Progress\n\n## Review\n\n## Done\n`);
    const latestMeeting: Meeting = {
      id: 'mtg-2',
      phase: 'PREPARE',
      participants: ['alice', 'bob'],
      decisionMaker: 'bob',
      artifacts: { perspectives: {}, judgments: {}, critiques: {}, responses: {} },
      createdAt: '2026-01-01T00:00:00Z',
    };

    const facts = await collectAgentFacts('alice', board, latestMeeting, vi.fn().mockResolvedValue(true));

    expect(facts.inMeeting).toBe(true);
  });

  it('sets inMeeting=false when meeting is in DECISION phase (short-circuit)', async () => {
    const board = parseKanbanBoard(`# Research Task Board\n\n## Todo\n\n## Assigned\n\n## In Progress\n\n## Review\n\n## Done\n`);
    const decisionMeeting: Meeting = {
      id: 'mtg-3',
      phase: 'DECISION',
      participants: ['alice', 'bob'],
      decisionMaker: 'bob',
      artifacts: { perspectives: {}, judgments: {}, critiques: {}, responses: {} },
      createdAt: '2026-01-01T00:00:00Z',
    };

    const facts = await collectAgentFacts('alice', board, decisionMeeting, vi.fn().mockResolvedValue(true));

    expect(facts.inMeeting).toBe(false);
  });

  it('sets hasReviewTask=true when agent owns a review task', async () => {
    const board = parseKanbanBoard(`# Research Task Board

## Todo

## Assigned

## In Progress

## Review
- [P1] #005 Review draft (assignee: alice) <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:00:00Z -->

## Done
`);

    const facts = await collectAgentFacts('alice', board, null, vi.fn().mockResolvedValue(true));

    expect(facts.hasReviewTask).toBe(true);
    expect(facts.hasInProgressTask).toBe(false);
    expect(facts.hasAssignedTask).toBe(false);
  });
});
