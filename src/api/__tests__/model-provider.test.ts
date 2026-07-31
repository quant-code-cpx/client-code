import { apiClient } from '../client';
import {
  listModelProviders,
  createModelProvider,
  deleteModelProvider,
  updateModelProvider,
  reloadModelProviders,
} from '../model-provider';

vi.mock('../client', () => ({
  apiClient: { post: vi.fn() },
}));

describe('model provider API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses super-admin endpoints and forwards payloads', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ items: [] });
    await listModelProviders();
    await createModelProvider({ providerId: 'demo' } as never);
    await updateModelProvider({ id: 'demo', enabled: false });
    await deleteModelProvider('demo');
    await reloadModelProviders();

    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/api/agent/admin/model-providers/list', {});
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/api/agent/admin/model-providers/create', { providerId: 'demo' });
    expect(apiClient.post).toHaveBeenNthCalledWith(3, '/api/agent/admin/model-providers/update', { id: 'demo', enabled: false });
    expect(apiClient.post).toHaveBeenNthCalledWith(4, '/api/agent/admin/model-providers/delete', { id: 'demo' });
    expect(apiClient.post).toHaveBeenNthCalledWith(5, '/api/agent/admin/model-providers/reload', {});
  });
});
