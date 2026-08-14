import type { MarketAnomaly, AnomalyListResponse } from 'src/api/alert';

import userEvent from '@testing-library/user-event';
import { MemoryRouter as CoreMemoryRouter } from 'react-router';
import { MemoryRouter as DomMemoryRouter } from 'react-router-dom';
import { act, render, screen, within, waitFor } from '@testing-library/react';

import { ThemeProvider } from '@mui/material/styles';

import { alertApi } from 'src/api/alert';
import { createTheme } from 'src/theme/create-theme';
import { getWatchlists, batchAddStocks } from 'src/api/watchlist';

import { AlertAnomaliesView } from '../../view/alert-anomalies-view';

vi.mock('src/auth', () => ({ useAuth: () => ({ role: 'ADMIN' }) }));
vi.mock('src/auth/context', () => ({ useAuth: () => ({ role: 'ADMIN' }) }));

vi.mock('src/api/alert', () => ({
  alertApi: {
    getAnomalies: vi.fn(),
    getAnomalyDetail: vi.fn(),
    scanAnomalies: vi.fn(),
  },
}));

vi.mock('src/api/watchlist', () => ({
  getWatchlists: vi.fn(),
  batchAddStocks: vi.fn(),
}));

const socket = vi.hoisted(() => ({ on: vi.fn(), off: vi.fn() }));
vi.mock('src/lib/socket', () => ({ getSocket: () => socket }));

vi.mock('src/components/date-picker', () => ({
  DatePicker: ({ label }: { label: string }) => <button type="button">{label}</button>,
}));

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const anomaly: MarketAnomaly = {
  id: 11,
  tradeDate: '20260812',
  tsCode: '000001.SZ',
  stockName: null,
  anomalyType: 'VOLUME_SURGE',
  value: 3.2,
  threshold: 2,
  detail: { vol: 25000, avg20Vol: 10000 },
  scannedAt: '2026-08-12T07:30:00.000Z',
  severity: 'HIGH',
  isNew: true,
  coincidentTypes: ['LARGE_NET_INFLOW'],
};

const normalResponse: AnomalyListResponse = {
  page: 1,
  pageSize: 20,
  total: 1,
  items: [anomaly],
  stats: {
    total: 1,
    byType: [{ type: 'VOLUME_SURGE', count: 1 }],
    newCount: 1,
    multiTypeStockCount: 1,
    watchlistCount: 1,
    totalDeltaVsPrev: -2,
  },
};

const theme = createTheme();

function renderView(initialEntry = '/alert/anomalies') {
  return {
    user: userEvent.setup(),
    ...render(
      <ThemeProvider theme={theme}>
        <CoreMemoryRouter initialEntries={[initialEntry]}>
          <DomMemoryRouter initialEntries={[initialEntry]}>
            <AlertAnomaliesView />
          </DomMemoryRouter>
        </CoreMemoryRouter>
      </ThemeProvider>
    ),
  };
}

describe('AlertAnomaliesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(alertApi.getAnomalies).mockResolvedValue(normalResponse);
    vi.mocked(alertApi.scanAnomalies).mockResolvedValue({
      tradeDate: '20260812',
      volumeSurgeCount: 1,
      limitUpCount: 0,
      largeInflowCount: 0,
      totalNew: 1,
    });
    vi.mocked(alertApi.getAnomalyDetail).mockResolvedValue({
      anomaly,
      ruleDescription: '成交量超过近 20 日均量两倍',
      sourceTables: ['daily'],
      relatedAnomalies: [
        {
          ...anomaly,
          id: 12,
          anomalyType: 'LARGE_NET_INFLOW',
          value: 0.12,
          threshold: 0.08,
        },
      ],
      history: [{ tradeDate: '20260811', anomalyType: 'VOLUME_SURGE', value: 2.5 }],
    });
    vi.mocked(getWatchlists).mockResolvedValue([
      { id: 7, name: '默认组', isDefault: true, _count: { stocks: 2 } },
    ] as Awaited<ReturnType<typeof getWatchlists>>);
    vi.mocked(batchAddStocks).mockResolvedValue({ added: 1, skipped: 0 });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('展示 loading 后的正常统计、null 名称、日期与核心行操作', async () => {
    let resolveList!: (value: AnomalyListResponse) => void;
    vi.mocked(alertApi.getAnomalies).mockImplementationOnce(
      () => new Promise((resolve) => { resolveList = resolve; })
    );
    const { container, user } = renderView();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
    await act(async () => resolveList(normalResponse));

    expect(await screen.findByText('今日总异动')).toBeInTheDocument();
    expect(screen.getByText('较昨日 -2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '000001.SZ' })).toHaveAttribute(
      'href',
      '/stock/detail?code=000001.SZ'
    );
    expect(screen.getByText('--')).toBeInTheDocument();
    expect(screen.getByText('2026-08-12')).toBeInTheDocument();

    const dataRow = screen.getByRole('link', { name: '000001.SZ' }).closest('tr')!;
    await user.click(within(dataRow).getByRole('checkbox'));
    expect(screen.getByText('已选 1 只股票')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '复制代码' }));
    expect(writeTextSpy).toHaveBeenCalledWith('000001.SZ');
    expect(await screen.findByText('已复制 1 个股票代码到剪贴板')).toBeInTheDocument();
  });

  it('请求错误可重试并进入无数据态', async () => {
    vi.mocked(alertApi.getAnomalies)
      .mockRejectedValueOnce(new Error('异动查询失败'))
      .mockResolvedValueOnce({ ...normalResponse, total: 0, items: [], stats: undefined });
    const { user } = renderView();

    expect(await screen.findByText('异动查询失败')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByText('所选交易日暂无异动')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '切到最新交易日' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '立即扫描' }).length).toBeGreaterThan(0);
  });

  it('筛选空态可清空条件并恢复默认 API Body', async () => {
    vi.mocked(alertApi.getAnomalies).mockResolvedValue({
      ...normalResponse,
      total: 0,
      items: [],
      stats: undefined,
    });
    const { user } = renderView('/alert/anomalies?keyword=%E5%B9%B3%E5%AE%89');

    expect(await screen.findByText('当前筛选下没有匹配的异动')).toBeInTheDocument();
    const clearButton = screen
      .getAllByRole('button', { name: '清空筛选' })
      .find((button) => button.textContent === '清空筛选');
    expect(clearButton).toBeDefined();
    await user.click(clearButton!);

    await waitFor(() => {
      expect(alertApi.getAnomalies).toHaveBeenLastCalledWith(
        {
          page: 1,
          pageSize: 20,
          sortBy: 'strength',
          sortOrder: 'desc',
          tradeDate: undefined,
        },
        expect.any(AbortSignal)
      );
    });
  });

  it('打开详情加载完整证据链，并把单股加入默认自选分组', async () => {
    const { user } = renderView();
    await user.click(await screen.findByRole('button', { name: '查看证据链' }));

    expect(alertApi.getAnomalyDetail).toHaveBeenCalledWith(
      { anomalyId: 11 },
      expect.any(AbortSignal)
    );
    expect(await screen.findByText('成交量超过近 20 日均量两倍')).toBeInTheDocument();
    expect(screen.getByText('2.50 万手')).toBeInTheDocument();
    expect(screen.getByText('同股同日共振')).toBeInTheDocument();
    expect(screen.getByText('近期同股异动轨迹')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '加入自选' }));
    expect(await screen.findByText('默认组（默认） · 2 只')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认加入' }));

    expect(batchAddStocks).toHaveBeenCalledWith({
      watchlistId: 7,
      stocks: [{ tsCode: '000001.SZ' }],
    });
    expect(await screen.findByText('成功加入 1 只，跳过 0 只（已存在）')).toBeInTheDocument();
  });

  it('详情端点失败时使用行内字段降级，管理员扫描发送当前交易日', async () => {
    vi.mocked(alertApi.getAnomalyDetail).mockRejectedValueOnce(new Error('detail 未上线'));
    const { user } = renderView('/alert/anomalies?tradeDate=2026-08-12');
    await user.click(await screen.findByRole('button', { name: '查看证据链' }));

    expect(
      await screen.findByText('完整证据链待后端 detail 端点上线，已基于行内字段降级展示。')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭' }));
    await user.click(screen.getByRole('button', { name: '立即扫描' }));

    expect(alertApi.scanAnomalies).toHaveBeenCalledWith({ tradeDate: '20260812' });
    expect(await screen.findByText(/扫描完成，新增 1 条异动/)).toBeInTheDocument();
  });
});
