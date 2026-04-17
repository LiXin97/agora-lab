import { describe, it, expect } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import http from 'node:http';
import { startServer } from '../src/index.js';

function rawGet(port: number, path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method: 'GET' }, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      res.on('end', () => resolve({ status: res.statusCode!, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

describe('static file serving — path traversal guard', () => {
  const port = 49201;

  async function withServer(fn: (base: string) => Promise<void>) {
    const base = join(tmpdir(), `agora-static-${Date.now()}`);
    const staticDir = join(base, 'static');
    const labDir = join(base, 'lab');

    await mkdir(staticDir, { recursive: true });
    await mkdir(join(labDir, 'shared', 'messages'), { recursive: true });
    await mkdir(join(labDir, 'shared', 'meetings'), { recursive: true });
    await writeFile(join(staticDir, 'index.html'), '<html>ok</html>');
    await writeFile(join(base, 'secret.txt'), 'secret-content');

    const { serializeLabConfig, createDefaultConfig, serializeKanbanBoard } = await import('@agora-lab/core');
    await writeFile(join(labDir, 'lab.yaml'), serializeLabConfig(createDefaultConfig('T', 'R')));
    await writeFile(join(labDir, 'shared', 'KANBAN.md'), serializeKanbanBoard({ tasks: [] }));

    const srv = await startServer({ labDir, port, staticDir });
    try {
      await fn(base);
    } finally {
      srv.close();
      await rm(base, { recursive: true, force: true });
    }
  }

  it('serves index.html for /', async () => {
    await withServer(async () => {
      const { status, body } = await rawGet(port, '/');
      expect(status).toBe(200);
      expect(body).toContain('ok');
    });
  });

  it('returns 403 for direct path traversal', async () => {
    await withServer(async () => {
      const { status } = await rawGet(port, '/../secret.txt');
      expect(status).toBe(403);
    });
  });

  it('returns 403 for multi-level traversal', async () => {
    await withServer(async () => {
      const { status } = await rawGet(port, '/../../etc/passwd');
      expect(status).toBe(403);
    });
  });

  it('returns 403 for URL-encoded traversal (%2e%2e)', async () => {
    await withServer(async () => {
      const { status } = await rawGet(port, '/%2e%2e%2fsecret.txt');
      expect(status).toBe(403);
    });
  });

  it('falls back to index.html for missing file', async () => {
    await withServer(async () => {
      const { status, body } = await rawGet(port, '/nonexistent.js');
      expect(status).toBe(200);
      expect(body).toContain('ok');
    });
  });
});
