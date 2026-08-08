import userEvent from '@testing-library/user-event';
import { useLocation, MemoryRouter } from 'react-router';
import { screen, render, waitFor } from '@testing-library/react';

import Button from '@mui/material/Button';

import { createCalendarDateRange } from '../types';
import { useCalendarState } from '../use-calendar-state';

function CalendarStateHarness() {
  const location = useLocation();
  const { filters, update, reset } = useCalendarState();
  return (
    <>
      <pre data-testid="filters">{JSON.stringify(filters)}</pre>
      <span data-testid="search">{location.search}</span>
      <Button onClick={() => update({ keyword: '银行' })}>改关键词</Button>
      <Button onClick={reset}>重置状态</Button>
    </>
  );
}

describe('事件日历 URL 状态', () => {
  it('有效深链恢复全部既有筛选与视图', () => {
    render(
      <MemoryRouter
        initialEntries={[
          '/alert?start=20260801&end=20260831&scope=PORTFOLIO&pf=portfolio-1&types=IPO,SHAREHOLDER&impact=HIGH,LOW&caps=MID&q=%E9%93%B6%E8%A1%8C&view=table',
        ]}
      >
        <CalendarStateHarness />
      </MemoryRouter>
    );

    expect(JSON.parse(screen.getByTestId('filters').textContent ?? '{}')).toMatchObject({
      startDate: '20260801',
      endDate: '20260831',
      scope: 'PORTFOLIO',
      portfolioId: 'portfolio-1',
      types: ['IPO', 'SHAREHOLDER'],
      impactLevels: ['HIGH', 'LOW'],
      marketCapBuckets: ['MID'],
      keyword: '银行',
      view: 'table',
    });
  });

  it('筛选即时 replace URL；reset 清空参数并恢复 14 日/月历默认', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/alert?start=20260801&end=20260831&view=timeline']}>
        <CalendarStateHarness />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: '改关键词' }));
    expect(screen.getByTestId('search')).toHaveTextContent('q=%E9%93%B6%E8%A1%8C');
    await user.click(screen.getByRole('button', { name: '重置状态' }));

    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
    expect(JSON.parse(screen.getByTestId('filters').textContent ?? '{}')).toMatchObject({
      ...createCalendarDateRange(14),
      scope: 'ALL',
      view: 'grid',
      keyword: '',
    });
  });

  it('非法日期、watchlist ID 和市值桶不会进入筛选请求状态，并自动清理 URL', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          '/alert?start=20260230&end=20261301&scope=WATCHLIST&wl=NaN&caps=UNKNOWN,MID,LARGE',
        ]}
      >
        <CalendarStateHarness />
      </MemoryRouter>
    );

    const filters = JSON.parse(screen.getByTestId('filters').textContent ?? '{}');

    expect(filters).toMatchObject({
      ...createCalendarDateRange(14),
      scope: 'WATCHLIST',
      marketCapBuckets: ['MID'],
    });
    expect(filters.watchlistId).toBeUndefined();

    await waitFor(() => {
      expect(screen.getByTestId('search')).toHaveTextContent('scope=WATCHLIST');
      expect(screen.getByTestId('search')).toHaveTextContent('caps=MID');
      expect(screen.getByTestId('search')).not.toHaveTextContent('20260230');
      expect(screen.getByTestId('search')).not.toHaveTextContent('20261301');
      expect(screen.getByTestId('search')).not.toHaveTextContent('wl=NaN');
    });
  });
});
