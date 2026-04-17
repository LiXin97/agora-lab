import chalk from 'chalk';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { loadLabContext } from '../lab-context.js';
import { loadServerModule } from '../server-runtime.js';

export async function devCommand(cwd: string, opts: { port: number }): Promise<void> {
  const { labDir } = await loadLabContext(cwd);

  // Resolve web package directory
  const require = createRequire(import.meta.url);
  const webPkgJson = require.resolve('@agora-lab/web/package.json');
  const webDir = dirname(webPkgJson);

  // Start WebSocket server in-process
  const { startServer } = await loadServerModule();
  console.log(chalk.magenta('[server]') + ' Starting WebSocket server...');
  const server = await startServer({ labDir, port: opts.port });
  console.log(chalk.magenta('[server]') + chalk.green(` Running on http://localhost:${opts.port}`));

  // Start Vite dev server as child process
  const { execa } = await import('execa');
  console.log(chalk.cyan('[web]') + ' Starting Vite dev server...');

  const vitePort = opts.port + 2170; // 3001 -> 5171
  const vite = execa('npx', ['vite', '--port', String(vitePort), '--clearScreen', 'false'], {
    cwd: webDir,
    env: { ...process.env, FORCE_COLOR: '1', VITE_WS_PORT: String(opts.port) },
  });

  vite.stdout?.on('data', (data: Buffer) => {
    for (const line of data.toString().split('\n').filter(Boolean)) {
      console.log(chalk.cyan('[web]') + ' ' + line);
    }
  });

  vite.stderr?.on('data', (data: Buffer) => {
    for (const line of data.toString().split('\n').filter(Boolean)) {
      console.error(chalk.cyan('[web]') + ' ' + chalk.red(line));
    }
  });

  console.log(chalk.bold.green(`\n  Agora Lab Dev Server`));
  console.log(chalk.gray(`  WebSocket: ws://localhost:${opts.port}`));
  console.log(chalk.gray(`  Frontend:  http://localhost:${vitePort}`));
  console.log(chalk.gray(`  Press Ctrl+C to stop\n`));

  const cleanup = () => {
    vite.kill();
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Wait for vite to exit (keeps process alive)
  try {
    await vite;
  } catch {
    // vite was killed, that's fine
  }
}
