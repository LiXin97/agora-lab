import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { AgentConfig, LabConfig } from './types.js';
import { renderTemplate } from './template.js';

export interface Templates {
  claudeTemplate: string;
  settingsTemplate: string;
}

function toRelSharedPath(commPath: string): string {
  // commPath like "shared/KANBAN.md" -> "../../shared/KANBAN.md"
  return `../../${commPath}`;
}

export async function createAgentWorkspace(
  labDir: string,
  agentConfig: AgentConfig,
  labConfig: LabConfig,
  templates: Templates,
): Promise<string> {
  const agentDir = path.join(labDir, 'agents', agentConfig.name);

  await fs.mkdir(path.join(agentDir, 'workspace'), { recursive: true });
  await fs.mkdir(path.join(agentDir, '.claude'), { recursive: true });

  const comm = labConfig.communication;
  const vars: Record<string, unknown> = {
    name: agentConfig.name,
    role: agentConfig.role,
    labName: labConfig.labName,
    researchTopic: labConfig.researchTopic,
    backend: agentConfig.backend,
    model: agentConfig.model ?? '',
    researchDirection: agentConfig.researchDirection ?? '',
    persona: agentConfig.persona ?? {},
    kanbanFileRel: toRelSharedPath(comm.kanbanFile),
    messageDirRel: toRelSharedPath(comm.messageDir),
    artifactDirRel: toRelSharedPath(comm.artifactDir),
    meetingDirRel: toRelSharedPath(comm.meetingDir),
  };

  const claudeMd = renderTemplate(templates.claudeTemplate, vars);
  const settingsJson = renderTemplate(templates.settingsTemplate, vars);

  await fs.writeFile(path.join(agentDir, 'CLAUDE.md'), claudeMd, 'utf-8');
  await fs.writeFile(path.join(agentDir, '.claude', 'settings.json'), settingsJson, 'utf-8');
  await fs.writeFile(path.join(agentDir, 'memory.md'), `# ${agentConfig.name} Memory\n`, 'utf-8');

  return agentDir;
}

export async function listAgentDirs(labDir: string): Promise<string[]> {
  const agentsDir = path.join(labDir, 'agents');
  try {
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

export async function removeAgentWorkspace(labDir: string, agentName: string): Promise<void> {
  const agentDir = path.join(labDir, 'agents', agentName);
  await fs.rm(agentDir, { recursive: true, force: true });
}
