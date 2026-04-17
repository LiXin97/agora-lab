import { describe, it, expect } from 'vitest';
import { initLab } from '../src/commands/init.js';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('initLab', () => {
  it('creates .agora structure', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agora-init-'));
    try {
      await initLab(dir, { name: 'Test Lab', topic: 'Attention' });
      const entries = await readdir(join(dir, '.agora'));
      expect(entries).toContain('lab.yaml');
      expect(entries).toContain('LAB.md');
      expect(entries).toContain('agents');
      expect(entries).toContain('shared');
      const shared = await readdir(join(dir, '.agora', 'shared'));
      expect(shared).toContain('KANBAN.md');
      expect(shared).toContain('messages');
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('creates supervisor workspace', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agora-init-'));
    try {
      await initLab(dir, { name: 'Test Lab', topic: 'Attention' });
      const entries = await readdir(join(dir, '.agora', 'agents', 'supervisor'));
      expect(entries).toContain('CLAUDE.md');
      expect(entries).toContain('workspace');
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('supervisor CLAUDE.md is generated from real repo template', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agora-init-'));
    try {
      await initLab(dir, { name: 'Test Lab', topic: 'Attention' });
      const claude = await readFile(join(dir, '.agora', 'agents', 'supervisor', 'CLAUDE.md'), 'utf-8');
      // Unique auto-generated header present only in the supervisor template
      expect(claude).toContain('auto-generated from `templates/supervisor.claude.md`');
      // Role-specific content from the supervisor template
      expect(claude).toContain('## Session Start Checklist');
      expect(claude).toContain('agora kanban list');
      // supervisor-specific role overlays line (unique to supervisor template)
      expect(claude).toContain('supervisor-planning');
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
