import { access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import chalk from 'chalk';
import { loadLabContext } from '../lab-context.js';
import { loadServerModule } from '../server-runtime.js';

export async function webCommand(cwd: string, opts: { port: number }): Promise<void> {
  const { labDir } = await loadLabContext(cwd);

  const { startServer } = await loadServerModule();

  // Resolve the web package directory robustly (works from both source and bundle)
  let staticDir: string | undefined;
  try {
    const require = createRequire(import.meta.url);
    const webPkgJson = require.resolve('@agora-lab/web/package.json');
    const candidate = join(dirname(webPkgJson), 'dist');
    await access(candidate);
    staticDir = candidate;
  } catch { /* web package not found or dist not built */ }

  console.log(chalk.bold('Starting Agora Lab Web UI...'));
  console.log(`Lab: ${labDir}`);
  console.log(`Port: ${opts.port}`);

  if (!staticDir) {
    console.log(chalk.yellow('Warning: Web frontend not built. Run `pnpm run build` in packages/web first.'));
  }

  const server = await startServer({
    labDir,
    port: opts.port,
    staticDir,
  });

  console.log(chalk.green(`\nAgora Lab running at http://localhost:${opts.port}`));
  console.log(chalk.gray('Press Ctrl+C to stop\n'));

  process.on('SIGINT', () => {
    server.close();
    process.exit(0);
  });
}
