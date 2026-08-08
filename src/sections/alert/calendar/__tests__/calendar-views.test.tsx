import type { CalendarEvent } from 'src/api/alert';

import { useState } from 'react';
import { act, screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { CalendarGridView } from '../calendar-grid-view';
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
});
