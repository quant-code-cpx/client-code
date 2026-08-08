import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

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
  DatePicker: () => <div data-testid="snapshot-date-picker" />,
}));

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
});
