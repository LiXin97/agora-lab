import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve, sep } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { buildFullState, getFullStateEvents, watchLabDir } from './watcher.js';
import { serializeEvent, parseClientEvent } from './events.js';
import type { ServerEvent } from './events.js';
import { handleCommand } from './commands.js';

export { type ServerEvent, type AgentInfo } from './events.js';
export { buildFullState, getFullStateEvents } from './watcher.js';
export { handleCommand } from './commands.js';
export {
  loadLabConfig,
  loadKanbanBoard,
  loadLatestMeeting,
  loadRecentMessages,
} from './runtime.js';

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

export interface ServerOptions {
  labDir: string;
  port: number;
  staticDir?: string;
}

export async function startServer(opts: ServerOptions): Promise<{ close: () => void }> {
  const { labDir, port, staticDir } = opts;
  const clients = new Set<WebSocket>();

  function broadcast(event: ServerEvent) {
    const data = serializeEvent(event);
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  const httpServer = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    if (!staticDir) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Agora Lab WebSocket Server. Connect via ws://');
      return;
    }

    const staticRoot = resolve(staticDir);
    const rawUrl = req.url ?? '/';
    const urlPath = rawUrl.split('?')[0];

    // Decode percent-encoding to catch %2e%2e%2f style traversal.
    let decoded: string;
    try {
      decoded = decodeURIComponent(urlPath);
    } catch {
      res.writeHead(400);
      res.end('Bad Request');
      return;
    }

    const relPath = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
    const filePath = resolve(staticDir, relPath);

    if (!filePath.startsWith(staticRoot + sep) && filePath !== staticRoot) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    try {
      const content = await readFile(filePath);
      const ext = extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(content);
    } catch {
      try {
        const index = await readFile(join(staticDir, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(index);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    }
  });

  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', async (ws) => {
    clients.add(ws);
    try {
      const state = await buildFullState(labDir);
      const events = getFullStateEvents(state);
      for (const event of events) {
        ws.send(serializeEvent(event));
      }
    } catch (err) {
      console.error('Failed to send initial state:', err);
    }
    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
    ws.on('message', async (raw) => {
      const event = parseClientEvent(String(raw));
      if (!event) return;
      try {
        await handleCommand(labDir, event);
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: String(err) }));
      }
    });
  });

  const stopWatching = watchLabDir(labDir, broadcast);

  await new Promise<void>((resolve, reject) => {
    httpServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use. Kill the existing process or use a different port.`));
      } else {
        reject(err);
      }
    });
    httpServer.listen(port, () => resolve());
  });
  console.log(`Agora Lab server running on http://localhost:${port}`);

  return {
    close() {
      stopWatching();
      wss.close();
      httpServer.close();
    },
  };
}
