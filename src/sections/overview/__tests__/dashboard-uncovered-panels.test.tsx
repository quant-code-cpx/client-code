import type { ReactNode } from 'react';
import type { TushareSyncPlan } from 'src/api/tushare-sync';
import type { LatestSignalResponse, SignalActivationItem } from 'src/api/signal';

import { act, screen, within, waitFor } from '@testing-library/react';

import { alertApi } from 'src/api/alert';
import { tushareSyncApi } from 'src/api/tushare-sync';
import { renderWithProviders } from 'src/test/test-utils';
import { getLatestSignals, listSignalActivations } from 'src/api/signal';
import {
  fetchSentiment,
  fetchVolumeOverview,
  fetchMainFlowRanking,
  fetchChangeDistribution,
} from 'src/api/market';

import { DashboardSignalCenter } from '../dashboard-signal-center';
import { DashboardSystemStatus } from '../dashboard-system-status';
import { DashboardMainFlowRanking } from '../dashboard-main-flow-ranking';
import { DashboardMarketTemperature } from '../dashboard-market-temperature';

const push = vi.hoisted(() => vi.fn());

vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push }) }));

vi.mock('src/api/market', () => ({
  fetchSentiment: vi.fn(),
  fetchVolumeOverview: vi.fn(),
  fetchChangeDistribution: vi.fn(),
  fetchMainFlowRanking: vi.fn(),
}));

vi.mock('src/api/signal', () => ({
  listSignalActivations: vi.fn(),
  getLatestSignals: vi.fn(),
}));

vi.mock('src/api/alert', () => ({
  alertApi: { getPriceRules: vi.fn() },
}));

vi.mock('src/api/tushare-sync', () => ({
  tushareSyncApi: { getPlans: vi.fn() },
}));

vi.mock('src/components/iconify', () => ({
  Iconify: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const plans: TushareSyncPlan[] = [
  {
    task: 'daily-market',
    label: '日线行情',
    category: 'market',
    bootstrapEnabled: true,
    supportsManual: true,
    supportsFullSync: true,
    requiresTradeDate: true,
    schedule: {
      cron: '0 30 18 * * 1-5',
      timeZone: 'Asia/Shanghai',
      description: '盘后',
      tradingDayOnly: true,
    },
  },
  {
    task: 'monthly-financial',
    label: '财务指标',
    category: 'financial',
    bootstrapEnabled: false,
    supportsManual: false,
    supportsFullSync: false,
    requiresTradeDate: false,
    schedule: {
      cron: '0 5 0 15 * *',
      timeZone: 'Asia/Shanghai',
      description: '月中',
      tradingDayOnly: false,
    },
  },
  {
    task: 'bad-cron',
    label: '另类任务',
    category: 'alternative',
    bootstrapEnabled: false,
    supportsManual: true,
    supportsFullSync: false,
    requiresTradeDate: false,
    schedule: {
      cron: 'invalid cron',
      timeZone: 'Asia/Shanghai',
      description: '原样展示',
      tradingDayOnly: false,
    },
  },
];

const activations: SignalActivationItem[] = [
  {
    id: 'a1',
    strategyId: 's1',
    strategyName: '动量策略',
    portfolioId: null,
    isActive: true,
    universe: 'ALL_A',
    benchmarkTsCode: '000300.SH',
    lookbackDays: 20,
    alertThreshold: 0.8,
    lastSignalDate: '20260812',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-12T00:00:00.000Z',
  },
  {
    id: 'a2',
    strategyId: 's2',
    strategyName: '价值策略',
    portfolioId: null,
    isActive: false,
    universe: 'ALL_A',
    benchmarkTsCode: '000300.SH',
    lookbackDays: 20,
    alertThreshold: 0.8,
    lastSignalDate: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-12T00:00:00.000Z',
  },
];

const latest: LatestSignalResponse[] = [
  {
    strategyId: 's1',
    strategyName: '动量策略',
    tradeDate: '20260812',
    generatedAt: '2026-08-12T08:00:00.000Z',
    signals: [
      {
        tsCode: '000001.SZ',
        stockName: '平安银行',
        action: 'BUY',
        targetWeight: 0.2,
        confidence: 0.88,
      },
      {
        tsCode: '000002.SZ',
        stockName: '万科A',
        action: 'HOLD',
        targetWeight: 0.1,
        confidence: null,
      },
      {
        tsCode: '600519.SH',
        stockName: '贵州茅台',
        action: 'SELL',
        targetWeight: 0,
        confidence: null,
      },
    ],
  },
];

describe('首页补充面板', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSentiment).mockResolvedValue({
      tradeDate: '20260812',
      total: 10,
      bigRise: 2,
      rise: 5,
      flat: 1,
      fall: 1,
      bigFall: 1,
    });
    vi.mocked(fetchVolumeOverview).mockResolvedValue({
      data: [
        { tradeDate: '20260811', totalAmount: 100, shAmount: 40, szAmount: 60 },
        { tradeDate: '20260812', totalAmount: 150, shAmount: 60, szAmount: 90 },
      ],
    });
    vi.mocked(fetchChangeDistribution).mockResolvedValue({
      tradeDate: '20260812',
      limitUp: 66,
      limitDown: 3,
      distribution: [],
    });
    vi.mocked(fetchMainFlowRanking).mockResolvedValue({
      tradeDate: '20260812',
      data: [
        {
          tsCode: '000001.SZ',
          name: '平安银行',
          industry: '银行',
          mainNetInflow: 12000,
          elgNetInflow: 6000,
          lgNetInflow: 6000,
          mdNetInflow: -2000,
          smNetInflow: -10000,
          pctChg: 2.5,
          amount: null,
        },
        {
          tsCode: '000002.SZ',
          name: '万科A',
          industry: null,
          mainNetInflow: 0,
          elgNetInflow: 0,
          lgNetInflow: 0,
          mdNetInflow: 0,
          smNetInflow: 0,
          pctChg: null,
          amount: null,
        },
      ],
    });
    vi.mocked(tushareSyncApi.getPlans).mockResolvedValue(plans);
    vi.mocked(listSignalActivations).mockResolvedValue(activations);
    vi.mocked(getLatestSignals).mockResolvedValue(latest);
    vi.mocked(alertApi.getPriceRules).mockResolvedValue([
      {
        id: 1,
        userId: 1,
        tsCode: '000001.SZ',
        stockName: '平安银行',
        watchlistId: null,
        portfolioId: null,
        sourceName: null,
        ruleType: 'PCT_CHANGE_UP',
        threshold: 5,
        memo: null,
        status: 'ACTIVE',
        triggerCount: 0,
        lastTriggeredAt: null,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
      {
        id: 2,
        userId: 1,
        tsCode: '000002.SZ',
        stockName: '万科A',
        watchlistId: null,
        portfolioId: null,
        sourceName: null,
        ruleType: 'LIMIT_UP',
        threshold: null,
        memo: null,
        status: 'PAUSED',
        triggerCount: 0,
        lastTriggeredAt: null,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ]);
  });

  it('市场温度并行加载三类数据，推导情绪、量能和涨跌停', async () => {
    let resolveSentiment!: (value: Awaited<ReturnType<typeof fetchSentiment>>) => void;
    vi.mocked(fetchSentiment).mockImplementationOnce(
      () => new Promise((resolve) => { resolveSentiment = resolve; })
    );
    const onTradeDateResolved = vi.fn();
    const { container, unmount } = renderWithProviders(
      <DashboardMarketTemperature onTradeDateResolved={onTradeDateResolved} refreshKey={0} />
    );
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    await act(async () =>
      resolveSentiment({
        tradeDate: '20260812',
        total: 10,
        bigRise: 2,
        rise: 5,
        flat: 1,
        fall: 1,
        bigFall: 1,
      })
    );

    expect(await screen.findByText('偏贪婪')).toBeInTheDocument();
    expect(screen.getByText('上涨')).toBeInTheDocument();
    expect(screen.getByText('涨停')).toBeInTheDocument();
    expect(screen.getByText('66')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === '↑50.0%')).toBeInTheDocument();
    expect(onTradeDateResolved).toHaveBeenCalledWith('20260812');
    expect(fetchVolumeOverview).toHaveBeenCalledWith({ days: 10 });

    unmount();
    renderWithProviders(
      <DashboardMarketTemperature onTradeDateResolved={onTradeDateResolved} refreshKey={1} />
    );
    await waitFor(() => expect(fetchSentiment).toHaveBeenCalledTimes(2));
  });

  it('市场温度允许辅助接口部分失败；核心情绪失败不伪造卡片', async () => {
    vi.mocked(fetchVolumeOverview).mockRejectedValueOnce(new Error('量能失败'));
    vi.mocked(fetchChangeDistribution).mockRejectedValueOnce(new Error('分布失败'));
    const { unmount } = renderWithProviders(<DashboardMarketTemperature />);
    expect(await screen.findByText('市场温度')).toBeInTheDocument();
    expect(screen.queryByText('涨跌停统计')).not.toBeInTheDocument();
    unmount();

    vi.mocked(fetchSentiment).mockRejectedValueOnce(new Error('情绪失败'));
    const { container } = renderWithProviders(<DashboardMarketTemperature />);
    await waitFor(() => expect(container.querySelector('.MuiSkeleton-root')).not.toBeInTheDocument());
    expect(screen.queryByText('市场温度')).not.toBeInTheDocument();
  });

  it('同步计划翻译 cron、支持分类搜索，并从错误重试恢复', async () => {
    vi.mocked(tushareSyncApi.getPlans).mockRejectedValueOnce(new Error('计划服务不可用'));
    const { user } = renderWithProviders(<DashboardSystemStatus />);
    expect(await screen.findByText('计划服务不可用')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByText('日线行情')).toBeInTheDocument();
    expect(screen.getByText('工作日 18:30')).toBeInTheDocument();
    expect(screen.getByText('每月15日 00:05')).toBeInTheDocument();
    expect(screen.getByText('invalid cron')).toBeInTheDocument();
    expect(screen.getByText('支持手动 / 全量')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: '财务数据' }));
    expect(screen.getByText('财务指标')).toBeInTheDocument();
    expect(screen.queryByText('日线行情')).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('搜索任务名称…'));
    await user.type(screen.getByPlaceholderText('搜索任务名称…'), '不存在');
    expect(screen.getByText('无匹配结果')).toBeInTheDocument();
  });

  it('同步计划区分真实空态和取消后的陈旧响应', async () => {
    vi.mocked(tushareSyncApi.getPlans).mockResolvedValueOnce([]);
    const { unmount } = renderWithProviders(<DashboardSystemStatus />);
    expect(await screen.findByText('暂无同步计划')).toBeInTheDocument();
    unmount();

    let resolve!: (value: TushareSyncPlan[]) => void;
    vi.mocked(tushareSyncApi.getPlans).mockImplementationOnce(
      () => new Promise((r) => { resolve = r; })
    );
    const mounted = renderWithProviders(<DashboardSystemStatus />);
    mounted.unmount();
    await act(async () => resolve(plans));
    expect(screen.queryByText('日线行情')).not.toBeInTheDocument();
  });

  it('信号中心只展示非 HOLD 信号，统计活跃策略/规则并导航', async () => {
    const { user, unmount } = renderWithProviders(<DashboardSignalCenter refreshKey={0} />);
    expect(await screen.findByText('平安银行')).toBeInTheDocument();
    expect(screen.getByText('贵州茅台')).toBeInTheDocument();
    expect(screen.queryByText('万科A')).not.toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();

    const activeBox = screen.getByText('活跃策略').parentElement!;
    const alertBox = screen.getByText('价格预警').parentElement!;
    expect(within(activeBox).getByText('1')).toBeInTheDocument();
    expect(within(alertBox).getByText('1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /查看全部信号/ }));
    expect(push).toHaveBeenCalledWith('/strategy/signal');
    unmount();
    renderWithProviders(<DashboardSignalCenter refreshKey={1} />);
    await waitFor(() => expect(getLatestSignals).toHaveBeenCalledTimes(2));
  });

  it('信号中心辅助请求失败时进入明确 empty，不把 HOLD 当交易信号', async () => {
    vi.mocked(listSignalActivations).mockRejectedValueOnce(new Error('激活失败'));
    vi.mocked(getLatestSignals).mockResolvedValueOnce([{ ...latest[0], signals: [latest[0].signals[1]] }]);
    vi.mocked(alertApi.getPriceRules).mockRejectedValueOnce(new Error('规则失败'));
    renderWithProviders(<DashboardSignalCenter />);
    expect(await screen.findByText('暂无活跃信号')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(2);
  });

  it('主力排名展示 null/零值，键盘下钻、切换排序并从错误重试', async () => {
    vi.mocked(fetchMainFlowRanking).mockRejectedValueOnce(new Error('资金排名不可用'));
    const { user } = renderWithProviders(<DashboardMainFlowRanking />);
    expect(await screen.findByText('资金排名不可用')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));

    const row = await screen.findByRole('link', { name: '打开 平安银行 个股详情' });
    expect(within(row).getByText('+2.50%')).toBeInTheDocument();
    const neutralRow = screen.getByRole('link', { name: '打开 万科A 个股详情' });
    expect(within(neutralRow).getByText('-')).toBeInTheDocument();
    expect(within(neutralRow).getByText('0.00万')).toBeInTheDocument();
    row.focus();
    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/stock/detail?code=000001.SZ');

    await user.click(screen.getByRole('button', { name: '净流出' }));
    await waitFor(() =>
      expect(fetchMainFlowRanking).toHaveBeenLastCalledWith({ order: 'asc', limit: 10 })
    );
    await user.click(screen.getByRole('button', { name: /查看更多/ }));
    expect(push).toHaveBeenCalledWith('/market/money-flow');
  });

  it('主力排名空响应进入空态，旧请求卸载后不覆盖新页面', async () => {
    vi.mocked(fetchMainFlowRanking).mockResolvedValueOnce({ tradeDate: null, data: [] });
    const empty = renderWithProviders(<DashboardMainFlowRanking />);
    expect(await screen.findByText('暂无数据')).toBeInTheDocument();
    empty.unmount();

    let resolve!: (value: Awaited<ReturnType<typeof fetchMainFlowRanking>>) => void;
    vi.mocked(fetchMainFlowRanking).mockImplementationOnce(
      () => new Promise((r) => { resolve = r; })
    );
    const mounted = renderWithProviders(<DashboardMainFlowRanking />);
    mounted.unmount();
    await act(async () => resolve({ tradeDate: '20260812', data: [] }));
    expect(screen.queryByText('个股资金 Top 10')).not.toBeInTheDocument();
  });
});
