import { describe, it, expect } from 'vitest';
import { parseLabConfig, createDefaultConfig } from '../src/config.js';

const VALID_YAML = `
version: "0.1.0"
lab_name: "Test Lab"
research_topic: "Efficient attention"

roles:
  supervisor:
    template: supervisor.claude.md
    default_backend: claude-code
    default_model: opus
    skills: [shared-references, core-kanban]
    can_assign_tasks: true
    can_make_decisions: true
    max_instances: 1
  student:
    template: student.claude.md
    default_backend: claude-code
    skills: [shared-references, student-literature]
    max_instances: 0

agents:
  supervisor:
    role: supervisor
    backend: claude-code
    model: opus
    persona_preset: supervisor-visionary-architect
    mbti: ENTJ
    background: "A research leader"
    notable_results: "Led research programs"
  student-a:
    role: student
    backend: claude-code
    persona_preset: student-rigor-engineer
    mbti: ISTJ
    background: "An empirical scientist"

meeting:
  trigger: manual
  min_participants: 3
  decision_maker: supervisor
  require_all_read: true

security:
  allow_unsafe_backends: false

communication:
  method: file
  message_dir: shared/messages/
  kanban_file: shared/KANBAN.md
  artifact_dir: shared/artifacts/
  meeting_dir: shared/meetings/
  paper_review_dir: shared/paper-reviews/
`;

describe('parseLabConfig', () => {
  it('parses valid lab.yaml', () => {
    const config = parseLabConfig(VALID_YAML);
    expect(config.labName).toBe('Test Lab');
    expect(config.researchTopic).toBe('Efficient attention');
    expect(config.roles.supervisor.skills).toContain('shared-references');
    expect(config.agents.supervisor.role).toBe('supervisor');
    expect(config.agents['student-a'].persona?.mbti).toBe('ISTJ');
    expect(config.meeting.decisionMaker).toBe('supervisor');
    expect(config.communication.kanbanFile).toBe('shared/KANBAN.md');
  });

  it('rejects invalid role', () => {
    const bad = VALID_YAML.replace('role: supervisor', 'role: janitor');
    expect(() => parseLabConfig(bad)).toThrow();
  });

  it('rejects missing lab_name', () => {
    const bad = VALID_YAML.replace('lab_name: "Test Lab"', '');
    expect(() => parseLabConfig(bad)).toThrow();
  });
});

describe('createDefaultConfig', () => {
  it('creates config with name and topic', () => {
    const config = createDefaultConfig('My Lab', 'Attention mechanisms');
    expect(config.labName).toBe('My Lab');
    expect(config.researchTopic).toBe('Attention mechanisms');
    expect(config.roles.supervisor).toBeDefined();
    expect(config.roles.student).toBeDefined();
    expect(config.agents.supervisor).toBeDefined();
  });
});
