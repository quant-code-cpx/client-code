import type {
  SubscriptionHit,
  SubscriptionLog,
  ScreenerSubscription,
  SubscriptionRunStatus,
} from 'src/api/screener-subscription';

import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { ScreenerSubscriptionDetailView } from '../screener-subscription-detail-view';

const routeState = vi.hoisted(() => ({ id: '7' }));
const routerPush = vi.hoisted(() => vi.fn());
const apiMocks = vi.hoisted(() => ({
  runSubscription: vi.fn(),
  pauseSubscription: vi.fn(),
  resumeSubscription: vi.fn(),
  getSubscriptionById: vi.fn(),
  getSubscriptionHits: vi.fn(),
  getSubscriptionLogs: vi.fn(),
  parseRunCooldownSeconds: vi.fn((message: string) => {
    const match = message.match(/(\d+)\s*秒/);
    return match ? Number(match[1]) : null;
  }),
}));
const hookState = vi.hoisted(() => ({
  runStatus: null as SubscriptionRunStatus | null,
  trackRunStatus: vi.fn(),
  refresh: null as (() => void) | null,
}));

vi.mock('react-router-dom', async () => {
  const original = await vi.importActual<Record<string, unknown>>('react-router-dom');
  return { ...original, useParams: () => ({ id: routeState.id }) };
});
vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock('src/api/screener-subscription', () => apiMocks);
vi.mock('../../hooks/use-subscription-run-status', () => ({
  useSubscriptionRunStatus: () => ({
    runStatus: hookState.runStatus,
    trackRunStatus: hookState.trackRunStatus,
  }),
}));
vi.mock('../../hooks/use-screener-subscription-refresh', () => ({
  useScreenerSubscriptionRefresh: (refresh: () => void) => {
    hookState.refresh = refresh;
  },
}));

const activeSubscription: ScreenerSubscription = {
  id: 7,
  name: '质量成长订阅',
  strategyId: 23,
  filters: {},
  sortBy: null,
  sortOrder: null,
  ruleType: 'FACTOR_SCREENING',
  ruleVersion: 1,
  ruleSpec: {
    type: 'FACTOR_SCREENING',
    version: 1,
    universe: {
      type: 'ALL_A',
      excludeSt: true,
      excludeSuspended: true,
      excludeBse: true,
    },
    conditions: [{ factorId: 'roe', operator: 'GTE', value: 15 }],
    sortBy: 'roe',
    sortOrder: 'DESC',
  },
  triggerSpec: {
    mode: 'BOTH',
    notifyOnInitialMatch: false,
    eventWindow: 'CURRENT_TRADE_DATE',
    cooldownTradingDays: 1,
    maxHitsPerNotification: 20,
  },
  ruleFingerprint: 'rule-v1',
  frequency: 'WEEKLY',
  status: 'ACTIVE',
  lastRunAt: '2026-01-01T10:00:00.000Z',
  lastRunResult: {
    tradeDate: '20260812',
    matchCount: 2,
    newEntryCount: 1,
    exitCount: 1,
  },
  lastMatchCodes: ['600519.SH', '000001.SZ'],
  consecutiveFails: 0,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-12T11:00:00.000Z',
};

const log: SubscriptionLog = {
  id: 101,
  tradeDate: '20260812',
  matchCount: 2,
  newEntryCount: 1,
  exitCount: 1,
  newEntryCodes: ['600519.SH'],
  exitCodes: ['000001.SZ'],
  executionMs: 328,
  success: true,
  errorMessage: null,
  createdAt: '2026-08-12T10:30:00.000Z',
};

const hit: SubscriptionHit = {
  id: 1001,
  kind: 'ENTER',
  tradeDate: '20260812',
  createdAt: '2026-08-12T10:30:00.000Z',
  tsCode: '600519.SH',
  metricId: 'roe',
  metricLabel: 'ROE',
  operator: 'GTE',
  previousValue: null,
  currentValue: 18.5,
  compareValue: [15, 30],
  reason: 'ROE 达到阈值',
};

describe('ScreenerSubscriptionDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeState.id = '7';
    hookState.runStatus = null;
    hookState.refresh = null;
    apiMocks.getSubscriptionById.mockResolvedValue(activeSubscription);
    apiMocks.getSubscriptionLogs.mockResolvedValue({ logs: [log], total: 45, page: 1, pageSize: 20 });
    apiMocks.getSubscriptionHits.mockResolvedValue({ hits: [hit], total: 1, page: 1, pageSize: 20 });
    apiMocks.pauseSubscription.mockResolvedValue({ ...activeSubscription, status: 'PAUSED' });
    apiMocks.resumeSubscription.mockResolvedValue({ ...activeSubscription, status: 'ACTIVE' });
    apiMocks.runSubscription.mockResolvedValue({ message: '任务已提交', jobId: 'job-7' });
  });

  it('按路由 ID 加载详情与日志，展示规则快照、日期和证券下钻', async () => {
    renderWithProviders(<ScreenerSubscriptionDetailView />);

    expect(await screen.findByRole('heading', { name: '质量成长订阅' })).toBeInTheDocument();
    expect(apiMocks.getSubscriptionById).toHaveBeenCalledWith(7);
    expect(apiMocks.getSubscriptionLogs).toHaveBeenCalledWith(7, 1, 20);
    expect(screen.getByText('每周')).toBeInTheDocument();
    expect(screen.getByText('策略 #23（按创建时快照运行）')).toBeInTheDocument();
    expect(screen.getByText('因子选股')).toBeInTheDocument();
    expect(screen.getByText('规则版本 1')).toBeInTheDocument();
    expect(screen.getByText('1 条条件')).toBeInTheDocument();
    expect(screen.getByText('进入和退出')).toBeInTheDocument();
    expect(screen.getByText('2026-08-12')).toBeInTheDocument();
    expect(screen.queryByText('20260812')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '600519.SH' })).toHaveAttribute(
      'href',
      '/stock/detail?code=600519.SH'
    );
    expect(screen.getByRole('link', { name: '000001.SZ' })).toHaveAttribute(
      'href',
      '/stock/detail?code=000001.SZ'
    );
  });

  it('命中证据请求绑定订阅与日志，保留 null 和区间阈值语义', async () => {
    const { user } = renderWithProviders(<ScreenerSubscriptionDetailView />);
    await screen.findByText('执行历史');

    await user.click(screen.getByRole('button', { name: '查看触发证据' }));

    await waitFor(() => expect(apiMocks.getSubscriptionHits).toHaveBeenCalledWith(7, 101));
    expect(await screen.findByText('ROE 达到阈值')).toBeInTheDocument();
    expect(screen.getByText('15 ~ 30')).toBeInTheDocument();
    expect(screen.getByText('18.5')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('日志分页使用一基页码，手动执行携带订阅 ID 并跟踪 job', async () => {
    const { user } = renderWithProviders(<ScreenerSubscriptionDetailView />);
    await screen.findByText('执行历史');

    await user.click(screen.getByTitle('Go to next page'));
    await waitFor(() => expect(apiMocks.getSubscriptionLogs).toHaveBeenCalledWith(7, 2, 20));

    await user.click(screen.getByRole('button', { name: '手动执行' }));
    await waitFor(() => expect(apiMocks.runSubscription).toHaveBeenCalledWith(7));
    expect(hookState.trackRunStatus).toHaveBeenCalledWith('job-7');
    expect(await screen.findByText('任务已提交')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /后可再次执行/ })).toBeDisabled();
  });

  it('暂停采用乐观状态并以服务端详情收敛，失败恢复会回滚并提示', async () => {
    apiMocks.getSubscriptionById
      .mockResolvedValueOnce(activeSubscription)
      .mockResolvedValueOnce({ ...activeSubscription, status: 'PAUSED' });
    const first = renderWithProviders(<ScreenerSubscriptionDetailView />);
    const user = first.user;
    await screen.findByRole('button', { name: '暂停' });
    await user.click(screen.getByRole('button', { name: '暂停' }));

    expect(apiMocks.pauseSubscription).toHaveBeenCalledWith(7);
    expect(await screen.findByRole('button', { name: '恢复' })).toBeInTheDocument();
    await waitFor(() => expect(apiMocks.getSubscriptionById).toHaveBeenCalledTimes(2));
    first.unmount();

    const errorSubscription: ScreenerSubscription = {
      ...activeSubscription,
      status: 'ERROR',
      consecutiveFails: 3,
    };
    apiMocks.getSubscriptionById.mockResolvedValue(errorSubscription);
    apiMocks.resumeSubscription.mockRejectedValueOnce(new Error('恢复订阅失败'));
    const second = renderWithProviders(<ScreenerSubscriptionDetailView />);
    await screen.findByText(/连续失败 3 次/);
    await second.user.click(screen.getByRole('button', { name: '恢复' }));

    expect(apiMocks.resumeSubscription).toHaveBeenCalledWith(7);
    expect(await screen.findByText('恢复订阅失败')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '恢复' })).toBeInTheDocument();
  });

  it('详情首屏失败可重试，日志与命中证据失败保持局部错误', async () => {
    apiMocks.getSubscriptionById
      .mockRejectedValueOnce(new Error('详情服务不可用'))
      .mockResolvedValueOnce(activeSubscription);
    apiMocks.getSubscriptionLogs.mockRejectedValue(new Error('日志服务不可用'));
    apiMocks.getSubscriptionHits.mockRejectedValue(new Error('证据服务不可用'));
    const { user } = renderWithProviders(<ScreenerSubscriptionDetailView />);

    expect(await screen.findByRole('alert')).toHaveTextContent('详情服务不可用');
    await user.click(screen.getByRole('button', { name: '重试' }));
    expect(await screen.findByRole('heading', { name: '质量成长订阅' })).toBeInTheDocument();
    expect(screen.getAllByText(/日志服务不可用/).length).toBeGreaterThanOrEqual(1);

    apiMocks.getSubscriptionLogs.mockResolvedValueOnce({ logs: [log], total: 1, page: 1, pageSize: 20 });
    await user.click(screen.getAllByRole('button', { name: '重试' })[0]);
    expect(await screen.findByRole('button', { name: '查看触发证据' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查看触发证据' }));
    expect(await screen.findByText('证据服务不可用')).toBeInTheDocument();
  });

  it('非法 ID 不发请求；终态状态与实时事件只刷新当前订阅', async () => {
    routeState.id = 'invalid';
    const invalid = renderWithProviders(<ScreenerSubscriptionDetailView />);
    expect(screen.getByRole('alert')).toHaveTextContent('订阅 ID 无效');
    expect(apiMocks.getSubscriptionById).not.toHaveBeenCalled();
    invalid.unmount();

    routeState.id = '7';
    hookState.runStatus = {
      jobId: 'job-failed',
      status: 'FAILED',
      errorMessage: '行情源失败',
    };
    renderWithProviders(<ScreenerSubscriptionDetailView />);
    expect(await screen.findByText(/手动执行任务 job-failed：失败 · 行情源失败/)).toBeInTheDocument();
    expect(hookState.refresh).toBeTypeOf('function');
    hookState.refresh?.();
    await waitFor(() => expect(apiMocks.getSubscriptionById).toHaveBeenCalledTimes(2));
    expect(apiMocks.getSubscriptionLogs).toHaveBeenCalledTimes(2);
  });
});
