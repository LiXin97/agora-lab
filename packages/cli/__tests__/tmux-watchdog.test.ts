import { describe, it, expect, vi, beforeEach } from 'vitest';

const { execaMock, buildAgoraSessionNameMock } = vi.hoisted(() => ({
  execaMock: vi.fn(),
  buildAgoraSessionNameMock: vi.fn((_labDir: string) => 'agora-mocked'),
}));

vi.mock('execa', () => ({ execa: execaMock }));

vi.mock('@agora-lab/core', async () => {
  const actual = await vi.importActual<typeof import('@agora-lab/core')>('@agora-lab/core');
  return {
    ...actual,
    buildAgoraSessionName: buildAgoraSessionNameMock,
  };
});

import { sendTmuxInput, buildWatchdogSessionName } from '../src/tmux.js';

describe('sendTmuxInput', () => {
  beforeEach(() => {
    execaMock.mockReset();
    execaMock.mockResolvedValue({});
  });

  it('calls execa with send-keys literal then Enter', async () => {
    await sendTmuxInput('my-session', 'hello world');
    expect(execaMock).toHaveBeenCalledTimes(2);
    expect(execaMock.mock.calls[0]).toEqual(['tmux', ['send-keys', '-t', 'my-session', '-l', '--', 'hello world']]);
    expect(execaMock.mock.calls[1]).toEqual(['tmux', ['send-keys', '-t', 'my-session', 'Enter']]);
  });

  it('sends Enter in a separate call after the literal text', async () => {
    await sendTmuxInput('sess', 'echo hi');
    expect(execaMock.mock.calls[0][1]).toContain('-l');
    expect(execaMock.mock.calls[1][1]).toContain('Enter');
  });
});

describe('buildWatchdogSessionName', () => {
  it('returns <agoraSessionName(dirname(labDir))>-runtime', () => {
    buildAgoraSessionNameMock.mockReturnValue('agora-some-lab');
    const result = buildWatchdogSessionName('/path/to/lab');
    expect(buildAgoraSessionNameMock).toHaveBeenCalledWith('/path/to');
    expect(result).toBe('agora-some-lab-runtime');
  });
});
