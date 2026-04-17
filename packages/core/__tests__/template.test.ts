import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../src/template.js';

describe('template', () => {
  it('renders with variables', () => {
    const result = renderTemplate('Hello {{name}}, welcome to {{lab}}!', { name: 'Alice', lab: 'Agora' });
    expect(result).toBe('Hello Alice, welcome to Agora!');
  });

  it('handles missing optional variables', () => {
    const result = renderTemplate('Hello {{name}}{{suffix}}', { name: 'Bob' });
    expect(result).toBe('Hello Bob');
  });

  it('supports #each helper', () => {
    const result = renderTemplate('{{#each items}}{{this}} {{/each}}', { items: ['a', 'b', 'c'] });
    expect(result).toBe('a b c ');
  });
});
