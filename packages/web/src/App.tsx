import { useState, useCallback, useEffect } from 'react';
import { ToastContainer, useToast } from './components/Toast.js';
import { AppChrome } from './components/AppChrome.js';
import { StatusBar } from './components/dashboard/StatusBar.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import { useLabState } from './hooks/useLabState.js';
import { useDashboardSelectors } from './hooks/useDashboardSelectors.js';
import { useTheme } from './hooks/useTheme.js';
import { DashboardView } from './views/DashboardView.js';
import { LabView } from './views/LabView.js';

const WS_URL = import.meta.env.DEV
  ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

type ViewMode = 'dashboard' | 'lab';

export function App() {
  const { state, dispatch, handleServerEvent } = useLabState();
  const { toasts, addToast } = useToast();
  const [view, setView] = useState<ViewMode>('dashboard');
  const { theme, setTheme } = useTheme();

  const handleWsMessage = useCallback((data: unknown) => {
    const msg = data as { type: string; message?: string };
    if (msg.type === 'error' && msg.message) {
      addToast(msg.message);
    } else {
      handleServerEvent(data);
    }
  }, [handleServerEvent, addToast]);

  const { connected, send } = useWebSocket(WS_URL, handleWsMessage);
  const dashboard = useDashboardSelectors(state, connected);

  // Keyboard shortcuts (global, view-independent)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      if (view === 'lab' && e.key === 'k') dispatch({ type: 'ui:togglePanel', panel: 'kanban' });
      else if (view === 'lab' && e.key === 'm') dispatch({ type: 'ui:togglePanel', panel: 'meeting' });
      else if (e.key === 'Escape') {
        dispatch({ type: 'ui:togglePanel', panel: null });
        dispatch({ type: 'ui:selectAgent', agent: null });
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dispatch, view]);

  return (
    <div className="app-shell">
      <AppChrome
        connected={dashboard.systemHealth.connected}
        currentView={view}
        onSwitchView={setView}
        theme={theme}
        onThemeChange={setTheme}
      />

      <ToastContainer toasts={toasts} />

      <div className="app-content">
        {view === 'dashboard' ? (
          <DashboardView state={state} dashboard={dashboard} send={send} dispatch={dispatch} />
        ) : (
          <LabView state={state} connected={connected} send={send} dispatch={dispatch} />
        )}
      </div>

      <StatusBar
        health={dashboard.systemHealth}
        decisions={dashboard.decisionLog}
      />
    </div>
  );
}
