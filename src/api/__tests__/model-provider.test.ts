import { apiClient } from '../client';
import {
  listModelAdapters,
  publishModelRouting,
  testModelConnection,
  listModelConnections,
  listModelDeployments,
  probeModelDeployment,
  createModelConnection,
  createModelDeployment,
} from '../model-provider';

vi.mock('../client', () => ({
  apiClient: { post: vi.fn() },
}));

describe('model provider console API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.post).mockResolvedValue({ items: [] });
  });

  it('uses POST body contracts for adapter, connection, deployment and publish flows', async () => {
    await listModelAdapters();
    await listModelConnections('FAILED');
    await createModelConnection({
      connectionKey: 'primary-model-connection',
      adapterKind: 'openai-chat-compatible',
      displayName: '主模型连接',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'secret',
    });
    await testModelConnection('connection-1');
    await listModelDeployments('connection-1');
    await createModelDeployment({
      connectionId: 'connection-1',
      modelId: 'gpt-5.6-sol',
      displayName: 'GPT 5.6 Sol',
      priority: 10,
      costTier: 'HIGH',
      contextWindow: 256000,
      maxOutputTokens: 54000,
      capabilities: ['STREAMING', 'REASONING_EFFORT'],
      reasoningMode: 'EFFORT',
      reasoningEfforts: ['LOW', 'HIGH', 'XHIGH', 'MAX'],
      defaultReasoningEffort: 'XHIGH',
      dataClasses: ['PUBLIC'],
      timeoutMs: 120000,
      maxRetries: 2,
      retryBaseMs: 200,
    });
    await probeModelDeployment('deployment-1');
    await publishModelRouting();

    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/api/agent/admin/model-adapters/list', {});
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/api/agent/admin/model-connections/list', {
      status: 'FAILED',
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(
      3,
      '/api/agent/admin/model-connections/create',
      expect.objectContaining({
        connectionKey: 'primary-model-connection',
        displayName: '主模型连接',
      })
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(4, '/api/agent/admin/model-connections/test', {
      id: 'connection-1',
      level: 'AUTH',
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(5, '/api/agent/admin/model-deployments/list', {
      connectionId: 'connection-1',
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(
      6,
      '/api/agent/admin/model-deployments/create',
      expect.objectContaining({ modelId: 'gpt-5.6-sol', defaultReasoningEffort: 'XHIGH' })
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(7, '/api/agent/admin/model-deployments/probe', {
      id: 'deployment-1',
      confirmBillable: true,
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(8, '/api/agent/admin/model-routing/publish', {});
  });
});
