import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import chalk from 'chalk';
import {
  createDefaultConfig,
  serializeLabConfig,
  createAgentWorkspace,
  serializeKanbanBoard,
} from '@agora-lab/core';
import type { AgentRole, AgentPersona } from '@agora-lab/core';
import { loadRoleTemplates } from '../role-templates.js';

// Persona presets — randomly assigned during init for diversity
const PERSONA_POOL: Array<{ mbti: string; background: string }> = [
  { mbti: 'INTJ', background: 'Theoretical foundations, mathematical modeling' },
  { mbti: 'ENTP', background: 'Rapid prototyping, creative problem solving' },
  { mbti: 'INFJ', background: 'Cross-disciplinary synthesis, qualitative analysis' },
  { mbti: 'ISTP', background: 'Systems engineering, empirical benchmarking' },
  { mbti: 'ENFP', background: 'Brainstorming, novel hypothesis generation' },
  { mbti: 'ISTJ', background: 'Rigorous methodology, reproducibility' },
  { mbti: 'INTP', background: 'Formal verification, logic and proofs' },
  { mbti: 'ESTJ', background: 'Project management, milestone tracking' },
  { mbti: 'INFP', background: 'Ethics and societal impact, human-centered design' },
  { mbti: 'ENTJ', background: 'Strategic planning, large-scale experiments' },
];

function pickPersona(index: number): AgentPersona {
  const p = PERSONA_POOL[index % PERSONA_POOL.length];
  return { mbti: p.mbti, background: p.background };
}

interface InitOptions {
  name: string;
  topic: string;
}

export async function initLab(projectDir: string, opts: InitOptions): Promise<string> {
  const agoraDir = join(projectDir, '.agora');
  const sharedDir = join(agoraDir, 'shared');

  await mkdir(join(agoraDir, 'agents'), { recursive: true });
  await mkdir(join(sharedDir, 'messages'), { recursive: true });
  await mkdir(join(sharedDir, 'artifacts'), { recursive: true });
  await mkdir(join(sharedDir, 'meetings'), { recursive: true });
  await mkdir(join(sharedDir, 'paper-reviews'), { recursive: true });

  const config = createDefaultConfig(opts.name, opts.topic);
  await writeFile(join(agoraDir, 'lab.yaml'), serializeLabConfig(config));

  const labMd = `# ${opts.name}\n\n## Mission\n${opts.topic}\n\n## Roles\n- **Supervisor**: Define directions, call meetings, make decisions\n- **Student**: Independent research, experiments, paper writing\n- **Research Staff**: Scientific judgment, meeting critique\n- **Paper Reviewer**: Pre-submission review gate\n\n## Communication\nAll communication via Markdown files in \`shared/\`.\n`;
  await writeFile(join(agoraDir, 'LAB.md'), labMd);

  await writeFile(join(sharedDir, 'KANBAN.md'), serializeKanbanBoard({ tasks: [] }));

  const supervisorConfig = config.agents.supervisor;
  if (supervisorConfig) {
    await createAgentWorkspace(
      agoraDir,
      supervisorConfig,
      config,
      await loadRoleTemplates('supervisor'),
    );
  }

  return agoraDir;
}

async function addAgent(agoraDir: string, name: string, role: AgentRole, persona?: AgentPersona): Promise<void> {
  const { parseLabConfig, serializeLabConfig: serialize, createAgentWorkspace: createWs } = await import('@agora-lab/core');
  const { readFile, writeFile: wf } = await import('node:fs/promises');

  const yamlStr = await readFile(join(agoraDir, 'lab.yaml'), 'utf-8');
  const config = parseLabConfig(yamlStr);
  const roleDef = config.roles[role];
  const backend = roleDef?.defaultBackend ?? 'claude-code';
  const agentConfig = { name, role, backend, persona };

  await createWs(agoraDir, agentConfig, config, await loadRoleTemplates(role));

  config.agents[name] = agentConfig;
  await wf(join(agoraDir, 'lab.yaml'), serialize(config));
}

export async function interactiveInit(projectDir: string): Promise<string> {
  const { input, number } = await import('@inquirer/prompts');

  console.log(chalk.bold('\n🔬 Agora Lab Setup\n'));

  const name = await input({ message: 'Lab name:', default: 'My Research Lab' });
  const topic = await input({ message: 'Research topic:' });
  const studentCount = await number({ message: 'Number of students (1-5):', default: 2, min: 1, max: 5 }) ?? 2;
  const staffCount = await number({ message: 'Number of research staff (1-5):', default: 1, min: 1, max: 5 }) ?? 1;
  const reviewerCount = await number({ message: 'Number of paper reviewers (1-5):', default: 1, min: 1, max: 5 }) ?? 1;

  console.log(chalk.gray('\nCreating lab...'));

  const agoraDir = await initLab(projectDir, { name, topic });

  let personaIdx = 0;

  // Add students
  for (let i = 1; i <= studentCount; i++) {
    const studentName = `student-${String.fromCharCode(96 + i)}`; // student-a, student-b, ...
    const persona = pickPersona(personaIdx++);
    await addAgent(agoraDir, studentName, 'student', persona);
    console.log(chalk.green(`  ✓ Added ${studentName}`) + chalk.gray(` [${persona.mbti}]`));
  }

  // Add staff
  for (let i = 1; i <= staffCount; i++) {
    const staffName = staffCount === 1 ? 'research-staff' : `research-staff-${i}`;
    const persona = pickPersona(personaIdx++);
    await addAgent(agoraDir, staffName, 'research-staff', persona);
    console.log(chalk.green(`  ✓ Added ${staffName}`) + chalk.gray(` [${persona.mbti}]`));
  }

  // Add reviewers
  for (let i = 1; i <= reviewerCount; i++) {
    const reviewerName = reviewerCount === 1 ? 'paper-reviewer' : `paper-reviewer-${i}`;
    const persona = pickPersona(personaIdx++);
    await addAgent(agoraDir, reviewerName, 'paper-reviewer', persona);
    console.log(chalk.green(`  ✓ Added ${reviewerName}`) + chalk.gray(` [${persona.mbti}]`));
  }

  console.log(chalk.bold.green(`\n✓ Lab "${name}" initialized at ${agoraDir}\n`));

  return agoraDir;
}
