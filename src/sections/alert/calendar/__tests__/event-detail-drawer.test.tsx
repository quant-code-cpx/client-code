import type { CalendarEvent, CalendarHistoryTrend } from 'src/api/alert';

import { useState } from 'react';
import { act, screen, waitFor } from '@testing-library/react';

import { alertApi } from 'src/api/alert';
import { renderWithProviders } from 'src/test/test-utils';

import { EventDetailDrawer, formatCalendarReturn } from '../event-detail-drawer';

vi.mock('src/api/alert', () => ({
  alertApi: { getCalendarHistoryTrend: vi.fn() },
}));

vi.mock('src/components/iconify', () => ({ Iconify: () => null }));

const event: CalendarEvent = {
  id: 'event-1',
  date: '20260808',
  tsCode: '000001.SZ',
  stockName: '平安银行',
  type: 'DISCLOSURE',
  subType: 'ANNUAL',
  title: '年度报告披露',
  detail: { 报告期: '2025', 备注: null },
  metrics: { 营收同比: '12%', 净利润: 100 },
  impactScore: 88,
  impactLevel: 'HIGH',
  daysToEvent: 3,
  status: 'POSTPONED',
  announcementUrl: 'https://example.test/announcement.pdf',
};

const trend: CalendarHistoryTrend = {
  samples: [
    { eventDate: '20250808', eventTitle: '去年年报', returns: { D1: 0.05 } },
    { eventDate: '20240808', eventTitle: '前年年报', returns: { D1: -0.03 } },
  ],
  average: { D1: 0.05, D3: 0, D5: -0.03, D10: null },
};

function DrawerHarness({ onSubscribe = vi.fn() }: { onSubscribe?: (value: CalendarEvent) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <EventDetailDrawer
      open={open}
      event={event}
      onClose={() => setOpen(false)}
      onSubscribe={onSubscribe}
    />
  );
}

describe('EventDetailDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('按事件契约请求历史趋势，格式化 YYYYMMDD 并展示详情、指标和下钻链接', async () => {
    vi.mocked(alertApi.getCalendarHistoryTrend).mockResolvedValue(trend);
    const onSubscribe = vi.fn();
    const { user } = renderWithProviders(
      <EventDetailDrawer open event={event} onClose={vi.fn()} onSubscribe={onSubscribe} />
    );

    expect(await screen.findByText('年度报告披露')).toBeInTheDocument();
    expect(alertApi.getCalendarHistoryTrend).toHaveBeenCalledWith(
      { tsCode: '000001.SZ', type: 'DISCLOSURE', subType: 'ANNUAL' },
      expect.any(AbortSignal)
    );
    expect(screen.getByText('2026-08-08')).toBeInTheDocument();
    expect(screen.queryByText('20260808')).not.toBeInTheDocument();
    expect(screen.getByText('（距今 3 天）')).toBeInTheDocument();
    expect(screen.getByText('高影响')).toBeInTheDocument();
    expect(screen.getByText('影响力 88')).toBeInTheDocument();
    expect(screen.getByText('已延期')).toBeInTheDocument();
    expect(screen.getByText('报告期')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByText('备注').nextElementSibling).toHaveTextContent('—');
    expect(screen.getByText('营收同比')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /查看个股/ })).toHaveAttribute(
      'href',
      '/stock/detail?code=000001.SZ'
    );
    expect(screen.getByRole('link', { name: '查看公告原文' })).toHaveAttribute(
      'href',
      'https://example.test/announcement.pdf'
    );

    await user.click(screen.getByRole('button', { name: '订阅此类事件' }));
    expect(onSubscribe).toHaveBeenCalledWith(event);
  });

  it('历史收益 null 占位、0 中性无加号、正红负绿', async () => {
    vi.mocked(alertApi.getCalendarHistoryTrend).mockResolvedValue(trend);
    renderWithProviders(
      <EventDetailDrawer open event={event} onClose={vi.fn()} onSubscribe={vi.fn()} />
    );

    expect(await screen.findByText('+5.00%')).toHaveStyle({ color: 'var(--palette-error-main)' });
    expect(screen.getByText('0.00%')).toHaveStyle({ color: 'var(--palette-text-secondary)' });
    expect(screen.getByText('-3.00%')).toHaveStyle({ color: 'var(--palette-success-main)' });
    expect(screen.getByText('D10').nextElementSibling).toHaveTextContent('—');
    expect(screen.queryByText('+0.00%')).not.toBeInTheDocument();
    expect(formatCalendarReturn(null)).toBe('—');
    expect(formatCalendarReturn(0)).toBe('0.00%');
  });

  it('loading、空历史、错误和 AbortError 分别保持独立状态', async () => {
    let resolve!: (value: CalendarHistoryTrend) => void;
    vi.mocked(alertApi.getCalendarHistoryTrend).mockReturnValueOnce(
      new Promise((promiseResolve) => {
        resolve = promiseResolve;
      })
    );
    const pending = renderWithProviders(
      <EventDetailDrawer open event={event} onClose={vi.fn()} onSubscribe={vi.fn()} />
    );
    expect(await screen.findByText('加载中…')).toBeInTheDocument();
    await act(async () => resolve({ samples: [], average: {} }));
    expect(await screen.findByText('暂无历史数据')).toBeInTheDocument();
    pending.unmount();

    vi.mocked(alertApi.getCalendarHistoryTrend).mockRejectedValueOnce('bad response');
    const failed = renderWithProviders(
      <EventDetailDrawer open event={event} onClose={vi.fn()} onSubscribe={vi.fn()} />
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('暂无历史数据');
    failed.unmount();

    vi.mocked(alertApi.getCalendarHistoryTrend).mockRejectedValueOnce(
      new DOMException('request aborted', 'AbortError')
    );
    renderWithProviders(
      <EventDetailDrawer open event={event} onClose={vi.fn()} onSubscribe={vi.fn()} />
    );
    await waitFor(() => expect(screen.queryByText('加载中…')).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('关闭 Drawer 会中止在途历史请求，event 为 null 时不发请求', async () => {
    vi.mocked(alertApi.getCalendarHistoryTrend).mockReturnValue(new Promise(() => {}));
    const { user } = renderWithProviders(<DrawerHarness />);
    await screen.findByText('加载中…');
    const signal = vi.mocked(alertApi.getCalendarHistoryTrend).mock.calls[0]?.[1];

    await user.click(screen.getByRole('button', { name: '关闭' }));
    expect(signal?.aborted).toBe(true);
    await waitFor(() => expect(screen.queryByText('事件详情')).not.toBeInTheDocument());

    renderWithProviders(
      <EventDetailDrawer open event={null} onClose={vi.fn()} onSubscribe={vi.fn()} />
    );
    expect(alertApi.getCalendarHistoryTrend).toHaveBeenCalledTimes(1);
  });
});
