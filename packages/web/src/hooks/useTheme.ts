import { useState, useEffect, useCallback } from 'react';
import {
  type ThemeOption,
  type ResolvedTheme,
  getStoredTheme,
  storeTheme,
  getSystemPreference,
  resolveTheme,
  applyThemeToDocument,
} from '../utils/theme.js';

export type { ThemeOption, ResolvedTheme };

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeOption>(() => getStoredTheme() ?? 'system');
  const [systemPref, setSystemPref] = useState<ResolvedTheme>(() => getSystemPreference());

  // Track OS-level preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPref(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolved: ResolvedTheme = resolveTheme(theme, systemPref);

  // Apply to <html data-theme="..."> on every change
  useEffect(() => {
    applyThemeToDocument(resolved);
  }, [resolved]);

  const setTheme = useCallback((t: ThemeOption) => {
    setThemeState(t);
    storeTheme(t);
  }, []);

  return { theme, resolved, setTheme };
}
