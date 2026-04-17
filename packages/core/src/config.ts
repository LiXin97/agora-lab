import { parse, stringify } from 'yaml';
import { z } from 'zod';
import type { LabConfig, AgentConfig, RoleDefinition } from './types.js';

// Zod schemas for snake_case YAML
const AgentRoleSchema = z.enum(['supervisor', 'student', 'research-staff', 'paper-reviewer']);
const AgentBackendSchema = z.enum(['claude-code', 'codex', 'copilot', 'gemini']);

const RoleDefinitionYamlSchema = z.object({
  template: z.string(),
  default_backend: AgentBackendSchema,
  default_model: z.string().optional(),
  skills: z.array(z.string()),
  max_instances: z.number(),
  can_assign_tasks: z.boolean().optional(),
  can_make_decisions: z.boolean().optional(),
});

const AgentConfigYamlSchema = z.object({
  role: AgentRoleSchema,
  backend: AgentBackendSchema,
  model: z.string().optional(),
  persona_preset: z.string().optional(),
  mbti: z.string().optional(),
  background: z.string().optional(),
  notable_results: z.string().optional(),
  research_lens: z.string().optional(),
  research_direction: z.string().optional(),
});

const MeetingConfigYamlSchema = z.object({
  trigger: z.enum(['manual', 'scheduled', 'on-milestone']),
  min_participants: z.number(),
  decision_maker: z.string(),
  require_all_read: z.boolean(),
});

const SecurityConfigYamlSchema = z.object({
  allow_unsafe_backends: z.boolean(),
});

const CommunicationConfigYamlSchema = z.object({
  method: z.literal('file'),
  message_dir: z.string(),
  kanban_file: z.string(),
  artifact_dir: z.string(),
  meeting_dir: z.string(),
  paper_review_dir: z.string(),
});

const LabConfigYamlSchema = z.object({
  version: z.string(),
  lab_name: z.string(),
  research_topic: z.string(),
  roles: z.record(RoleDefinitionYamlSchema),
  agents: z.record(AgentConfigYamlSchema),
  meeting: MeetingConfigYamlSchema,
  security: SecurityConfigYamlSchema,
  communication: CommunicationConfigYamlSchema,
});

function transformRole(raw: z.infer<typeof RoleDefinitionYamlSchema>): RoleDefinition {
  return {
    template: raw.template,
    defaultBackend: raw.default_backend,
    defaultModel: raw.default_model,
    skills: raw.skills,
    maxInstances: raw.max_instances,
    canAssignTasks: raw.can_assign_tasks,
    canMakeDecisions: raw.can_make_decisions,
  };
}

function transformAgent(name: string, raw: z.infer<typeof AgentConfigYamlSchema>): AgentConfig {
  const persona = (raw.mbti || raw.background || raw.notable_results || raw.research_lens || raw.persona_preset)
    ? {
        mbti: raw.mbti,
        background: raw.background,
        notableResults: raw.notable_results,
        researchLens: raw.research_lens,
        preset: raw.persona_preset,
      }
    : undefined;

  return {
    name,
    role: raw.role,
    backend: raw.backend,
    model: raw.model,
    persona,
    researchDirection: raw.research_direction,
  };
}

export function parseLabConfig(yamlStr: string): LabConfig {
  const raw = parse(yamlStr);
  const validated = LabConfigYamlSchema.parse(raw);

  const roles: Record<string, RoleDefinition> = {};
  for (const [key, val] of Object.entries(validated.roles)) {
    roles[key] = transformRole(val);
  }

  const agents: Record<string, AgentConfig> = {};
  for (const [key, val] of Object.entries(validated.agents)) {
    agents[key] = transformAgent(key, val);
  }

  return {
    version: validated.version,
    labName: validated.lab_name,
    researchTopic: validated.research_topic,
    roles,
    agents,
    meeting: {
      trigger: validated.meeting.trigger,
      minParticipants: validated.meeting.min_participants,
      decisionMaker: validated.meeting.decision_maker,
      requireAllRead: validated.meeting.require_all_read,
    },
    security: {
      allowUnsafeBackends: validated.security.allow_unsafe_backends,
    },
    communication: {
      method: validated.communication.method,
      messageDir: validated.communication.message_dir,
      kanbanFile: validated.communication.kanban_file,
      artifactDir: validated.communication.artifact_dir,
      meetingDir: validated.communication.meeting_dir,
      paperReviewDir: validated.communication.paper_review_dir,
    },
  };
}

export function createDefaultConfig(name: string, topic: string): LabConfig {
  return {
    version: '0.1.0',
    labName: name,
    researchTopic: topic,
    roles: {
      supervisor: {
        template: 'supervisor.claude.md',
        defaultBackend: 'claude-code',
        defaultModel: 'opus',
        skills: ['shared-references', 'core-kanban'],
        maxInstances: 1,
        canAssignTasks: true,
        canMakeDecisions: true,
      },
      student: {
        template: 'student.claude.md',
        defaultBackend: 'claude-code',
        skills: ['shared-references', 'student-literature'],
        maxInstances: 0,
      },
      'research-staff': {
        template: 'research-staff.claude.md',
        defaultBackend: 'claude-code',
        skills: ['shared-references', 'research-tools'],
        maxInstances: 0,
      },
      'paper-reviewer': {
        template: 'paper-reviewer.claude.md',
        defaultBackend: 'claude-code',
        skills: ['shared-references', 'paper-review'],
        maxInstances: 0,
      },
    },
    agents: {
      supervisor: {
        name: 'supervisor',
        role: 'supervisor',
        backend: 'claude-code',
        model: 'opus',
      },
    },
    meeting: {
      trigger: 'manual',
      minParticipants: 3,
      decisionMaker: 'supervisor',
      requireAllRead: true,
    },
    security: {
      allowUnsafeBackends: false,
    },
    communication: {
      method: 'file',
      messageDir: 'shared/messages/',
      kanbanFile: 'shared/KANBAN.md',
      artifactDir: 'shared/artifacts/',
      meetingDir: 'shared/meetings/',
      paperReviewDir: 'shared/paper-reviews/',
    },
  };
}

function serializeRole(role: RoleDefinition): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    template: role.template,
    default_backend: role.defaultBackend,
    skills: role.skills,
    max_instances: role.maxInstances,
  };
  if (role.defaultModel !== undefined) obj.default_model = role.defaultModel;
  if (role.canAssignTasks !== undefined) obj.can_assign_tasks = role.canAssignTasks;
  if (role.canMakeDecisions !== undefined) obj.can_make_decisions = role.canMakeDecisions;
  return obj;
}

function serializeAgent(agent: AgentConfig): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    role: agent.role,
    backend: agent.backend,
  };
  if (agent.model !== undefined) obj.model = agent.model;
  if (agent.researchDirection !== undefined) obj.research_direction = agent.researchDirection;
  if (agent.persona) {
    if (agent.persona.preset !== undefined) obj.persona_preset = agent.persona.preset;
    if (agent.persona.mbti !== undefined) obj.mbti = agent.persona.mbti;
    if (agent.persona.background !== undefined) obj.background = agent.persona.background;
    if (agent.persona.notableResults !== undefined) obj.notable_results = agent.persona.notableResults;
    if (agent.persona.researchLens !== undefined) obj.research_lens = agent.persona.researchLens;
  }
  return obj;
}

export function serializeLabConfig(config: LabConfig): string {
  const roles: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(config.roles)) {
    roles[key] = serializeRole(val);
  }

  const agents: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(config.agents)) {
    agents[key] = serializeAgent(val);
  }

  const obj = {
    version: config.version,
    lab_name: config.labName,
    research_topic: config.researchTopic,
    roles,
    agents,
    meeting: {
      trigger: config.meeting.trigger,
      min_participants: config.meeting.minParticipants,
      decision_maker: config.meeting.decisionMaker,
      require_all_read: config.meeting.requireAllRead,
    },
    security: {
      allow_unsafe_backends: config.security.allowUnsafeBackends,
    },
    communication: {
      method: config.communication.method,
      message_dir: config.communication.messageDir,
      kanban_file: config.communication.kanbanFile,
      artifact_dir: config.communication.artifactDir,
      meeting_dir: config.communication.meetingDir,
      paper_review_dir: config.communication.paperReviewDir,
    },
  };

  return stringify(obj);
}
