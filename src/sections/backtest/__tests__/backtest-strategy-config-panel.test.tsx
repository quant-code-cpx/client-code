import { screen, waitFor } from '@testing-library/react';

import { searchStocks } from 'src/api/stock';
import { renderWithProviders } from 'src/test/test-utils';

import { BacktestStrategyConfigPanel } from '../backtest-strategy-config-panel';

import type { BacktestRunForm } from '../types';

// ----------------------------------------------------------------------

vi.mock('src/api/stock', () => ({ searchStocks: vi.fn() }));

const form: BacktestRunForm = {
  name: '',
  startDate: '2020-01-01',
  endDate: '2024-12-31',
  initialCapital: 1_000_000,
  benchmarkTsCode: '000300.SH',
  universe: 'HS300',
  customUniverseTsCodes: [],
  rebalanceFrequency: 'MONTHLY',
  priceMode: 'NEXT_OPEN',
  enableTradeConstraints: false,
  enableT1Restriction: true,
  partialFillEnabled: true,
  commissionRate: 0.0003,
  stampDutyRate: 0.0005,
  minCommission: 5,
  slippageBps: 5,
  maxPositions: 20,
  maxWeightPerStock: 0.1,
  minDaysListed: 60,
  strategyConfig: { tsCode: '', shortWindow: 5, longWindow: 20, allowFlat: false },
};

describe('BacktestStrategyConfigPanel 股票搜索', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('新建单股策略使用 searchStocks，并在选择后保留候选', async () => {
    vi.mocked(searchStocks).mockResolvedValue({
      items: [
        {
          tsCode: '000001.SZ',
          symbol: '000001',
          name: '平安银行',
          market: '主板',
          industry: '银行',
          listStatus: 'L',
        },
        {
          tsCode: '600519.SH',
          symbol: '600519',
          name: '贵州茅台',
          market: '主板',
          industry: '白酒',
          listStatus: 'L',
        },
      ],
      total: 2,
    });

    const { user } = renderWithProviders(
      <BacktestStrategyConfigPanel
        selectedTemplateId="MA_CROSS_SINGLE"
        form={form}
        onChange={vi.fn()}
      />
    );

    await user.type(screen.getByRole('combobox', { name: '股票代码' }), '000001');

    const option = await screen.findByRole('option', { name: '000001.SZ 平安银行' });
    await waitFor(() => {
      expect(searchStocks).toHaveBeenLastCalledWith({ keyword: '000001', limit: 20 });
    });

    const callCountBeforeSelection = vi.mocked(searchStocks).mock.calls.length;
    await user.click(option);

    expect(screen.getByRole('combobox', { name: '股票代码' })).toHaveValue(
      '000001.SZ 平安银行'
    );
    expect(searchStocks).toHaveBeenCalledTimes(callCountBeforeSelection);
    expect(searchStocks).not.toHaveBeenCalledWith({
      keyword: '000001.SZ 平安银行',
      limit: 20,
    });
  });

  it('透传服务端 cnspell 搜索结果，不按展示 label 二次过滤', async () => {
    vi.mocked(searchStocks).mockResolvedValue({
      items: [
        {
          tsCode: '000001.SZ',
          symbol: '000001',
          name: '平安银行',
          market: '主板',
          industry: '银行',
          listStatus: 'L',
        },
      ],
      total: 1,
    });

    const { user } = renderWithProviders(
      <BacktestStrategyConfigPanel
        selectedTemplateId="MA_CROSS_SINGLE"
        form={form}
        onChange={vi.fn()}
      />
    );

    const optionLabel = '000001.SZ 平安银行';
    expect(optionLabel).not.toMatch(/PAYH/i);

    await user.type(screen.getByRole('combobox', { name: '股票代码' }), 'PAYH');

    await waitFor(() => {
      expect(searchStocks).toHaveBeenLastCalledWith({ keyword: 'PAYH', limit: 20 });
    });
    expect(await screen.findByRole('option', { name: optionLabel })).toBeInTheDocument();
  });

  it('单股策略 allowFlat 开关有稳定的 id/name', () => {
    renderWithProviders(
      <BacktestStrategyConfigPanel
        selectedTemplateId="MA_CROSS_SINGLE"
        form={form}
        fieldIdPrefix="comparison-strategy-2"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole('checkbox', { name: '允许空仓（死叉后清空持仓）' })).toHaveAttribute(
      'id',
      'comparison-strategy-2-allow-flat'
    );
    expect(screen.getByRole('checkbox', { name: '允许空仓（死叉后清空持仓）' })).toHaveAttribute(
      'name',
      'comparison-strategy-2-allowFlat'
    );
  });
});
