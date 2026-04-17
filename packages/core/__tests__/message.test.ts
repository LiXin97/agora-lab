import { describe, it, expect } from 'vitest';
import { createMessage, serializeMessage, parseMessage, messageFileName } from '../src/message.js';

describe('message', () => {
  it('creates a message', () => {
    const msg = createMessage({ from: 'student-a', to: 'supervisor', type: 'question', content: 'Hello?' });
    expect(msg.from).toBe('student-a');
    expect(msg.status).toBe('unread');
    expect(msg.content).toBe('Hello?');
  });

  it('roundtrips serialize/parse', () => {
    const msg = createMessage({ from: 'student-a', to: 'supervisor', type: 'question', content: 'What should I focus on next?' });
    const md = serializeMessage(msg);
    const parsed = parseMessage(md);
    expect(parsed).toEqual(msg);
  });

  it('generates correct filename', () => {
    const msg = createMessage({ from: 'student-a', to: 'supervisor', type: 'question', content: 'hi' });
    const fn = messageFileName(msg);
    expect(fn).toMatch(/^student-a_to_supervisor_\d+_question\.md$/);
  });
});
