import type { CalendarEvent } from 'src/api/alert';

import dayjs from 'dayjs';
import { useState } from 'react';
import { act, screen, within } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { CalendarGridView } from '../calendar-grid-view';
import { CalendarStatsRow } from '../calendar-stats-row';
import { CalendarTimelineView } from '../calendar-timeline-view';

const insideEvent: CalendarEvent = {
  id: 'inside',
  date: '20260808',
  tsCode: '000001.SZ',
  stockName: '范围内股票',
  type: 'DISCLOSURE',
  title: '范围内事件',
  detail: null,
};

const outsideEvent: CalendarEvent = {
  ...insideEvent,
  id: 'outside',
  date: '20260901',
  stockName: '范围外股票',
  title: '范围外事件',
};

function ExternalDateHarness() {
  const [startDate, setStartDate] = useState('20260801');
  return (
    <>
      <button type="button" onClick={() => setStartDate('20260901')}>
        切换外部日期
      </button>
      <CalendarGridView
        events={[]}
        startDate={startDate}
        endDate={startDate === '20260801' ? '20260831' : '20260930'}
        onSelectDay={vi.fn()}
        onSelectEvent={vi.fn()}
        onNavigateMonth={vi.fn()}
      />
    </>
  );
}

describe('事件日历三视图回归', () => {
  it('CAL-B05: 月份导航同步写入目标月完整日期范围', async () => {
    const onNavigateMonth = vi.fn();
    const { user } = renderWithProviders(
      <CalendarGridView
        events={[]}
        startDate="20260808"
        endDate="20260821"
        onSelectDay={vi.fn()}
        onSelectEvent={vi.fn()}
        onNavigateMonth={onNavigateMonth}
      />
    );

    await user.click(screen.getByRole('button', { name: '下个月' }));
    expect(onNavigateMonth).toHaveBeenCalledWith('20260901', '20260930');
    expect(screen.getByText('2026年 9月')).toBeInTheDocument();
  });

  it('CAL-B05: 外部 startDate 改变会同步月历 cursor', async () => {
    const { user } = renderWithProviders(<ExternalDateHarness />);

    expect(screen.getByText('2026年 8月')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '切换外部日期' }));
    expect(screen.getByText('2026年 9月')).toBeInTheDocument();
  });

  it('月历不渲染请求日期范围之外的相邻月事件', () => {
    renderWithProviders(
      <CalendarGridView
        events={[insideEvent, outsideEvent]}
        startDate="20260801"
        endDate="20260831"
        onSelectDay={vi.fn()}
        onSelectEvent={vi.fn()}
        onNavigateMonth={vi.fn()}
      />
    );

    expect(screen.getByText(/范围内股票·财报披露/)).toBeInTheDocument();
    expect(screen.queryByText(/范围外股票·财报披露/)).not.toBeInTheDocument();
  });

  it('CAL-B13: 月历日期和事件支持 Enter/Space 键盘触发', async () => {
    const onSelectDay = vi.fn();
    const onSelectEvent = vi.fn();
    const { user } = renderWithProviders(
      <CalendarGridView
        events={[insideEvent]}
        startDate="20260801"
        endDate="20260831"
        onSelectDay={onSelectDay}
        onSelectEvent={onSelectEvent}
        onNavigateMonth={vi.fn()}
      />
    );

    act(() => screen.getByRole('button', { name: /2026-08-08/ }).focus());
    await user.keyboard('{Enter}');
    expect(onSelectDay).toHaveBeenCalledWith('20260808');

    act(() => screen.getByRole('button', { name: '查看 范围内股票 财报披露' }).focus());
    await user.keyboard(' ');
    expect(onSelectEvent).toHaveBeenCalledWith(insideEvent);
  });

  it('CAL-B13: 时间线事件支持键盘触发', async () => {
    const onSelectEvent = vi.fn();
    const { user } = renderWithProviders(
      <CalendarTimelineView events={[insideEvent]} onSelectEvent={onSelectEvent} />
    );

    act(() => screen.getByRole('button', { name: /查看 范围内股票 范围内事件/ }).focus());
    await user.keyboard('{Enter}');
    expect(onSelectEvent).toHaveBeenCalledWith(insideEvent);
  });

  it('月历最多展示前三项、汇总更多数量，事件点击不误触发日期选择', async () => {
    const events: CalendarEvent[] = [
      { ...insideEvent, impactLevel: 'HIGH' },
      { ...insideEvent, id: 'float', type: 'FLOAT', stockName: '解禁股票' },
      { ...insideEvent, id: 'dividend', type: 'DIVIDEND', stockName: '分红股票' },
      { ...insideEvent, id: 'forecast', type: 'FORECAST', stockName: '预告股票' },
    ];
    const onSelectDay = vi.fn();
    const onSelectEvent = vi.fn();
    const { user } = renderWithProviders(
      <CalendarGridView
        events={events}
        startDate="20260801"
        endDate="20260831"
        onSelectDay={onSelectDay}
        onSelectEvent={onSelectEvent}
        onNavigateMonth={vi.fn()}
      />
    );

    expect(screen.getByText('+1 更多')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看 范围内股票 财报披露' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /预告股票/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /查看 解禁股票/ }));
    expect(onSelectEvent).toHaveBeenCalledWith(events[1]);
    expect(onSelectDay).not.toHaveBeenCalled();
  });

  it('时间线按 YYYYMMDD 升序分组并格式化，空列表和代码回退不混淆', async () => {
    const early = { ...insideEvent, date: '20260807', stockName: null, isInWatchlist: true };
    const late = {
      ...insideEvent,
      id: 'late',
      date: '20260809',
      stockName: '较晚股票',
      impactScore: 75,
    };
    const onSelectEvent = vi.fn();
    const { container, user, unmount } = renderWithProviders(
      <CalendarTimelineView events={[late, early]} onSelectEvent={onSelectEvent} />
    );

    expect(container.textContent!.indexOf('2026-08-07')).toBeLessThan(
      container.textContent!.indexOf('2026-08-09')
    );
    expect(screen.queryByText('20260807')).not.toBeInTheDocument();
    expect(screen.getAllByText('000001.SZ').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('影响 75')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /查看 000001.SZ 范围内事件/ }));
    expect(onSelectEvent).toHaveBeenCalledWith(early);
    unmount();

    renderWithProviders(<CalendarTimelineView events={[]} onSelectEvent={vi.fn()} />);
    expect(screen.getByText('所选区间无事件')).toBeInTheDocument();
  });

  it('统计卡独立推导今日/未来七天/高影响/自选数量并回传筛选键', async () => {
    const today = dayjs();
    const events: CalendarEvent[] = [
      {
        ...insideEvent,
        id: 'today',
        date: today.format('YYYYMMDD'),
        impactLevel: 'HIGH',
        isInWatchlist: true,
      },
      { ...insideEvent, id: 'week', date: today.add(6, 'day').format('YYYYMMDD') },
      { ...insideEvent, id: 'outside-week', date: today.add(7, 'day').format('YYYYMMDD') },
    ];
    const loading = renderWithProviders(
      <CalendarStatsRow events={events} loading onCardClick={vi.fn()} />
    );
    expect(screen.getAllByText('—')).toHaveLength(4);
    loading.unmount();

    const onCardClick = vi.fn();
    const { user } = renderWithProviders(
      <CalendarStatsRow events={events} loading={false} onCardClick={onCardClick} />
    );
    const todayCard = screen.getByText('今日事件').closest('button')!;
    const weekCard = screen.getByText('未来一周').closest('button')!;
    const impactCard = screen.getByText('高影响事件').closest('button')!;
    const watchlistCard = screen.getByText('自选股事件').closest('button')!;
    expect(within(todayCard).getByText('1')).toBeInTheDocument();
    expect(within(weekCard).getByText('2')).toBeInTheDocument();
    expect(within(impactCard).getByText('1')).toBeInTheDocument();
    expect(within(watchlistCard).getByText('1')).toBeInTheDocument();

    for (const [card, key] of [
      [todayCard, 'today'],
      [weekCard, 'week'],
      [impactCard, 'high-impact'],
      [watchlistCard, 'watchlist'],
    ] as const) {
      await user.click(card);
      expect(onCardClick).toHaveBeenLastCalledWith(key);
    }
  });
});
