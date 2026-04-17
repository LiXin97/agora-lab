import { useReducer, useCallback } from 'react';
import type { AgentRuntimeStatus, KanbanBoard, Meeting, AgentMessage, LabConfig, MeetingPhase } from '@agora-lab/core';

interface AgentInfo {
  name: string;
  role: string;
  status: AgentRuntimeStatus;
  currentTask?: string;
}

export interface LabState {
  config: LabConfig | null;
  agents: AgentInfo[];
  kanban: KanbanBoard;
  meeting: Meeting | null;
  messages: AgentMessage[];
  selectedAgent: string | null;
  expandedPanel: 'kanban' | 'meeting' | null;
}

export type LabAction =
  | { type: 'lab:config'; data: LabConfig }
  | { type: 'agent:list'; data: AgentInfo[] }
  | { type: 'agent:status'; agent: string; status: AgentRuntimeStatus }
  | { type: 'kanban:update'; data: KanbanBoard }
  | { type: 'meeting:update'; data: Meeting | null }
  | { type: 'meeting:phase'; meetingId: string; phase: MeetingPhase }
  | { type: 'message:new'; data: AgentMessage }
  | { type: 'ui:selectAgent'; agent: string | null }
  | { type: 'ui:togglePanel'; panel: 'kanban' | 'meeting' | null };

const initialState: LabState = {
  config: null,
  agents: [],
  kanban: { tasks: [] },
  meeting: null,
  messages: [],
  selectedAgent: null,
  expandedPanel: null,
};

function labReducer(state: LabState, action: LabAction): LabState {
  switch (action.type) {
    case 'lab:config':
      return { ...state, config: action.data };
    case 'agent:list':
      return {
        ...state,
        agents: action.data,
        selectedAgent: action.data.some(agent => agent.name === state.selectedAgent)
          ? state.selectedAgent
          : null,
      };
    case 'agent:status': {
      const agents = state.agents.map(a =>
        a.name === action.agent ? { ...a, status: action.status } : a
      );
      return { ...state, agents };
    }
    case 'kanban:update':
      return { ...state, kanban: action.data };
    case 'meeting:update':
      return { ...state, meeting: action.data };
    case 'meeting:phase':
      if (state.meeting && state.meeting.id === action.meetingId) {
        return { ...state, meeting: { ...state.meeting, phase: action.phase } };
      }
      return state;
    case 'message:new':
      return { ...state, messages: [...state.messages.slice(-49), action.data] };
    case 'ui:selectAgent':
      return { ...state, selectedAgent: action.agent };
    case 'ui:togglePanel':
      return { ...state, expandedPanel: state.expandedPanel === action.panel ? null : action.panel };
    default:
      return state;
  }
}

export function useLabState() {
  const [state, dispatch] = useReducer(labReducer, initialState);

  const handleServerEvent = useCallback((event: unknown) => {
    const e = event as LabAction;
    if (e && e.type) dispatch(e);
  }, []);

  return { state, dispatch, handleServerEvent };
}
