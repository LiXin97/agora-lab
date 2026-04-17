import {
  createAgentWorkspace,
  removeAgentWorkspace,
  listAgentDirs,
  serializeLabConfig,
} from '@agora-lab/core';
import type { AgentRole, AgentBackend, LabConfig } from '@agora-lab/core';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadRoleTemplates } from '../role-templates.js';

export async function agentAddCommand(
  labDir: string,
  config: LabConfig,
  opts: { name: string; role: AgentRole; backend?: AgentBackend },
): Promise<string> {
  const role = opts.role;
  const roleDef = config.roles[role];
  if (!roleDef) {
    throw new Error(`Unknown role: ${role}`);
  }
  const backend = opts.backend ?? roleDef.defaultBackend;
  const agentConfig = { name: opts.name, role, backend };

  await createAgentWorkspace(labDir, agentConfig, config, await loadRoleTemplates(role));

  // Update lab config
  config.agents[opts.name] = agentConfig;
  await writeFile(join(labDir, 'lab.yaml'), serializeLabConfig(config));

  return `Added agent "${opts.name}" with role "${role}" (backend: ${backend})`;
}

export async function agentRemoveCommand(
  labDir: string,
  config: LabConfig,
  name: string,
): Promise<string> {
  await removeAgentWorkspace(labDir, name);
  delete config.agents[name];
  await writeFile(join(labDir, 'lab.yaml'), serializeLabConfig(config));
  return `Removed agent "${name}"`;
}

export async function agentListCommand(labDir: string, config: LabConfig): Promise<string> {
  const agents = await listAgentDirs(labDir);
  if (agents.length === 0) return 'No agents configured.';
  const lines = agents.map(name => {
    const ac = config.agents[name];
    return ac ? `${name} (${ac.role}, ${ac.backend})` : `${name} (unknown)`;
  });
  return lines.join('\n');
}
