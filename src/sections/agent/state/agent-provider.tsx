import type { Dispatch, ReactNode } from 'react';

import { useMemo, useEffect, useReducer, useContext, createContext } from 'react';

import { agentReducer, createInitialAgentState } from './agent-reducer';

import type { AgentState, AgentAction } from './agent-state.types';

const AgentStateContext = createContext<AgentState | null>(null);
const AgentDispatchContext = createContext<Dispatch<AgentAction> | null>(null);

type AgentProviderProps = {
  children: ReactNode;
  initialConversationId?: string | null;
};

export function AgentProvider({ children, initialConversationId = null }: AgentProviderProps) {
  const [state, dispatch] = useReducer(
    agentReducer,
    initialConversationId,
    createInitialAgentState
  );

  useEffect(() => {
    dispatch({ type: 'CONVERSATION_SELECTED', conversationId: initialConversationId });
  }, [initialConversationId]);

  const stateValue = useMemo(() => state, [state]);

  return (
    <AgentDispatchContext.Provider value={dispatch}>
      <AgentStateContext.Provider value={stateValue}>{children}</AgentStateContext.Provider>
    </AgentDispatchContext.Provider>
  );
}

export function useAgentState(): AgentState {
  const state = useContext(AgentStateContext);
  if (!state) throw new Error('useAgentState 必须在 AgentProvider 内部使用');
  return state;
}

export function useAgentDispatch(): Dispatch<AgentAction> {
  const dispatch = useContext(AgentDispatchContext);
  if (!dispatch) throw new Error('useAgentDispatch 必须在 AgentProvider 内部使用');
  return dispatch;
}
