import type { PortfolioListItem } from 'src/api/portfolio';
import type { BacktestRunListItem } from 'src/api/backtest';

import { useState } from 'react';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { GenerateFormStock } from '../generate/generate-form-stock';
import { GenerateFormBacktest } from '../generate/generate-form-backtest';
import { GenerateFormStrategy } from '../generate/generate-form-strategy';
import { GenerateFormPortfolio } from '../generate/generate-form-portfolio';

const { mockListRuns, mockListPortfolios, mockListStrategies } = vi.hoisted(() => ({
  mockListRuns: vi.fn(),
  mockListPortfolios: vi.fn(),
  mockListStrategies: vi.fn(),
}));

vi.mock('src/api/backtest', () => ({ listRuns: mockListRuns }));
vi.mock('src/api/portfolio', () => ({ listPortfolios: mockListPortfolios }));
vi.mock('src/api/strategy', () => ({ listStrategies: mockListStrategies }));
vi.mock('src/components/stock-search-autocomplete', () => ({
  stockItemFromCode: (tsCode: string) => (tsCode ? { tsCode } : null),
  StockSearchAutocomplete: ({
    value,
    onChange,
  }: {
    value: { tsCode: string } | null;
    onChange: (stock: { tsCode: string } | null) => void;
  }) => (
    <div>
      <span data-testid="stock-value">{value?.tsCode ?? '空'}</span>
      <button type="button" onClick={() => onChange({ tsCode: '600000.SH' })}>
        选择浦发银行
      </button>
      <button type="button" onClick={() => onChange(null)}>
        清空股票
      </button>
    </div>
  ),
}));

const run: BacktestRunListItem = {
  runId: 'run-123456',
  name: '动量回测',
  strategyType: 'MOMENTUM',
  status: 'COMPLETED',
  startDate: '20260102',
  endDate: '20260131',
  benchmarkTsCode: '000300.SH',
  totalReturn: null,
  annualizedReturn: null,
  maxDrawdown: null,
  sharpeRatio: null,
  progress: 100,
  createdAt: '2026-02-01T08:00:00.000Z',
  completedAt: '2026-02-01T08:10:00.000Z',
};

const portfolio: PortfolioListItem = {
  id: 'portfolio-1',
  name: '核心组合',
  description: null,
  initialCash: 1000000,
  holdingCount: 8,
  createdAt: '2026-01-15T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
};

const strategy = {
  id: 'strategy-1',
  userId: 7,
  name: '动量策略',
  description: null,
  strategyType: 'MOMENTUM',
  strategyConfig: {},
  backtestDefaults: null,
  tags: [],
  version: 2,
  isPublic: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
};

function BacktestHarness({ onValidChange }: { onValidChange?: (valid: boolean) => void }) {
  const [value, setValue] = useState({ runId: '' });
  return (
    <>
      <GenerateFormBacktest
        value={value}
        onChange={setValue}
        onValidChange={onValidChange}
      />
      <output data-testid="run-id">{value.runId}</output>
    </>
  );
}

function PortfolioHarness() {
  const [value, setValue] = useState({ portfolioId: '' });
  return (
    <>
      <GenerateFormPortfolio value={value} onChange={setValue} />
      <output data-testid="portfolio-id">{value.portfolioId}</output>
    </>
  );
}

function StrategyHarness() {
  const [value, setValue] = useState({ backtestRunId: '' });
  return (
    <>
      <GenerateFormStrategy value={value} onChange={setValue} />
      <output data-testid="strategy-run-id">{value.backtestRunId}</output>
    </>
  );
}

function StockHarness({ onValidChange }: { onValidChange: (valid: boolean) => void }) {
  const [value, setValue] = useState({ tsCode: '' });
  return (
    <>
      <GenerateFormStock value={value} onChange={setValue} onValidChange={onValidChange} />
      <output data-testid="stock-param">{value.tsCode}</output>
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListRuns.mockResolvedValue({ page: 1, pageSize: 30, total: 1, items: [run] });
  mockListPortfolios.mockResolvedValue([portfolio]);
  mockListStrategies.mockResolvedValue({ strategies: [] });
});

describe('report generate forms', () => {
  it('回测列表失败不伪装空态，手工输入仍可用，重试后恢复为真实 empty', async () => {
    mockListRuns.mockRejectedValueOnce(new Error('回测服务暂不可用')).mockResolvedValueOnce({
      page: 1,
      pageSize: 30,
      total: 0,
      items: [],
    });
    const onValidChange = vi.fn();
    const { user } = renderWithProviders(<BacktestHarness onValidChange={onValidChange} />);

    expect(await screen.findByText('回测服务暂不可用')).toBeInTheDocument();
    expect(mockListRuns).toHaveBeenNthCalledWith(1, { pageSize: 30, keyword: undefined });

    await user.click(screen.getByRole('button', { name: '高级：手动输入 runId →' }));
    await user.type(screen.getByRole('textbox', { name: '回测运行 ID（手动）' }), 'manual-run');
    expect(screen.getByTestId('run-id')).toHaveTextContent('manual-run');
    await waitFor(() => expect(onValidChange).toHaveBeenLastCalledWith(true));

    await user.click(screen.getByRole('button', { name: '重试' }));
    await waitFor(() => expect(screen.queryByText('回测服务暂不可用')).not.toBeInTheDocument());
    expect(mockListRuns).toHaveBeenNthCalledWith(2, { pageSize: 30, keyword: undefined });

    await user.click(screen.getByRole('button', { name: '← 改用下拉选择' }));
    await user.click(screen.getByRole('combobox', { name: '选择回测运行' }));
    expect(await screen.findByText('尚无回测记录')).toBeInTheDocument();
  });

  it('回测搜索传精确 Body，八位交易日期只在展示层格式化', async () => {
    const { user } = renderWithProviders(<BacktestHarness />);
    await waitFor(() => expect(mockListRuns).toHaveBeenCalledWith({ pageSize: 30, keyword: undefined }));
    const combobox = screen.getByRole('combobox', { name: '选择回测运行' });
    await user.click(combobox);

    expect(await screen.findByText(/2026-01-02 ~ 2026-01-31/)).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /\u52a8\u91cf\u56de\u6d4b/ }));
    expect(screen.getByTestId('run-id')).toHaveTextContent('run-123456');
    expect(combobox).toHaveValue('动量回测 · 2026-01-02~2026-01-31 · 123456');

    await user.clear(combobox);
    await user.type(combobox, '动量');
    await waitFor(() =>
      expect(mockListRuns).toHaveBeenCalledWith({ pageSize: 30, keyword: '动量' })
    );
  });

  it('组合失败可重试恢复并选中精确 portfolioId', async () => {
    mockListPortfolios.mockRejectedValueOnce(new Error('组合列表加载失败')).mockResolvedValueOnce([portfolio]);
    const { user } = renderWithProviders(<PortfolioHarness />);

    expect(await screen.findByText('组合列表加载失败')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));
    await waitFor(() => expect(mockListPortfolios).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('组合列表加载失败')).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: '选择组合' }));
    await user.click(await screen.findByRole('option', { name: /核心组合/ }));
    expect(screen.getByTestId('portfolio-id')).toHaveTextContent('portfolio-1');
  });

  it('策略研究的回测选择项也格式化八位日期，但参数仍保留 runId', async () => {
    const { user } = renderWithProviders(<StrategyHarness />);
    await waitFor(() => expect(mockListRuns).toHaveBeenCalledWith({ pageSize: 50 }));

    await user.click(screen.getByRole('combobox', { name: '选择回测运行' }));
    expect(await screen.findByText(/2026-01-02 ~ 2026-01-31/)).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /动量回测/ }));
    expect(screen.getByTestId('strategy-run-id')).toHaveTextContent('run-123456');
  });

  it('策略研究单路失败保留其他成功选项，重试后恢复全部资源', async () => {
    mockListStrategies
      .mockRejectedValueOnce(new Error('策略服务失败'))
      .mockResolvedValueOnce({ strategies: [strategy] });
    mockListPortfolios
      .mockRejectedValueOnce(new Error('组合服务失败'))
      .mockResolvedValueOnce([portfolio]);
    const { user } = renderWithProviders(<StrategyHarness />);

    expect(await screen.findByText('策略、组合加载失败')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: '选择回测运行' }));
    expect(await screen.findByRole('option', { name: /动量回测/ })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: '重试' }));
    await waitFor(() => expect(screen.queryByText('策略、组合加载失败')).not.toBeInTheDocument());
    expect(mockListStrategies).toHaveBeenCalledTimes(2);
    expect(mockListRuns).toHaveBeenCalledTimes(2);
    expect(mockListPortfolios).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('combobox', { name: '选择策略（可选）' }));
    expect(await screen.findByRole('option', { name: /动量策略/ })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('combobox', { name: '选择参考组合（可选）' }));
    expect(await screen.findByRole('option', { name: /核心组合/ })).toBeInTheDocument();
  });

  it('股票选择/清空分别产生 tsCode 和空参数，同步校验状态', async () => {
    const onValidChange = vi.fn();
    const { user } = renderWithProviders(<StockHarness onValidChange={onValidChange} />);

    expect(screen.getByTestId('stock-value')).toHaveTextContent('空');
    await waitFor(() => expect(onValidChange).toHaveBeenLastCalledWith(false));
    await user.click(screen.getByRole('button', { name: '选择浦发银行' }));
    expect(screen.getByTestId('stock-param')).toHaveTextContent('600000.SH');
    await waitFor(() => expect(onValidChange).toHaveBeenLastCalledWith(true));

    await user.click(screen.getByRole('button', { name: '清空股票' }));
    expect(screen.getByTestId('stock-param')).toBeEmptyDOMElement();
    await waitFor(() => expect(onValidChange).toHaveBeenLastCalledWith(false));
  });
});
