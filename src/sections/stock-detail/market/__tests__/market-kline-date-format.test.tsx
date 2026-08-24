import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { MarketKlineTable } from '../market-kline-table';
import { MarketKlineLegend } from '../market-kline-legend';

const bar = {
  timestamp: 1,
  tradeDate: '20260812',
  open: 10,
  high: 12,
  low: 9,
  close: 11,
  volume: 100,
  turnover: 1000,
};

describe('Market Kline 日期展示', () => {
  it('图例与行情表不直出八位交易日', () => {
    renderWithProviders(
      <>
        <MarketKlineLegend bar={bar} period="D" />
        <MarketKlineTable tsCode="000001.SZ" period="D" bars={[bar]} />
      </>
    );

    expect(screen.getAllByText('2026-08-12')).toHaveLength(2);
    expect(screen.queryByText('20260812')).not.toBeInTheDocument();
  });

  it('分时图例展示相对昨收的涨跌额和涨跌幅', () => {
    renderWithProviders(
      <MarketKlineLegend bar={{ ...bar, time: '15:30', preClose: 10, close: 10.5 }} period="T" />
    );

    expect(screen.getByText('+0.50')).toBeInTheDocument();
    expect(screen.getByText('+5.00%')).toBeInTheDocument();
  });
});
