import type { AgentResponse } from 'src/api/agent';

import { useState, useEffect } from 'react';

import { agentApi } from 'src/api/agent';

export type AgentToolCall = AgentResponse<'/agent/runs/tool-calls/list'>['items'][number];

type ToolCallLoadState = {
  items: AgentToolCall[];
  loading: boolean;
  error: string | null;
};

const EMPTY_STATE: ToolCallLoadState = { items: [], loading: false, error: null };

export function useAgentToolCalls(
  runId: string | null | undefined,
  statusVersion: number | null | undefined,
  enabled: boolean
): ToolCallLoadState {
  const [state, setState] = useState<ToolCallLoadState>(EMPTY_STATE);

  useEffect(() => {
    if (!enabled || !runId) {
      setState(EMPTY_STATE);
      return undefined;
    }

    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));

    void agentApi
      .listToolCalls({ runId, limit: 50, includePayload: false }, controller.signal)
      .then((response) => {
        setState({ items: response.items, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          items: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Tool 摘要加载失败',
        });
      });

    return () => controller.abort();
  }, [enabled, runId, statusVersion]);

  return state;
}
