import { describe, expect, it, vi } from 'vitest';

vi.mock('@agora-lab/core', async () => import('../../core/src/index.ts'));

import { runWatchdogCycle } from '../src/automation/watchdog.js';

describe('runWatchdogCycle', () => {
  it('injects pending prompt when session exists and records signature', async () => {
    const sendTmuxInput = vi.fn().mockResolvedValue(undefined);
    const hasTmuxSession = vi.fn().mockResolvedValue(true);
    const next = await runWatchdogCycle({
      agentNames: ['student-a'],
      labDir: '/tmp/labs/demo',
      runtimeState: { version: 2, agentAutomation: {} },
      pendingByAgent: { 'student-a': { prompt: 'Task #001 assigned.', signature: 'sig-1' } },
      deps: { hasTmuxSession, sendTmuxInput },
    });
    expect(sendTmuxInput).toHaveBeenCalledOnce();
    expect(sendTmuxInput.mock.calls[0][1]).toBe('Task #001 assigned.');
    expect(next.agentAutomation!['student-a'].lastPromptSignature).toBe('sig-1');
    expect(next.agentAutomation!['student-a'].lastInjectedAt).toBeDefined();
  });

  it('skips injection when signature already recorded', async () => {
    const sendTmuxInput = vi.fn();
    const hasTmuxSession = vi.fn().mockResolvedValue(true);
    const next = await runWatchdogCycle({
      agentNames: ['student-a'],
      labDir: '/tmp/labs/demo',
      runtimeState: { version: 2, agentAutomation: { 'student-a': { lastPromptSignature: 'sig-1' } } },
      pendingByAgent: { 'student-a': { prompt: 'x', signature: 'sig-1' } },
      deps: { hasTmuxSession, sendTmuxInput },
    });
    expect(sendTmuxInput).not.toHaveBeenCalled();
    expect(next.agentAutomation!['student-a'].lastPromptSignature).toBe('sig-1');
  });

  it('skips agents without pending prompts', async () => {
    const sendTmuxInput = vi.fn();
    const hasTmuxSession = vi.fn().mockResolvedValue(true);
    await runWatchdogCycle({
      agentNames: ['student-a'],
      labDir: '/tmp/labs/demo',
      runtimeState: { version: 2, agentAutomation: {} },
      pendingByAgent: {},
      deps: { hasTmuxSession, sendTmuxInput },
    });
    expect(sendTmuxInput).not.toHaveBeenCalled();
  });

  it('does not inject when tmux session is missing', async () => {
    const sendTmuxInput = vi.fn();
    const hasTmuxSession = vi.fn().mockResolvedValue(false);
    const next = await runWatchdogCycle({
      agentNames: ['student-a'],
      labDir: '/tmp/labs/demo',
      runtimeState: { version: 2, agentAutomation: {} },
      pendingByAgent: { 'student-a': { prompt: 'x', signature: 'sig-1' } },
      deps: { hasTmuxSession, sendTmuxInput },
    });
    expect(sendTmuxInput).not.toHaveBeenCalled();
    expect(next.agentAutomation!['student-a']).toBeUndefined();
  });

  it('injects heartbeat when agent has been idle past threshold even with no signature change', async () => {
    const sendTmuxInput = vi.fn().mockResolvedValue(undefined);
    const hasTmuxSession = vi.fn().mockResolvedValue(true);
    const now = Date.parse('2026-04-18T02:00:00Z');
    const stale = new Date(now - 25 * 60 * 1000).toISOString();
    const next = await runWatchdogCycle({
      agentNames: ['student-a'],
      labDir: '/tmp/labs/demo',
      runtimeState: { version: 2, agentAutomation: { 'student-a': { lastPromptSignature: 'sig-1', lastInjectedAt: stale } } },
      pendingByAgent: { 'student-a': { prompt: 'x', signature: 'sig-1' } },
      deps: { hasTmuxSession, sendTmuxInput },
      nowMs: now,
    });
    expect(sendTmuxInput).toHaveBeenCalledOnce();
    expect(sendTmuxInput.mock.calls[0][1]).toMatch(/heartbeat/i);
    expect(next.agentAutomation!['student-a'].lastPromptSignature).toBe('sig-1');
    expect(next.agentAutomation!['student-a'].lastInjectedAt).toBe(new Date(now).toISOString());
  });

  it('does not heartbeat when agent was injected recently', async () => {
    const sendTmuxInput = vi.fn();
    const hasTmuxSession = vi.fn().mockResolvedValue(true);
    const now = Date.parse('2026-04-18T02:00:00Z');
    const recent = new Date(now - 60 * 1000).toISOString();
    await runWatchdogCycle({
      agentNames: ['student-a'],
      labDir: '/tmp/labs/demo',
      runtimeState: { version: 2, agentAutomation: { 'student-a': { lastPromptSignature: 'sig-1', lastInjectedAt: recent } } },
      pendingByAgent: { 'student-a': { prompt: 'x', signature: 'sig-1' } },
      deps: { hasTmuxSession, sendTmuxInput },
      nowMs: now,
    });
    expect(sendTmuxInput).not.toHaveBeenCalled();
  });

  it('does not heartbeat when pane is busy', async () => {
    const sendTmuxInput = vi.fn();
    const hasTmuxSession = vi.fn().mockResolvedValue(true);
    const isPaneBusy = vi.fn().mockResolvedValue(true);
    const now = Date.parse('2026-04-18T02:00:00Z');
    const stale = new Date(now - 25 * 60 * 1000).toISOString();
    await runWatchdogCycle({
      agentNames: ['student-a'],
      labDir: '/tmp/labs/demo',
      runtimeState: { version: 2, agentAutomation: { 'student-a': { lastPromptSignature: 'sig-1', lastInjectedAt: stale } } },
      pendingByAgent: { 'student-a': { prompt: 'x', signature: 'sig-1' } },
      deps: { hasTmuxSession, sendTmuxInput, isPaneBusy },
      nowMs: now,
    });
    expect(sendTmuxInput).not.toHaveBeenCalled();
  });

  it('does not heartbeat agents that have never been injected (no kickoff yet)', async () => {
    const sendTmuxInput = vi.fn();
    const hasTmuxSession = vi.fn().mockResolvedValue(true);
    const now = Date.parse('2026-04-18T02:00:00Z');
    await runWatchdogCycle({
      agentNames: ['student-a'],
      labDir: '/tmp/labs/demo',
      runtimeState: { version: 2, agentAutomation: {} },
      pendingByAgent: {},
      deps: { hasTmuxSession, sendTmuxInput },
      nowMs: now,
    });
    expect(sendTmuxInput).not.toHaveBeenCalled();
  });

  it('records supervisorKickoffSentAt when pending marksKickoffSent', async () => {
    const sendTmuxInput = vi.fn().mockResolvedValue(undefined);
    const hasTmuxSession = vi.fn().mockResolvedValue(true);
    const next = await runWatchdogCycle({
      agentNames: ['supervisor'],
      labDir: '/tmp/labs/demo',
      runtimeState: { version: 2, agentAutomation: {} },
      pendingByAgent: { supervisor: { prompt: 'kick', signature: 'kickoff:supervisor', marksKickoffSent: true } },
      deps: { hasTmuxSession, sendTmuxInput },
    });
    expect(next.supervisorKickoffSentAt).toBeDefined();
  });
});
