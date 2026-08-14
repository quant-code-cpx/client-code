import type { NewsHighlightsResponse } from 'src/api/news';
import type { ValidateBacktestRunResponse } from 'src/api/backtest';
import type { IndustryDictMappingResponse } from 'src/api/industry-dict';

import { setupServer } from 'msw/node';
import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { BacktestValidatePanel } from 'src/sections/backtest/backtest-validate-panel';

import { handlers } from '../handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { data: T };
  return payload.data;
}

it('返回完整校验契约并可直接渲染回测校验面板', async () => {
  const validation = await post<ValidateBacktestRunResponse>('/api/backtests/runs/validate', {
    strategyType: 'SCREENING_ROTATION',
    strategyConfig: {},
    startDate: '20200101',
    endDate: '20260812',
    initialCapital: 1_000_000,
  });

  expect(validation).toMatchObject({
    isValid: true,
    warnings: [],
    errors: [],
    dataReadiness: {
      hasDaily: true,
      hasAdjFactor: true,
      hasTradeCal: true,
    },
    stats: { tradingDays: 242, estimatedUniverseSize: 5200 },
  });

  renderWithProviders(<BacktestValidatePanel validation={validation} loading={false} />);

  expect(screen.getByText('已通过')).toBeInTheDocument();
  expect(screen.getByText('5,200')).toBeInTheDocument();
});

it('首页新闻 Demo 响应满足运行时契约', async () => {
  const response = await post<NewsHighlightsResponse>('/api/news/articles/highlights', {
    scope: 'ALL',
    limit: 5,
  });

  expect(response).toMatchObject({
    rankingVersion: 'impact-v1',
    rankingStatus: 'READY',
    displayMode: 'HIGHLIGHTS',
    partial: false,
  });
  expect(response.items).toEqual([
    expect.objectContaining({ title: expect.stringContaining('示例'), impactLevel: 'MAJOR' }),
  ]);
});

it('行业字典 Demo 响应提供可用映射与覆盖信息', async () => {
  const response = await post<IndustryDictMappingResponse>('/api/industry/dict-mapping', {
    source: 'sw_l1',
    target: 'dc_industry',
    includeUnmatched: true,
  });

  expect(response.coverage).toMatchObject({ total: 3, matched: 2, unmatched: 1 });
  expect(response.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ swName: '食品饮料', dcTsCode: 'BK0438.DC' }),
      expect.objectContaining({ swName: '有色金属', dcTsCode: null }),
    ])
  );
});
