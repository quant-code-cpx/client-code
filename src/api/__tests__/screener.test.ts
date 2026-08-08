import {
  fetchAreas,
  fetchScreener,
  createStrategy,
  updateStrategy,
  deleteStrategy,
  fetchIndustries,
  fetchStrategies,
  fetchScreenerPresets,
  fetchScreenerConcepts,
} from '../screener';

vi.mock('src/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from 'src/api/client';

const post = () => vi.mocked(apiClient.post);

beforeEach(() => {
  post().mockReset();
  post().mockResolvedValue({});
});

describe('选股器 API POST 契约', () => {
  it('查询 Body 原样传给严格 AND 选股端点', async () => {
    const body = {
      minPeTtm: 5,
      maxPeTtm: 15,
      page: 2,
      pageSize: 50,
      sortBy: 'dvTtm',
      sortOrder: 'desc' as const,
    };
    await fetchScreener(body);
    expect(post()).toHaveBeenCalledWith('/api/stock/screener', body);
  });

  it('辅助数据与策略列表继续使用既有 POST 端点', async () => {
    await fetchScreenerPresets();
    await fetchIndustries();
    await fetchAreas();
    await fetchScreenerConcepts();
    await fetchStrategies();

    expect(post().mock.calls).toEqual([
      ['/api/stock/screener/presets', {}],
      ['/api/stock/industries'],
      ['/api/stock/areas'],
      ['/api/stock/screener/concepts', {}],
      ['/api/stock/screener/strategies/list'],
    ]);
  });

  it('创建、覆盖更新、删除策略保持既有 Body 结构', async () => {
    await createStrategy({
      name: '稳健价值',
      description: '兼容策略',
      filters: { industry: '银行', minCircMv: 100000 },
      sortBy: 'roe',
      sortOrder: 'desc',
    });
    await updateStrategy(7, {
      name: '稳健价值 v2',
      filters: { industry: '银行', minCircMv: 100000, minRoe: 10 },
      sortBy: 'roe',
      sortOrder: 'desc',
    });
    await deleteStrategy(7);

    expect(post().mock.calls).toEqual([
      [
        '/api/stock/screener/strategies',
        {
          name: '稳健价值',
          description: '兼容策略',
          filters: { industry: '银行', minCircMv: 100000 },
          sortBy: 'roe',
          sortOrder: 'desc',
        },
      ],
      [
        '/api/stock/screener/strategies/update',
        {
          id: 7,
          name: '稳健价值 v2',
          filters: { industry: '银行', minCircMv: 100000, minRoe: 10 },
          sortBy: 'roe',
          sortOrder: 'desc',
        },
      ],
      ['/api/stock/screener/strategies/delete', { id: 7 }],
    ]);
  });
});
