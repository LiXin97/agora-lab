import { access, readFile, realpath } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { parseLabConfig } from '@agora-lab/core';
import type { LabConfig } from '@agora-lab/core';

export async function findLabDir(startDir: string): Promise<string | null> {
  let dir = startDir;
  while (true) {
    const candidate = join(dir, '.agora');
    try {
      await access(join(candidate, 'lab.yaml'));
      return realpath(candidate);
    } catch {
      const parent = dirname(dir);
      if (parent === dir) return null; // reached filesystem root
      dir = parent;
    }
  }
}

export async function loadLabContext(cwd: string): Promise<{ labDir: string; config: LabConfig }> {
  const labDir = await findLabDir(cwd);
  if (!labDir) {
    throw new Error('Not in an Agora Lab project. Run `agora init` first.');
  }
  const yamlStr = await readFile(join(labDir, 'lab.yaml'), 'utf-8');
  const config = parseLabConfig(yamlStr);
  return { labDir, config };
}
