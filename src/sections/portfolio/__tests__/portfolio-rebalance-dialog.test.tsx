import type { ReactNode } from 'react';
import type {
  HoldingDetailItem,
  RebalancePlanResponse,
} from 'src/api/portfolio';

import { act, screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const { mockRebalancePlan } = vi.hoisted(() => ({ mockRebalancePlan: vi.fn() }));

vi.mock('src/api/portfolio', () => ({ rebalancePlan: mockRebalancePlan }));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/label', () => ({
  Label: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock('src/components/stock-search-autocomplete', () => ({
  stockItemFromCode: () => null,
  StockSearchAutocomplete: ({ value }: { value: { tsCode?: string } | null }) => (
    <span>{value?.tsCode ?? '未选择股票'}</span>
  ),
}));

import { PortfolioRebalanceDialog } from '../portfolio-rebalance-dialog';
import {
  stockFromHolding,
  buildRebalanceOrderText,
  toOptionalRebalanceNumber,
} from '../portfolio-rebalance-model';

const holdings: HoldingDetailItem[] = [
  {
    id: 'holding-1',
    tsCode: '600000.SH',
    stockName: '浦发银行',
    quantity: 1000,
    avgCost: 10,
    currentPrice: 12,
    marketValue: 12000,
    unrealizedPnl: 2000,
    pnlPct: 0.2,
    weight: 0.2,
    industry: '银行',
  },
  {
    id: 'holding-2',
    tsCode: '000001.SZ',
    stockName: '平安银行',
    quantity: 2000,
    avgCost: 9,
    currentPrice: null,
    marketValue: null,
    unrealizedPnl: null,
    pnlPct: null,
    weight: 0.3,
    industry: null,
  },
];

const result: RebalancePlanResponse = {
  portfolioId: 'portfolio-1',
  totalValue: 100000,
  priceDate: '20260812',
  estimatedCost: 18.5,
  summary: { added: 1, updated: 0, removed: 1, unchanged: 1, totalHoldings: 2 },
  actions: [
    {
      tsCode: '600000.SH',
      stockName: '浦发银行',
      action: 'BUY',
      previousQuantity: 1000,
      previousAvgCost: 10,
      targetQuantity: 1200,
      targetAvgCost: 10,
      deltaQuantity: 200,
    },
    {
      tsCode: '000001.SZ',
      stockName: '平安银行',
      action: 'SELL',
      previousQuantity: 2000,
      previousAvgCost: 9,
      targetQuantity: 1500,
      targetAvgCost: 9,
      deltaQuantity: -500,
    },
    {
      tsCode: '000002.SZ',
      stockName: '万科A',
      action: 'HOLD',
      previousQuantity: 100,
      previousAvgCost: 8,
      targetQuantity: 100,
      targetAvgCost: 8,
      deltaQuantity: 0,
    },
  ],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe('PortfolioRebalanceDialog', () => {
  it('从当前持仓生成规范 Body，加载防重并复制非零委托清单', async () => {
    const pending = deferred<RebalancePlanResponse>();
    mockRebalancePlan.mockReturnValue(pending.promise);
    const { user } = renderWithProviders(
      <PortfolioRebalanceDialog
        open
        onClose={vi.fn()}
        portfolioId="portfolio-1"
        holdings={holdings}
      />
    );

    expect(screen.getByRole('button', { name: '生成计划' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '从当前持仓带入' }));
    expect(screen.getByText('合计权重：50.0%')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '高级成本参数' }));
    await user.clear(screen.getByLabelText('总市值覆盖'));
    await user.type(screen.getByLabelText('总市值覆盖'), '100000');
    await user.click(screen.getByRole('button', { name: '生成计划' }));

    expect(mockRebalancePlan).toHaveBeenCalledWith({
      portfolioId: 'portfolio-1',
      omitUnspecified: 'HOLD',
      totalValue: 100000,
      commissionRate: 0.0003,
      stampDutyRate: 0.0005,
      minCommission: 5,
      targets: [
        { tsCode: '600000.SH', targetWeight: 0.2 },
        { tsCode: '000001.SZ', targetWeight: 0.3 },
      ],
    });
    expect(screen.getByRole('button', { name: /生成中/ })).toBeDisabled();

    await act(async () => {
      pending.resolve(result);
      await pending.promise;
    });

    expect(await screen.findByText('调仓操作清单')).toBeInTheDocument();
    expect(screen.getByText('预估交易成本：¥18.5')).toBeInTheDocument();
    expect(screen.getByText('+200')).toBeInTheDocument();
    expect(screen.getByText('-500')).toBeInTheDocument();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    await user.click(screen.getByRole('button', { name: '复制委托清单' }));
    expect(writeText).toHaveBeenCalledWith(
      '方向\t股票代码\t股票名称\t数量\n买入\t600000.SH\t浦发银行\t200\n卖出\t000001.SZ\t平安银行\t500'
    );
    expect(await screen.findByText('委托清单已复制，可粘贴到券商或交易笔记中。')).toBeInTheDocument();
  });

  it('接口错误展示后端消息；null 权重不会伪造有效目标', async () => {
    mockRebalancePlan.mockRejectedValue(new Error('价格数据尚未就绪'));
    const firstView = renderWithProviders(
      <PortfolioRebalanceDialog
        open
        onClose={vi.fn()}
        portfolioId="portfolio-1"
        holdings={[{ ...holdings[0], weight: null }]}
      />
    );

    await firstView.user.click(screen.getByRole('button', { name: '从当前持仓带入' }));
    expect(screen.getByText('合计权重：0.0%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '生成计划' })).toBeDisabled();
    firstView.unmount();

    // 换成有效持仓后新挂载，验证后端错误不会被吞掉。
    const view = renderWithProviders(
      <PortfolioRebalanceDialog
        open
        onClose={vi.fn()}
        portfolioId="portfolio-2"
        holdings={holdings.slice(0, 1)}
      />
    );
    await view.user.click(screen.getByRole('button', { name: '从当前持仓带入' }));
    await view.user.click(screen.getByRole('button', { name: '生成计划' }));
    expect(await screen.findByText('价格数据尚未就绪')).toBeInTheDocument();
    await waitFor(() => expect(mockRebalancePlan).toHaveBeenCalledTimes(1));
  });
});

describe('portfolio rebalance model', () => {
  it('数值解析保留空值，持仓映射保留 nullable 行业', () => {
    expect(toOptionalRebalanceNumber('  ')).toBeUndefined();
    expect(toOptionalRebalanceNumber('0')).toBe(0);
    expect(Number.isNaN(toOptionalRebalanceNumber('oops'))).toBe(true);
    expect(stockFromHolding(holdings[1])).toEqual(
      expect.objectContaining({ tsCode: '000001.SZ', name: '平安银行', industry: null })
    );
  });

  it('复制文本排除 HOLD/零变化，并为全零计划给出明确结论', () => {
    expect(buildRebalanceOrderText(result.actions)).toContain('买入\t600000.SH\t浦发银行\t200');
    expect(buildRebalanceOrderText(result.actions)).not.toContain('万科A');
    expect(buildRebalanceOrderText([{ ...result.actions[2] }])).toBe(
      '无需调仓，当前持仓已符合目标权重。'
    );
  });
});
