import type { LatestSignalResponse } from 'src/api/signal';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { SignalLatestSummary } from '../signal-latest-summary';

const data: LatestSignalResponse = {
  strategyId: 'alpha',
  strategyName: 'Alpha 策略',
  tradeDate: '20260812',
  generatedAt: '2026-08-12T08:30:00.000Z',
  portfolioId: 'portfolio-1',
  portfolioName: '核心组合',
  portfolioMarketValue: 1234567,
  benchmarkTsCode: '000300.SH',
  benchmarkName: '沪深300',
  signals: [
    {
      tsCode: '600000.SH',
      stockName: '浦发银行',
      action: 'BUY',
      targetWeight: 0.2,
      confidence: 0.8,
    },
    {
      tsCode: '000001.SZ',
      stockName: '平安银行',
      action: 'SELL',
      targetWeight: 0,
      confidence: 0.7,
    },
    {
      tsCode: '000002.SZ',
      stockName: '万科A',
      action: 'HOLD',
      targetWeight: 0.1,
      confidence: null,
    },
  ],
};

describe('SignalLatestSummary', () => {
  it('汇总 BUY/SELL/HOLD，格式化 YYYYMMDD、组合市值与基准', () => {
    renderWithProviders(<SignalLatestSummary data={data} />);

    expect(screen.getByText('2026-08-12')).toBeInTheDocument();
    expect(screen.queryByText('20260812')).not.toBeInTheDocument();
    expect(screen.getByText(/核心组合 · 市值/)).toHaveTextContent('¥1,234,567');
    expect(screen.getByText('沪深300')).toBeInTheDocument();
    expect(screen.getByText('总信号').nextElementSibling).toHaveTextContent('3');
  });

  it('鼠标与键盘均可下钻操作类别，总计不可点击', async () => {
    const onJump = vi.fn();
    const { user } = renderWithProviders(
      <SignalLatestSummary data={{ ...data, portfolioName: null, benchmarkName: null }} onJumpToAction={onJump} />
    );

    const buy = screen.getByRole('button', { name: '查看买入信号：1' });
    await user.click(buy);
    expect(onJump).toHaveBeenLastCalledWith('BUY');

    const sell = screen.getByRole('button', { name: '查看卖出信号：1' });
    sell.focus();
    await user.keyboard(' ');
    expect(onJump).toHaveBeenLastCalledWith('SELL');

    const hold = screen.getByRole('button', { name: '查看持有信号：1' });
    hold.focus();
    await user.keyboard('{Enter}');
    expect(onJump).toHaveBeenLastCalledWith('HOLD');
    expect(onJump).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('button', { name: /总信号/ })).not.toBeInTheDocument();
    expect(screen.getByText('未关联')).toBeInTheDocument();
    expect(screen.getByText('000300.SH')).toBeInTheDocument();
  });
});
