import type { ModelDeployment, ModelConnection, ModelAdapterDefinition } from 'src/api/model-provider';

import { act, waitFor, renderHook } from '@testing-library/react';

const {
  mockListModelAdapters,
  mockListModelConnections,
  mockListModelDeployments,
  mockGetModelRoutingSummary,
} = vi.hoisted(() => ({
  mockListModelAdapters: vi.fn(),
  mockListModelConnections: vi.fn(),
  mockListModelDeployments: vi.fn(),
  mockGetModelRoutingSummary: vi.fn(),
}));

vi.mock('src/api/model-provider', () => ({
  listModelAdapters: mockListModelAdapters,
  listModelConnections: mockListModelConnections,
  listModelDeployments: mockListModelDeployments,
  getModelRoutingSummary: mockGetModelRoutingSummary,
}));

import { useModelProviderConsole } from '../hooks/use-model-provider-console';

const adapter: ModelAdapterDefinition = {
  kind: 'openai-responses',
  label: 'OpenAI Responses',
  transport: 'RESPONSES',
  native: true,
  defaultBaseUrl: 'https://api.openai.com/v1',
  reasoningModes: ['AUTO', 'EFFORT'],
  builtInEfforts: ['LOW', 'HIGH'],
  capabilities: ['STREAMING'],
  probeLevels: ['AUTH'],
  summary: '原生协议',
};

const connection = {
  id: 'connection-1',
  connectionKey: 'primary',
  adapterKind: 'openai-responses',
  displayName: '主连接',
  baseUrl: 'https://api.openai.com/v1',
  apiKeyConfigured: true,
  apiKeyLastFour: '1234',
  enabled: true,
  version: 2,
  deploymentCount: 1,
  lastProbe: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-12T00:00:00.000Z',
} satisfies ModelConnection;

const deployment = {
  id: 'deployment-1',
  connectionId: connection.id,
  connectionKey: connection.connectionKey,
  connectionName: connection.displayName,
  adapterKind: 'openai-responses',
  modelId: 'gpt-5.6',
  displayName: 'GPT 5.6',
  priority: 10,
  costTier: 'HIGH',
  contextWindow: 200000,
  maxOutputTokens: 32000,
  capabilities: ['STREAMING'],
  reasoningMode: 'EFFORT',
  reasoningEfforts: ['LOW', 'HIGH'],
  defaultReasoningEffort: 'HIGH',
  reasoningBudgetTokens: null,
  dataClasses: ['PUBLIC'],
  timeoutMs: 30000,
  maxRetries: 2,
  retryBaseMs: 500,
  enabled: true,
  version: 3,
  lastProbe: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-12T00:00:00.000Z',
} satisfies ModelDeployment;

const summary = {
  activeDeployments: 1,
  verifiedConnections: 1,
  failedProbes: 0,
  configurationIssues: 0,
  activeVersion: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockListModelAdapters.mockResolvedValue({ items: [adapter] });
  mockListModelConnections.mockResolvedValue({ items: [connection] });
  mockListModelDeployments.mockResolvedValue({ items: [deployment] });
  mockGetModelRoutingSummary.mockResolvedValue(summary);
});

describe('useModelProviderConsole', () => {
  it('并行加载四个资源，完整保留 activeVersion null', async () => {
    const { result } = renderHook(() => useModelProviderConsole());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.adapters).toEqual([adapter]);
    expect(result.current.connections).toEqual([connection]);
    expect(result.current.deployments).toEqual([deployment]);
    expect(result.current.summary).toEqual(summary);
    expect(result.current.summary.activeVersion).toBeNull();
    expect(mockListModelConnections).toHaveBeenCalledWith();
    expect(mockListModelDeployments).toHaveBeenCalledWith();
  });

  it('任一请求失败保留上次成功快照，展示原始业务错误并支持 refresh 恢复', async () => {
    const { result } = renderHook(() => useModelProviderConsole());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGetModelRoutingSummary.mockRejectedValue(new Error('路由摘要超时'));
    await act(async () => result.current.refresh());
    expect(result.current.error).toBe('路由摘要超时');
    expect(result.current.connections).toEqual([connection]);

    mockGetModelRoutingSummary.mockResolvedValue({ ...summary, activeDeployments: 2 });
    await act(async () => result.current.refresh());
    expect(result.current.error).toBe('');
    expect(result.current.summary.activeDeployments).toBe(2);
  });

  it('disabled 权限态不发管理 API', () => {
    const { result } = renderHook(() => useModelProviderConsole(false));

    expect(mockListModelAdapters).not.toHaveBeenCalled();
    expect(mockListModelConnections).not.toHaveBeenCalled();
    expect(result.current.connections).toEqual([]);
  });
});
