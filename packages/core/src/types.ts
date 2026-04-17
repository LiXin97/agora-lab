// Agent roles
export type AgentRole = 'supervisor' | 'student' | 'research-staff' | 'paper-reviewer';
export type AgentBackend = 'claude-code' | 'codex' | 'copilot' | 'gemini';

export interface AgentPersona {
  mbti?: string;
  background?: string;
  notableResults?: string;
  researchLens?: string;
  preset?: string;
}

export interface AgentConfig {
  name: string;
  role: AgentRole;
  backend: AgentBackend;
  model?: string;
  persona?: AgentPersona;
  researchDirection?: string;
}

export interface RoleDefinition {
  template: string;
  defaultBackend: AgentBackend;
  defaultModel?: string;
  skills: string[];
  maxInstances: number;
  canAssignTasks?: boolean;
  canMakeDecisions?: boolean;
}

export interface MeetingConfig {
  trigger: 'manual' | 'scheduled' | 'on-milestone';
  minParticipants: number;
  decisionMaker: string;
  requireAllRead: boolean;
}

export interface CommunicationConfig {
  method: 'file';
  messageDir: string;
  kanbanFile: string;
  artifactDir: string;
  meetingDir: string;
  paperReviewDir: string;
}

export interface SecurityConfig {
  allowUnsafeBackends: boolean;
}

export interface LabConfig {
  version: string;
  labName: string;
  researchTopic: string;
  roles: Record<string, RoleDefinition>;
  agents: Record<string, AgentConfig>;
  meeting: MeetingConfig;
  security: SecurityConfig;
  communication: CommunicationConfig;
}

export type AgentState = 'idle' | 'running' | 'meeting' | 'stopped';

export interface Agent {
  name: string;
  role: AgentRole;
  state: AgentState;
  config: AgentConfig;
}

export type AgentRuntimeStatus = 'offline' | 'ready' | 'assigned' | 'working' | 'meeting' | 'review';

/**
 * Point-in-time snapshot of an agent's observable state used to derive its
 * {@link AgentRuntimeStatus}.  All fields are read from external state stores
 * (session file, kanban board, meeting directory) and must not be mutated by
 * the consumer.
 *
 * - `hasSession`       – a tmux/CLI session is active for this agent
 * - `inMeeting`        – the agent currently has an open meeting artifact
 * - `hasReviewTask`    – at least one kanban task in "review" is assigned to this agent
 * - `hasInProgressTask`– at least one kanban task in "in_progress" is assigned to this agent
 * - `hasAssignedTask`  – at least one kanban task in "assigned" is assigned to this agent
 */
export interface AgentRuntimeFacts {
  hasSession: boolean;
  inMeeting: boolean;
  hasReviewTask: boolean;
  hasInProgressTask: boolean;
  hasAssignedTask: boolean;
}

export interface AgentAutomationState {
  lastPromptSignature?: string;
  lastInjectedAt?: string;
}

export interface RuntimeState {
  version: number;
  starterSeededAt?: string;
  supervisorKickoffSentAt?: string;
  agentAutomation?: Record<string, AgentAutomationState>;
}

export type TaskStatus = 'todo' | 'assigned' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface KanbanTask {
  id: string;
  title: string;
  assignee?: string;
  priority: TaskPriority;
  status: TaskStatus;
  artifact?: string;
  escalation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanBoard {
  tasks: KanbanTask[];
}

export type MeetingPhase = 'PREPARE' | 'CROSS_READ' | 'CHALLENGE' | 'RESPOND' | 'DECISION';

export interface MeetingArtifacts {
  perspectives: Record<string, string>;
  judgments: Record<string, string>;
  critiques: Record<string, string>;
  responses: Record<string, string>;
  decision?: string;
}

export interface Meeting {
  id: string;
  phase: MeetingPhase;
  participants: string[];
  decisionMaker: string;
  artifacts: MeetingArtifacts;
  createdAt: string;
}

export type MessageType = 'question' | 'critique' | 'decision' | 'meeting-perspective' | 'status';

export interface AgentMessage {
  from: string;
  to: string;
  type: MessageType;
  timestamp: string;
  status: 'unread' | 'read';
  content: string;
}
