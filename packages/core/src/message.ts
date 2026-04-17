import { parse, stringify } from 'yaml';
import type { AgentMessage, MessageType } from './types.js';

export function createMessage(opts: {
  from: string;
  to: string;
  type: MessageType;
  content: string;
}): AgentMessage {
  return {
    from: opts.from,
    to: opts.to,
    type: opts.type,
    timestamp: new Date().toISOString(),
    status: 'unread',
    content: opts.content,
  };
}

export function serializeMessage(msg: AgentMessage): string {
  const frontmatter = stringify({
    from: msg.from,
    to: msg.to,
    type: msg.type,
    timestamp: msg.timestamp,
    status: msg.status,
  }).trim();
  return `---\n${frontmatter}\n---\n\n${msg.content}\n`;
}

export function parseMessage(markdown: string): AgentMessage {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
  if (!match) throw new Error('Invalid message format');
  const meta = parse(match[1]) as Record<string, string>;
  return {
    from: meta.from,
    to: meta.to,
    type: meta.type as MessageType,
    timestamp: meta.timestamp,
    status: meta.status as 'unread' | 'read',
    content: match[2].replace(/\n$/, ''),
  };
}

export function messageFileName(msg: AgentMessage): string {
  const ts = new Date(msg.timestamp).getTime();
  return `${msg.from}_to_${msg.to}_${ts}_${msg.type}.md`;
}
