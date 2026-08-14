import type { ScreenerFilters } from 'src/api/screener';

import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { ScreenerFilterPanel } from '../screener-filter-panel';

describe('ScreenerFilterPanel MUI slot behavior', () => {
  it('keeps Select names and keyboard removal for selected Autocomplete values', () => {
    const filters: ScreenerFilters = { industries: ['银行'] };
    const onChange = vi.fn();

    renderWithProviders(
      <ScreenerFilterPanel
        filters={filters}
        industries={[{ name: '银行', count: 12 }]}
        areas={[]}
        onChange={onChange}
      />
    );

    expect(screen.getByRole('combobox', { name: '交易所' })).toBeInTheDocument();

    const chip = screen.getByText('银行').closest<HTMLElement>('.MuiChip-root');
    expect(chip).toHaveAttribute('data-item-index', '0');

    fireEvent.focus(chip!);
    fireEvent.keyUp(chip!, { key: 'Delete' });

    expect(onChange).toHaveBeenCalledWith({ industries: undefined });
  });

  it('keeps every business filter group keyboard-discoverable', () => {
    renderWithProviders(
      <ScreenerFilterPanel filters={{}} industries={[]} areas={[]} onChange={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: /概念板块/ }));
    expect(screen.getByRole('combobox', { name: '概念多选' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /估值/ }));
    expect(screen.getByRole('spinbutton', { name: 'PE TTM下限' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /成长/ }));
    expect(screen.getByRole('spinbutton', { name: '营收同比增速下限' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /盈利/ }));
    expect(screen.getByRole('spinbutton', { name: 'ROE下限' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /财务 \/ 现金流/ }));
    expect(screen.getByRole('spinbutton', { name: '资产负债率 ≤' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /资金流向/ }));
    expect(screen.getByRole('spinbutton', { name: '近 5 日主力净流入 ≥' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /行情/ }));
    expect(screen.getByRole('spinbutton', { name: '涨跌幅下限' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /技术信号/ }));
    expect(screen.getByRole('combobox', { name: 'MACD 信号' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /北向资金/ }));
    expect(screen.getByRole('switch', { name: '仅显示北向持仓股' })).toBeInTheDocument();
  });
});
