import type { ReactNode } from 'react';
import type {
  DriftDetectionResponse,
  PortfolioPerformanceResponse,
} from 'src/api/portfolio';

import dayjs from 'dayjs';
import { act, screen, within } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const { mockDetectDrift, mockGetPerformance } = vi.hoisted(() => ({
  mockDetectDrift: vi.fn(),
  mockGetPerformance: vi.fn(),
}));

vi.mock('src/api/portfolio', () => ({
  detectDrift: mockDetectDrift,
  getPerformance: mockGetPerformance,
}));
vi.mock('src/components/chart', () => ({
  useChart: (options: unknown) => options,
  Chart: ({ series }: { series: unknown }) => <div data-testid="performance-chart">{JSON.stringify(series)}</div>,
}));
vi.mock('src/components/date-picker', () => ({
  DatePicker: ({
    label,
    onChange,
  }: {
    label: string;
    onChange: (value: dayjs.Dayjs | null) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(dayjs(label === '开始日期' ? '2026-01-02' : '2026-08-12'))}
    >
      {`设置${label}`}
    </button>
  ),
}));
vi.mock('src/components/stock-search-autocomplete', () => ({
  StockSearchAutocomplete: ({ onChange }: { onChange: (item: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange({
          tsCode: '000905.SH',
          symbol: '000905',
          name: '中证500',
          market: null,
          industry: null,
          listStatus: null,
        })
      }
    >
      选择中证500
    </button>
  ),
}));
vi.mock('src/components/label', () => ({
  Label: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

import { PortfolioDriftTab } from '../portfolio-drift-tab';
import { PortfolioPerformanceTab } from '../portfolio-performance-tab';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

const performance: PortfolioPerformanceResponse = {
  portfolioId: 'portfolio-1',
  startDate: '20260102',
  endDate: '20260812',
  benchmarkTsCode: '000905.SH',
  series: [
    {
      date: '20260102',
      portfolioNav: 1,
      benchmarkNav: 1,
      dailyReturn: 0,
      benchmarkReturn: 0,
      excessReturn: 0,
    },
    {
      date: '20260812',
      portfolioNav: 1.123456,
      benchmarkNav: 1.08,
      dailyReturn: 0.01,
      benchmarkReturn: 0.005,
      excessReturn: 0.005,
    },
  ],
  metrics: {
    totalReturn: 0.1234,
    annualizedReturn: 0.2,
    benchmarkReturn: 0.08,
    excessReturn: 0.0434,
    trackingError: 0.03,
    informationRatio: 1.23456,
    maxDrawdown: -0.0567,
    sharpeRatio: null,
  },
};

const drift: DriftDetectionResponse = {
  portfolioId: 'portfolio-1',
  strategyId: 'strategy-alpha',
  tradeDate: '20260812',
  overallDrift: 0.08,
  isAlerting: true,
  alertThreshold: 0.05,
  items: [
    {
      tsCode: '600000.SH',
      stockName: '浦发银行',
      actualWeight: null,
      targetWeight: 0.2,
      weightDiff: null,
      driftType: 'MISSING_IN_PORTFOLIO',
    },
    {
      tsCode: '000001.SZ',
      stockName: '平安银行',
      actualWeight: 0.3,
      targetWeight: 0.2,
      weightDiff: 0.1,
      driftType: 'WEIGHT_DRIFT',
    },
  ],
  industryDrift: [
    { industry: '银行', actualWeight: 0.3, targetWeight: 0.2, diff: 0.1 },
    { industry: '电子', actualWeight: 0.1, targetWeight: 0.15, diff: -0.05 },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PortfolioPerformanceTab', () => {
  it('提交 YYYYMMDD Body，加载期间禁用查询并展示指标、null 与净值序列', async () => {
    const request = deferred<PortfolioPerformanceResponse>();
    mockGetPerformance.mockReturnValue(request.promise);
    const { user } = renderWithProviders(<PortfolioPerformanceTab portfolioId="portfolio-1" />);

    await user.click(screen.getByRole('button', { name: '设置开始日期' }));
    await user.click(screen.getByRole('button', { name: '设置结束日期' }));
    await user.click(screen.getByRole('button', { name: '选择中证500' }));
    await user.click(screen.getByRole('button', { name: '查询' }));

    expect(mockGetPerformance).toHaveBeenCalledWith({
      portfolioId: 'portfolio-1',
      startDate: '20260102',
      endDate: '20260812',
      benchmarkTsCode: '000905.SH',
    });
    expect(screen.getByRole('button', { name: '查询' })).toBeDisabled();

    await act(async () => {
      request.resolve(performance);
      await request.promise;
    });

    expect(await screen.findByText('12.34%')).toBeInTheDocument();
    expect(screen.getByText('1.2346')).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();
    expect(screen.getByTestId('performance-chart')).toHaveTextContent('1.1235');
    expect(screen.getByTestId('performance-chart')).toHaveTextContent('基准净值 (000905.SH)');
  });

  it('错误后再次查询可恢复，空序列显示业务空态', async () => {
    mockGetPerformance.mockRejectedValue(new Error('network'));
    const { user } = renderWithProviders(<PortfolioPerformanceTab portfolioId="portfolio-1" />);

    await user.click(screen.getByRole('button', { name: '查询' }));
    expect(await screen.findByText('加载业绩数据失败')).toBeInTheDocument();

    mockGetPerformance.mockResolvedValue({ ...performance, series: [] });
    await user.click(screen.getByRole('button', { name: '查询' }));
    expect(await screen.findByText('所选日期范围内暂无业绩数据')).toBeInTheDocument();
  });
});

describe('PortfolioDriftTab', () => {
  it('提交策略和阈值 Body，展示告警、null 占位及行业正负漂移', async () => {
    mockDetectDrift.mockResolvedValue(drift);
    const { user } = renderWithProviders(<PortfolioDriftTab portfolioId="portfolio-1" />);

    await user.type(screen.getByLabelText('策略 ID（选填）'), 'strategy-alpha');
    await user.clear(screen.getByLabelText('告警阈值'));
    await user.type(screen.getByLabelText('告警阈值'), '0.05');
    await user.click(screen.getByRole('button', { name: '执行检测' }));

    expect(mockDetectDrift).toHaveBeenCalledWith({
      portfolioId: 'portfolio-1',
      strategyId: 'strategy-alpha',
      alertThreshold: 0.05,
    });
    expect(await screen.findByText('漂移告警：综合漂移度 8.00% 超过阈值 5.00%')).toBeInTheDocument();
    const missingRow = screen.getByText('600000.SH').closest('tr');
    expect(missingRow).not.toBeNull();
    expect(within(missingRow as HTMLElement).getAllByText('--')).toHaveLength(2);
    expect(screen.getByText('组合中缺少')).toBeInTheDocument();
    expect(screen.getByText('+10.00%')).toBeInTheDocument();
    expect(screen.getByText('-5.00%')).toBeInTheDocument();
  });

  it('失败可重查；无明细显示空态且空参数不进入 Body', async () => {
    mockDetectDrift.mockRejectedValue(new Error('network'));
    const { user } = renderWithProviders(<PortfolioDriftTab portfolioId="portfolio-1" />);

    await user.clear(screen.getByLabelText('告警阈值'));
    await user.click(screen.getByRole('button', { name: '执行检测' }));
    expect(await screen.findByText('漂移检测失败')).toBeInTheDocument();
    expect(mockDetectDrift).toHaveBeenLastCalledWith({
      portfolioId: 'portfolio-1',
      strategyId: undefined,
      alertThreshold: undefined,
    });

    mockDetectDrift.mockResolvedValue({
      ...drift,
      isAlerting: false,
      overallDrift: 0.01,
      items: [],
      industryDrift: [],
    });
    await user.click(screen.getByRole('button', { name: '执行检测' }));
    expect(await screen.findByText(/漂移正常：综合漂移度 1.00%/)).toBeInTheDocument();
    expect(screen.getByText('暂无漂移明细')).toBeInTheDocument();
  });
});
