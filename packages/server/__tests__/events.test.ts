import { describe, it, expect } from 'vitest';
import { createLabConfigEvent, createKanbanUpdateEvent, createAgentListEvent, createMeetingUpdateEvent, createMessageEvent } from '../src/events.js';
import type { LabConfig, KanbanBoard, Meeting, AgentMessage } from '@agora-lab/core';

describe('createLabConfigEvent', () => {
  it('wraps config in lab:config event', () => {
    const config = { labName: 'Test', researchTopic: 'AI' } as LabConfig;
    const event = createLabConfigEvent(config);
    expect(event.type).toBe('lab:config');
    expect(event.data.labName).toBe('Test');
  });
});

describe('createKanbanUpdateEvent', () => {
  it('wraps board in kanban:update event', () => {
    const board: KanbanBoard = { tasks: [{ id: '001', title: 'Test', priority: 'P1', status: 'todo', createdAt: '', updatedAt: '' }] };
    const event = createKanbanUpdateEvent(board);
    expect(event.type).toBe('kanban:update');
    expect(event.data.tasks).toHaveLength(1);
  });
});

describe('createAgentListEvent', () => {
  it('creates agent list with status', () => {
    const agents = [{ name: 'supervisor', role: 'supervisor' as const, status: 'offline' as const }];
    const event = createAgentListEvent(agents);
    expect(event.type).toBe('agent:list');
    expect(event.data[0].name).toBe('supervisor');
  });
});

describe('createMeetingUpdateEvent', () => {
  it('wraps meeting in meeting:update event', () => {
    const meeting = { id: 'mtg-1', phase: 'PREPARE' } as Meeting;
    const event = createMeetingUpdateEvent(meeting);
    expect(event.type).toBe('meeting:update');
    expect(event.data!.phase).toBe('PREPARE');
  });

  it('handles null meeting', () => {
    const event = createMeetingUpdateEvent(null);
    expect(event.type).toBe('meeting:update');
    expect(event.data).toBeNull();
  });
});

describe('createMessageEvent', () => {
  it('wraps message in message:new event', () => {
    const msg = { from: 'student-a', to: 'supervisor', type: 'question', content: 'Hi' } as AgentMessage;
    const event = createMessageEvent(msg);
    expect(event.type).toBe('message:new');
    expect(event.data.from).toBe('student-a');
  });
});
