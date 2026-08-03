import { technicalSignalApi } from '../technical-signal';

import type { TechnicalSignalStatisticsRequest } from '../technical-signal';

const mocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('../client', () => ({ apiClient: { post: mocks.post } }));

describe('technicalSignalApi', () => {
  beforeEach(() => {
    mocks.post.mockReset();
  });

  it('uses POST to load stable signal definitions', async () => {
    mocks.post.mockResolvedValueOnce([]);

    await technicalSignalApi.listDefinitions({ includeDeprecated: false });

    expect(mocks.post).toHaveBeenCalledWith(
      '/api/stock/detail/analysis/signal-definitions/list',
      { includeDeprecated: false },
      undefined
    );
  });

  it('passes the complete statistics request through the request body', async () => {
    mocks.post.mockResolvedValueOnce({ meta: {}, groups: [] });
    const request: TechnicalSignalStatisticsRequest = {
      tsCode: '600519.SH',
      periods: ['1Y', '3Y'],
      horizons: [1, 3, 5],
      entryMode: 'SIGNAL_CLOSE' as const,
      includeBenchmark: true,
    };

    await technicalSignalApi.queryStatistics(request);

    expect(mocks.post).toHaveBeenCalledWith(
      '/api/stock/detail/analysis/signal-statistics/query',
      request,
      undefined
    );
  });

  it('uses API page numbers directly for occurrence queries', async () => {
    mocks.post.mockResolvedValueOnce({ items: [], page: 2, pageSize: 20, total: 0 });
    const request = {
      tsCode: '600519.SH',
      signalKey: 'macd.golden-cross',
      startDate: '20240101',
      endDate: '20250101',
      horizons: [5],
      page: 2,
      pageSize: 20,
    };

    await technicalSignalApi.listOccurrences(request);

    expect(mocks.post).toHaveBeenCalledWith(
      '/api/stock/detail/analysis/signal-occurrences/list',
      request,
      undefined
    );
  });
});
