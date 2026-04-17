import type { AgentRuntimeStatus } from '@agora-lab/core';
import type { Character } from './types.js';
import type { LabLayout } from './layout.js';
import { createCharacter, setCharacterTarget, setCharacterState } from './characters.js';

interface AgentSnapshot {
  name: string;
  role: string;
  status: AgentRuntimeStatus;
}

/**
 * Pure function that reconciles Character array with the current agent snapshots.
 * Extracted from LabView's setCharacters callback so it can be unit-tested.
 */
export function syncCharactersToAgents(
  prev: Character[],
  agents: AgentSnapshot[],
  newLayout: LabLayout,
): Character[] {
  const existing = new Map(prev.map(c => [c.id, c]));
  const deskMap = new Map(newLayout.deskPositions.map(d => [d.name, d]));

  return agents.map((a, i) => {
    const desk = deskMap.get(a.name);
    const deskX = desk?.chairX;
    const deskY = desk?.chairY;

    if (existing.has(a.name)) {
      const ch = existing.get(a.name)!;

      // meeting → move to meeting area
      if (a.status === 'meeting' && ch.state !== 'meeting') {
        const pos = newLayout.meetingPositions[i % newLayout.meetingPositions.length];
        return setCharacterTarget({ ...ch, deskX, deskY }, pos.x, pos.y, newLayout.grid, newLayout.furniture);
      }

      // working / review → sit at desk (also exits meeting state)
      if (
        (a.status === 'working' || a.status === 'review') &&
        (ch.state === 'idle' || ch.state === 'walk' || ch.state === 'meeting')
      ) {
        if (deskX !== undefined && deskY !== undefined) {
          const refreshed = { ...ch, deskX, deskY };
          const atDesk = Math.floor(ch.x / 16) === deskX && Math.floor(ch.y / 16) === deskY;
          if (atDesk) return setCharacterState(refreshed, 'sitting');
          return setCharacterTarget(refreshed, deskX, deskY, newLayout.grid, newLayout.furniture);
        }
      }

      // ready / assigned → walk to desk and idle there (also exits meeting state)
      if (
        (a.status === 'ready' || a.status === 'assigned') &&
        (ch.state === 'idle' || ch.state === 'sitting' || ch.state === 'meeting')
      ) {
        const refreshed = { ...ch, deskX, deskY };
        if (ch.state === 'sitting') return setCharacterState(refreshed, 'idle');
        if (deskX !== undefined && deskY !== undefined) {
          const atDesk = Math.floor(ch.x / 16) === deskX && Math.floor(ch.y / 16) === deskY;
          if (!atDesk) return setCharacterTarget(refreshed, deskX, deskY, newLayout.grid, newLayout.furniture);
        }
      }

      // offline → keep idle at current position (no movement)
      if (a.status === 'offline' && ch.state !== 'idle') {
        return setCharacterState(ch, 'idle');
      }

      return ch;
    }

    const spawnX = deskX ?? 5;
    const spawnY = deskY ?? 5;
    return { ...createCharacter(a.name, a.name, a.role, i, spawnX, spawnY), deskX, deskY };
  });
}
