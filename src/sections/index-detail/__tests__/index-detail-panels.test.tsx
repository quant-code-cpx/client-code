import type { IndexQuoteItem } from 'src/api/market';
import type { IndexInfo, IndexDailyItem } from 'src/api/index-detail';

import { screen, waitFor, fireEvent } from '@testing-library/react';

import { fetchIndexQuote } from 'src/api/market';
import { renderWithProviders } from 'src/test/test-utils';
import { fetchIndexList, fetchIndexDaily } from 'src/api/index-detail';

import { IndexDailyChart } from '../index-daily-chart';
import { IndexOverviewCard } from '../index-overview-card';
import { IndexDetailView } from '../view/index-detail-view';

const chartSpy = vi.hoisted(() => vi.fn());

vi.mock('src/api/market', () => ({ fetchIndexQuote: vi.fn() }));
vi.mock('src/api/index-detail', () => ({
  fetchIndexList: vi.fn(),
  fetchIndexDaily: vi.fn(),
}));
vi.mock('src/components/chart', () => ({
  useChart: (options: unknown) => options,
  Chart: (props: unknown) => {
    chartSpy(props);
    return <div>指数图表</div>;
  },
}));
vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('../index-constituents-table', () => ({
  IndexConstituentsTable: ({
    tsCode,
    onDataLoaded,
  }: {
    tsCode: string;
    onDataLoaded: (items: Array<{ tsCode: string }>) => void;
  }) => (
    <button type="button" onClick={() => onDataLoaded([{ tsCode: '000001.SZ' }])}>
      {`成分股-${tsCode}`}
    </button>
  ),
}));
vi.mock('../index-weight-distribution', () => ({
  IndexWeightDistribution: ({ constituents }: { constituents: unknown[] }) => (
    <div>{`权重-${constituents.length}`}</div>
  ),
}));

const daily: IndexDailyItem = {
  tradeDate: '20260812',
  open: 4000,
  high: 4050,
  low: 3980,
  close: 4030,
  preClose: 4000,
  change: 30,
  pctChg: 0.75,
  vol: 200,
  amount: 300000,
};

const quote: IndexQuoteItem = {
  tsCode: '000300.SH',
  tradeDate: '20260812',
  close: 4030,
  preClose: 4000,
  change: 30,
  pctChg: 0.75,
  vol: 200,
  amount: 300000,
  baseDate: '20041231',
  basePoint: 1000,
};

beforeEach(() => {
  vi.clearAllMocks();
  chartSpy.mockClear();
  window.history.replaceState({}, '', '/');
  vi.mocked(fetchIndexDaily).mockResolvedValue([]);
  vi.mocked(fetchIndexQuote).mockResolvedValue([]);
  vi.mocked(fetchIndexList).mockResolvedValue([]);
});

describe('IndexDailyChart', () => {
  it('请求默认一年区间，格式化日期并换算成交额', async () => {
    vi.mocked(fetchIndexDaily).mockResolvedValue([daily]);
    renderWithProviders(<IndexDailyChart tsCode="000300.SH" />);

    await waitFor(() => expect(fetchIndexDaily).toHaveBeenCalledWith({
      ts_code: '000300.SH',
      start_date: expect.stringMatching(/^\d{8}$/),
    }));
    expect(await screen.findByText('指数图表')).toBeInTheDocument();
    const props = chartSpy.mock.calls[0][0] as {
      series: Array<{ data: number[] }>;
      options: { xaxis: { categories: string[] } };
    };
    expect(props.options.xaxis.categories).toEqual(['2026-08-12']);
    expect(props.series[1].data).toEqual([3]);
  });

  it('切换周期重请求，并区分 empty 与 error/retry', async () => {
    const { user } = renderWithProviders(<IndexDailyChart tsCode="000300.SH" />);
    expect(await screen.findByText('暂无数据')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '3月' }));
    await waitFor(() => expect(fetchIndexDaily).toHaveBeenCalledTimes(2));

    vi.mocked(fetchIndexDaily)
      .mockRejectedValueOnce(new Error('日线暂不可用'))
      .mockResolvedValueOnce([]);
    const second = renderWithProviders(<IndexDailyChart tsCode="000905.SH" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('日线暂不可用');
    await user.click(screen.getByRole('button', { name: '重试' }));
    await waitFor(() => expect(fetchIndexDaily).toHaveBeenCalledTimes(4));
    second.unmount();
  });
});

describe('IndexOverviewCard', () => {
  it('展示真实行情、基期日期与 A 股正收益语义', async () => {
    vi.mocked(fetchIndexQuote).mockResolvedValue([quote]);
    renderWithProviders(<IndexOverviewCard tsCode="000300.SH" />);

    await waitFor(() => expect(fetchIndexQuote).toHaveBeenCalledWith({ ts_codes: ['000300.SH'] }));
    expect(await screen.findByText('4030.00')).toBeInTheDocument();
    expect(screen.getByText('+0.75%')).toBeInTheDocument();
    expect(screen.getByText('+30.00')).toHaveStyle({ color: 'var(--palette-error-main)' });
    expect(screen.getByText('2004-12-31')).toBeInTheDocument();
  });

  it('空结果显示占位，错误可重试恢复', async () => {
    const first = renderWithProviders(<IndexOverviewCard tsCode="000300.SH" />);
    expect((await screen.findAllByText('-')).length).toBeGreaterThan(0);
    first.unmount();

    vi.mocked(fetchIndexQuote)
      .mockRejectedValueOnce(new Error('指数行情失败'))
      .mockResolvedValueOnce([]);
    const { user } = renderWithProviders(<IndexOverviewCard tsCode="000905.SH" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('指数行情失败');
    await user.click(screen.getByRole('button', { name: '重试' }));
    await waitFor(() => expect(fetchIndexQuote).toHaveBeenCalledTimes(3));
  });
});

describe('IndexDetailView', () => {
  const indices: IndexInfo[] = [
    { tsCode: '000300.SH', name: '沪深300' },
    { tsCode: '000905.SH', name: '中证500' },
  ];

  it('优先恢复 URL 指数，切换时清空旧成分权重', async () => {
    vi.mocked(fetchIndexList).mockResolvedValue(indices);
    vi.mocked(fetchIndexQuote).mockResolvedValue([]);
    window.history.replaceState({}, '', '/index/detail?code=000905.SH');
    const { user } = renderWithProviders(<IndexDetailView />);

    expect(await screen.findByText('成分股-000905.SH')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '成分股-000905.SH' }));
    expect(screen.getByText('权重-1')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: '选择指数' }), {
      target: { value: '沪深300' },
    });
    await user.click(await screen.findByText('沪深300（000300.SH）'));
    expect(await screen.findByText('成分股-000300.SH')).toBeInTheDocument();
    expect(screen.getByText('权重-0')).toBeInTheDocument();
  });

  it('列表失败可重试，空列表不渲染详情面板', async () => {
    vi.mocked(fetchIndexList)
      .mockRejectedValueOnce(new Error('指数目录失败'))
      .mockResolvedValueOnce([]);
    const { user } = renderWithProviders(<IndexDetailView />);

    expect(await screen.findByRole('alert')).toHaveTextContent('指数目录失败');
    expect(screen.queryByText(/成分股-/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));
    await waitFor(() => expect(fetchIndexList).toHaveBeenCalledTimes(2));
  });
});
