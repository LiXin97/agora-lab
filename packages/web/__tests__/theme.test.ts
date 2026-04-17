import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isValidTheme,
  resolveTheme,
  getStoredTheme,
  storeTheme,
  type ThemeOption,
  type ResolvedTheme,
} from '../src/utils/theme.js';

// ─── Pure logic ──────────────────────────────────────────────────────────────

describe('isValidTheme', () => {
  it('accepts valid theme strings', () => {
    expect(isValidTheme('system')).toBe(true);
    expect(isValidTheme('light')).toBe(true);
    expect(isValidTheme('dark')).toBe(true);
  });

  it('rejects invalid strings', () => {
    expect(isValidTheme('auto')).toBe(false);
    expect(isValidTheme('System')).toBe(false);
    expect(isValidTheme('')).toBe(false);
  });

  it('rejects non-string types', () => {
    expect(isValidTheme(null)).toBe(false);
    expect(isValidTheme(undefined)).toBe(false);
    expect(isValidTheme(42)).toBe(false);
    expect(isValidTheme(true)).toBe(false);
    expect(isValidTheme({})).toBe(false);
  });
});

describe('resolveTheme', () => {
  const cases: [ThemeOption, ResolvedTheme, ResolvedTheme][] = [
    ['dark',   'dark',  'dark'],
    ['dark',   'light', 'dark'],
    ['light',  'dark',  'light'],
    ['light',  'light', 'light'],
    ['system', 'dark',  'dark'],
    ['system', 'light', 'light'],
  ];

  it.each(cases)('resolveTheme(%s, %s) → %s', (theme, sysPref, expected) => {
    expect(resolveTheme(theme, sysPref)).toBe(expected);
  });

  it('explicit dark always wins over system light', () => {
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });

  it('explicit light always wins over system dark', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
  });

  it('system defers to system preference', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('system', 'light')).toBe('light');
  });
});

// ─── Storage (requires localStorage stub) ────────────────────────────────────

describe('getStoredTheme / storeTheme', () => {
  const fakeStorage: Record<string, string> = {};

  beforeEach(() => {
    // Reset fake store
    for (const k of Object.keys(fakeStorage)) delete fakeStorage[k];

    vi.stubGlobal('localStorage', {
      getItem: (k: string) => fakeStorage[k] ?? null,
      setItem: (k: string, v: string) => { fakeStorage[k] = v; },
      removeItem: (k: string) => { delete fakeStorage[k]; },
    });
  });

  it('returns null when nothing stored', () => {
    expect(getStoredTheme()).toBeNull();
  });

  it('returns stored theme when valid', () => {
    storeTheme('dark');
    expect(getStoredTheme()).toBe('dark');

    storeTheme('light');
    expect(getStoredTheme()).toBe('light');

    storeTheme('system');
    expect(getStoredTheme()).toBe('system');
  });

  it('returns null when stored value is invalid', () => {
    fakeStorage['gd-theme'] = 'banana';
    expect(getStoredTheme()).toBeNull();
  });

  it('storeTheme persists the new value', () => {
    storeTheme('light');
    expect(fakeStorage['gd-theme']).toBe('light');
  });

  it('storeTheme overwrites a previous value', () => {
    storeTheme('dark');
    storeTheme('light');
    expect(getStoredTheme()).toBe('light');
  });

  it('getStoredTheme is safe when localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('no storage'); },
      setItem: () => { throw new Error('no storage'); },
    });
    expect(getStoredTheme()).toBeNull();
  });

  it('storeTheme is safe when localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('no storage'); },
    });
    // Should not throw
    expect(() => storeTheme('dark')).not.toThrow();
  });
});

// ─── Default theme is "system" ───────────────────────────────────────────────

describe('theme defaults', () => {
  it('resolveTheme(system, dark) produces dark — matching the dark-first default', () => {
    // The default OS preference when in doubt is dark; verifying the system path
    expect(resolveTheme('system', 'dark')).toBe('dark');
  });

  it('resolveTheme(system, light) produces light — light OS picks light theme', () => {
    expect(resolveTheme('system', 'light')).toBe('light');
  });
});
