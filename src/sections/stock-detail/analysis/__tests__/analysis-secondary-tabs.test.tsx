/** @vitest-environment jsdom */

import type { FundHoldingItem } from 'src/api/fund';
import type {
  ChipDistributionData,
  StockTimingSignalsData,
  StockRelativeStrengthData,
} from 'src/api/stock';

import { vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { stockDetailApi } from 'src/api/stock';
import { fetchInstitutionalHoldings } from 'src/api/fund';
import { renderWithProviders } from 'src/test/test-utils';

import { AnalysisChipTab } from '../analysis-chip-tab';
import { AnalysisTimingTab } from '../analysis-timing-tab';
import { AnalysisInstitutionalTab } from '../analysis-institutional-tab';
import { AnalysisRelativeStrengthTab } from '../analysis-relative-strength-tab';

const apiMocks = vi.hoisted(() => ({
  chipDistribution: vi.fn(),
  relativeStrength: vi.fn(),
  timingSignals: vi.fn(),
  fetchInstitutionalHoldings: vi.fn(),
}));

const chartCalls = vi.hoisted(() => ({ props: [] as unknown[], options: [] as unknown[] }));

vi.mock('src/api/stock', () => ({
  stockDetailApi: {
    chipDistribution: apiMocks.chipDistribution,
    relativeStrength: apiMocks.relativeStrength,
    timingSignals: apiMocks.timingSignals,
  },
}));

vi.mock('src/api/fund', () => ({
  fetchInstitutionalHoldings: apiMocks.fetchInstitutionalHoldings,
}));

vi.mock('src/components/chart', () => ({
  useChart: (options: unknown) => {
    chartCalls.options.push(options);
    return options;
  },
  Chart: (props: { type: string; series: Array<{ name: string }> }) => {
    chartCalls.props.push(props);
    return <div data-testid={`chart-${props.type}`}>{props.series.map((s) => s.name).join(' / ')}</div>;
  },
}));

const chipData: ChipDistributionData = {
  tsCode: '000001.SZ',
  tradeDate: '20260813',
  currentPrice: 10.8,
  concentration: {
    range90Low: 8,
    range90High: 12,
    range70Low: 9,
    range70High: 11,
    score: 78,
    profitRatio: 62.5,
    avgCost: 10.25,
    concentration90: 18.6,
    concentration70: 9.2,
  },
  distribution: [
    { priceLow: 9, priceHigh: 10, percent: 70, isProfit: false },
    { priceLow: 11, priceHigh: 12, percent: 30, isProfit: true },
  ],
  keyLevels: {
    peakPrice: 10.2,
    resistanceHigh: 12,
    resistanceLow: 11.5,
    supportHigh: 9.2,
    supportLow: 8.8,
  },
  isEstimated: true,
};

const relativeData: StockRelativeStrengthData = {
  tsCode: '000001.SZ',
  benchmarkCode: '000300.SH',
  benchmarkName: '沪深300',
  summary: {
    stockTotalReturn: 12.5,
    benchmarkTotalReturn: -2.5,
    excessReturn: 15,
    excess20d: null,
    annualizedVol: 0.25,
    maxDrawdown: -8.2,
    beta: 1.2,
    informationRatio: null,
  },
  history: [
    {
      tradeDate: '20260812',
      stockCumReturn: 1.25,
      benchmarkCumReturn: -0.5,
      excessReturn: 1.75,
      rsRatio: 1.02,
    },
  ],
};

const timingData: StockTimingSignalsData = {
  tsCode: '000001.SZ',
  scoreSummary: {
    score: 72,
    rating: '看多',
    bullishCount: 2,
    bearishCount: 1,
    neutralCount: 1,
    details: [
      { indicator: 'MACD', signal: 'bullish', score: 135, reason: '金叉向上' },
      { indicator: 'KDJ', signal: '死叉', score: -20, reason: '短线转弱' },
      { indicator: 'RSI', signal: 'custom', score: 50, reason: '自定义观察' },
    ],
  },
  signals: [
    {
      tradeDate: '20260810',
      type: 'sell',
      strength: 2,
      source: 'KDJ',
      description: '卖出观察',
      closePrice: null,
    },
    {
      tradeDate: '20260813',
      type: 'buy',
      strength: 8,
      source: 'MACD',
      description: '趋势转强',
      closePrice: 10.123,
    },
  ],
};

const holdings: FundHoldingItem[] = [
  {
    fundCode: 'F001',
    fundName: '成长一号',
    tsCode: '000001.SZ',
    stockName: '平安银行',
    marketValue: 100,
    navPercent: 0.1234,
    holdVolume: 50,
    endDate: '20260630',
  },
  {
    fundCode: 'F001',
    fundName: '成长一号',
    tsCode: '000001.SZ',
    stockName: '平安银行',
    marketValue: 200,
    navPercent: 0.1,
    holdVolume: 80,
    endDate: '20260630',
  },
  {
    fundCode: 'F002',
    fundName: '价值二号',
    tsCode: '000001.SZ',
    stockName: '平安银行',
    marketValue: 50,
    navPercent: 0.05,
    holdVolume: 20,
    endDate: '20260630',
  },
];

describe('stock detail secondary analysis tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chartCalls.props.length = 0;
    chartCalls.options.length = 0;
  });

  it('筹码页覆盖 loading、估算告警、排序、价位标注与金融摘要', async () => {
    let resolveData: (value: ChipDistributionData) => void = () => undefined;
    vi.mocked(stockDetailApi.chipDistribution).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveData = resolve;
        })
    );
    renderWithProviders(<AnalysisChipTab tsCode="000001.SZ" />);
    expect(document.querySelectorAll('.MuiSkeleton-root')).toHaveLength(4);

    resolveData(chipData);
    expect(await screen.findByText('⚠️ 数据为估算值，仅供参考')).toBeInTheDocument();
    expect(stockDetailApi.chipDistribution).toHaveBeenCalledWith('000001.SZ');
    expect(screen.getByText('62.50%')).toBeInTheDocument();
    expect(screen.getByText('¥10.25')).toBeInTheDocument();
    expect(screen.getByText('78/100')).toBeInTheDocument();

    const props = chartCalls.props.at(-1) as {
      series: Array<{ name: string; data: number[] }>;
    };
    expect(props.series).toEqual([{ name: '筹码占比', data: [30, 70] }]);
    const options = chartCalls.options.at(-1) as {
      xaxis: { categories: string[] };
      annotations: { xaxis: Array<{ x: number; label: { text: string } }> };
      tooltip: { y: { formatter: (value: number) => string } };
    };
    expect(options.xaxis.categories).toEqual(['11.00-12.00', '9.00-10.00']);
    expect(options.annotations.xaxis).toMatchObject([
      { x: 10.8, label: { text: '当前价 10.80' } },
      { x: 10.25, label: { text: '平均成本 10.25' } },
    ]);
    expect(options.tooltip.y.formatter(12.345)).toBe('12.35%');
  });

  it('筹码空分布与 null 指标不伪造为 0，错误保留服务端原因', async () => {
    vi.mocked(stockDetailApi.chipDistribution).mockResolvedValue({
      ...chipData,
      currentPrice: null,
      distribution: [],
      isEstimated: false,
      concentration: {
        ...chipData.concentration,
        avgCost: null,
        score: null,
        profitRatio: null,
      },
    });
    const first = renderWithProviders(<AnalysisChipTab tsCode="000001.SZ" />);
    expect(await screen.findByText('数据来源：Tushare 官方')).toBeInTheDocument();
    expect(screen.getByText('暂无筹码数据')).toBeInTheDocument();
    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(2);
    first.unmount();

    vi.mocked(stockDetailApi.chipDistribution).mockRejectedValueOnce(new Error('筹码日期缺失'));
    renderWithProviders(<AnalysisChipTab tsCode="000001.SZ" />);
    expect(await screen.findByText('筹码日期缺失')).toBeInTheDocument();
  });

  it('相对强弱默认与切换参数准确，图表日期格式化且涨红跌绿/null 明确', async () => {
    vi.mocked(stockDetailApi.relativeStrength).mockResolvedValue(relativeData);
    const { user } = renderWithProviders(<AnalysisRelativeStrengthTab tsCode="000001.SZ" />);

    expect(await screen.findByText('风险收益指标')).toBeInTheDocument();
    expect(stockDetailApi.relativeStrength).toHaveBeenNthCalledWith(
      1,
      '000001.SZ',
      '000300.SH',
      120
    );
    expect(getComputedStyle(screen.getByText('+12.50%')).color).toBe('rgb(255, 86, 48)');
    expect(getComputedStyle(screen.getByText('-8.20%')).color).toBe('rgb(34, 197, 94)');
    expect(screen.getByText('1.20 (高于大盘)')).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();

    const lineProps = chartCalls.props.find(
      (call) => (call as { type: string }).type === 'line'
    ) as { series: Array<{ data: Array<{ x: string; y: number }> }> };
    expect(lineProps.series[0].data).toEqual([{ x: '2026-08-12', y: 1.25 }]);
    expect(JSON.stringify(lineProps.series)).not.toContain('20260812');

    await user.click(screen.getByRole('button', { name: '上证指数' }));
    await waitFor(() =>
      expect(stockDetailApi.relativeStrength).toHaveBeenLastCalledWith(
        '000001.SZ',
        '000001.SH',
        120
      )
    );
    await user.click(screen.getByRole('button', { name: '60日' }));
    await waitFor(() =>
      expect(stockDetailApi.relativeStrength).toHaveBeenLastCalledWith(
        '000001.SZ',
        '000001.SH',
        60
      )
    );
  });

  it('相对强弱错误与空历史可解释，空 tsCode 不发请求', async () => {
    vi.mocked(stockDetailApi.relativeStrength).mockResolvedValue({ ...relativeData, history: [] });
    const first = renderWithProviders(<AnalysisRelativeStrengthTab tsCode="000001.SZ" />);
    expect(await screen.findByText('暂无数据')).toBeInTheDocument();
    first.unmount();

    vi.mocked(stockDetailApi.relativeStrength).mockRejectedValueOnce('offline');
    const second = renderWithProviders(<AnalysisRelativeStrengthTab tsCode="000001.SZ" />);
    expect(await screen.findByText('获取相对强弱数据失败')).toBeInTheDocument();
    second.unmount();

    vi.clearAllMocks();
    renderWithProviders(<AnalysisRelativeStrengthTab tsCode="" />);
    expect(stockDetailApi.relativeStrength).not.toHaveBeenCalled();
  });

  it('择时明细夹紧分数，按日期倒序并以涨红跌绿呈现买卖信号', async () => {
    vi.mocked(stockDetailApi.timingSignals).mockResolvedValue(timingData);
    renderWithProviders(<AnalysisTimingTab tsCode="000001.SZ" />);

    expect(await screen.findByText('多空打分明细')).toBeInTheDocument();
    expect(stockDetailApi.timingSignals).toHaveBeenCalledWith('000001.SZ');
    expect(screen.getByText('MACD').closest('tr')).toHaveTextContent('看多135金叉向上');
    expect(screen.getByText('KDJ').closest('tr')).toHaveTextContent('死叉-20短线转弱');
    const progress = screen.getAllByRole('progressbar');
    expect(progress.at(-3)).toHaveAttribute('aria-valuenow', '100');
    expect(progress.at(-2)).toHaveAttribute('aria-valuenow', '0');

    const dates = screen.getAllByText(/^2026-08-/).map((node) => node.textContent);
    expect(dates).toEqual(['2026-08-13', '2026-08-10']);
    expect(screen.getByText('买入').closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
    expect(screen.getByText('卖出').closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    expect(screen.getByText('⭐⭐⭐⭐⭐')).toBeInTheDocument();
    expect(screen.getByText('收盘: ¥10.12')).toBeInTheDocument();
  });

  it('择时错误与空信号都有明确状态', async () => {
    vi.mocked(stockDetailApi.timingSignals).mockResolvedValue({ ...timingData, signals: [] });
    const first = renderWithProviders(<AnalysisTimingTab tsCode="000001.SZ" />);
    expect(await screen.findByText('暂无信号数据')).toBeInTheDocument();
    first.unmount();

    vi.mocked(stockDetailApi.timingSignals).mockRejectedValueOnce(new Error('择时服务繁忙'));
    renderWithProviders(<AnalysisTimingTab tsCode="000001.SZ" />);
    expect(await screen.findByText('择时服务繁忙')).toBeInTheDocument();
  });

  it('机构持仓按基金去重、汇总万元并格式化紧凑报告期', async () => {
    vi.mocked(fetchInstitutionalHoldings).mockResolvedValue(holdings);
    renderWithProviders(<AnalysisInstitutionalTab tsCode="000001.SZ" />);

    expect(await screen.findByText('基金持仓明细')).toBeInTheDocument();
    expect(fetchInstitutionalHoldings).toHaveBeenCalledWith('000001.SZ');
    expect(screen.getByText('持有基金数').previousElementSibling).toHaveTextContent('2');
    expect(screen.getByText('总持仓市值').previousElementSibling).toHaveTextContent('350万');
    expect(screen.getByText('持仓记录数').previousElementSibling).toHaveTextContent('3');
    expect(screen.getByText('12.34%')).toBeInTheDocument();
    expect(screen.getAllByText('2026-06-30')).toHaveLength(3);
    expect(screen.queryByText('20260630')).not.toBeInTheDocument();
  });

  it('机构持仓覆盖 empty、Error 与非 Error 错误', async () => {
    vi.mocked(fetchInstitutionalHoldings).mockResolvedValue([]);
    const first = renderWithProviders(<AnalysisInstitutionalTab tsCode="000001.SZ" />);
    expect(await screen.findByText('暂无机构持仓数据')).toBeInTheDocument();
    first.unmount();

    vi.mocked(fetchInstitutionalHoldings).mockRejectedValueOnce(new Error('基金披露未同步'));
    const second = renderWithProviders(<AnalysisInstitutionalTab tsCode="000001.SZ" />);
    expect(await screen.findByText('基金披露未同步')).toBeInTheDocument();
    second.unmount();

    vi.mocked(fetchInstitutionalHoldings).mockRejectedValueOnce('offline');
    renderWithProviders(<AnalysisInstitutionalTab tsCode="000001.SZ" />);
    expect(await screen.findByText('获取机构持仓数据失败')).toBeInTheDocument();
  });
});
