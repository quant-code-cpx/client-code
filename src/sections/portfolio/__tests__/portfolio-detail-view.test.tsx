import type { ReactNode } from 'react';
import type { PnlToday, PortfolioDetail } from 'src/api/portfolio';

import userEvent from '@testing-library/user-event';
import { Route, Routes, MemoryRouter } from 'react-router-dom';
import { render, screen, within, waitFor } from '@testing-library/react';

import { ThemeProvider } from '@mui/material/styles';

import { createTheme } from 'src/theme/create-theme';

const {
  mockPush,
  mockGetPnlToday,
  mockDeletePortfolio,
  mockUpdatePortfolio,
  mockGetPortfolioDetail,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockGetPnlToday: vi.fn(),
  mockDeletePortfolio: vi.fn(),
  mockUpdatePortfolio: vi.fn(),
  mockGetPortfolioDetail: vi.fn(),
}));

vi.mock('src/api/portfolio', () => ({
  getPnlToday: mockGetPnlToday,
  deletePortfolio: mockDeletePortfolio,
  updatePortfolio: mockUpdatePortfolio,
  getPortfolioDetail: mockGetPortfolioDetail,
}));
vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/sections/report/report-generate-dialog', () => ({
  ReportGenerateDialog: ({
    open,
    defaultParams,
    onGenerated,
  }: {
    open: boolean;
    defaultParams: { portfolioId: string };
    onGenerated: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="生成组合报告">
        {`report:${defaultParams.portfolioId}`}
        <button type="button" onClick={onGenerated}>报告完成</button>
      </div>
    ) : null,
}));

vi.mock('../portfolio-holding-tab', () => ({
  PortfolioHoldingTab: ({ onRefresh }: { onRefresh: () => void }) => (
    <div>
      tab:holdings
      <button type="button" onClick={onRefresh}>刷新全部</button>
    </div>
  ),
}));
vi.mock('../portfolio-pnl-tab', () => ({
  PortfolioPnlTab: () => <div>tab:pnl</div>,
}));
vi.mock('../portfolio-risk-tab', () => ({
  PortfolioRiskTab: () => <div>tab:risk</div>,
}));
vi.mock('../portfolio-risk-rule-tab', () => ({
  PortfolioRiskRuleTab: () => <div>tab:rules</div>,
}));
vi.mock('../portfolio-performance-tab', () => ({
  PortfolioPerformanceTab: () => <div>tab:performance</div>,
}));
vi.mock('../portfolio-trade-log-tab', () => ({
  PortfolioTradeLogTab: () => <div>tab:trade-log</div>,
}));
vi.mock('../portfolio-drift-tab', () => ({
  PortfolioDriftTab: () => <div>tab:drift</div>,
}));

import { PortfolioDetailView } from '../view/portfolio-detail-view';

const theme = createTheme();

const detail: PortfolioDetail = {
  portfolio: {
    id: 'portfolio-1',
    name: '核心组合',
    description: '长期价值',
    initialCash: 1000000,
    createdAt: '2026-01-02T00:00:00.000Z',
    kind: 'LIVE',
    lastUpdated: '2026-08-12T08:00:00.000Z',
  },
  holdings: [
    {
      id: 'holding-1',
      tsCode: '600000.SH',
      stockName: '浦发银行',
      quantity: 1000,
      avgCost: 10,
      currentPrice: null,
      marketValue: null,
      unrealizedPnl: null,
      pnlPct: null,
      weight: null,
      industry: '银行',
    },
  ],
  summary: {
    totalCost: 10000,
    totalMarketValue: 11000,
    totalUnrealizedPnl: 1000,
    totalPnlPct: 0.1,
    cashBalance: 990000,
    todayPnl: 500,
    todayPnlPct: 0.005,
    cumulativeReturn: 0.1,
    isTradingDay: true,
  },
};

const pnlToday: PnlToday = {
  tradeDate: '20260812',
  todayPnl: -200,
  todayPnlPct: -0.002,
  isTradingDay: true,
  byHolding: [],
};

function renderView(path = '/portfolio/portfolio-1') {
  const user = userEvent.setup();
  return {
    user,
    ...render(
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/portfolio/:id" element={<PortfolioDetailView />} />
            <Route path="/portfolio" element={<PortfolioDetailView />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    ),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPortfolioDetail.mockResolvedValue(detail);
  mockGetPnlToday.mockResolvedValue(pnlToday);
  mockUpdatePortfolio.mockResolvedValue({});
  mockDeletePortfolio.mockResolvedValue({ message: 'ok' });
});

describe('PortfolioDetailView', () => {
  it('详情与今日盈亏并行请求，PnL partial 失败不阻断且持仓刷新重拉全局数据', async () => {
    mockGetPnlToday.mockRejectedValue(new Error('pnl unavailable'));
    const { user } = renderView();

    expect(await screen.findByText('核心组合')).toBeInTheDocument();
    expect(mockGetPortfolioDetail).toHaveBeenCalledWith({ portfolioId: 'portfolio-1' });
    expect(mockGetPnlToday).toHaveBeenCalledWith({ portfolioId: 'portfolio-1' });
    expect(screen.getByText('初始资金：¥1,000,000')).toBeInTheDocument();
    expect(screen.getByText('持仓：1 只')).toBeInTheDocument();
    expect(screen.getByText('+¥500')).toBeInTheDocument();
    expect(screen.getByText('tab:holdings')).toBeVisible();

    await user.click(screen.getByRole('button', { name: '刷新全部' }));
    await waitFor(() => expect(mockGetPortfolioDetail).toHaveBeenCalledTimes(2));
    expect(mockGetPnlToday).toHaveBeenCalledTimes(2);
  });

  it('Tab 首次访问后按需挂载，并支持报告入口', async () => {
    const { user } = renderView();
    await screen.findByText('核心组合');

    expect(screen.queryByText('tab:performance')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '业绩归因' }));
    expect(await screen.findByText('tab:performance')).toBeVisible();
    await user.click(screen.getByRole('tab', { name: '漂移检测' }));
    expect(await screen.findByText('tab:drift')).toBeVisible();

    await user.click(screen.getByRole('button', { name: '生成报告' }));
    expect(screen.getByRole('dialog', { name: '生成组合报告' })).toHaveTextContent(
      'report:portfolio-1'
    );
    await user.click(screen.getByRole('button', { name: '报告完成' }));
    expect(screen.queryByRole('dialog', { name: '生成组合报告' })).not.toBeInTheDocument();
  });

  it('编辑和删除提交资源 ID；删除成功返回列表', async () => {
    const { user } = renderView();
    await screen.findByText('核心组合');

    await user.click(screen.getByRole('button', { name: '编辑组合' }));
    const editDialog = screen.getByRole('dialog', { name: '编辑组合' });
    const name = within(editDialog).getByLabelText(/组合名称/);
    await user.clear(name);
    await user.type(name, '核心组合 V2');
    await user.click(within(editDialog).getByRole('button', { name: '保存' }));
    expect(mockUpdatePortfolio).toHaveBeenCalledWith({
      id: 'portfolio-1',
      name: '核心组合 V2',
      description: '长期价值',
    });
    await waitFor(() => expect(mockGetPortfolioDetail).toHaveBeenCalledTimes(2));

    await user.click(await screen.findByRole('button', { name: '删除组合' }));
    const deleteDialog = screen.getByRole('dialog', { name: '确认删除' });
    await user.click(within(deleteDialog).getByRole('button', { name: '确认删除' }));
    expect(mockDeletePortfolio).toHaveBeenCalledWith({ portfolioId: 'portfolio-1' });
    expect(mockPush).toHaveBeenCalledWith('/portfolio');
  });

  it('详情失败可重试恢复；缺少路由 ID 不发请求', async () => {
    mockGetPortfolioDetail.mockRejectedValueOnce(new Error('network'));
    const first = renderView();
    expect(await screen.findByText('加载组合详情失败')).toBeInTheDocument();
    await first.user.click(screen.getByRole('button', { name: '重试' }));
    expect(await screen.findByText('核心组合')).toBeInTheDocument();
    expect(mockGetPortfolioDetail).toHaveBeenCalledTimes(2);
    first.unmount();

    vi.clearAllMocks();
    renderView('/portfolio');
    expect(await screen.findByText('组合不存在')).toBeInTheDocument();
    expect(mockGetPortfolioDetail).not.toHaveBeenCalled();
    expect(mockGetPnlToday).not.toHaveBeenCalled();
  });
});
