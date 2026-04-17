import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('@agora-lab/core', async () => import('../../core/src/index.ts'));

import { createDefaultConfig, parseMessage, serializeLabConfig } from '@agora-lab/core';
import type { KanbanTask } from '@agora-lab/core';
import { dispatchTaskToAgent } from '../src/dispatch.js';

describe('dispatchTaskToAgent', () => {
  let labDir: string;

  beforeEach(async () => {
    labDir = join(tmpdir(), `agora-dispatch-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    await mkdir(labDir, { recursive: true });
    await writeFile(join(labDir, 'lab.yaml'), serializeLabConfig(createDefaultConfig('test', 'test')));
  });

  afterEach(async () => {
    await rm(labDir, { recursive: true, force: true });
  });

  it('creates a message artifact in the messages dir', async () => {
    const config = createDefaultConfig('test', 'test');
    const task: KanbanTask = {
      id: '001',
      title: 'Write literature review',
      priority: 'P1',
      status: 'assigned',
      assignee: 'student-a',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    await dispatchTaskToAgent(labDir, config, task, 'student-a');

    const msgDir = join(labDir, config.communication.messageDir);
    const files = await readdir(msgDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toContain('agora_to_student-a_');
    expect(files[0]).toMatch(/\.md$/);
  });

  it('message content references the task id and title', async () => {
    const config = createDefaultConfig('test', 'test');
    const task: KanbanTask = {
      id: '042',
      title: 'Run experiments',
      priority: 'P2',
      status: 'assigned',
      assignee: 'student-b',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    await dispatchTaskToAgent(labDir, config, task, 'student-b');

    const msgDir = join(labDir, config.communication.messageDir);
    const files = await readdir(msgDir);
    const raw = await readFile(join(msgDir, files[0]), 'utf-8');
    const msg = parseMessage(raw);

    expect(msg.from).toBe('agora');
    expect(msg.to).toBe('student-b');
    expect(msg.type).toBe('status');
    expect(msg.content).toContain('#042');
    expect(msg.content).toContain('Run experiments');
  });
});
