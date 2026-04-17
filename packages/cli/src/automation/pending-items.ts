import type { AgentMessage, KanbanTask, Meeting, RuntimeState } from '@agora-lab/core';

export interface PendingPromptInput {
  agentName: string;
  unreadMessages: AgentMessage[];
  assignedTasks: KanbanTask[];
  runtimeState: RuntimeState;
  meeting: Meeting | null;
}

export interface PendingPrompt {
  prompt: string;
  signature: string;
  marksKickoffSent?: boolean;
}

export function buildPendingAgentPrompt(input: PendingPromptInput): PendingPrompt | null {
  if (input.agentName === 'supervisor' && !input.runtimeState.supervisorKickoffSentAt) {
    return {
      prompt: 'You are the supervisor. Start the first planning cycle now. Review KANBAN, assign starter tasks, and message students.',
      signature: 'kickoff:supervisor',
      marksKickoffSent: true,
    };
  }

  const unread = input.unreadMessages
    .filter((message) => message.to === input.agentName && message.status === 'unread')
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const sortedTasks = [...input.assignedTasks].sort((a, b) => a.id.localeCompare(b.id));

  if (unread.length === 0 && sortedTasks.length === 0 && input.meeting == null) {
    return null;
  }

  const lines = [`Unread messages: ${unread.length}`];
  for (const task of sortedTasks) lines.push(`Task #${task.id} (${task.priority}) — ${task.title}`);
  if (input.meeting) lines.push(`Active meeting: ${input.meeting.id}`);

  return {
    prompt: lines.join('\n'),
    signature: JSON.stringify({
      unread: unread.map((message) => message.timestamp),
      tasks: sortedTasks.map((task) => `${task.id}:${task.status}:${task.updatedAt}`),
      meeting: input.meeting?.id ?? null,
    }),
  };
}
