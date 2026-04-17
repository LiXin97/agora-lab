import type { ThemeOption } from '../hooks/useTheme.js';

const THEME_OPTIONS: { value: ThemeOption; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

interface Props {
  connected: boolean;
  currentView: 'dashboard' | 'lab';
  onSwitchView: (view: 'dashboard' | 'lab') => void;
  theme: ThemeOption;
  onThemeChange: (theme: ThemeOption) => void;
}

export function AppChrome({ connected, currentView, onSwitchView, theme, onThemeChange }: Props) {
  return (
    <header className="app-chrome" data-testid="app-chrome">
      {/* Identity + connection health */}
      <div className="app-chrome-identity">
        <span className="app-chrome-logo" aria-hidden="true">⬡</span>
        <span className="app-chrome-title">Guided Dispatch</span>
        <div className="app-chrome-health" title={connected ? 'Connected' : 'Disconnected'}>
          <span
            className={`app-chrome-health-dot ${connected ? 'app-chrome-health-dot--ok' : 'app-chrome-health-dot--err'}`}
            aria-label={connected ? 'Connected' : 'Disconnected'}
          />
          <span className="app-chrome-health-label">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Primary view tabs */}
      <nav className="app-chrome-nav" aria-label="Primary view">
        <button
          className={`app-chrome-tab ${currentView === 'dashboard' ? 'app-chrome-tab--active' : ''}`}
          onClick={() => onSwitchView('dashboard')}
          aria-current={currentView === 'dashboard' ? 'page' : undefined}
        >
          Dashboard
        </button>
        <button
          className={`app-chrome-tab ${currentView === 'lab' ? 'app-chrome-tab--active' : ''}`}
          onClick={() => onSwitchView('lab')}
          aria-current={currentView === 'lab' ? 'page' : undefined}
        >
          Lab View
        </button>
      </nav>

      {/* Theme selector */}
      <div className="app-chrome-actions">
        <div className="app-chrome-theme-selector" role="group" aria-label="Theme">
          {THEME_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              className={`app-chrome-theme-btn ${theme === value ? 'app-chrome-theme-btn--active' : ''}`}
              onClick={() => onThemeChange(value)}
              aria-pressed={theme === value}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
