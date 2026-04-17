/**
 * status-meta-header.test.ts
 *
 * Regression tests for the Kanban column-header theme tokens.
 * Ensures TASK_STATUS_HEADER uses opacity-scaled classes (theme-aware)
 * instead of hardcoded solid dark backgrounds that break light theme.
 */
import { describe, it, expect } from 'vitest';
import {
  TASK_STATUS_ORDER,
  TASK_STATUS_HEADER,
} from '../src/status-meta.js';

const DARK_SOLID_PATTERN = /\bbg-\w+-[5-9]00\b(?!\/)/;

describe('TASK_STATUS_HEADER', () => {
  it('is exported from status-meta', () => {
    expect(TASK_STATUS_HEADER).toBeDefined();
    expect(typeof TASK_STATUS_HEADER).toBe('object');
  });

  it('has an entry for every TaskStatus in TASK_STATUS_ORDER', () => {
    for (const status of TASK_STATUS_ORDER) {
      expect(TASK_STATUS_HEADER).toHaveProperty(status);
    }
  });

  it('contains no hardcoded solid dark bg-*-[500-900] classes (theme breaks light mode)', () => {
    for (const [status, cls] of Object.entries(TASK_STATUS_HEADER)) {
      expect(
        DARK_SOLID_PATTERN.test(cls),
        `${status}: "${cls}" contains a hardcoded solid dark bg class`,
      ).toBe(false);
    }
  });

  it('each status entry includes a border accent class for visual distinction', () => {
    for (const [status, cls] of Object.entries(TASK_STATUS_HEADER)) {
      expect(cls, `${status}: expected a border class`).toMatch(/\bborder-\w/);
    }
  });

  it('all five statuses have distinct header classes', () => {
    const values = Object.values(TASK_STATUS_HEADER);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});
