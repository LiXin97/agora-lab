import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('@agora-lab/core', async () => import('../../core/src/index.ts'));

import {
  createDefaultConfig,
  createMessage,
  messageFileName,
  serializeMessage,
} from '../../core/src/index.ts';
import { runRuntimeCycle } from '../src/automation/runtime-loop.js';

async function makeLabDir(): Promise<{ labDir: string; cleanup: () => Promise<void> }> {
  const parent = await mkdtemp(join(tmpdir(), 'agora-runtime-loop-'));
  const labDir = join(parent, '.agora');
  await mkdir(join(labDir, 'shared', 'messages'), { recursive: true });
  await mkdir(join(labDir, 'shared', 'meetings'), { recursive: true });
  await mkdir(join(labDir, 'shared', 'artifacts'), { recursive: true });
  await writeFile(join(labDir, 'shared', 'KANBAN.md'), '# KANBAN\n');
  return { labDir, cleanup: () => rm(parent, { recursive: true, force: true }) };
}

describe('runRuntimeCycle', () => {
  it('wakes a student who has an unread message', async () => {
    const { labDir, cleanup } = await makeLabDir();
    try {
      const config = createDefaultConfig('Test Lab', 'Attention');
      config.agents['student-a'] = { name: 'student-a', role: 'student', backend: 'claude-code' };

      const msg = createMessage({
        from: 'supervisor',
        to: 'student-a',
        type: 'status',
        content: 'Welcome, your first task is queued.',
      });
      await writeFile(
        join(labDir, 'shared', 'messages', messageFileName(msg)),
        serializeMessage(msg),
      );

      const sendTmuxInput = vi.fn().mockResolvedValue(undefined);
      const hasTmuxSession = vi.fn().mockResolvedValue(true);

      const next = await runRuntimeCycle(
        labDir,
        config,
        { version: 2, agentAutomation: {}, supervisorKickoffSentAt: new Date().toISOString() },
        { hasTmuxSession, sendTmuxInput },
      );

      const recipients = sendTmuxInput.mock.calls.map((c) => c[0]);
      expect(recipients.some((s) => s.includes('student-a'))).toBe(true);
      expect(next.agentAutomation!['student-a'].lastPromptSignature).toBeDefined();
    } finally {
      await cleanup();
    }
  });

  it('does not wake a student with no unread messages, tasks, or meeting', async () => {
    const { labDir, cleanup } = await makeLabDir();
    try {
      const config = createDefaultConfig('Test Lab', 'Attention');
      config.agents['student-a'] = { name: 'student-a', role: 'student', backend: 'claude-code' };

      const sendTmuxInput = vi.fn();
      const hasTmuxSession = vi.fn().mockResolvedValue(true);

      await runRuntimeCycle(
        labDir,
        config,
        { version: 2, agentAutomation: {}, supervisorKickoffSentAt: new Date().toISOString() },
        { hasTmuxSession, sendTmuxInput },
      );

      const studentCalls = sendTmuxInput.mock.calls.filter((c) => c[0].includes('student-a'));
      expect(studentCalls).toHaveLength(0);
    } finally {
      await cleanup();
    }
  });

  it('overlays orchestrator prompt when supervisor pending signature matches lastPromptSignature (deadlock break)', async () => {
    const { labDir, cleanup } = await makeLabDir();
    try {
      const config = createDefaultConfig('Test Lab', 'Attention');
      config.agents['supervisor'] = { name: 'supervisor', role: 'supervisor', backend: 'claude-code' };

      // Seed an in_progress task assigned to supervisor that's >2h stale → stuck.
      const oldIso = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      await writeFile(
        join(labDir, 'shared', 'KANBAN.md'),
        `# KANBAN\n\n## In Progress\n- [P1] #010 Stuck task (assignee: supervisor) <!-- created:${oldIso} updated:${oldIso} -->\n`,
      );

      const sendTmuxInput = vi.fn().mockResolvedValue(undefined);
      const hasTmuxSession = vi.fn().mockResolvedValue(true);

      // Run once to discover the natural pending signature for supervisor.
      const after1 = await runRuntimeCycle(
        labDir,
        config,
        { version: 2, agentAutomation: {}, supervisorKickoffSentAt: new Date().toISOString() },
        { hasTmuxSession, sendTmuxInput },
      );
      const lockedSig = after1.agentAutomation!['supervisor']?.lastPromptSignature;
      sendTmuxInput.mockClear();

      // Second cycle: nothing changed. Without L2 overlay, signature-diff would
      // skip injection and supervisor would deadlock. With overlay, the stuck
      // task triggers an orchestrator prompt with a fresh (bucketed) signature.
      await runRuntimeCycle(labDir, config, after1, { hasTmuxSession, sendTmuxInput });

      const supervisorCalls = sendTmuxInput.mock.calls.filter((c) => c[0].includes('supervisor'));
      expect(supervisorCalls.length).toBeGreaterThan(0);
      expect(supervisorCalls[0][1]).toContain('Lab orchestrator tick');
      // Sanity: the new signature is not the locked one.
      expect(lockedSig).toBeDefined();
    } finally {
      await cleanup();
    }
  });
});
