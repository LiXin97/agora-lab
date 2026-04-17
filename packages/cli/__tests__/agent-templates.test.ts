import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { initLab } from '../src/commands/init.js';
import { agentAddCommand } from '../src/commands/agent.js';
import { loadLabContext } from '../src/lab-context.js';

const UNSUPPORTED_COMMANDS = [
  'agora kanban start',
  'agora kanban submit',
  'agora meeting ack-read',
  'agora meeting start',
  'agora meeting complete',
  'agora meeting advance --phase',
];

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('generated agent workspaces', () => {
  it('creates a supervisor prompt with a session checklist and TS-native commands', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agora-template-'));
    try {
      await initLab(dir, { name: 'Template Lab', topic: 'autonomy recovery' });
      const claude = await readFile(join(dir, '.agora', 'agents', 'supervisor', 'CLAUDE.md'), 'utf-8');
      expect(claude).toContain('## Session Start Checklist');
      expect(claude).toContain('agora kanban list');
      expect(claude).toContain('agora meeting status');
      expect(claude).toContain('agora meeting new');
      expect(claude).toContain('agora meeting advance');
      expect(claude).not.toContain('agora kanban assign');
      for (const cmd of UNSUPPORTED_COMMANDS) {
        expect(claude, `supervisor template must not mention "${cmd}"`).not.toContain(cmd);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('creates a student prompt that tells the agent to read assigned tasks and unread messages', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agora-template-'));
    try {
      await initLab(dir, { name: 'Template Lab', topic: 'autonomy recovery' });
      const { labDir, config } = await loadLabContext(dir);
      await agentAddCommand(labDir, config, { name: 'student-a', role: 'student', backend: 'copilot' });
      const claude = await readFile(join(labDir, 'agents', 'student-a', 'CLAUDE.md'), 'utf-8');
      expect(claude).toContain('Read `../../shared/KANBAN.md`');
      expect(claude).toContain('Scan `../../shared/messages/` for unread messages to you');
      expect(countOccurrences(claude, 'agora kanban assign')).toBe(1);
      expect(claude).toContain('agora kanban move');
      for (const cmd of UNSUPPORTED_COMMANDS) {
        expect(claude, `student template must not mention "${cmd}"`).not.toContain(cmd);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('creates a research-staff prompt with correct session checklist and supported commands only', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agora-template-'));
    try {
      await initLab(dir, { name: 'Template Lab', topic: 'autonomy recovery' });
      const { labDir, config } = await loadLabContext(dir);
      await agentAddCommand(labDir, config, { name: 'staff-a', role: 'research-staff', backend: 'copilot' });
      const claude = await readFile(join(labDir, 'agents', 'staff-a', 'CLAUDE.md'), 'utf-8');
      expect(claude).toContain('## Session Start Checklist');
      expect(claude).toContain('agora kanban list');
      expect(claude).toContain('agora meeting status');
      for (const cmd of UNSUPPORTED_COMMANDS) {
        expect(claude, `research-staff template must not mention "${cmd}"`).not.toContain(cmd);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('creates a paper-reviewer prompt with correct session checklist and supported commands only', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agora-template-'));
    try {
      await initLab(dir, { name: 'Template Lab', topic: 'autonomy recovery' });
      const { labDir, config } = await loadLabContext(dir);
      await agentAddCommand(labDir, config, { name: 'reviewer-a', role: 'paper-reviewer', backend: 'copilot' });
      const claude = await readFile(join(labDir, 'agents', 'reviewer-a', 'CLAUDE.md'), 'utf-8');
      expect(claude).toContain('## Session Start Checklist');
      expect(claude).toContain('agora kanban list');
      expect(claude).toContain('agora kanban move');
      for (const cmd of UNSUPPORTED_COMMANDS) {
        expect(claude, `paper-reviewer template must not mention "${cmd}"`).not.toContain(cmd);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
