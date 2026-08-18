import type { AgentResponse } from 'src/api/agent';

import { useRef, useState, useEffect } from 'react';

import { agentApi } from 'src/api/agent';

export type AgentToolCall = AgentResponse<'/agent/runs/tool-calls/list'>['items'][number];

type ToolCallLoadState = {
  items: AgentToolCall[];
  loading: boolean;
  error: string | null;
  partial: boolean;
};

const PAGE_SIZE = 100;
const EMPTY_STATE: ToolCallLoadState = { items: [], loading: false, error: null, partial: false };

export function useAgentToolCalls(
  runId: string | null | undefined,
  statusVersion: number | null | undefined,
  enabled: boolean
): ToolCallLoadState {
  const [state, setState] = useState<ToolCallLoadState>(EMPTY_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;
  const cachedRunIdRef = useRef<string | null>(null);
  const completedRequestKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!runId) {
      cachedRunIdRef.current = null;
      completedRequestKeyRef.current = null;
      setState(EMPTY_STATE);
      return undefined;
    }
    if (!enabled) {
      setState((current) => (current.loading ? { ...current, loading: false } : current));
      return undefined;
    }

    const requestKey = `${runId}:${statusVersion ?? 'unknown'}`;
    if (completedRequestKeyRef.current === requestKey) return undefined;

    const controller = new AbortController();
    const sameRun = cachedRunIdRef.current === runId;
    cachedRunIdRef.current = runId;
    setState((current) =>
      sameRun
        ? { ...current, loading: true, error: null, partial: false }
        : { ...EMPTY_STATE, loading: true }
    );

    void (async () => {
      const initialItems = sameRun ? stateRef.current.items : [];
      const itemIds = initialItems.map((item) => item.toolCallId);
      const itemsById = new Map(initialItems.map((item) => [item.toolCallId, item]));
      const seenCursors = new Set<string>();
      let cursor: string | null = null;

      const snapshot = () => itemIds.map((id) => itemsById.get(id)!);

      try {
        while (!controller.signal.aborted) {
          const response = await agentApi.listToolCalls(
            { runId, cursor, limit: PAGE_SIZE, includePayload: false },
            controller.signal
          );
          if (controller.signal.aborted) return;
          response.items.forEach((item) => {
            if (!itemsById.has(item.toolCallId)) itemIds.push(item.toolCallId);
            itemsById.set(item.toolCallId, item);
          });
          const { nextCursor } = response;
          if (nextCursor !== null && (typeof nextCursor !== 'string' || nextCursor.length === 0)) {
            throw new Error('Tool 调用历史游标无效');
          }
          if (nextCursor === null) {
            completedRequestKeyRef.current = requestKey;
            setState({
              items: snapshot(),
              loading: false,
              error: null,
              partial: false,
            });
            return;
          }
          if (seenCursors.has(nextCursor)) {
            completedRequestKeyRef.current = requestKey;
            setState({
              items: snapshot(),
              loading: false,
              error: null,
              partial: true,
            });
            return;
          }
          setState({ items: snapshot(), loading: true, error: null, partial: false });
          seenCursors.add(nextCursor);
          cursor = nextCursor;
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const items = snapshot();
        setState({
          items,
          loading: false,
          error: error instanceof Error ? error.message : 'Tool 摘要加载失败',
          partial: items.length > 0,
        });
      }
    })();

    return () => controller.abort();
  }, [enabled, runId, statusVersion]);

  return state;
}
