import type { AgentMessage } from '@agora-lab/core';

export function buildMessageKey(
  message: Pick<AgentMessage, 'timestamp' | 'from' | 'to' | 'type' | 'content'>,
): string {
  return [message.timestamp, message.from, message.to, message.type, message.content].join('::');
}

export function formatTimestampLabel(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.valueOf())) {
    return timestamp;
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
