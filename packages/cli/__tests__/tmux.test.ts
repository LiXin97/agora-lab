import { describe, it, expect, vi } from 'vitest';
import { buildSessionName, buildStartCommand } from '../src/tmux.js';

const { buildAgentSessionNameMock } = vi.hoisted(() => ({
  buildAgentSessionNameMock: vi.fn((labDir: string, agentName: string) => (
    `agora-core-${labDir.split('/').filter(Boolean).join('-')}-${agentName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()}`
  )),
}));

vi.mock('@agora-lab/core', async () => {
  const actual = await vi.importActual<typeof import('@agora-lab/core')>('@agora-lab/core');
  return {
    ...actual,
    buildAgentSessionName: buildAgentSessionNameMock,
  };
});

describe('buildSessionName', () => {
  it('reuses the shared core session-name helper', () => {
    expect(buildSessionName('My Lab', 'student-a', '/home/user/projects/myproject/.agora'))
      .toBe('agora-core-home-user-projects-myproject-student-a');
    expect(buildAgentSessionNameMock).toHaveBeenCalledWith('/home/user/projects/myproject', 'student-a');
  });

  it('produces different names for different agent names', () => {
    const name1 = buildSessionName('My Lab', 'student-a', '/projects/lab1/.agora');
    const name2 = buildSessionName('My Lab', 'student-b', '/projects/lab1/.agora');
    expect(name1).not.toBe(name2);
  });

  it('produces different names for different lab dirs with the same basename', () => {
    const name1 = buildSessionName('My Lab', 'student-a', '/users/alice/my-lab/.agora');
    const name2 = buildSessionName('My Lab', 'student-a', '/users/bob/my-lab/.agora');
    expect(name1).not.toBe(name2);
  });

  it('sanitizes agent name', () => {
    const result = buildSessionName('lab', 'Agent Name!', '/some/path/.agora');
    expect(result).toBe('agora-core-some-path-agent-name-');
  });

  it('lowercases agent name', () => {
    const result = buildSessionName('lab', 'AgentA', '/some/path/.agora');
    expect(result).toBe('agora-core-some-path-agenta');
  });
});

describe('buildStartCommand', () => {
  it('builds claude-code command with a kickoff prompt, not the workspace path', () => {
    const cmd = buildStartCommand('claude-code', '/path/to/workspace');
    expect(cmd).toContain('claude --dangerously-skip-permissions');
    expect(cmd).toContain('Session Start Checklist');
    // The workspace path must NOT be passed as a positional — it'd be parsed
    // as a user prompt, leaving the agent idle waiting for instructions.
    expect(cmd).not.toContain('/path/to/workspace');
  });
});
