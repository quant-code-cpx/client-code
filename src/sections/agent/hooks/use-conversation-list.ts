import { useRef, useMemo, useEffect, useCallback } from 'react';

import { agentApi } from 'src/api/agent';

import { selectConversationList } from '../state/agent-selectors';
import { nextAgentRequestGeneration } from '../lib/request-generation';
import { useAgentState, useAgentDispatch } from '../state/agent-provider';

const CONVERSATION_LIST_ERROR_MESSAGE = '会话列表暂时无法加载，请稍后重试';

export function useConversationList() {
  const state = useAgentState();
  const dispatch = useAgentDispatch();
  const stateRef = useRef(state);
  const controllerRef = useRef<AbortController | null>(null);
  const items = useMemo(() => selectConversationList(state), [state]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const load = useCallback(
    async (append: boolean) => {
      const list = stateRef.current.list;
      if (append && (!list.nextCursor || list.loadingMore)) return;

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const generation = nextAgentRequestGeneration();
      dispatch({ type: 'CONVERSATION_LIST_REQUESTED', generation, append });

      try {
        const result = await agentApi.listConversations(
          {
            cursor: append ? list.nextCursor : null,
            limit: 30,
            includeArchived: false,
          },
          controller.signal
        );
        dispatch({
          type: 'CONVERSATION_LIST_SUCCEEDED',
          generation,
          append,
          items: result.items,
          nextCursor: result.nextCursor ?? null,
        });
      } catch {
        if (controller.signal.aborted) return;
        dispatch({
          type: 'CONVERSATION_LIST_FAILED',
          generation,
          error: CONVERSATION_LIST_ERROR_MESSAGE,
        });
      }
    },
    [dispatch]
  );

  const refresh = useCallback(() => load(false), [load]);
  const loadMore = useCallback(() => load(true), [load]);

  useEffect(() => {
    void refresh();
    return () => controllerRef.current?.abort();
  }, [refresh]);

  return {
    items,
    refresh,
    loadMore,
    status: state.list.status,
    error: state.list.error,
    hasMore: state.list.nextCursor !== null,
    loadingMore: state.list.loadingMore,
  };
}
