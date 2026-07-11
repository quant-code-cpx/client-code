import { apiClient } from '../client';
import { listSchedules } from '../report';

import type { ReportSchedule } from '../report';

vi.mock('../client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

const schedule: ReportSchedule = {
  id: 'schedule-1',
  userId: 1,
  type: 'BACKTEST',
  title: '每日回测报告',
  params: {},
  format: 'PDF',
  frequency: 'DAILY',
  cronExpression: '0 18 * * 1-5',
  enabled: true,
  lastRunAt: null,
  nextRunAt: null,
  createdAt: '2026-07-11T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listSchedules', () => {
  it('extracts items from the backend list response', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ items: [schedule], total: 1 });

    await expect(listSchedules()).resolves.toEqual([schedule]);
    expect(apiClient.post).toHaveBeenCalledWith('/api/report/schedules/list', {});
  });

  it('keeps compatibility with a legacy array response', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce([schedule]);

    await expect(listSchedules()).resolves.toEqual([schedule]);
  });

  it('rejects an invalid response instead of passing it to the view', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ schedules: [] });

    await expect(listSchedules()).rejects.toThrow('定时报告列表响应格式错误');
  });
});
