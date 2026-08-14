import type { Strategy, StrategyPerformance } from 'src/api/strategy';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const { mockGetStrategyPerformance } = vi.hoisted(() => ({
  mockGetStrategyPerformance: vi.fn(),
}));

vi.mock('src/api/strategy', () => ({
  getStrategyPerformance: mockGetStrategyPerformance,
}));

import { StrategyPerformanceCard } from '../strategy-performance-card';

const strategy: Strategy = {
  id: 'strategy-alpha',
  userId: 1,
  name: 'Alpha 策略',
  description: null,
  strategyType: 'MA_CROSS_SINGLE',
  strategyConfig: {},
  backtestDefaults: null,
  tags: [],
  version: 1,
  isPublic: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-08-12T00:00:00.000Z',
};

const performance: StrategyPerformance = {
  totalReturn: 0.2,
  annualizedReturn: 0.12,
  sharpeRatio: null,
  maxDrawdown: -0.08,
  navSeries: [
    { date: '20260102', nav: 1 },
    { date: '20260812', nav: 1.2 },
  ],
  baseline: {
    totalReturn: 0.05,
    navSeries: [
      { date: '20260102', nav: 1 },
      { date: '20260812', nav: 1.05 },
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StrategyPerformanceCard', () => {
  it('策略与基准不同走势时，基准标签严格使用基准首末 NAV', async () => {
    mockGetStrategyPerformance.mockResolvedValue(performance);
    renderWithProviders(<StrategyPerformanceCard strategy={strategy} />);

    expect(await screen.findByText('+20%')).toBeInTheDocument();
    expect(screen.getByText('+12%')).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();
    expect(screen.getByText('-8%')).toBeInTheDocument();
    expect(screen.getByText('+5%')).toBeInTheDocument();
    expect(screen.getByText('基准 +5.00%')).toBeInTheDocument();
    expect(screen.queryByText('基准 +20.00%')).not.toBeInTheDocument();
    expect(screen.getByText('20260102 ~ 20260812')).toBeInTheDocument();
    expect(mockGetStrategyPerformance).toHaveBeenCalledWith('strategy-alpha');
  });

  it('404 映射为稳定文案；其他错误保留业务消息', async () => {
    mockGetStrategyPerformance.mockRejectedValue(new Error('Cannot POST /api/strategies/performance'));
    const first = renderWithProviders(<StrategyPerformanceCard strategy={strategy} />);
    expect(await screen.findByText('业绩数据暂不可用')).toBeInTheDocument();
    first.unmount();

    mockGetStrategyPerformance.mockRejectedValue(new Error('业绩服务超时'));
    renderWithProviders(<StrategyPerformanceCard strategy={strategy} />);
    expect(await screen.findByText('业绩服务超时')).toBeInTheDocument();
  });

  it('null 响应显示明确空态而非伪造零指标', async () => {
    mockGetStrategyPerformance.mockResolvedValue(null);
    renderWithProviders(<StrategyPerformanceCard strategy={strategy} />);

    expect(await screen.findByText('暂无回测数据，请先运行回测')).toBeInTheDocument();
    expect(screen.getAllByText('--')).toHaveLength(4);
  });
});
