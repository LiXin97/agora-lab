import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type { AgentRole } from '@agora-lab/core';
import type { Templates } from '@agora-lab/core';

const TEMPLATE_ROOT = fileURLToPath(new URL('../../../templates/', import.meta.url));

const ROLE_TEMPLATE_FILES: Record<AgentRole, { claude: string }> = {
  supervisor: { claude: 'supervisor.claude.md' },
  student: { claude: 'student.claude.md' },
  'research-staff': { claude: 'research-staff.claude.md' },
  'paper-reviewer': { claude: 'paper-reviewer.claude.md' },
};

export async function loadRoleTemplates(role: AgentRole): Promise<Templates> {
  const files = ROLE_TEMPLATE_FILES[role];
  return {
    claudeTemplate: await readFile(join(TEMPLATE_ROOT, files.claude), 'utf-8'),
    settingsTemplate: '{}',
  };
}
