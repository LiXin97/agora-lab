import { access, mkdir, readFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { execa } from 'execa';
import { initLab } from '../src/commands/init.js';

const TEST_ROOT = join(process.cwd(), 'packages', 'cli', '__tests__', '__bundle_tmp__');

afterEach(async () => {
  await rm(TEST_ROOT, { recursive: true, force: true });
});

describe.sequential('built CLI packaging', () => {
  it('runs server-backed CLI commands even if packages/server/dist is absent', async () => {
    const repoRoot = process.cwd();
    const projectDir = join(
      TEST_ROOT,
      `bundle-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    await mkdir(projectDir, { recursive: true });
    await initLab(projectDir, { name: 'Bundle Test Lab', topic: 'packaging regression' });

    await execa('pnpm', ['--filter', '@agora-lab/cli', 'build'], { cwd: repoRoot });

    const cliEntry = join(repoRoot, 'packages', 'cli', 'dist', 'index.js');
    const kanbanPath = join(projectDir, '.agora', 'shared', 'KANBAN.md');
    const serverDist = join(repoRoot, 'packages', 'server', 'dist');
    const serverDistBackup = `${serverDist}.bak-${process.pid}-${Date.now()}`;

    let serverDistMoved = false;
    try {
      await access(serverDist);
      await rename(serverDist, serverDistBackup);
      serverDistMoved = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    try {
      const result = await execa(
        'node',
        [cliEntry, 'kanban', 'add', '-T', 'Bundled task smoke test', '-p', 'P1'],
        {
          cwd: projectDir,
          reject: false,
        },
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Added task');
      expect(await readFile(kanbanPath, 'utf-8')).toContain('Bundled task smoke test');

      // Verify `kanban assign` is reachable in the built bundle
      const helpResult = await execa('node', [cliEntry, 'kanban', 'assign', '--help'], {
        cwd: projectDir,
        reject: false,
      });
      expect(helpResult.exitCode).toBe(0);
      expect(helpResult.stdout).toContain('-i, --id');
    } finally {
      if (serverDistMoved) {
        await rm(serverDist, { recursive: true, force: true });
        await rename(serverDistBackup, serverDist);
      } else {
        await rm(serverDist, { recursive: true, force: true });
      }
    }
  });
});
