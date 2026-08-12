import type { PropsWithChildren } from 'react';
import type { BacktestPositionItem, BacktestRunDetailResponse } from 'src/api/backtest';

import { vi } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { BacktestMetricsGrid } from '../backtest-metrics-grid';
import { BacktestPositionsTable } from '../backtest-positions-table';

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

const summary: BacktestRunDetailResponse['summary'] = {
  totalReturn: 0.2341,
  annualizedReturn: null,
  benchmarkReturn: null,
  excessReturn: null,
  maxDrawdown: null,
  sharpeRatio: null,
  sortinoRatio: null,
  calmarRatio: null,
  volatility: null,
  alpha: null,
  beta: null,
  informationRatio: null,
  winRate: null,
  turnoverRate: null,
  tradeCount: null,
};

const position: BacktestPositionItem = {
  tsCode: '000001.SZ',
  name: '平安银行',
  quantity: 100,
  costPrice: 10,
  closePrice: 11,
  marketValue: 1100,
  weight: 0.25,
  unrealizedPnl: 100,
  holdingDays: 5,
};

describe('backtest ratio percentage rendering', () => {
  it('renders ratio metrics as percentage values', () => {
    renderWithProviders(<BacktestMetricsGrid summary={summary} />);

    expect(screen.getByText('+23.4%')).toBeInTheDocument();
  });

  it('renders position weights as percentage values', () => {
    renderWithProviders(<BacktestPositionsTable items={[position]} loading={false} />);

    expect(screen.getByText('25%')).toBeInTheDocument();
  });
});
