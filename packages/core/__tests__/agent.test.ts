import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { createAgentWorkspace, listAgentDirs, removeAgentWorkspace } from '../src/agent.js';
import type { AgentConfig, LabConfig } from '../src/types.js';
import type { Templates } from '../src/agent.js';

const labConfig: LabConfig = {
  version: '1',
  labName: 'test-lab',
  researchTopic: 'AI Safety',
  roles: {},
  agents: {},
  meeting: { trigger: 'manual', minParticipants: 2, decisionMaker: 'supervisor', requireAllRead: true },
  security: { allowUnsafeBackends: false },
  communication: {
    method: 'file',
    messageDir: 'shared/messages',
    kanbanFile: 'shared/KANBAN.md',
    artifactDir: 'shared/artifacts',
    meetingDir: 'shared/meetings',
    paperReviewDir: 'shared/paper-reviews',
  },
};

const agentConfig: AgentConfig = {
  name: 'student-a',
  role: 'student',
  backend: 'claude-code',
  model: 'opus',
  researchDirection: 'alignment',
};

const templates: Templates = {
  claudeTemplate: '# {{name}}\nRole: {{role}}\nLab: {{labName}}\nKanban: {{kanbanFileRel}}',
  settingsTemplate: '{"agent":"{{name}}"}',
};

describe('agent workspace', () => {
  it('creates expected files', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-test-'));
    try {
      const agentDir = await createAgentWorkspace(tmpDir, agentConfig, labConfig, templates);
      expect(agentDir).toBe(path.join(tmpDir, 'agents', 'student-a'));

      const claude = await fs.readFile(path.join(agentDir, 'CLAUDE.md'), 'utf-8');
      expect(claude).toContain('# student-a');
      expect(claude).toContain('Role: student');
      expect(claude).toContain('Kanban: ../../shared/KANBAN.md');

      const settings = await fs.readFile(path.join(agentDir, '.claude', 'settings.json'), 'utf-8');
      expect(settings).toBe('{"agent":"student-a"}');

      const memory = await fs.readFile(path.join(agentDir, 'memory.md'), 'utf-8');
      expect(memory).toContain('student-a Memory');

      const wsStat = await fs.stat(path.join(agentDir, 'workspace'));
      expect(wsStat.isDirectory()).toBe(true);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('lists agent dirs', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-test-'));
    try {
      await createAgentWorkspace(tmpDir, agentConfig, labConfig, templates);
      await createAgentWorkspace(tmpDir, { ...agentConfig, name: 'student-b' }, labConfig, templates);

      const dirs = await listAgentDirs(tmpDir);
      expect(dirs).toEqual(['student-a', 'student-b']);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns empty array when no agents dir', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-test-'));
    try {
      const dirs = await listAgentDirs(tmpDir);
      expect(dirs).toEqual([]);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('removes agent workspace', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-test-'));
    try {
      await createAgentWorkspace(tmpDir, agentConfig, labConfig, templates);
      await removeAgentWorkspace(tmpDir, 'student-a');

      const dirs = await listAgentDirs(tmpDir);
      expect(dirs).toEqual([]);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
