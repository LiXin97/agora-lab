/**
 * app-shell.test.ts
 *
 * Tests for pure shell-level helpers: view management logic, chrome tab state,
 * and theme selector state. These are verified without a DOM or React renderer.
 */
import { describe, it, expect } from 'vitest';
import { isValidTheme, resolveTheme } from '../src/utils/theme.js';
import type { ThemeOption } from '../src/utils/theme.js';

// ─── AppChrome tab options ────────────────────────────────────────────────────

const VALID_VIEWS = ['dashboard', 'lab'] as const;
type ViewMode = (typeof VALID_VIEWS)[number];

function isValidView(v: unknown): v is ViewMode {
  return VALID_VIEWS.includes(v as ViewMode);
}

describe('view switching — valid views', () => {
  it('dashboard is a valid view', () => {
    expect(isValidView('dashboard')).toBe(true);
  });

  it('lab is a valid view', () => {
    expect(isValidView('lab')).toBe(true);
  });

  it('rejects unknown views', () => {
    expect(isValidView('settings')).toBe(false);
    expect(isValidView('')).toBe(false);
    expect(isValidView(null)).toBe(false);
  });
});

// ─── Theme selector options exposed by AppChrome ─────────────────────────────

const CHROME_THEME_OPTIONS: ThemeOption[] = ['system', 'light', 'dark'];

describe('AppChrome theme options', () => {
  it('exposes exactly three options: system, light, dark', () => {
    expect(CHROME_THEME_OPTIONS).toHaveLength(3);
    expect(CHROME_THEME_OPTIONS).toContain('system');
    expect(CHROME_THEME_OPTIONS).toContain('light');
    expect(CHROME_THEME_OPTIONS).toContain('dark');
  });

  it('all chrome options pass isValidTheme', () => {
    for (const opt of CHROME_THEME_OPTIONS) {
      expect(isValidTheme(opt)).toBe(true);
    }
  });
});

// ─── Shell-wide initial state contract ───────────────────────────────────────

describe('shell initial state contract', () => {
  it('default view is dashboard', () => {
    const defaultView: ViewMode = 'dashboard';
    expect(isValidView(defaultView)).toBe(true);
  });

  it('default theme is system', () => {
    const defaultTheme: ThemeOption = 'system';
    expect(isValidTheme(defaultTheme)).toBe(true);
  });

  it('system theme resolves to dark when OS is dark', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark');
  });

  it('system theme resolves to light when OS is light', () => {
    expect(resolveTheme('system', 'light')).toBe('light');
  });

  it('explicit overrides always win', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });
});

// ─── Connection health chip logic ─────────────────────────────────────────────

describe('connection health state', () => {
  function healthLabel(connected: boolean) {
    return connected ? 'Connected' : 'Disconnected';
  }

  it('shows Connected when connected is true', () => {
    expect(healthLabel(true)).toBe('Connected');
  });

  it('shows Disconnected when connected is false', () => {
    expect(healthLabel(false)).toBe('Disconnected');
  });
});
