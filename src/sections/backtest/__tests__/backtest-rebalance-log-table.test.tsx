import type { BacktestRebalanceLogItem } from 'src/api/backtest';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { BacktestRebalanceLogTable } from '../backtest-rebalance-log-table';

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const item: BacktestRebalanceLogItem = {
  signalDate: '20260811',
  executeDate: '20260812',
  targetCount: 10,
  actualBuy: 3,
  actualSell: 2,
  skippedLimitUp: 1,
  skippedSuspend: 0,
  remark: null,
};

describe('BacktestRebalanceLogTable', () => {
  it('格式化紧凑交易日并完整展示调仓语义', () => {
    renderWithProviders(<BacktestRebalanceLogTable items={[item]} loading={false} />);

    expect(screen.getByText('2026-08-11')).toBeInTheDocument();
    expect(screen.getByText('2026-08-12')).toBeInTheDocument();
    expect(screen.queryByText('20260811')).not.toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('仅在非加载空集合时显示明确空态', () => {
    const first = renderWithProviders(<BacktestRebalanceLogTable items={[]} loading />);
    expect(screen.queryByText('暂无调仓日志')).not.toBeInTheDocument();
    first.unmount();

    renderWithProviders(<BacktestRebalanceLogTable items={[]} loading={false} />);
    expect(screen.getByText('暂无调仓日志')).toBeInTheDocument();
  });
});
