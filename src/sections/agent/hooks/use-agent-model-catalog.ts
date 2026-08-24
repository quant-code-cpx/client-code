import type { AgentResponse } from 'src/api/agent';

import { useRef, useState, useEffect, useCallback } from 'react';

import {
  readAgentModelSelection,
  writeAgentModelSelection,
} from 'src/utils/agent-model-selection-storage';

import { agentApi } from 'src/api/agent';

import { useAuth } from 'src/auth/context';

export type AgentModel = AgentResponse<'/agent/models/list'>['items'][number];

type ModelCatalogState = {
  items: AgentModel[];
  loading: boolean;
  error: string | null;
  defaultModel: string | null;
};

const INITIAL_STATE: ModelCatalogState = {
  items: [],
  loading: true,
  error: null,
  defaultModel: null,
};

export function useAgentModelCatalog() {
  const { userProfile } = useAuth();
  const userId = userProfile?.id ?? null;
  const requestRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<ModelCatalogState>(INITIAL_STATE);

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const response = await agentApi.listModels(controller.signal);
      if (controller.signal.aborted) return;
      const availableModels = response.items.filter((model) => model.status === 'AVAILABLE');
      const rememberedModel = userId === null ? null : readAgentModelSelection(userId);
      const defaultModel =
        availableModels.find((model) => model.model === rememberedModel)?.model ??
        availableModels[0]?.model ??
        null;
      if (userId !== null && defaultModel) writeAgentModelSelection(userId, defaultModel);
      setState({ items: response.items, loading: false, error: null, defaultModel });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({
        items: [],
        loading: false,
        error: error instanceof Error ? error.message : '模型目录加载失败',
        defaultModel: null,
      });
    }
  }, [userId]);

  useEffect(() => {
    void load();
    return () => requestRef.current?.abort();
  }, [load]);

  const rememberModel = useCallback(
    (model: string) => {
      if (userId !== null) writeAgentModelSelection(userId, model);
      setState((current) => ({ ...current, defaultModel: model }));
    },
    [userId]
  );

  return { ...state, reload: load, rememberModel };
}
