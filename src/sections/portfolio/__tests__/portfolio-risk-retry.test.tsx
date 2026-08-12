import type { Mock } from 'vitest';
import type { ReactNode, ReactElement } from 'react';
import type {
  BetaAnalysis,
  ViolationRecord,
  IndustryDistribution,
  PositionConcentration,
  MarketCapDistribution,
} from 'src/api/portfolio';

import { screen, within, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const {
  mockGetRiskBeta,
  mockGetViolations,
  mockGetRiskIndustry,
  mockGetRiskPosition,
  mockGetRiskMarketCap,
} = vi.hoisted(() => ({
  mockGetRiskBeta: vi.fn(),
  mockGetViolations: vi.fn(),
  mockGetRiskIndustry: vi.fn(),
  mockGetRiskPosition: vi.fn(),
  mockGetRiskMarketCap: vi.fn(),
}));

vi.mock('src/api/portfolio', () => ({
  getRiskBeta: mockGetRiskBeta,
  getViolations: mockGetViolations,
  getRiskIndustry: mockGetRiskIndustry,
  getRiskPosition: mockGetRiskPosition,
  getRiskMarketCap: mockGetRiskMarketCap,
}));
vi.mock('src/components/chart', () => ({
  useChart: (options: unknown) => options,
  Chart: ({ series }: { series: unknown }) => (
    <div data-testid="risk-chart">{JSON.stringify(series)}</div>
  ),
}));
vi.mock('src/components/label', () => ({
  Label: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

import { RiskBetaTable } from '../risk-beta-table';
import { RiskIndustryChart } from '../risk-industry-chart';
import { RiskMarketCapChart } from '../risk-market-cap-chart';
import { ViolationHistoryTable } from '../violation-history-table';
import { RiskConcentrationCard } from '../risk-concentration-card';

const PORTFOLIO_ID = 'portfolio-risk-retry';

async function retryAfterFailure(request: Mock, ui: ReactElement, errorText: string) {
  const { user } = renderWithProviders(ui);
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(errorText);

  await user.click(within(alert).getByRole('button', { name: '重试' }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetRiskBeta.mockReset();
  mockGetViolations.mockReset();
  mockGetRiskIndustry.mockReset();
  mockGetRiskPosition.mockReset();
  mockGetRiskMarketCap.mockReset();
});

describe('portfolio risk remote error retry', () => {
  it('市值分布失败后可重试成功，并保留 null 权重而不是转成 0', async () => {
    const response: MarketCapDistribution = {
      tradeDate: '20260808',
      tiers: [
        { tier: '未知权重', stockCount: 1, weight: null },
        { tier: '中盘', stockCount: 2, weight: 0.25 },
      ],
    };
    mockGetRiskMarketCap
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(response);

    await retryAfterFailure(
      mockGetRiskMarketCap,
      <RiskMarketCapChart portfolioId={PORTFOLIO_ID} />,
      '加载市值分布失败'
    );

    expect(await screen.findByTestId('risk-chart')).toHaveTextContent('"data":[null,25]');
    expect(mockGetRiskMarketCap).toHaveBeenLastCalledWith({ portfolioId: PORTFOLIO_ID });
  });

  it('行业分布失败后可重试成功，图表忽略缺失权重但表格仍显示缺失', async () => {
    const response: IndustryDistribution = {
      tradeDate: '20260808',
      industries: [
        { industry: '银行', stockCount: 1, totalMarketValue: null, weight: null },
        { industry: '电子', stockCount: 2, totalMarketValue: 100, weight: 0.4 },
      ],
    };
    mockGetRiskIndustry.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(response);

    await retryAfterFailure(
      mockGetRiskIndustry,
      <RiskIndustryChart portfolioId={PORTFOLIO_ID} />,
      '加载行业分布失败'
    );

    const bankRow = (await screen.findByText('银行')).closest('tr');
    expect(bankRow).not.toBeNull();
    expect(within(bankRow as HTMLElement).getByText('-')).toBeInTheDocument();
    expect(screen.getByTestId('risk-chart')).toHaveTextContent('[40]');
    expect(mockGetRiskIndustry).toHaveBeenLastCalledWith({ portfolioId: PORTFOLIO_ID });
  });

  it('Beta 分析失败后可重试成功', async () => {
    const response: BetaAnalysis = {
      tradeDate: '20260808',
      portfolioBeta: null,
      holdings: [{ tsCode: '600000.SH', stockName: '浦发银行', beta: null, weight: null }],
    };
    mockGetRiskBeta.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(response);

    await retryAfterFailure(
      mockGetRiskBeta,
      <RiskBetaTable portfolioId={PORTFOLIO_ID} />,
      '加载 Beta 分析失败'
    );

    expect(await screen.findByText('600000.SH')).toBeInTheDocument();
    expect(screen.getAllByText('-')).toHaveLength(3);
    expect(mockGetRiskBeta).toHaveBeenLastCalledWith({ portfolioId: PORTFOLIO_ID });
  });

  it('仓位集中度失败后可重试成功', async () => {
    const response: PositionConcentration = {
      tradeDate: '20260808',
      concentration: { hhi: 0.25, top1Weight: 0.3, top3Weight: 0.7, top5Weight: 1 },
      positions: [
        {
          tsCode: '000001.SZ',
          stockName: '平安银行',
          marketValue: null,
          weight: null,
        },
      ],
    };
    mockGetRiskPosition.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(response);

    await retryAfterFailure(
      mockGetRiskPosition,
      <RiskConcentrationCard portfolioId={PORTFOLIO_ID} />,
      '加载仓位集中度失败'
    );

    const positionRow = (await screen.findByText('000001.SZ')).closest('tr');
    expect(positionRow).not.toBeNull();
    expect(within(positionRow as HTMLElement).getByText('-')).toBeInTheDocument();
    expect(mockGetRiskPosition).toHaveBeenLastCalledWith({ portfolioId: PORTFOLIO_ID });
  });

  it('违规记录失败后可重试成功', async () => {
    const response: ViolationRecord[] = [
      {
        id: 'violation-1',
        portfolioId: PORTFOLIO_ID,
        ruleType: 'INDUSTRY_WEIGHT',
        tsCode: null,
        currentValue: 0.4,
        threshold: 0.3,
        message: '超过行业上限',
        detectedAt: '2026-08-08T16:00:00.000Z',
      },
    ];
    mockGetViolations.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(response);

    await retryAfterFailure(
      mockGetViolations,
      <ViolationHistoryTable portfolioId={PORTFOLIO_ID} />,
      '加载违规记录失败'
    );

    expect(await screen.findByText('超过行业上限')).toBeInTheDocument();
    expect(mockGetViolations).toHaveBeenLastCalledWith({ portfolioId: PORTFOLIO_ID, limit: 50 });
  });
});
