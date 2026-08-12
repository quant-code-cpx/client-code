import type { ReactNode } from 'react';
import type {
  TradingSignalItem,
  SignalDiffFromPrev,
  LatestSignalResponse,
  SignalActivationItem,
} from 'src/api/signal';

import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor } from '@testing-library/react';

const { mockGetLatestSignals, mockListSignalActivations } = vi.hoisted(() => ({
  mockGetLatestSignals: vi.fn(),
  mockListSignalActivations: vi.fn(),
}));

vi.mock('src/api/signal', () => ({
  getLatestSignals: mockGetLatestSignals,
  listSignalActivations: mockListSignalActivations,
}));
vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/date-picker', () => ({ DatePicker: () => null }));
vi.mock('src/sections/signal/signal-activation-card', () => ({
  SignalActivationCard: ({
    activation,
    onClick,
  }: {
    activation: SignalActivationItem;
    onClick: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {activation.strategyName}
    </button>
  ),
}));
vi.mock('src/sections/signal/signal-latest-summary', () => ({
  SignalLatestSummary: ({ data }: { data: LatestSignalResponse }) => (
    <div>{`summary:${data.strategyId}:${data.tradeDate}`}</div>
  ),
}));
vi.mock('src/sections/signal/signal-diff-section', () => ({
  SignalDiffSection: ({
    diff,
    fallback,
  }: {
    diff: SignalDiffFromPrev | null;
    fallback: boolean;
  }) => <div>{`diff:${diff?.prevTradeDate ?? 'none'}:${fallback ? 'fallback' : 'server'}`}</div>,
}));
vi.mock('src/sections/signal/signal-empty-state', () => ({ SignalEmptyState: () => null }));
vi.mock('src/sections/signal/signal-detail-panel', () => ({ SignalDetailPanel: () => null }));
vi.mock('src/sections/signal/signal-status-banner', () => ({ SignalStatusBanner: () => null }));

import { SignalLatestView } from '../signal-latest-view';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function activationFixture(strategyId: string, strategyName: string): SignalActivationItem {
  return {
    id: `activation-${strategyId}`,
    strategyId,
    strategyName,
    portfolioId: null,
    isActive: true,
    universe: 'CSI300',
    benchmarkTsCode: '000300.SH',
    lookbackDays: 20,
    alertThreshold: 0.5,
    lastSignalDate: null,
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
  };
}

function tradingSignal(tsCode: string): TradingSignalItem {
  return {
    tsCode,
    stockName: tsCode,
    action: 'BUY',
    targetWeight: 0.1,
    confidence: 0.8,
  };
}

function latest(
  strategyId: string,
  tradeDate: string,
  diffFromPrev?: SignalDiffFromPrev | null
): LatestSignalResponse {
  return {
    strategyId,
    strategyName: strategyId,
    tradeDate,
    generatedAt: `${tradeDate}T16:00:00.000Z`,
    signals: [tradingSignal(`${strategyId}.SZ`)],
    diffFromPrev,
  };
}

function serverDiff(prevTradeDate: string): SignalDiffFromPrev {
  return { prevTradeDate, added: [], removed: [], rebalanced: [] };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListSignalActivations.mockResolvedValue([
    activationFixture('strategy-a', '策略 A'),
    activationFixture('strategy-b', '策略 B'),
  ]);
});

describe('SignalLatestView request coordination', () => {
  it('策略切换后旧 fallback diff 不能结束新请求或串入新策略', async () => {
    const aMain = deferred<LatestSignalResponse[]>();
    const aPrevious = deferred<LatestSignalResponse[]>();
    const bMain = deferred<LatestSignalResponse[]>();
    const bPrevious = deferred<LatestSignalResponse[]>();
    mockGetLatestSignals
      .mockReturnValueOnce(aMain.promise)
      .mockReturnValueOnce(aPrevious.promise)
      .mockReturnValueOnce(bMain.promise)
      .mockReturnValueOnce(bPrevious.promise);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignalLatestView />
      </MemoryRouter>
    );

    await waitFor(() => expect(mockGetLatestSignals).toHaveBeenCalledTimes(1));
    await act(async () => {
      aMain.resolve([latest('strategy-a', '20260810', null)]);
      await aMain.promise;
    });
    await waitFor(() => expect(mockGetLatestSignals).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole('button', { name: '策略 B' }));
    await waitFor(() => expect(mockGetLatestSignals).toHaveBeenCalledTimes(3));
    await act(async () => {
      bMain.resolve([latest('strategy-b', '20260811', null)]);
      await bMain.promise;
    });
    await waitFor(() => expect(mockGetLatestSignals).toHaveBeenCalledTimes(4));

    await act(async () => {
      aPrevious.resolve([latest('strategy-a', '20260807', serverDiff('20260806'))]);
      await aPrevious.promise;
    });
    expect(screen.queryByText(/^summary:/)).not.toBeInTheDocument();
    expect(screen.queryByText('diff:20260807:fallback')).not.toBeInTheDocument();

    await act(async () => {
      bPrevious.resolve([latest('strategy-b', '20260808', serverDiff('20260807'))]);
      await bPrevious.promise;
    });
    expect(await screen.findByText('summary:strategy-b:20260811')).toBeInTheDocument();
    expect(screen.getByText('diff:20260808:fallback')).toBeInTheDocument();
  });

  it('日期切换后旧请求失败不能写入 error 或提前结束当前 loading', async () => {
    const oldDate = deferred<LatestSignalResponse[]>();
    const currentDate = deferred<LatestSignalResponse[]>();
    mockGetLatestSignals
      .mockResolvedValueOnce([latest('strategy-a', '20260808', serverDiff('20260807'))])
      .mockReturnValueOnce(oldDate.promise)
      .mockReturnValueOnce(currentDate.promise);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignalLatestView />
      </MemoryRouter>
    );

    expect(await screen.findByText('summary:strategy-a:20260808')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '今日' }));
    await waitFor(() => expect(mockGetLatestSignals).toHaveBeenCalledTimes(2));
    await user.click(screen.getByRole('button', { name: '昨日' }));
    await waitFor(() => expect(mockGetLatestSignals).toHaveBeenCalledTimes(3));

    await act(async () => {
      oldDate.reject(new Error('过期日期失败'));
      await oldDate.promise.catch(() => undefined);
    });
    expect(screen.queryByText('过期日期失败')).not.toBeInTheDocument();
    expect(screen.queryByText(/^summary:/)).not.toBeInTheDocument();

    await act(async () => {
      currentDate.resolve([latest('strategy-a', '20260807', serverDiff('20260806'))]);
      await currentDate.promise;
    });
    expect(await screen.findByText('summary:strategy-a:20260807')).toBeInTheDocument();
  });
});
