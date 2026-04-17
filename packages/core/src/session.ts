import { createHash } from 'node:crypto';

function sanitizeSessionBase(value: string, fallback: string): string {
  return value
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || fallback;
}

function sanitizeAgentSessionSegment(agentName: string): string {
  const sanitized = agentName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  return sanitized.replace(/-/g, '') ? sanitized : 'agent';
}

/**
 * Builds a deterministic Agora tmux session name from a lab directory path.
 * Uses a readable basename plus a short hash of the normalized full path so
 * different labs with the same basename do not collide.
 */
export function buildAgoraSessionName(labPath: string): string {
  const normalized = labPath.replace(/\/+$/, '');
  const base = normalized.split('/').pop();
  if (!base) throw new Error(`Cannot derive session name from path: "${labPath}"`);
  const readableBase = sanitizeSessionBase(base, 'lab');
  const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 6);
  return `agora-${readableBase}-${hash}`;
}

export function buildAgentSessionName(labPath: string, agentName: string): string {
  return `${buildAgoraSessionName(labPath)}-${sanitizeAgentSessionSegment(agentName)}`;
}
