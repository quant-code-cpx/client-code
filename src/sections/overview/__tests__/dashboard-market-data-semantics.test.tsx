import type { MarketMoneyFlowDetail } from 'src/api/market';

import { useState } from 'react';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { DashboardSectorWind } from '../dashboard-sector-wind';
import { DashboardMarketPulse } from '../dashboard-market-pulse';
import { DashboardCapitalRadar } from '../dashboard-capital-radar';

const push = vi.hoisted(() => vi.fn());

const mocks = vi.hoisted(() => ({
  fetchHsgtFlow: vi.fn(),
  fetchMoneyFlow: vi.fn(),
  fetchSectorRanking: vi.fn(),
  fetchSectorFlowRanking: vi.fn(),
  fetchIndexQuoteWithSparkline: vi.fn(),
}));

vi.mock('src/api/market', () => mocks);
vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push }) }));

vi.mock('src/components/chart-sparkline', () => ({
  ChartSparkline: () => <div data-testid="sparkline" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('首页市场数据缺失语义', () => {
  it('指数涨跌幅和成交额缺失时显示占位，不伪造成 0', async () => {
    mocks.fetchIndexQuoteWithSparkline.mockResolvedValue({
      tradeDate: '20260808',
      sparklinePeriod: '1m',
      indices: [
        {
          tsCode: '000001.SH',
          name: '上证指数',
          tradeDate: '20260808',
          close: 3500,
          preClose: null,
          change: null,
          pctChg: null,
          vol: null,
          amount: null,
          sparkline: [],
        },
      ],
    });

    renderWithProviders(<DashboardMarketPulse />);

    expect(await screen.findByText('上证指数')).toBeInTheDocument();
    expect(screen.getByText('成交额 —')).toBeInTheDocument();
    expect(screen.queryByText('0.00%')).not.toBeInTheDocument();
  });

  it('资金字段缺失时不生成 0 亿或 50/50 比例', async () => {
    mocks.fetchHsgtFlow.mockResolvedValue({
      tradeDate: '20260808',
      history: [
        {
          tradeDate: '20260808',
          northMoney: null,
          southMoney: null,
          hgt: null,
          sgt: null,
          ggtSs: null,
          ggtSz: null,
        },
      ],
    });
    mocks.fetchMoneyFlow.mockResolvedValue(moneyFlowWithMissingValues());

    renderWithProviders(<DashboardCapitalRadar />);

    expect(await screen.findByText('全市场净流入')).toBeInTheDocument();
    expect(screen.queryByText('+0.00')).not.toBeInTheDocument();
    expect(screen.queryByText('买0.0亿')).not.toBeInTheDocument();
    expect(screen.getAllByText('买—')).toHaveLength(4);
  });

  it('资金零值中性且无加号，正红负绿并按真实单位展示', async () => {
    mocks.fetchHsgtFlow.mockResolvedValue({
      tradeDate: '20260808',
      history: [
        {
          tradeDate: '20260808',
          northMoney: 1_234,
          southMoney: null,
          hgt: null,
          sgt: null,
          ggtSs: null,
          ggtSz: null,
        },
      ],
    });
    mocks.fetchMoneyFlow.mockResolvedValue(
      moneyFlowWithMissingValues({
        netMfAmount: 0,
        main: tier({ netAmount: 0 }),
        elg: tier({ buyAmount: 100_000_000, sellAmount: 100_000_000, netAmount: 0 }),
        lg: tier({ buyAmount: 200_000_000, sellAmount: 100_000_000, netAmount: 100_000_000 }),
        md: tier({ buyAmount: 100_000_000, sellAmount: 200_000_000, netAmount: -100_000_000 }),
      })
    );
    const { user } = renderWithProviders(<DashboardCapitalRadar />);

    expect(await screen.findByText('0.00')).toHaveStyle({ color: 'var(--palette-text-secondary)' });
    expect(screen.getByText('0.00亿')).toHaveStyle({ color: 'var(--palette-text-secondary)' });
    expect(screen.getByText('0.0亿')).toHaveStyle({ color: 'var(--palette-text-secondary)' });
    expect(screen.getByText('+1.0亿')).toHaveStyle({ color: 'var(--palette-error-main)' });
    expect(screen.getByText('-1.0亿')).toHaveStyle({ color: 'var(--palette-success-main)' });
    expect(screen.queryByText(/\+0\.0/)).not.toBeInTheDocument();
    expect(screen.getByText('12.3亿')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /查看更多/ }));
    expect(push).toHaveBeenCalledWith('/market/money-flow');
  });

  it('资金接口失败时暴露错误并提供局部重试', async () => {
    mocks.fetchHsgtFlow.mockRejectedValue(new Error('北向接口不可用'));
    mocks.fetchMoneyFlow.mockRejectedValue(new Error('资金接口不可用'));

    renderWithProviders(<DashboardCapitalRadar />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('资金接口不可用');
    expect(alert).toHaveTextContent('北向接口不可用');
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
  });

  it('资金刷新失败保留旧数据、标注 stale，并可由局部重试恢复', async () => {
    mocks.fetchHsgtFlow
      .mockResolvedValueOnce({ tradeDate: '20260808', history: [] })
      .mockRejectedValueOnce(new Error('北向刷新失败'))
      .mockResolvedValueOnce({ tradeDate: '20260808', history: [] });
    mocks.fetchMoneyFlow
      .mockResolvedValueOnce(moneyFlowWithMissingValues({ netMfAmount: 100_000_000 }))
      .mockRejectedValueOnce(new Error('资金刷新失败'))
      .mockResolvedValueOnce(moneyFlowWithMissingValues({ netMfAmount: -100_000_000 }));
    const rendered = renderWithProviders(<CapitalRefreshHarness />);
    expect(await screen.findByText('+1.00')).toBeInTheDocument();

    await rendered.user.click(screen.getByRole('button', { name: '触发资金刷新' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('资金流刷新失败，当前展示上次数据：资金刷新失败');
    expect(alert).toHaveTextContent('北向刷新失败');
    expect(screen.getByText('+1.00')).toBeInTheDocument();

    await rendered.user.click(screen.getByRole('button', { name: '重试' }));
    expect(await screen.findByText('-1.00')).toHaveStyle({ color: 'var(--palette-success-main)' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('板块名称和排名指标缺失时回退代码与占位符', async () => {
    mocks.fetchSectorRanking.mockResolvedValue({
      tradeDate: '20260808',
      sectors: [
        {
          tsCode: 'BK.RANK.NULL',
          name: null,
          pctChange: null,
          netAmount: null,
          netAmountRate: null,
        },
      ],
    });
    mocks.fetchSectorFlowRanking.mockResolvedValue({
      tradeDate: '20260808',
      contentType: 'INDUSTRY',
      sectors: [
        {
          tsCode: 'BK.FLOW.NULL',
          name: null,
          pctChange: null,
          close: null,
          netAmount: null,
          netAmountRate: null,
          buyElgAmount: null,
          buyLgAmount: null,
          buyMdAmount: null,
          buySmAmount: null,
        },
      ],
    });

    renderWithProviders(<DashboardSectorWind />);

    expect(await screen.findByText('BK.RANK.NULL')).toBeInTheDocument();
    expect(screen.getByText('BK.FLOW.NULL')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.queryByText('+0.00%')).not.toBeInTheDocument();
    expect(screen.queryByText('+0')).not.toBeInTheDocument();
  });

  it('板块涨跌与资金保持零中性、正红负绿，并传递明确 API Body', async () => {
    mocks.fetchSectorRanking.mockResolvedValue({
      tradeDate: '20260808',
      sectors: [
        sectorRanking('BK.UP', '上涨行业', 2),
        sectorRanking('BK.DOWN', '下跌行业', -1),
        sectorRanking('BK.FLAT', '平盘行业', 0),
      ],
    });
    mocks.fetchSectorFlowRanking.mockResolvedValue({
      tradeDate: '20260808',
      contentType: 'INDUSTRY',
      sectors: [
        sectorFlow('BK.IN', '流入行业', 200_000_000),
        sectorFlow('BK.OUT', '流出行业', -100_000_000),
        sectorFlow('BK.ZERO', '零流行业', 0),
      ],
    });
    const { user } = renderWithProviders(<DashboardSectorWind />);

    expect(await screen.findByText('+2.00%')).toHaveStyle({ color: 'var(--palette-error-main)' });
    expect(screen.getByText('-1.00%')).toHaveStyle({ color: 'var(--palette-success-main)' });
    expect(screen.getByText('0.00%')).toHaveStyle({ color: 'var(--palette-text-secondary)' });
    expect(screen.getByText(/\+2亿/)).toHaveStyle({ color: 'var(--palette-error-main)' });
    expect(screen.getByText(/1亿/)).toHaveStyle({ color: 'var(--palette-success-main)' });
    expect(screen.getByText('0')).toHaveStyle({ color: 'var(--palette-text-secondary)' });
    expect(mocks.fetchSectorRanking).toHaveBeenCalledWith({ limit: 10, sort_by: 'pct_change' });
    expect(mocks.fetchSectorFlowRanking).toHaveBeenCalledWith({
      limit: 10,
      order: 'desc',
      sort_by: 'net_amount',
    });

    await user.click(screen.getByRole('button', { name: /查看更多/ }));
    expect(push).toHaveBeenCalledWith('/market/industry-rotation');
  });

  it('板块双接口失败给出可重试错误，恢复后清错；单接口失败保留另一侧数据', async () => {
    mocks.fetchSectorRanking
      .mockRejectedValueOnce(new Error('涨跌接口失败'))
      .mockResolvedValueOnce({
        tradeDate: '20260808',
        sectors: [sectorRanking('BK.OK', '恢复行业', 1)],
      });
    mocks.fetchSectorFlowRanking
      .mockRejectedValueOnce('unknown')
      .mockResolvedValueOnce({
        tradeDate: '20260808',
        contentType: 'INDUSTRY',
        sectors: [sectorFlow('BK.FLOW', '恢复资金', 100_000_000)],
      });
    const { user } = renderWithProviders(<DashboardSectorWind />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('涨跌接口失败');
    expect(alert).toHaveTextContent('板块资金数据加载失败');
    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByText('恢复行业')).toBeInTheDocument();
    expect(screen.getByText('恢复资金')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.fetchSectorRanking).toHaveBeenCalledTimes(2));
  });
});

function CapitalRefreshHarness() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setRefreshKey((key) => key + 1)}>
        触发资金刷新
      </button>
      <DashboardCapitalRadar refreshKey={refreshKey} />
    </>
  );
}

function tier(overrides: Partial<MarketMoneyFlowDetail['elg']> = {}) {
  return {
    buyAmount: null,
    sellAmount: null,
    netAmount: null,
    buyRate: null,
    sellRate: null,
    netRate: null,
    ...overrides,
  };
}

function moneyFlowWithMissingValues(
  overrides: Partial<MarketMoneyFlowDetail> = {}
): MarketMoneyFlowDetail {
  return {
    tradeDate: '20260808',
    closeSh: null,
    pctChangeSh: null,
    closeSz: null,
    pctChangeSz: null,
    totalAmount: null,
    netMfAmount: null,
    main: tier(),
    retail: tier(),
    elg: tier(),
    lg: tier(),
    md: tier(),
    sm: tier(),
    ...overrides,
  };
}

function sectorRanking(tsCode: string, name: string, pctChange: number) {
  return { tsCode, name, pctChange, netAmount: null, netAmountRate: null };
}

function sectorFlow(tsCode: string, name: string, netAmount: number) {
  return {
    tsCode,
    name,
    pctChange: null,
    close: null,
    netAmount,
    netAmountRate: null,
    buyElgAmount: null,
    buyLgAmount: null,
    buyMdAmount: null,
    buySmAmount: null,
  };
}
