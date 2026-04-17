import { describe, it, expect } from 'vitest';
import { findLabDir } from '../src/lab-context.js';
import { mkdtemp, mkdir, rm, writeFile, symlink, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

async function makeValidLab(dir: string): Promise<void> {
  await mkdir(join(dir, '.agora'), { recursive: true });
  await writeFile(join(dir, '.agora', 'lab.yaml'), 'name: test\n');
}

describe('findLabDir', () => {
  it('finds .agora with lab.yaml in start dir', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agora-test-'));
    try {
      await makeValidLab(dir);
      const found = await findLabDir(dir);
      expect(found).toBe(await realpath(join(dir, '.agora')));
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('walks up to find .agora with lab.yaml in parent directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agora-test-'));
    try {
      await makeValidLab(dir);
      const child = join(dir, 'nested', 'subdir');
      await mkdir(child, { recursive: true });
      const found = await findLabDir(child);
      expect(found).toBe(await realpath(join(dir, '.agora')));
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('returns null when no .agora exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agora-test-'));
    try {
      expect(await findLabDir(dir)).toBeNull();
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('returns null when .agora exists but lacks lab.yaml', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agora-test-'));
    try {
      await mkdir(join(dir, '.agora'));
      expect(await findLabDir(dir)).toBeNull();
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('skips .agora without lab.yaml and finds valid one in parent', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agora-test-'));
    try {
      // parent has a valid lab
      await makeValidLab(dir);
      // child has .agora but no lab.yaml
      const child = join(dir, 'subproject');
      await mkdir(join(child, '.agora'), { recursive: true });
      const found = await findLabDir(child);
      expect(found).toBe(await realpath(join(dir, '.agora')));
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('canonicalizes path when .agora is reached via a symlinked parent', async () => {
    const real = await mkdtemp(join(tmpdir(), 'agora-real-'));
    const link = join(tmpdir(), `agora-link-${Date.now()}`);
    try {
      await makeValidLab(real);
      await symlink(real, link);
      const found = await findLabDir(link);
      const expected = await realpath(join(real, '.agora'));
      expect(found).toBe(expected);
    } finally {
      await rm(link);
      await rm(real, { recursive: true });
    }
  });
});
