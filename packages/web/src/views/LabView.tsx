import { useState, useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { LabCanvas } from '../components/LabCanvas.js';
import { KanbanOverlay } from '../components/KanbanOverlay.js';
import { MeetingOverlay } from '../components/MeetingOverlay.js';
import { AgentSidebar } from '../components/AgentSidebar.js';
import { BottomToolbar } from '../components/BottomToolbar.js';
import { useGameLoop } from '../hooks/useGameLoop.js';
import { createLabLayout } from '../engine/layout.js';
import type { LabLayout } from '../engine/layout.js';
import { updateCharacter } from '../engine/characters.js';
import { syncCharactersToAgents } from '../engine/characterSync.js';
import { centerCamera, panCamera, zoomCamera } from '../engine/camera.js';
import { needsAnimation, type RenderState } from '../engine/render-policy.js';
import type { Character, Camera, SpeechBubble } from '../engine/types.js';
import type { LabState } from '../hooks/useLabState.js';
import type { LabAction } from '../hooks/useLabState.js';

const defaultLayout = createLabLayout();
const DEFAULT_STAGE_SIZE = { width: 1280, height: 720 };
const DEFAULT_TOOLBAR_HEIGHT = 88;

interface Props {
  state: LabState;
  connected: boolean;
  send: (event: unknown) => void;
  dispatch: React.Dispatch<LabAction>;
}

function charactersChanged(previous: Character[], next: Character[]): boolean {
  if (previous.length !== next.length) {
    return true;
  }

  for (let index = 0; index < previous.length; index += 1) {
    const current = previous[index];
    const updated = next[index];

    if (
      current.id !== updated.id ||
      current.state !== updated.state ||
      current.direction !== updated.direction ||
      current.x !== updated.x ||
      current.y !== updated.y ||
      current.animFrame !== updated.animFrame ||
      current.pathIndex !== updated.pathIndex ||
      current.targetX !== updated.targetX ||
      current.targetY !== updated.targetY
    ) {
      return true;
    }
  }

  return false;
}

function bubbleStyle(message: LabState['messages'][number]): SpeechBubble['style'] {
  return message.type === 'question'
    ? 'question'
    : message.type === 'decision'
      ? 'decision'
      : message.type === 'critique'
        ? 'critique'
        : 'status';
}

export function LabView({ state, connected, send, dispatch }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const charactersRef = useRef<Character[]>([]);
  const hasCenteredOnRealSizeRef = useRef(false);
  const [stageSize, setStageSize] = useState(DEFAULT_STAGE_SIZE);
  const [toolbarHeight, setToolbarHeight] = useState(DEFAULT_TOOLBAR_HEIGHT);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [camera, setCamera] = useState<Camera>(() =>
    centerCamera(defaultLayout.cols, defaultLayout.rows, DEFAULT_STAGE_SIZE.width, DEFAULT_STAGE_SIZE.height, 2),
  );
  const [bubbles, setBubbles] = useState<SpeechBubble[]>([]);
  const latestMessage = state.messages[state.messages.length - 1];
  const rosterSignature = useMemo(
    () => state.agents.map(agent => `${agent.name}:${agent.role}`).join('|'),
    [state.agents],
  );
  const layout = useMemo<LabLayout>(() => {
    if (state.agents.length === 0) {
      return defaultLayout;
    }

    return createLabLayout(state.agents.map(agent => ({ role: agent.role, name: agent.name })));
  }, [rosterSignature, state.agents.length]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateSize = () => {
      const rect = stage.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));

      setStageSize(previous => (
        previous.width === width && previous.height === height
          ? previous
          : { width, height }
      ));
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(stage);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const updateHeight = () => {
      const nextHeight = Math.max(64, Math.round(toolbar.getBoundingClientRect().height));
      setToolbarHeight(previous => (previous === nextHeight ? previous : nextHeight));
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(toolbar);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (state.agents.length === 0) {
      if (charactersRef.current.length !== 0) {
        charactersRef.current = [];
        setCharacters([]);
      }
      return;
    }

    const previousCharacters = charactersRef.current;
    const nextCharacters = syncCharactersToAgents(previousCharacters, state.agents, layout);
    if (charactersChanged(previousCharacters, nextCharacters)) {
      charactersRef.current = nextCharacters;
      setCharacters(nextCharacters);
    }
  }, [layout, state.agents]);

  useEffect(() => {
    if (state.agents.length === 0) {
      // No agents: always follow size changes, and reset centering flag so the
      // next time agents are pre-loaded we'll center once on first real measurement.
      hasCenteredOnRealSizeRef.current = false;
      setCamera(previous => centerCamera(defaultLayout.cols, defaultLayout.rows, stageSize.width, stageSize.height, previous.zoom));
      return;
    }

    // Agents present: center once on the first real stage measurement so that
    // pre-loaded state doesn't start off-center. Subsequent size changes are
    // intentionally ignored to preserve user pan/zoom.
    if (!hasCenteredOnRealSizeRef.current) {
      hasCenteredOnRealSizeRef.current = true;
      setCamera(previous => centerCamera(layout.cols, layout.rows, stageSize.width, stageSize.height, previous.zoom));
    }
  }, [stageSize.height, stageSize.width, state.agents.length, layout.cols, layout.rows]);

  useEffect(() => {
    if (!latestMessage) return;

    const createdAt = Date.now();
    const nextBubble: SpeechBubble = {
      characterId: latestMessage.from,
      text: latestMessage.content,
      style: bubbleStyle(latestMessage),
      createdAt,
      expiresAt: createdAt + 3200,
    };

    setBubbles(previous => [
      ...previous.filter(bubble => Date.now() < bubble.expiresAt),
      nextBubble,
    ]);
  }, [latestMessage]);

  useEffect(() => {
    if (bubbles.length === 0) {
      return undefined;
    }

    const nextExpiry = Math.min(...bubbles.map(bubble => bubble.expiresAt));
    const timeout = window.setTimeout(() => {
      setBubbles(previous => previous.filter(bubble => Date.now() < bubble.expiresAt));
    }, Math.max(0, nextExpiry - Date.now()) + 24);

    return () => window.clearTimeout(timeout);
  }, [bubbles]);

  const renderState = useMemo<RenderState>(() => ({
    grid: layout.grid,
    furniture: layout.furniture,
    characters,
    camera,
    bubbles,
    selectedCharacterId: state.selectedAgent,
    cols: layout.cols,
    rows: layout.rows,
    ambientLighting: false,
    particleCount: 0,
    overlayMode: state.expandedPanel ?? 'none',
  }), [layout, characters, camera, bubbles, state.selectedAgent, state.expandedPanel]);

  const stepCharacters = useCallback((deltaMs: number) => {
    const previousCharacters = charactersRef.current;
    if (previousCharacters.length === 0) {
      return false;
    }

    const nextCharacters = previousCharacters.map(character => updateCharacter(character, deltaMs));

    if (charactersChanged(previousCharacters, nextCharacters)) {
      charactersRef.current = nextCharacters;
      setCharacters(nextCharacters);
    }

    return nextCharacters.some(character => character.state === 'walk');
  }, []);

  useGameLoop(stepCharacters, needsAnimation(renderState));

  const handleResetCamera = useCallback(() => {
    setCamera(previous => centerCamera(layout.cols, layout.rows, stageSize.width, stageSize.height, previous.zoom));
  }, [layout.cols, layout.rows, stageSize.height, stageSize.width]);

  return (
    <div className="lab-view" data-testid="lab-view">
      <div className={`lab-layout ${state.selectedAgent ? 'lab-layout--with-sidebar' : ''}`}>
        <div className="lab-stage">
          <div
            ref={stageRef}
            className="lab-stage__surface"
            style={{ '--lab-toolbar-offset': `${toolbarHeight}px` } as CSSProperties}
          >
            <LabCanvas
              renderState={renderState}
              onClickCharacter={id => dispatch({ type: 'ui:selectAgent', agent: id })}
              onClickFurniture={furniture => {
                if (furniture.interactive === 'kanban') dispatch({ type: 'ui:togglePanel', panel: 'kanban' });
                if (furniture.interactive === 'meeting') dispatch({ type: 'ui:togglePanel', panel: 'meeting' });
              }}
              onClickEmpty={() => dispatch({ type: 'ui:selectAgent', agent: null })}
              onPan={(dx, dy) => setCamera(previous => panCamera(previous, dx, dy))}
              onZoom={dir => setCamera(previous => zoomCamera(previous, dir))}
            />

            {state.expandedPanel === 'kanban' && (
              <KanbanOverlay
                board={state.kanban}
                agents={state.agents}
                send={send}
                onClose={() => dispatch({ type: 'ui:togglePanel', panel: null })}
              />
            )}

            {state.expandedPanel === 'meeting' && (
              <MeetingOverlay
                meeting={state.meeting}
                agents={state.agents}
                send={send}
                onClose={() => dispatch({ type: 'ui:togglePanel', panel: null })}
              />
            )}

            <div ref={toolbarRef} className="lab-stage__toolbar">
              <BottomToolbar
                agents={state.agents}
                selectedAgent={state.selectedAgent}
                zoom={camera.zoom}
                connected={connected}
                onSelectAgent={name => dispatch({ type: 'ui:selectAgent', agent: name })}
                onZoom={dir => setCamera(previous => zoomCamera(previous, dir))}
                onResetCamera={handleResetCamera}
              />
            </div>
          </div>
        </div>

        {state.selectedAgent && (
          <AgentSidebar
            agent={state.agents.find(agent => agent.name === state.selectedAgent)}
            kanban={state.kanban}
            messages={state.messages}
            onClose={() => dispatch({ type: 'ui:selectAgent', agent: null })}
          />
        )}
      </div>
    </div>
  );
}
