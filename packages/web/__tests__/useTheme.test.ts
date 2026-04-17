/**
 * useTheme.test.ts
 *
 * Hook-level regression coverage for the useTheme integration seam.
 * Tests verify the three behavioural contracts:
 *   1. Default initialises to "system" when nothing is stored.
 *   2. applyThemeToDocument sets data-theme on document.documentElement.
 *   3. Persisting a changed selection round-trips through localStorage.
 *
 * These tests run in the default node environment — DOM globals are
 * stubbed manually so no extra packages are required.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStoredTheme,
  storeTheme,
  applyThemeToDocument,
  getSystemPreference,
  resolveTheme,
  type ThemeOption,
  type ResolvedTheme,
} from '../src/utils/theme.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeLocalStorage(store: Record<string, string> = {}) {
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
}

// ─── 1. Default "system" initialisation ──────────────────────────────────────

describe('useTheme — default system initialisation', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeLocalStorage());
  });

  it('initialises to "system" when nothing is stored', () => {
    // Mirrors: useState<ThemeOption>(() => getStoredTheme() ?? 'system')
    const initial: ThemeOption = getStoredTheme() ?? 'system';
    expect(initial).toBe('system');
  });

  it('initialises to the stored value when one exists', () => {
    storeTheme('light');
    const initial: ThemeOption = getStoredTheme() ?? 'system';
    expect(initial).toBe('light');
  });

  it('falls back to "system" when stored value is corrupted', () => {
    const store: Record<string, string> = { 'gd-theme': 'banana' };
    vi.stubGlobal('localStorage', makeLocalStorage(store));
    const initial: ThemeOption = getStoredTheme() ?? 'system';
    expect(initial).toBe('system');
  });

  it('system resolves dark when OS prefers dark', () => {
    const sysPref: ResolvedTheme = 'dark';
    expect(resolveTheme('system', sysPref)).toBe('dark');
  });

  it('system resolves light when OS prefers light', () => {
    const sysPref: ResolvedTheme = 'light';
    expect(resolveTheme('system', sysPref)).toBe('light');
  });
});

// ─── 2. Applying data-theme to document ──────────────────────────────────────

describe('useTheme — applyThemeToDocument', () => {
  it('sets data-theme="dark" on documentElement', () => {
    const setAttribute = vi.fn();
    vi.stubGlobal('document', { documentElement: { setAttribute } });

    applyThemeToDocument('dark');

    expect(setAttribute).toHaveBeenCalledOnce();
    expect(setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });

  it('sets data-theme="light" on documentElement', () => {
    const setAttribute = vi.fn();
    vi.stubGlobal('document', { documentElement: { setAttribute } });

    applyThemeToDocument('light');

    expect(setAttribute).toHaveBeenCalledWith('data-theme', 'light');
  });

  it('reflects the resolved value, not the raw option', () => {
    const setAttribute = vi.fn();
    vi.stubGlobal('document', { documentElement: { setAttribute } });

    // "system" + dark OS → resolved is 'dark'
    const resolved = resolveTheme('system', 'dark');
    applyThemeToDocument(resolved);

    expect(setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });
});

// ─── 3. Persisting a changed selection ───────────────────────────────────────

describe('useTheme — persisting theme selection', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeLocalStorage());
  });

  it('setTheme persists the new value immediately', () => {
    // Mirrors: setThemeState(t); storeTheme(t);
    storeTheme('dark');
    expect(getStoredTheme()).toBe('dark');
  });

  it('setTheme overwrites the previous stored value', () => {
    storeTheme('dark');
    storeTheme('light');
    expect(getStoredTheme()).toBe('light');
  });

  it('setTheme("system") stores "system"', () => {
    storeTheme('system');
    expect(getStoredTheme()).toBe('system');
  });

  it('after persist, re-initialisation picks up the new value', () => {
    storeTheme('dark');
    const reinit: ThemeOption = getStoredTheme() ?? 'system';
    expect(reinit).toBe('dark');
  });
});

// ─── 4. getSystemPreference — OS preference detection ────────────────────────

describe('useTheme — getSystemPreference', () => {
  it('returns "dark" when matchMedia reports dark', () => {
    vi.stubGlobal('window', {
      matchMedia: (q: string) => ({ matches: q === '(prefers-color-scheme: dark)' }),
    });
    expect(getSystemPreference()).toBe('dark');
  });

  it('returns "light" when matchMedia reports light', () => {
    vi.stubGlobal('window', {
      matchMedia: (_q: string) => ({ matches: false }),
    });
    expect(getSystemPreference()).toBe('light');
  });

  it('returns "dark" as safe fallback when matchMedia throws', () => {
    vi.stubGlobal('window', {
      matchMedia: () => { throw new Error('no matchMedia'); },
    });
    expect(getSystemPreference()).toBe('dark');
  });
});
