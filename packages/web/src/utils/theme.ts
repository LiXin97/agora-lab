export type ThemeOption = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'gd-theme';
const VALID_THEMES: readonly ThemeOption[] = ['system', 'light', 'dark'];

export function isValidTheme(value: unknown): value is ThemeOption {
  return VALID_THEMES.includes(value as ThemeOption);
}

export function resolveTheme(theme: ThemeOption, systemPreference: ResolvedTheme): ResolvedTheme {
  if (theme === 'system') return systemPreference;
  return theme;
}

export function getStoredTheme(): ThemeOption | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isValidTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function storeTheme(theme: ThemeOption): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore — storage may be unavailable
  }
}

export function getSystemPreference(): ResolvedTheme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

export function applyThemeToDocument(resolved: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', resolved);
}
