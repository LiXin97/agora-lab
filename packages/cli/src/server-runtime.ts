import { access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

async function ensureLinkedServerBuild(): Promise<void> {
  const require = createRequire(import.meta.url);
  const serverPkgJson = require.resolve('@agora-lab/server/package.json');
  const serverDir = dirname(serverPkgJson);
  const serverDistEntry = join(serverDir, 'dist', 'index.js');

  try {
    await access(serverDistEntry);
    return;
  } catch {
    // Missing dist is expected in linked-workspace installs after cleanup.
  }

  const serverSourceEntry = join(serverDir, 'src', 'index.ts');
  try {
    await access(serverSourceEntry);
  } catch {
    return;
  }

  const { execa } = await import('execa');
  await execa('pnpm', ['build'], { cwd: serverDir });
}

export async function loadServerModule(): Promise<typeof import('@agora-lab/server')> {
  await ensureLinkedServerBuild();
  return import('@agora-lab/server');
}
