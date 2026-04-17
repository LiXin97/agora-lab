// packages/cli/__tests__/start-stop.test.ts
import { describe, expect, it, vi } from 'vitest';
import { startCommand } from '../src/commands/start.js';
import { stopCommand } from '../src/commands/stop.js';
import { listTmuxSessions } from '../src/tmux.js';

vi.mock('../src/tmux.js', () => ({
  buildSessionName: vi.fn((_labName: string, agentName: string) => `agora-test-${agentName}`),
  buildWatchdogSessionName: vi.fn(() => 'agora-test-runtime'),
  buildAgoraSessionName: vi.fn(() => 'agora-test'),
  buildStartCommand: vi.fn(() => 'copilot "/tmp/workspace"'),
  createTmuxSession: vi.fn().mockResolvedValue(undefined),
  killTmuxSession: vi.fn().mockResolvedValue(undefined),
  hasTmuxSession: vi.fn().mockResolvedValue(false),
  listTmuxSessions: vi.fn(async (prefix: string) => {
    return ['agora-test-supervisor', 'agora-test-runtime', 'agora-test-stale-student']
      .filter(s => s.startsWith(prefix));
  }),
}));

vi.mock('../src/runtime.js', () => ({
  ensureLabRuntime: vi.fn().mockResolvedValue({ seeded: false, state: { version: 2, agentAutomation: {} } }),
}));

vi.mock('@agora-lab/core', async (importActual) => {
  const actual = await importActual<typeof import('@agora-lab/core')>();
  return {
    ...actual,
    listAgentDirs: vi.fn().mockResolvedValue(['supervisor']),
  };
});

describe('startCommand / stopCommand', () => {
  it('starts the runtime watchdog after agent sessions', async () => {
    const result = await startCommand('/tmp/lab/.agora', {
      labName: 'Test Lab',
      agents: {
        supervisor: { name: 'supervisor', role: 'supervisor', backend: 'copilot' },
      },
    } as never);
    expect(result).toContain('runtime watchdog: started');
  });

  it('stops the runtime watchdog session and any orphan session with the same lab prefix', async () => {
    const result = await stopCommand('/tmp/lab/.agora', {
      labName: 'Test Lab',
      agents: {
        supervisor: { name: 'supervisor', role: 'supervisor', backend: 'copilot' },
      },
    } as never);
    expect(result).toContain('runtime watchdog: stopped');
    expect(result).toContain('stale session: agora-test-stale-student');
    expect(listTmuxSessions).toHaveBeenCalledWith('agora-test-');
  });
});
