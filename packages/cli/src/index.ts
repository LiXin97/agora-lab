import { Command } from 'commander';
import { loadLabContext } from './lab-context.js';
import { initLab, interactiveInit } from './commands/init.js';
import { statusCommand } from './commands/status.js';
import { kanbanListCommand, kanbanAddCommand, kanbanMoveCommand, kanbanAssignCommand } from './commands/kanban.js';
import { meetingNewCommand, meetingStatusCommand, meetingAdvanceCommand } from './commands/meeting.js';
import { agentAddCommand, agentRemoveCommand, agentListCommand } from './commands/agent.js';
import { startCommand } from './commands/start.js';
import { stopCommand } from './commands/stop.js';
import { webCommand } from './commands/web.js';
import { devCommand } from './commands/dev.js';
import { runRuntimeWatchdog } from './automation/runtime-loop.js';
import type { AgentRole, AgentBackend, TaskPriority, TaskStatus } from '@agora-lab/core';

const program = new Command();

program
  .name('agora')
  .description('Agora Lab — Multi-agent research orchestration')
  .version('2.0.0');

program
  .command('init [name]')
  .description('Initialize a new Agora Lab')
  .option('-t, --topic <topic>', 'Research topic')
  .option('--with-web', 'Start web UI after init')
  .action(async (name?: string, opts?: { topic?: string; withWeb?: boolean }) => {
    let agoraDir: string;
    if (name && opts?.topic) {
      agoraDir = await initLab(process.cwd(), { name, topic: opts.topic });
      console.log(`Initialized Agora Lab at ${agoraDir}`);
    } else {
      agoraDir = await interactiveInit(process.cwd());
    }
    if (opts?.withWeb) {
      await webCommand(process.cwd(), { port: 3001 });
    }
  });

program
  .command('start')
  .description('Start all agents via tmux')
  .action(async () => {
    const { labDir, config } = await loadLabContext(process.cwd());
    console.log(await startCommand(labDir, config));
  });

program
  .command('stop')
  .description('Stop all agents')
  .action(async () => {
    const { labDir, config } = await loadLabContext(process.cwd());
    console.log(await stopCommand(labDir, config));
  });

program
  .command('runtime-watchdog')
  .description('Internal: run the Agora runtime watchdog')
  .requiredOption('--lab-dir <labDir>', 'Absolute path to the .agora directory')
  .action(async (opts: { labDir: string }) => {
    const { config } = await loadLabContext(opts.labDir);
    await runRuntimeWatchdog(opts.labDir, config, { intervalMs: 10000 });
  });

program
  .command('web')
  .description('Start web UI')
  .option('-p, --port <port>', 'Port number', '3001')
  .action(async (opts: { port: string }) => {
    await webCommand(process.cwd(), { port: parseInt(opts.port, 10) });
  });

program
  .command('dev')
  .description('Start web UI + dev server concurrently')
  .option('-p, --port <port>', 'Server port', '3001')
  .action(async (opts: { port: string }) => {
    await devCommand(process.cwd(), { port: parseInt(opts.port, 10) });
  });

program
  .command('status')
  .description('Show lab status')
  .action(async () => {
    const { labDir, config } = await loadLabContext(process.cwd());
    console.log(await statusCommand(labDir, config));
  });

// Agent subcommands
const agent = program.command('agent').description('Manage agents');

agent
  .command('add <name>')
  .description('Add a new agent')
  .requiredOption('-r, --role <role>', 'Agent role (supervisor|student|research-staff|paper-reviewer)')
  .option('-b, --backend <backend>', 'Agent backend')
  .action(async (name: string, opts: { role: string; backend?: string }) => {
    const { labDir, config } = await loadLabContext(process.cwd());
    console.log(await agentAddCommand(labDir, config, {
      name,
      role: opts.role as AgentRole,
      backend: opts.backend as AgentBackend | undefined,
    }));
  });

agent
  .command('remove <name>')
  .description('Remove an agent')
  .action(async (name: string) => {
    const { labDir, config } = await loadLabContext(process.cwd());
    console.log(await agentRemoveCommand(labDir, config, name));
  });

agent
  .command('list')
  .description('List agents')
  .action(async () => {
    const { labDir, config } = await loadLabContext(process.cwd());
    console.log(await agentListCommand(labDir, config));
  });

// Meeting subcommands
const meeting = program.command('meeting').description('Manage meetings');

meeting
  .command('new')
  .description('Create a new meeting')
  .action(async () => {
    const { labDir, config } = await loadLabContext(process.cwd());
    console.log(await meetingNewCommand(labDir, config));
  });

meeting
  .command('status [id]')
  .description('Show meeting status')
  .action(async (id?: string) => {
    const { labDir, config } = await loadLabContext(process.cwd());
    console.log(await meetingStatusCommand(labDir, config, id));
  });

meeting
  .command('advance <id>')
  .description('Advance meeting phase')
  .action(async (id: string) => {
    const { labDir, config } = await loadLabContext(process.cwd());
    console.log(await meetingAdvanceCommand(labDir, config, id));
  });

// Kanban subcommands
const kanban = program.command('kanban').description('Manage kanban board');

kanban
  .command('list')
  .description('List kanban tasks')
  .action(async () => {
    const { labDir, config } = await loadLabContext(process.cwd());
    console.log(await kanbanListCommand(labDir, config));
  });

kanban
  .command('add')
  .description('Add a kanban task')
  .requiredOption('-T, --title <title>', 'Task title')
  .option('-p, --priority <priority>', 'Priority (P0|P1|P2|P3)', 'P1')
  .option('-a, --assign <agent>', 'Assign to agent')
  .action(async (opts: { title: string; priority: string; assign?: string }) => {
    const { labDir, config } = await loadLabContext(process.cwd());
    console.log(await kanbanAddCommand(labDir, config, {
      title: opts.title,
      priority: opts.priority as TaskPriority,
      assignee: opts.assign,
    }));
  });

kanban
  .command('move')
  .description('Move a kanban task')
  .requiredOption('-i, --id <id>', 'Task ID')
  .requiredOption('-s, --status <status>', 'New status (todo|assigned|in_progress|review|done)')
  .action(async (opts: { id: string; status: string }) => {
    const { labDir, config } = await loadLabContext(process.cwd());
    console.log(await kanbanMoveCommand(labDir, config, {
      id: opts.id,
      status: opts.status as TaskStatus,
    }));
  });

kanban
  .command('assign')
  .description('Assign or clear the assignee for an existing kanban task')
  .requiredOption('-i, --id <id>', 'Task ID')
  .option('-a, --agent <agent>', 'Agent to assign; omit to clear the assignee')
  .action(async (opts: { id: string; agent?: string }) => {
    const { labDir, config } = await loadLabContext(process.cwd());
    console.log(await kanbanAssignCommand(labDir, config, {
      id: opts.id,
      assignee: opts.agent,
    }));
  });

program.parse();
