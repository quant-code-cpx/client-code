import type { CalendarEvent } from 'src/api/alert';

import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { SubscribeDialog } from '../subscribe-dialog';

const mocks = vi.hoisted(() => ({
  getWatchlists: vi.fn(),
  createPriceRule: vi.fn(),
}));

vi.mock('src/api/watchlist', () => ({ getWatchlists: mocks.getWatchlists }));
vi.mock('src/api/alert', () => ({ alertApi: { createPriceRule: mocks.createPriceRule } }));

function event(tsCode: string, type: CalendarEvent['type'] = 'DISCLOSURE'): CalendarEvent {
  return {
    id: `${tsCode}-${type}`,
    date: '20260811',
    tsCode,
    stockName: tsCode,
    type,
    title: '测试事件',
    detail: null,
  };
}

describe('事件订阅 Dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getWatchlists.mockResolvedValue([]);
    mocks.createPriceRule.mockResolvedValue({ id: 1 });
  });

  it('CAL-B04: 单事件订阅提交真实 EVENT_* 规则和当日提醒窗口', async () => {
    const onSuccess = vi.fn();
    const { user } = renderWithProviders(
      <SubscribeDialog
        open
        events={[event('000001.SZ', 'SHAREHOLDER')]}
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />
    );

    await user.click(screen.getByRole('button', { name: '确认订阅' }));

    await waitFor(() =>
      expect(mocks.createPriceRule).toHaveBeenCalledWith({
        tsCode: '000001.SZ',
        ruleType: 'EVENT_SHAREHOLDER',
        threshold: 0,
        memo: JSON.stringify({
          source: 'calendar',
          kind: 'event',
          eventDate: '20260811',
        }),
      })
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('CAL-B04: 批量订阅按唯一股票创建 EVENT_ANY 规则', async () => {
    const { user } = renderWithProviders(
      <SubscribeDialog
        open
        events={[event('000001.SZ'), event('000001.SZ', 'IPO'), event('600000.SH')]}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/选中的 2 只股票/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认订阅' }));

    await waitFor(() => expect(mocks.createPriceRule).toHaveBeenCalledTimes(2));
    expect(mocks.createPriceRule).toHaveBeenCalledWith(
      expect.objectContaining({ tsCode: '000001.SZ', ruleType: 'EVENT_ANY', threshold: 0 })
    );
    expect(mocks.createPriceRule).toHaveBeenCalledWith(
      expect.objectContaining({ tsCode: '600000.SH', ruleType: 'EVENT_ANY', threshold: 0 })
    );
  });

  it('订阅失败保留 Dialog、显示错误且不伪造成功', async () => {
    mocks.createPriceRule.mockRejectedValueOnce(new Error('事件订阅后端失败'));
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const { user } = renderWithProviders(
      <SubscribeDialog
        open
        events={[event('000001.SZ')]}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    await user.click(screen.getByRole('button', { name: '确认订阅' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('事件订阅后端失败');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
