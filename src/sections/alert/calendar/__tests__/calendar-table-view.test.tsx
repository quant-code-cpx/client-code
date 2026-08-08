import type { CalendarEvent } from 'src/api/alert';

import { act, screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { CalendarTableView } from '../calendar-table-view';

const event: CalendarEvent = {
  id: 'event-1',
  date: '20260808',
  tsCode: '000001.SZ',
  stockName: '平安银行',
  type: 'DISCLOSURE',
  title: '半年报披露',
  detail: null,
};

describe('事件日历表格可访问性', () => {
  it('行与选择控件都有可读名称，键盘可打开事件详情', async () => {
    const onSelectEvent = vi.fn();
    const { user } = renderWithProviders(
      <CalendarTableView
        events={[event]}
        onSelectEvent={onSelectEvent}
        onBatchSubscribe={vi.fn()}
      />
    );

    expect(screen.getByRole('checkbox', { name: '选择全部事件' })).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: '选择事件 平安银行 半年报披露' })
    ).toBeInTheDocument();

    const row = screen.getByLabelText('查看事件 平安银行 半年报披露');
    act(() => row.focus());
    await user.keyboard('{Enter}');

    expect(onSelectEvent).toHaveBeenCalledWith(event);
  });
});
