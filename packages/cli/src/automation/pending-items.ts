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

  const lines: string[] = [];
  lines.push(`You have been woken up by the lab runtime. Your inbox/task state changed — act on it now, don't ask for confirmation.`);
  lines.push('');
  lines.push(`Unread messages: ${unread.length}`);
  if (unread.length > 0) {
    lines.push(`  → Read each unread message file in shared/messages/ where \`to: ${input.agentName}\` and \`status: unread\`, then flip its frontmatter to \`status: read\` once handled.`);
    for (const m of unread.slice(0, 5)) {
      lines.push(`    • from ${m.from} (${m.type}) @ ${m.timestamp}`);
    }
  }

  if (sortedTasks.length > 0) {
    lines.push('');
    lines.push(`Assigned/in-progress tasks (${sortedTasks.length}):`);
    for (const task of sortedTasks) {
      lines.push(`  • Task #${task.id} (${task.priority}, ${task.status}) — ${task.title}`);
    }
    lines.push(`  → For each task: move to in_progress via \`agora kanban move -i <ID> -s in_progress\` if not already, then execute per your role's Session Start Checklist in CLAUDE.md.`);
  }

  if (input.meeting) {
    lines.push('');
    lines.push(`Active meeting: ${input.meeting.id} (phase: ${input.meeting.phase})`);
    lines.push(`  → Run the actions for the current phase as described in your CLAUDE.md "Group Meeting Participation" section.`);
  }

  lines.push('');
  lines.push(`Proceed now. Use tools to read files, write artifacts, send replies, and update the kanban. Do not stop to ask "what would you like me to do" — your CLAUDE.md is the spec.`);

  return {
    prompt: lines.join('\n'),
    signature: JSON.stringify({
      unread: unread.map((message) => message.timestamp),
      tasks: sortedTasks.map((task) => `${task.id}:${task.status}:${task.updatedAt}`),
      meeting: input.meeting ? `${input.meeting.id}:${input.meeting.phase}` : null,
    }),
  };
}
