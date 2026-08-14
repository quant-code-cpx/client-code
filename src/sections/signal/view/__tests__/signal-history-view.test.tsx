import type { ReactNode } from 'react';
import type {
  SignalActivationItem,
  SignalHistoryResponse,
} from 'src/api/signal';

import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { act, render, screen, within, waitFor } from '@testing-library/react';

import { ThemeProvider } from '@mui/material/styles';

import { createTheme } from 'src/theme/create-theme';

const { mockGetSignalHistory, mockListSignalActivations } = vi.hoisted(() => ({
  mockGetSignalHistory: vi.fn(),
  mockListSignalActivations: vi.fn(),
}));

vi.mock('src/api/signal', () => ({
  getSignalHistory: mockGetSignalHistory,
  listSignalActivations: mockListSignalActivations,
}));
vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/date-picker', () => ({ DatePicker: () => null }));
vi.mock('src/routes/components', () => ({ RouterLink: 'a' }));

import { SignalHistoryView } from '../signal-history-view';

const theme = createTheme();

function renderView(initialEntry = '/strategy/signal/history') {
  const user = userEvent.setup();
  return {
    user,
    ...render(
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <SignalHistoryView />
        </MemoryRouter>
      </ThemeProvider>
    ),
  };
}

const activation: SignalActivationItem = {
  id: 'activation-alpha',
  strategyId: 'strategy-alpha',
  strategyName: 'Alpha 策略',
  portfolioId: null,
  isActive: true,
  universe: 'CSI300',
  benchmarkTsCode: '000300.SH',
  lookbackDays: 20,
  alertThreshold: 0.7,
  lastSignalDate: '20260812',
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-12T08:00:00.000Z',
};

const history: SignalHistoryResponse = {
  strategyId: 'strategy-alpha',
  total: 21,
  page: 1,
  pageSize: 10,
  aggregateStats: {
    totalSignals: 3,
    buyCount: 1,
    sellCount: 1,
    holdCount: 1,
    avgConfidence: 0.735,
    accuracy: { window: 20, rate: 0.625, sampleSize: 8 },
    avgExcessReturn: { window: 20, value: -1.25 },
  },
  groups: [
    {
      tradeDate: '20260812',
      signalCount: 2,
      generatedAt: '2026-08-12T16:00:00.000Z',
      diffFromPrev: { added: 1, removed: 0, weightChanged: 1 },
      signals: [
        {
          tsCode: '600000.SH',
          stockName: '浦发银行',
          action: 'BUY',
          currentWeight: null,
          targetWeight: 0.125,
          confidence: 0.81,
          isFirstOccurrence: false,
          forwardReturn: { d1: 0.01, d5: null, d20: -0.03 },
          excessReturn: { d20: -0.02 },
          reason: [
            { factor: '价值', contribution: 0.12 },
            { factor: '动量', contribution: -0.04 },
          ],
        },
        {
          tsCode: '000001.SZ',
          stockName: '平安银行',
          action: 'HOLD',
          currentWeight: 0.1,
          targetWeight: 0.1,
          confidence: null,
        },
      ],
    },
    {
      tradeDate: '20260811',
      signalCount: 1,
      signals: [
        {
          tsCode: '000002.SZ',
          stockName: '万科A',
          action: 'SELL',
          targetWeight: 0,
          confidence: 0.66,
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockListSignalActivations.mockResolvedValue([activation]);
  mockGetSignalHistory.mockResolvedValue(history);
});

describe('SignalHistoryView', () => {
  it('按 URL 筛选请求完整 Body，格式化交易日并保留 null 语义', async () => {
    const { user } = renderView(
      '/strategy/signal/history?strategyId=strategy-alpha&startDate=20260801&endDate=20260812&actions=BUY,SELL&stockKeyword=%E9%93%B6%E8%A1%8C&confidenceMin=0.2&confidenceMax=0.9&forwardWindow=20&viewMode=position&pageSize=10'
    );

    expect(await screen.findByText('Alpha 策略 · 2026-08-01 → 2026-08-12 · 最新信号 2026-08-12')).toBeInTheDocument();
    await waitFor(() =>
      expect(mockGetSignalHistory).toHaveBeenCalledWith({
        strategyId: 'strategy-alpha',
        startDate: '20260801',
        endDate: '20260812',
        actions: ['BUY', 'SELL'],
        stockKeyword: '银行',
        confidenceMin: 0.2,
        confidenceMax: 0.9,
        forwardWindow: 20,
        viewMode: 'position',
        showHold: false,
        page: 1,
        pageSize: 10,
      })
    );

    expect(screen.getByText('2026-08-12')).toBeInTheDocument();
    expect(screen.queryByText('20260812')).not.toBeInTheDocument();
    expect(screen.getByText('样本不足')).toBeInTheDocument();
    expect(screen.getByText('62.5%')).toBeInTheDocument();
    expect(screen.getByText('-1.3%')).toBeInTheDocument();
    expect(screen.getByText('持续信号')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.queryByText('平安银行')).not.toBeInTheDocument();

    const reasonRow = screen.getByRole('button', { name: '浦发银行 信号触发原因' });
    await user.keyboard('{Tab}');
    act(() => reasonRow.focus());
    await user.keyboard('{Enter}');
    expect(await screen.findByText('价值 +12.0%')).toBeInTheDocument();
    expect(screen.getByText('动量 -4.0%')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '打开' })[0]);
    expect(await screen.findByText('单日信号详情')).toBeInTheDocument();
    expect(screen.getByText('2026-08-12 · 共 2 条')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭' }));
  });

  it('分页写回 URL 后仅以新页参数重查', async () => {
    const { user } = renderView(
      '/strategy/signal/history?strategyId=strategy-alpha&startDate=20260801&endDate=20260812&pageSize=10'
    );

    await screen.findByText('共 21 条 · 第 1 / 3 页');
    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));

    await waitFor(() =>
      expect(mockGetSignalHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({ strategyId: 'strategy-alpha', page: 2, pageSize: 10 })
      )
    );
  });

  it('激活列表失败可重试；无激活策略显示明确引导', async () => {
    mockListSignalActivations
      .mockRejectedValueOnce(new Error('激活列表网络失败'))
      .mockResolvedValueOnce([]);
    const { user } = renderView();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('激活列表网络失败');
    await user.click(within(alert).getByRole('button', { name: '重试' }));

    expect(await screen.findByText('暂无已激活的策略信号')).toBeInTheDocument();
    expect(mockListSignalActivations).toHaveBeenCalledTimes(2);
    expect(mockGetSignalHistory).not.toHaveBeenCalled();
  });

  it('历史接口失败展示原始错误并支持重试为空结果', async () => {
    mockGetSignalHistory.mockRejectedValue(new Error('历史接口超时'));
    const { user } = renderView('/strategy/signal/history?strategyId=strategy-alpha');

    expect(await screen.findByText('历史接口超时')).toBeInTheDocument();
    mockGetSignalHistory.mockResolvedValue({
      ...history,
      total: 0,
      groups: [],
      aggregateStats: null,
    });
    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByText('当前筛选条件下无信号记录')).toBeInTheDocument();
    expect(mockGetSignalHistory.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
