import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@agora-lab/core', async () => import('../../core/src/index.ts'));

import { buildFullState } from '../src/watcher.js';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { serializeLabConfig, createDefaultConfig, serializeKanbanBoard } from '@agora-lab/core';

describe('buildFullState', () => {
  let labDir: string;

  beforeEach(async () => {
    labDir = await mkdtemp(join(tmpdir(), 'agora-watcher-'));
    await mkdir(join(labDir, 'agents', 'supervisor', 'workspace'), { recursive: true });
    await mkdir(join(labDir, 'shared', 'messages'), { recursive: true });
    await mkdir(join(labDir, 'shared', 'meetings'), { recursive: true });
    const config = createDefaultConfig('Test Lab', 'Attention');
    await writeFile(join(labDir, 'lab.yaml'), serializeLabConfig(config));
    await writeFile(join(labDir, 'shared', 'KANBAN.md'), serializeKanbanBoard({ tasks: [] }));
  });

  it('reads lab config', async () => {
    const state = await buildFullState(labDir);
    expect(state.config.labName).toBe('Test Lab');
  });

  it('lists agents', async () => {
    const state = await buildFullState(labDir);
    expect(state.agents.length).toBeGreaterThanOrEqual(1);
    expect(state.agents[0].name).toBe('supervisor');
    expect(state.agents[0].status).toBe('offline');
  });

  it('reads kanban board', async () => {
    const state = await buildFullState(labDir);
    expect(state.kanban.tasks).toHaveLength(0);
  });

  it('returns null meeting when none exists', async () => {
    const state = await buildFullState(labDir);
    expect(state.meeting).toBeNull();
  });
});
