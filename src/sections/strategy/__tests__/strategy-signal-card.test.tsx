import type { ReactNode } from 'react';
import type { PortfolioListItem } from 'src/api/portfolio';
import type { LatestSignalResponse, SignalActivationItem } from 'src/api/signal';

import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const {
  mockPush,
  mockListPortfolios,
  mockActivateSignal,
  mockDeactivateSignal,
  mockGetLatestSignals,
  mockListSignalActivations,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockListPortfolios: vi.fn(),
  mockActivateSignal: vi.fn(),
  mockDeactivateSignal: vi.fn(),
  mockGetLatestSignals: vi.fn(),
  mockListSignalActivations: vi.fn(),
}));

vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('src/api/portfolio', () => ({ listPortfolios: mockListPortfolios }));
vi.mock('src/api/signal', () => ({
  activateSignal: mockActivateSignal,
  deactivateSignal: mockDeactivateSignal,
  getLatestSignals: mockGetLatestSignals,
  listSignalActivations: mockListSignalActivations,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/label', () => ({
  Label: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

import { StrategySignalCard } from '../strategy-signal-card';

const active: SignalActivationItem = {
  id: 'activation-1',
  strategyId: 'strategy-alpha',
  strategyName: 'Alpha 策略',
  portfolioId: 'portfolio-1',
  isActive: true,
  universe: 'HS300',
  benchmarkTsCode: '000300.SH',
  lookbackDays: 30,
  alertThreshold: 0.35,
  lastSignalDate: '20260812',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-12T00:00:00.000Z',
};

const portfolio: PortfolioListItem = {
  id: 'portfolio-1',
  name: '核心组合',
  description: null,
  initialCash: 1000000,
  holdingCount: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-08-12T00:00:00.000Z',
};

const latest: LatestSignalResponse = {
  strategyId: 'strategy-alpha',
  strategyName: 'Alpha 策略',
  tradeDate: '20260812',
  generatedAt: '2026-08-12T16:00:00.000Z',
  signals: [
    { tsCode: '600000.SH', stockName: '浦发银行', action: 'BUY', targetWeight: 0.2, confidence: 0.8 },
    { tsCode: '000001.SZ', stockName: '平安银行', action: 'SELL', targetWeight: 0, confidence: 0.7 },
    { tsCode: '000002.SZ', stockName: '万科A', action: 'HOLD', targetWeight: 0.1, confidence: null },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockListPortfolios.mockResolvedValue([portfolio]);
  mockGetLatestSignals.mockResolvedValue([latest]);
  mockActivateSignal.mockResolvedValue(active);
  mockDeactivateSignal.mockResolvedValue({ ...active, isActive: false });
});

describe('StrategySignalCard', () => {
  it('激活状态展示最新摘要、格式化日期和组合名称，并可下钻', async () => {
    mockListSignalActivations.mockResolvedValue([active]);
    const { user } = renderWithProviders(
      <StrategySignalCard strategyId="strategy-alpha" strategyName="Alpha 策略" />
    );

    expect(await screen.findByText('已激活')).toBeInTheDocument();
    expect(await screen.findByText('最新信号日期：2026-08-12')).toBeInTheDocument();
    expect(screen.getByText('买入 1')).toBeInTheDocument();
    expect(screen.getByText('卖出 1')).toBeInTheDocument();
    expect(screen.getByText('持有 1')).toBeInTheDocument();
    expect(screen.getByText('核心组合')).toBeInTheDocument();
    expect(screen.queryByText('20260812')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '查看最新信号' }));
    expect(mockPush).toHaveBeenCalledWith('/signal?strategyId=strategy-alpha');
    expect(mockGetLatestSignals).toHaveBeenCalledWith({ strategyId: 'strategy-alpha' });
  });

  it('编辑后保存完整配置 Body，随后停用提交策略 ID', async () => {
    mockListSignalActivations.mockResolvedValue([active]);
    const { user } = renderWithProviders(
      <StrategySignalCard strategyId="strategy-alpha" strategyName="Alpha 策略" />
    );
    await screen.findByText('已激活');

    await user.click(screen.getByRole('button', { name: '编辑' }));
    const benchmark = screen.getByLabelText('基准指数');
    await user.clear(benchmark);
    await user.type(benchmark, '000905.SH');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(mockActivateSignal).toHaveBeenCalledWith({
      strategyId: 'strategy-alpha',
      portfolioId: 'portfolio-1',
      universe: 'HS300',
      benchmarkTsCode: '000905.SH',
      alertThreshold: 0.35,
    });
    await waitFor(() => expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: '停用' }));
    expect(mockDeactivateSignal).toHaveBeenCalledWith({ strategyId: 'strategy-alpha' });
    expect(await screen.findByText('当前策略未激活每日信号生成')).toBeInTheDocument();
  });

  it('兼容历史 ZZ500 存量值，编辑保存时迁移为后端回测契约 CSI500', async () => {
    mockListSignalActivations.mockResolvedValue([{ ...active, universe: 'ZZ500' }]);
    const { user } = renderWithProviders(
      <StrategySignalCard strategyId="strategy-alpha" strategyName="Alpha 策略" />
    );
    await screen.findByText('已激活');

    await user.click(screen.getByRole('button', { name: '编辑' }));
    expect(screen.getByLabelText('信号宇宙')).toHaveTextContent('CSI500（中证 500）');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(mockActivateSignal).toHaveBeenCalledWith(
      expect.objectContaining({ strategyId: 'strategy-alpha', universe: 'CSI500' })
    );
  });

  it('未激活时省略空 portfolioId，使用明确默认配置激活', async () => {
    mockListSignalActivations.mockResolvedValue([]);
    mockActivateSignal.mockResolvedValue({ ...active, portfolioId: null });
    const { user } = renderWithProviders(
      <StrategySignalCard strategyId="strategy-alpha" strategyName="Alpha 策略" />
    );

    expect(await screen.findByText('当前策略未激活每日信号生成')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '激活信号生成' }));
    expect(mockActivateSignal).toHaveBeenCalledWith({
      strategyId: 'strategy-alpha',
      universe: 'ALL_A',
      benchmarkTsCode: '000300.SH',
      alertThreshold: 0.3,
    });
  });

  it('激活配置失败不伪装成未激活，重试后恢复真实状态', async () => {
    mockListSignalActivations
      .mockRejectedValueOnce(new Error('信号配置服务超时'))
      .mockResolvedValueOnce([active]);
    const { user } = renderWithProviders(
      <StrategySignalCard strategyId="strategy-alpha" strategyName="Alpha 策略" />
    );

    expect(await screen.findByText('信号配置服务超时')).toBeInTheDocument();
    expect(screen.queryByText('当前策略未激活每日信号生成')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));
    expect(await screen.findByText('已激活')).toBeInTheDocument();
    expect(mockListSignalActivations).toHaveBeenCalledTimes(2);
  });

  it('组合列表失败显示可重试错误，不把失败伪装成空列表', async () => {
    mockListSignalActivations.mockResolvedValue([]);
    mockListPortfolios.mockRejectedValueOnce(new Error('组合服务不可用')).mockResolvedValueOnce([
      portfolio,
    ]);
    const { user } = renderWithProviders(
      <StrategySignalCard strategyId="strategy-alpha" strategyName="Alpha 策略" />
    );

    expect(await screen.findByText('组合服务不可用')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));
    await waitFor(() => expect(mockListPortfolios).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('组合服务不可用')).not.toBeInTheDocument();
  });
});
