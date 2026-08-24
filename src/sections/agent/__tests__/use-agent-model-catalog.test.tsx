import type { ReactNode } from 'react';

import { act, waitFor, renderHook } from '@testing-library/react';

import { agentApi } from 'src/api/agent';
import { createAuthenticatedContext } from 'src/test/factories/auth-context';

import { AuthContext } from 'src/auth/context';

import { useAgentModelCatalog } from '../hooks/use-agent-model-catalog';

vi.mock('src/api/agent', () => ({
  agentApi: { listModels: vi.fn() },
}));

const models = {
  items: [
    {
      model: 'unavailable-v1',
      displayName: '不可用模型',
      provider: 'paused',
      capabilities: ['STREAMING'],
      reasoningEfforts: [],
      defaultReasoningEffort: null,
      contextWindow: 32000,
      maxOutputTokens: 4096,
      contextAccountingMode: 'SHARED_WINDOW' as const,
      completionTokenAccounting: 'REASONING_AND_VISIBLE' as const,
      supportedVerbosityLevels: [],
      costTier: 'LOW' as const,
      status: 'UNAVAILABLE' as const,
      reason: '已停用',
    },
    {
      model: 'first-available-v1',
      displayName: '首个可用模型',
      provider: 'primary',
      capabilities: ['STREAMING', 'STRUCTURED_OUTPUT'],
      reasoningEfforts: [],
      defaultReasoningEffort: null,
      contextWindow: 128000,
      maxOutputTokens: 8192,
      contextAccountingMode: 'SHARED_WINDOW' as const,
      completionTokenAccounting: 'REASONING_AND_VISIBLE' as const,
      supportedVerbosityLevels: [],
      costTier: 'MEDIUM' as const,
      status: 'AVAILABLE' as const,
      reason: null,
    },
    {
      model: 'last-selected-v1',
      displayName: '上次选择模型',
      provider: 'secondary',
      capabilities: ['STREAMING', 'STRUCTURED_OUTPUT'],
      reasoningEfforts: [],
      defaultReasoningEffort: null,
      contextWindow: 128000,
      maxOutputTokens: 8192,
      contextAccountingMode: 'SHARED_WINDOW' as const,
      completionTokenAccounting: 'REASONING_AND_VISIBLE' as const,
      supportedVerbosityLevels: [],
      costTier: 'HIGH' as const,
      status: 'AVAILABLE' as const,
      reason: null,
    },
  ],
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={createAuthenticatedContext()}>{children}</AuthContext.Provider>
  );
}

describe('useAgentModelCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.mocked(agentApi.listModels).mockResolvedValue(models);
  });

  it('优先恢复当前用户上次选择的可用模型', async () => {
    window.localStorage.setItem('quant-agent:model-selection:v1:1', 'last-selected-v1');

    const catalog = renderHook(() => useAgentModelCatalog(), { wrapper });

    await waitFor(() => expect(catalog.result.current.loading).toBe(false));
    expect(catalog.result.current.defaultModel).toBe('last-selected-v1');
  });

  it('没有有效历史选择时使用目录中首个可用模型', async () => {
    window.localStorage.setItem('quant-agent:model-selection:v1:1', 'unavailable-v1');

    const catalog = renderHook(() => useAgentModelCatalog(), { wrapper });

    await waitFor(() => expect(catalog.result.current.loading).toBe(false));
    expect(catalog.result.current.defaultModel).toBe('first-available-v1');
    expect(window.localStorage.getItem('quant-agent:model-selection:v1:1')).toBe(
      'first-available-v1'
    );
  });

  it('保存新选择后立即作为后续新会话默认值', async () => {
    const catalog = renderHook(() => useAgentModelCatalog(), { wrapper });
    await waitFor(() => expect(catalog.result.current.loading).toBe(false));

    act(() => catalog.result.current.rememberModel('last-selected-v1'));

    expect(catalog.result.current.defaultModel).toBe('last-selected-v1');
    expect(window.localStorage.getItem('quant-agent:model-selection:v1:1')).toBe(
      'last-selected-v1'
    );
  });
});
