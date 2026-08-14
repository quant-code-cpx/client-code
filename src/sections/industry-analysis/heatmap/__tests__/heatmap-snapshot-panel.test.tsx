import dayjs from 'dayjs';
import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { fetchHeatmapSnapshotHistory } from 'src/api/heatmap';

import { HeatmapSnapshotPanel } from '../heatmap-snapshot-panel';

const authMock = vi.hoisted(() => ({ role: 'ADMIN' }));

vi.mock('src/auth', () => ({
  useAuth: () => ({ role: authMock.role }),
}));

vi.mock('src/api/heatmap', () => ({
  fetchHeatmapSnapshotHistory: vi.fn(),
  triggerHeatmapSnapshot: vi.fn(),
}));

vi.mock('src/components/date-picker', () => ({
  DatePicker: ({ onChange }: { onChange: (value: dayjs.Dayjs) => void }) => (
    <button type="button" onClick={() => onChange(dayjs('2026-08-12'))}>
      选择目标交易日期
    </button>
  ),
}));

const mockFetchSnapshot = vi.mocked(fetchHeatmapSnapshotHistory);

describe('HeatmapSnapshotPanel', () => {
  it('ADMIN 只能查询快照，不展示聚合触发入口', () => {
    authMock.role = 'ADMIN';
    renderWithProviders(<HeatmapSnapshotPanel />);

    expect(screen.getByRole('button', { name: '查询快照' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '触发快照聚合' })).not.toBeInTheDocument();
  });

  it('SUPER_ADMIN 同时拥有查询和聚合触发入口', () => {
    authMock.role = 'SUPER_ADMIN';
    renderWithProviders(<HeatmapSnapshotPanel />);

    expect(screen.getByRole('button', { name: '查询快照' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '触发快照聚合' })).toBeInTheDocument();
  });

  it('查询结果中的八位交易日统一展示为 YYYY-MM-DD', async () => {
    authMock.role = 'ADMIN';
    mockFetchSnapshot.mockResolvedValueOnce({
      tradeDate: '20260812',
      groupBy: 'industry',
      stockCount: 2,
      isFromSnapshot: true,
      items: [],
    });
    const { user } = renderWithProviders(<HeatmapSnapshotPanel />);

    await user.click(screen.getByRole('button', { name: '选择目标交易日期' }));
    await user.click(screen.getByRole('button', { name: '查询快照' }));

    expect(await screen.findByText('快照预览 — 2026-08-12')).toBeInTheDocument();
    expect(screen.getByText('2026-08-12')).toBeInTheDocument();
    expect(screen.queryByText('20260812')).not.toBeInTheDocument();
  });
});
