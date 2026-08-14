import type { ReactNode } from 'react';
import type {
  TierFlow,
  ConceptItem,
  IndexQuoteItem,
  MoneyFlowTrendItem,
  MainFlowRankingItem,
  MarketMoneyFlowDetail,
} from 'src/api/market';

import { act, screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import {
  fetchMoneyFlow,
  fetchIndexQuote,
  fetchConceptList,
  fetchMoneyFlowTrend,
  fetchConceptMembers,
  fetchMainFlowRanking,
} from 'src/api/market';

import { PulseHeadline } from '../pulse-headline';
import { ConceptExplorer } from '../concept-explorer';
import { ConceptMembersTable } from '../concept-members-table';
import { MainFlowRankingTable } from '../main-flow-ranking-table';
import { CapitalFlowSummaryCard } from '../capital-flow-summary-card';

vi.mock('src/api/market', () => ({
  fetchMoneyFlow: vi.fn(),
  fetchIndexQuote: vi.fn(),
  fetchConceptList: vi.fn(),
  fetchMoneyFlowTrend: vi.fn(),
  fetchConceptMembers: vi.fn(),
  fetchMainFlowRanking: vi.fn(),
}));

vi.mock('../mini-tier-bar', () => ({
  MiniTierBar: ({ elg, lg }: { elg: number; lg: number }) => (
    <span data-testid="tier-bar">{`${elg}/${lg}`}</span>
  ),
}));

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../stock-flow-detail-dialog', () => ({
  StockFlowDetailDialog: ({ stockName, onClose }: { stockName: string; onClose: () => void }) => (
    <div role="dialog">
      <span>{`详情：${stockName}`}</span>
      <button type="button" onClick={onClose}>
        关闭详情
      </button>
    </div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchMoneyFlowTrend).mockResolvedValue({ data: [] });
});

describe('CapitalFlowSummaryCard', () => {
  it('按交易日请求资金与四个指数，保留 null 并回传实际交易日', async () => {
    const flow = moneyFlow({
      tradeDate: '20260812',
      netMfAmount: 1_200_000_000,
      totalAmount: 12_000_000_000,
      elg: tier(300_000_000, 2.5),
      lg: tier(-200_000_000, -1.5),
      md: tier(null, null),
      sm: tier(0, 0),
    });
    const indices: IndexQuoteItem[] = [
      indexQuote('000001.SH', 3566.12, 1.25),
      indexQuote('399001.SZ', 11_200.5, -0.75),
    ];
    const flowDeferred = deferred<MarketMoneyFlowDetail | null>();
    vi.mocked(fetchMoneyFlow).mockReturnValue(flowDeferred.promise);
    vi.mocked(fetchIndexQuote).mockResolvedValue(indices);
    const onTradeDateResolved = vi.fn();
    const onDataResolved = vi.fn();
    const { container } = renderWithProviders(
      <CapitalFlowSummaryCard
        tradeDate="20260813"
        onTradeDateResolved={onTradeDateResolved}
        onDataResolved={onDataResolved}
      />
    );

    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(5);
    await act(async () => flowDeferred.resolve(flow));

    expect(fetchMoneyFlow).toHaveBeenCalledWith({ trade_date: '20260813' });
    expect(fetchIndexQuote).toHaveBeenCalledWith({
      trade_date: '20260813',
      ts_codes: ['000001.SH', '399001.SZ', '399006.SZ', '000688.SH'],
    });
    expect(onTradeDateResolved).toHaveBeenCalledWith('20260812');
    expect(onDataResolved).toHaveBeenCalledWith(flow);
    expect(await screen.findByText('+12.00')).toBeInTheDocument();
    expect(screen.getByText('-2.00')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    expect(screen.getByText('3566.12')).toBeInTheDocument();
    expect(screen.getByText('11200.50')).toBeInTheDocument();
  });

  it('任一核心请求失败时显示明确错误', async () => {
    vi.mocked(fetchMoneyFlow).mockRejectedValue(new Error('资金接口不可用'));
    vi.mocked(fetchIndexQuote).mockResolvedValue([]);

    renderWithProviders(<CapitalFlowSummaryCard tradeDate="20260812" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('资金接口不可用');
  });
});

describe('PulseHeadline', () => {
  it('展示连续净流入、较昨日扩大和绝对值最大的主导档位', async () => {
    const trend: MoneyFlowTrendItem[] = [
      trendItem('20260810', 100_000_000),
      trendItem('20260811', 200_000_000),
      trendItem('20260812', 450_000_000),
    ];
    vi.mocked(fetchMoneyFlowTrend).mockResolvedValue({ data: trend });

    renderWithProviders(
      <PulseHeadline
        tradeDate="20260812"
        data={moneyFlow({
          netMfAmount: 450_000_000,
          elg: tier(600_000_000, 2),
          lg: tier(100_000_000, 1),
          md: tier(-200_000_000, -1),
          sm: tier(50_000_000, 0.5),
        })}
      />
    );

    expect(fetchMoneyFlowTrend).toHaveBeenCalledWith({ trade_date: '20260812', days: 7 });
    expect(await screen.findByText('连续 3 日净流入')).toBeInTheDocument();
    expect(screen.getByText('较昨日扩大 2.50亿')).toBeInTheDocument();
    expect(screen.getByText('超大单')).toBeInTheDocument();
  });

  it('趋势缺失时保持主卡可用，并对全空档位显示未知', async () => {
    vi.mocked(fetchMoneyFlowTrend).mockRejectedValue(new Error('辅助趋势失败'));
    const emptyTiers = tier(null, null);

    renderWithProviders(
      <PulseHeadline
        data={moneyFlow({
          netMfAmount: null,
          elg: emptyTiers,
          lg: emptyTiers,
          md: emptyTiers,
          sm: emptyTiers,
        })}
      />
    );

    expect(await screen.findByText('未知')).toBeInTheDocument();
    expect(screen.queryByText(/连续/)).not.toBeInTheDocument();
    expect(screen.queryByText(/较昨日/)).not.toBeInTheDocument();
  });
});

describe('MainFlowRankingTable', () => {
  it('请求双榜、展示 null 语义，并支持键盘打开与关闭个股详情', async () => {
    const inflow = ranking('600519.SH', '贵州茅台', 12_000, 2.5);
    const outflow = ranking('000001.SZ', '平安银行', -9_000, null);
    vi.mocked(fetchMainFlowRanking).mockResolvedValue({
      tradeDate: '20260812',
      topInflow: [inflow],
      topOutflow: [outflow],
    });

    const { user } = renderWithProviders(<MainFlowRankingTable tradeDate="20260812" />);

    expect(await screen.findByText('主力净流入 Top 20')).toBeInTheDocument();
    expect(screen.getByText('主力净流出 Top 20')).toBeInTheDocument();
    expect(fetchMainFlowRanking).toHaveBeenCalledWith({
      trade_date: '20260812',
      sort_by: 'main_net_inflow',
      dual: true,
      limit: 100,
    });
    const outflowRow = screen.getByRole('button', { name: '查看 平安银行 资金流详情' });
    outflowRow.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog')).toHaveTextContent('详情：平安银行');
    await user.click(screen.getByRole('button', { name: '关闭详情' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('兼容单榜响应并在当前前100名内本地重排与切换流向', async () => {
    vi.mocked(fetchMainFlowRanking).mockResolvedValue({
      tradeDate: '20260812',
      data: [
        ranking('A.SZ', '低流入', 100, -1),
        ranking('B.SZ', '高流入', 500, 3),
      ],
    });
    const { user } = renderWithProviders(<MainFlowRankingTable />);

    expect(await screen.findAllByText('※ 本地排序（前 100 名内）')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: '净流入', pressed: false }));
    expect(screen.getByText('主力净流入 Top 20')).toBeInTheDocument();
    expect(screen.queryByText('主力净流出 Top 20')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '涨跌幅' }));
    await waitFor(() =>
      expect(fetchMainFlowRanking).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort_by: 'pct_chg' })
      )
    );
  });

  it('请求失败时显示错误而不残留旧榜单', async () => {
    vi.mocked(fetchMainFlowRanking).mockRejectedValue(new Error('榜单加载失败'));

    renderWithProviders(<MainFlowRankingTable />);

    expect(await screen.findByRole('alert')).toHaveTextContent('榜单加载失败');
    expect(screen.queryByText(/Top 20/)).not.toBeInTheDocument();
  });
});

describe('ConceptMembersTable', () => {
  it('提交准确分页 Body、保留空名称，并从下一页重新请求', async () => {
    vi.mocked(fetchConceptMembers)
      .mockResolvedValueOnce({
        conceptCode: 'BK-DEMO-PAGE',
        conceptName: '机器人',
        total: 21,
        members: [{ tsCode: '300024.SZ', name: null }],
      })
      .mockResolvedValueOnce({
        conceptCode: 'BK-DEMO-PAGE',
        conceptName: '机器人',
        total: 21,
        members: [{ tsCode: '002747.SZ', name: '埃斯顿' }],
      });
    const { user } = renderWithProviders(
      <ConceptMembersTable conceptCode="BK-DEMO-PAGE" conceptName="机器人" />
    );

    expect(await screen.findByText('300024.SZ')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(fetchConceptMembers).toHaveBeenNthCalledWith(1, {
      tsCode: 'BK-DEMO-PAGE',
      name: '机器人',
      page: 1,
      pageSize: 20,
    });
    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(await screen.findByText('埃斯顿')).toBeInTheDocument();
    expect(fetchConceptMembers).toHaveBeenNthCalledWith(2, {
      tsCode: 'BK-DEMO-PAGE',
      name: '机器人',
      page: 2,
      pageSize: 20,
    });
  });

  it('错误可重试，成功后进入明确空态', async () => {
    vi.mocked(fetchConceptMembers)
      .mockRejectedValueOnce(new Error('成分服务失败'))
      .mockResolvedValueOnce({
        conceptCode: 'BK-DEMO-RETRY',
        conceptName: null,
        total: 0,
        members: [],
      });
    const { user } = renderWithProviders(
      <ConceptMembersTable conceptCode="BK-DEMO-RETRY" conceptName="" />
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('成分服务失败');
    await user.click(screen.getByRole('button', { name: '重试' }));
    expect(await screen.findByText('暂无成分股数据')).toBeInTheDocument();
    expect(fetchConceptMembers).toHaveBeenCalledTimes(2);
  });
});

describe('ConceptExplorer', () => {
  it('去抖搜索概念并把选择结果传给成分股请求', async () => {
    const option: ConceptItem = { code: 'BK-ROBOT', name: '机器人', count: 42, listDate: null };
    vi.mocked(fetchConceptList).mockResolvedValue({
      total: 1,
      page: 1,
      pageSize: 30,
      items: [option],
    });
    vi.mocked(fetchConceptMembers).mockResolvedValue({
      conceptCode: option.code,
      conceptName: option.name,
      total: 0,
      members: [],
    });
    const { user } = renderWithProviders(<ConceptExplorer initialConcept={null} />);

    expect(screen.getByText('请选择一个概念')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('搜索概念，如「机器人」');
    await user.type(input, ' 机器人 ');
    await act(() => new Promise((resolve) => setTimeout(resolve, 320)));
    expect(fetchConceptList).toHaveBeenCalledWith({ keyword: '机器人', page: 1, pageSize: 30 });
    await user.click(await screen.findByRole('option', { name: /机器人/ }));
    await waitFor(() =>
      expect(fetchConceptMembers).toHaveBeenCalledWith({
        tsCode: 'BK-ROBOT',
        name: '机器人',
        page: 1,
        pageSize: 20,
      })
    );
  });

  it('外部板块选择变化时同步新的概念并避免无意义搜索', async () => {
    vi.mocked(fetchConceptMembers).mockResolvedValue({
      conceptCode: 'BK-A',
      conceptName: '旧概念',
      total: 0,
      members: [],
    });
    const rendered = renderWithProviders(
      <ConceptExplorer initialConcept={{ tsCode: 'BK-A', name: '旧概念' }} />
    );
    expect(await screen.findByDisplayValue('旧概念')).toBeInTheDocument();

    vi.mocked(fetchConceptMembers).mockResolvedValue({
      conceptCode: 'BK-B',
      conceptName: '新概念',
      total: 0,
      members: [],
    });
    rendered.rerender(<ConceptExplorer initialConcept={{ tsCode: 'BK-B', name: '新概念' }} />);

    expect(await screen.findByDisplayValue('新概念')).toBeInTheDocument();
    expect(fetchConceptList).not.toHaveBeenCalled();
  });
});

function tier(netAmount: number | null, netRate: number | null): TierFlow {
  return {
    buyAmount: netAmount == null ? null : Math.max(netAmount, 0),
    sellAmount: netAmount == null ? null : Math.max(-netAmount, 0),
    netAmount,
    buyRate: netRate == null ? null : Math.max(netRate, 0),
    sellRate: netRate == null ? null : Math.max(-netRate, 0),
    netRate,
  };
}

function moneyFlow(overrides: Partial<MarketMoneyFlowDetail> = {}): MarketMoneyFlowDetail {
  const zero = tier(0, 0);
  return {
    tradeDate: '20260812',
    closeSh: 3500,
    pctChangeSh: 1,
    closeSz: 11_000,
    pctChangeSz: -1,
    totalAmount: 10_000_000_000,
    netMfAmount: 0,
    main: zero,
    retail: zero,
    elg: zero,
    lg: zero,
    md: zero,
    sm: zero,
    ...overrides,
  };
}

function indexQuote(tsCode: string, close: number, pctChg: number): IndexQuoteItem {
  return {
    tsCode,
    tradeDate: '20260812',
    close,
    pctChg,
    change: null,
    preClose: null,
    vol: null,
    amount: null,
    baseDate: '19901219',
    basePoint: 100,
  };
}

function trendItem(tradeDate: string, netAmount: number): MoneyFlowTrendItem {
  return {
    tradeDate,
    netAmount,
    cumulativeNet: netAmount,
    buyElgAmount: null,
    buyLgAmount: null,
    buyMdAmount: null,
    buySmAmount: null,
  };
}

function ranking(
  tsCode: string,
  name: string,
  mainNetInflow: number,
  pctChg: number | null
): MainFlowRankingItem {
  return {
    tsCode,
    name,
    industry: null,
    mainNetInflow,
    elgNetInflow: mainNetInflow * 0.6,
    lgNetInflow: mainNetInflow * 0.4,
    mdNetInflow: -mainNetInflow * 0.2,
    smNetInflow: -mainNetInflow * 0.8,
    pctChg,
    amount: null,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
