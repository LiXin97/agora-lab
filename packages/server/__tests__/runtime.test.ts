import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('@agora-lab/core', async () => import('../../core/src/index.ts'));

import { createDefaultConfig, parseKanbanBoard, serializeLabConfig } from '@agora-lab/core';
import { buildAgentList } from '../src/runtime.js';

describe('buildAgentList', () => {
  let labDir: string;

  beforeEach(async () => {
    labDir = join(tmpdir(), `agora-runtime-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    const config = createDefaultConfig('Test Lab', 'Attention');
    config.agents = {
      alice: { name: 'alice', role: 'student', backend: 'claude-code' },
      bob: { name: 'bob', role: 'student', backend: 'claude-code' },
      carol: { name: 'carol', role: 'student', backend: 'claude-code' },
      dave: { name: 'dave', role: 'student', backend: 'claude-code' },
      erin: { name: 'erin', role: 'student', backend: 'claude-code' },
      frank: { name: 'frank', role: 'student', backend: 'claude-code' },
    };

    await mkdir(join(labDir, 'shared', 'messages'), { recursive: true });
    await mkdir(join(labDir, 'shared', 'meetings'), { recursive: true });
    for (const name of Object.keys(config.agents)) {
      await mkdir(join(labDir, 'agents', name, 'workspace'), { recursive: true });
    }
    await writeFile(join(labDir, 'lab.yaml'), serializeLabConfig(config));
  });

  afterEach(async () => {
    await rm(labDir, { recursive: true, force: true });
  });

  it('derives runtime statuses and current tasks from shared state', async () => {
    const config = createDefaultConfig('Test Lab', 'Attention');
    config.agents = {
      alice: { name: 'alice', role: 'student', backend: 'claude-code' },
      bob: { name: 'bob', role: 'student', backend: 'claude-code' },
      carol: { name: 'carol', role: 'student', backend: 'claude-code' },
      dave: { name: 'dave', role: 'student', backend: 'claude-code' },
      erin: { name: 'erin', role: 'student', backend: 'claude-code' },
      frank: { name: 'frank', role: 'student', backend: 'claude-code' },
    };

    const board = parseKanbanBoard(`# Research Task Board

## Todo

## Assigned
- [P1] #001 Assigned task (assignee: alice) <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:00:00Z -->

## In Progress
- [P1] #002 Working task (assignee: bob) <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:00:00Z -->

## Review
- [P1] #003 Review task (assignee: carol) <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:00:00Z -->

## Done
`);

    const meeting = {
      id: 'mtg-1',
      phase: 'PREPARE' as const,
      participants: ['erin'],
      decisionMaker: 'erin',
      artifacts: { perspectives: {}, judgments: {}, critiques: {}, responses: {} },
      createdAt: '2026-01-01T00:00:00Z',
    };

    const agents = await buildAgentList(
      labDir,
      config,
      board,
      meeting,
      async (sessionName) => !sessionName.endsWith('-frank'),
    );

    expect(agents).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'alice', status: 'assigned', currentTask: 'Assigned task' }),
      expect.objectContaining({ name: 'bob', status: 'working', currentTask: 'Working task' }),
      expect.objectContaining({ name: 'carol', status: 'review', currentTask: 'Review task' }),
      expect.objectContaining({ name: 'dave', status: 'ready' }),
      expect.objectContaining({ name: 'erin', status: 'meeting' }),
      expect.objectContaining({ name: 'frank', status: 'offline' }),
    ]));
  });

  it('uses the default tmux checker for discovered agents when none is injected', async () => {
    const config = createDefaultConfig('Test Lab', 'Attention');
    config.agents = {
      alice: { name: 'alice', role: 'student', backend: 'claude-code' },
      bob: { name: 'bob', role: 'student', backend: 'claude-code' },
      carol: { name: 'carol', role: 'student', backend: 'claude-code' },
      dave: { name: 'dave', role: 'student', backend: 'claude-code' },
      erin: { name: 'erin', role: 'student', backend: 'claude-code' },
      frank: { name: 'frank', role: 'student', backend: 'claude-code' },
    };

    const infos = await buildAgentList(labDir, config, { tasks: [] }, null);

    expect(infos).toHaveLength(6);
    expect(infos.every((info) => info.status === 'offline')).toBe(true);
  });

  it('picks the most recently updated active task as currentTask', async () => {
    const config = createDefaultConfig('Test Lab', 'Attention');
    config.agents = {
      bob: { name: 'bob', role: 'student', backend: 'claude-code' },
    };

    const board = parseKanbanBoard(`# Research Task Board

## Todo

## Assigned

## In Progress
- [P1] #001 Older working task (assignee: bob) <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:05:00Z -->
- [P1] #002 Newer working task (assignee: bob) <!-- created:2026-01-01T00:00:00Z updated:2026-01-01T00:10:00Z -->

## Review

## Done
`);

    const agents = await buildAgentList(labDir, config, board, null, async () => true);

    expect(agents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'bob',
        status: 'working',
        currentTask: 'Newer working task',
      }),
    ]));
  });
});
