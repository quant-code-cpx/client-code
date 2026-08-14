import type { ReactNode } from 'react';
import type {
  SignalActivationItem,
  SignalHistoryCompareResponse,
} from 'src/api/signal';

import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';

import { ThemeProvider } from '@mui/material/styles';

import { createTheme } from 'src/theme/create-theme';

const { mockCompareSignalHistory, mockListSignalActivations } = vi.hoisted(() => ({
  mockCompareSignalHistory: vi.fn(),
  mockListSignalActivations: vi.fn(),
}));

vi.mock('src/api/signal', () => ({
  compareSignalHistory: mockCompareSignalHistory,
  listSignalActivations: mockListSignalActivations,
}));
vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/date-picker', () => ({ DatePicker: () => null }));
vi.mock('src/routes/components', () => ({ RouterLink: 'a' }));

import { SignalHistoryCompareView } from '../signal-history-compare-view';

const theme = createTheme();

function activation(id: string, active = true): SignalActivationItem {
  return {
    id: `activation-${id}`,
    strategyId: id,
    strategyName: `策略 ${id.toUpperCase()}`,
    portfolioId: null,
    isActive: active,
    universe: 'CSI300',
    benchmarkTsCode: '000300.SH',
    lookbackDays: 20,
    alertThreshold: 0.6,
    lastSignalDate: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

const response: SignalHistoryCompareResponse = {
  items: [
    {
      strategyId: 'alpha',
      strategyName: '策略 ALPHA',
      aggregateStats: {
        totalSignals: 12,
        buyCount: 7,
        sellCount: 3,
        holdCount: 2,
        avgConfidence: 0.8,
        accuracy: { window: 20, rate: 0.75, sampleSize: 12 },
        avgExcessReturn: { window: 20, value: 2.4 },
      },
    },
    {
      strategyId: 'beta',
      strategyName: '策略 BETA',
      aggregateStats: null,
    },
  ],
};

function renderView(entry: string) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[entry]}>
        <SignalHistoryCompareView />
      </MemoryRouter>
    </ThemeProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListSignalActivations.mockResolvedValue([
    activation('alpha'),
    activation('beta'),
    activation('archived', false),
  ]);
  mockCompareSignalHistory.mockResolvedValue(response);
});

describe('SignalHistoryCompareView', () => {
  it('从 URL 恢复三项筛选，用 POST Body 查询并保留待结算空值', async () => {
    renderView(
      '/strategy/signal/history/compare?strategyIds=alpha,beta&startDate=20260701&endDate=20260812&forwardWindow=20'
    );

    expect((await screen.findAllByText('策略 ALPHA')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('策略 BETA').length).toBeGreaterThan(0);
    await waitFor(() =>
      expect(mockCompareSignalHistory).toHaveBeenCalledWith({
        strategyIds: ['alpha', 'beta'],
        startDate: '20260701',
        endDate: '20260812',
        forwardWindow: 20,
      })
    );

    expect(screen.getByText('75.0%')).toBeInTheDocument();
    expect(screen.getByText('+2.4%')).toBeInTheDocument();
    expect(screen.getAllByText('待结算').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: '返回历史' })).toHaveAttribute(
      'href',
      '/strategy/signal/history'
    );
    expect(screen.queryByText('策略 ARCHIVED')).not.toBeInTheDocument();
  });

  it('无 URL 策略时默认选择前三个激活策略并自动查询', async () => {
    mockListSignalActivations.mockResolvedValue([
      activation('alpha'),
      activation('beta'),
      activation('gamma'),
      activation('delta'),
    ]);
    renderView('/strategy/signal/history/compare');

    await waitFor(() =>
      expect(mockCompareSignalHistory).toHaveBeenCalledWith(
        expect.objectContaining({ strategyIds: ['alpha', 'beta', 'gamma'], forwardWindow: 5 })
      )
    );
  });

  it('404 兼容错误显示稳定文案，重新查询可恢复', async () => {
    mockCompareSignalHistory.mockRejectedValue(new Error('Cannot POST /api/signal/history/compare'));
    const user = userEvent.setup();
    renderView(
      '/strategy/signal/history/compare?strategyIds=alpha&startDate=20260701&endDate=20260812'
    );

    expect(await screen.findByText('多策略对比接口暂不可用')).toBeInTheDocument();
    mockCompareSignalHistory.mockResolvedValue(response);
    await user.click(screen.getByRole('button', { name: '查询' }));

    expect((await screen.findAllByText('策略 ALPHA')).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryByText('多策略对比接口暂不可用')).not.toBeInTheDocument());
  });
});
