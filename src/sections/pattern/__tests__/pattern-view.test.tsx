import type { PatternSearchResult } from 'src/api/pattern';

import { act, screen, waitFor } from '@testing-library/react';

import { stockDetailApi } from 'src/api/stock';
import { renderWithProviders } from 'src/test/test-utils';
import { searchBySeries, searchPatterns, getPatternTemplatesRaw } from 'src/api/pattern';

import { PatternView } from '../view/pattern-view';

vi.mock('src/api/pattern', () => ({
  getPatternTemplatesRaw: vi.fn(),
  searchPatterns: vi.fn(),
  searchBySeries: vi.fn(),
}));

vi.mock('src/api/stock', () => ({
  stockDetailApi: { chart: vi.fn() },
}));

vi.mock('src/components/chart', () => ({
  Chart: ({ series }: { series: { data: number[] }[] }) => (
    <div data-testid="pattern-chart">{series[0]?.data.join(',')}</div>
  ),
  useChart: (options: unknown) => options,
}));

vi.mock('src/components/stock-search-autocomplete', () => ({
  StockSearchAutocomplete: ({ onChange }: { onChange: (item: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange({
          tsCode: '000001.SZ',
          symbol: '000001',
          name: '平安银行',
          market: '深圳',
          industry: '银行',
          listStatus: 'L',
        })
      }
    >
      选择平安银行
    </button>
  ),
}));

vi.mock('src/components/date-picker', () => ({
  DatePicker: ({ label, onChange }: { label: string; onChange: (value: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange({ format: () => (label === '开始日期' ? '2026-08-01' : '2026-08-12') })
      }
    >
      设置{label}
    </button>
  ),
}));

const template = {
  id: 'DOUBLE_BOTTOM',
  name: '双底',
  description: '底部反转形态',
  length: 15,
};

const emptyResult: PatternSearchResult = {
  patternLength: 5,
  algorithm: 'NED',
  candidateCount: 42,
  elapsedMs: 8,
  querySeries: [0, 0.25, 0.5, 0.75, 1],
  matches: [],
};

const resultWithMatch: PatternSearchResult = {
  ...emptyResult,
  matches: [
    {
      tsCode: '600519.SH',
      name: '贵州茅台',
      startDate: '20260701',
      endDate: '20260715',
      distance: 0.1,
      similarity: 92.5,
      futureReturns: [1.2, -0.5],
      normalizedSeries: [0, 0.4, 1, 0.6, 0.2],
    },
  ],
};

describe('PatternView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPatternTemplatesRaw).mockResolvedValue([template]);
    vi.mocked(searchBySeries).mockResolvedValue(resultWithMatch);
    vi.mocked(searchPatterns).mockResolvedValue(emptyResult);
  });

  it('展示模板加载态，并在空模板响应后给出明确空态', async () => {
    let resolveTemplates!: (value: []) => void;
    vi.mocked(getPatternTemplatesRaw).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTemplates = resolve;
        })
    );

    const { container } = renderWithProviders(<PatternView />);

    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(8);

    await act(async () => resolveTemplates([]));
    expect(await screen.findByText('该类型暂无形态模板')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '搜索' })).toBeDisabled();
  });

  it('模板加载失败可重试，并在恢复后渲染模板', async () => {
    vi.mocked(getPatternTemplatesRaw)
      .mockRejectedValueOnce(new Error('模板服务不可用'))
      .mockResolvedValueOnce([template]);
    const { user } = renderWithProviders(<PatternView />);

    expect(await screen.findByText('模板服务不可用')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByRole('button', { name: '选择形态模板 双底' })).toBeInTheDocument();
    expect(getPatternTemplatesRaw).toHaveBeenCalledTimes(2);
  });

  it('选择模板后发送默认筛选 Body，并展示正常匹配结果', async () => {
    const { user } = renderWithProviders(<PatternView />);
    await user.click(await screen.findByRole('button', { name: '选择形态模板 双底' }));
    await user.click(screen.getByRole('button', { name: '搜索' }));

    await waitFor(() => {
      expect(searchBySeries).toHaveBeenCalledWith(
        {
          series: expect.any(Array),
          algorithm: 'NED',
          topK: 20,
          scope: 'ALL',
          indexCode: undefined,
          lookbackYears: 5,
        },
        expect.any(AbortSignal)
      );
    });
    expect(await screen.findByRole('link', { name: '贵州茅台 600519.SH' })).toHaveAttribute(
      'href',
      '/stock/detail?code=600519.SH'
    );
    expect(screen.getByText(/共 1 条匹配 · 候选池 42 只/)).toBeInTheDocument();
    expect(screen.getByText('+1.20%')).toBeInTheDocument();
    expect(screen.getByText('-0.50%')).toBeInTheDocument();
  });

  it('按区间搜索把日期转换为 YYYYMMDD，并渲染搜索空态', async () => {
    const { user } = renderWithProviders(<PatternView />, {
      initialEntries: ['/stock/pattern?mode=range'],
    });
    await screen.findByRole('button', { name: '选择平安银行' });

    await user.click(screen.getByRole('button', { name: '选择平安银行' }));
    await user.click(screen.getByRole('button', { name: '设置开始日期' }));
    await user.click(screen.getByRole('button', { name: '设置结束日期' }));
    await user.click(screen.getByRole('button', { name: '搜索' }));

    expect(searchPatterns).toHaveBeenCalledWith(
      {
        tsCode: '000001.SZ',
        startDate: '20260801',
        endDate: '20260812',
        algorithm: 'NED',
        topK: 20,
        scope: 'ALL',
        indexCode: undefined,
        lookbackYears: 5,
        excludeSelf: true,
      },
      expect.any(AbortSignal)
    );
    expect(await screen.findByText('未找到匹配，请调整参数后重试。')).toBeInTheDocument();
  });

  it('按序列搜索校验最少点数，标准化有效输入并展示请求错误', async () => {
    vi.mocked(searchBySeries).mockRejectedValueOnce(new Error('搜索超时'));
    const { user } = renderWithProviders(<PatternView />, {
      initialEntries: ['/stock/pattern?mode=series'],
    });
    await screen.findByLabelText('价格序列（逗号或换行分隔）');

    const input = screen.getByLabelText('价格序列（逗号或换行分隔）');
    await user.type(input, '10, 11, 12');
    expect(screen.getByText('请至少输入 5 个价格点位（当前 3 个）。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '搜索相似形态' })).toBeDisabled();

    await user.clear(input);
    await user.type(input, '10, 20, 30, 40, 50');
    await user.click(screen.getByRole('button', { name: '搜索相似形态' }));

    expect(searchBySeries).toHaveBeenCalledWith(
      {
        series: [0, 0.25, 0.5, 0.75, 1],
        algorithm: 'NED',
        topK: 20,
        scope: 'ALL',
        indexCode: undefined,
        lookbackYears: 5,
      },
      expect.any(AbortSignal)
    );
    expect(await screen.findByText('搜索超时')).toBeInTheDocument();
  });

  it('从历史区段提取时使用真实行情 Body，并拒绝不足五个收盘价的结果', async () => {
    vi.mocked(stockDetailApi.chart).mockResolvedValue({
      items: [{ close: 10 }, { close: null }, { close: 11 }, { close: 12 }],
    } as Awaited<ReturnType<typeof stockDetailApi.chart>>);
    const { user } = renderWithProviders(<PatternView />, {
      initialEntries: ['/stock/pattern?mode=series'],
    });

    await user.click(await screen.findByRole('button', { name: '从历史区段提取' }));
    await user.click(screen.getByRole('button', { name: '选择平安银行' }));
    await user.click(screen.getByRole('button', { name: '设置开始日期' }));
    await user.click(screen.getByRole('button', { name: '设置结束日期' }));
    await user.click(screen.getByRole('button', { name: '提取序列' }));

    expect(stockDetailApi.chart).toHaveBeenCalledWith({
      tsCode: '000001.SZ',
      period: 'D',
      adjustType: 'qfq',
      startDate: '20260801',
      endDate: '20260812',
    });
    expect(await screen.findByText('该区间交易日不足 5 个，请扩大区间。')).toBeInTheDocument();
  });
});
