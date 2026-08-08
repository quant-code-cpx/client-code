import { act, screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { TushareSyncView } from '../view/tushare-sync-view';

const permission = vi.hoisted(() => ({ isAdmin: true, isSuperAdmin: false }));

vi.mock('src/permission', () => ({
  usePermission: () => ({
    hasMinRole: (role: string) =>
      role === 'ADMIN' ? permission.isAdmin : permission.isSuperAdmin,
  }),
}));

vi.mock('src/contexts/sync-notification-context', () => ({
  useSyncNotification: () => ({ socketStatus: 'connected', reconnect: vi.fn() }),
}));

vi.mock('../sync-status-overview', () => ({
  SyncStatusOverviewPanel: () => <div>状态总览内容</div>,
}));
vi.mock('../sync-plan-tab', () => ({ SyncPlanTab: () => <div>任务调度内容</div> }));
vi.mock('../sync-log-tab', () => ({ SyncLogTab: () => <div>同步日志内容</div> }));
vi.mock('../data-quality-tab', () => ({ DataQualityTab: () => <div>数据质量内容</div> }));
vi.mock('../ops-tab', () => ({ OpsTab: () => <div>运维工具内容</div> }));

describe('TushareSyncView feature gate', () => {
  beforeEach(() => {
    permission.isAdmin = true;
    permission.isSuperAdmin = false;
  });

  it('ADMIN 保留只读总览、四个主 Tab、WS 状态和占位入口', async () => {
    const { user } = renderWithProviders(<TushareSyncView />);

    expect(screen.getByRole('heading', { name: '数据运维' })).toBeInTheDocument();
    expect(screen.getByText('管理员（只读）')).toBeInTheDocument();
    expect(screen.getByText('实时在线')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '告警订阅' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '审计' })).toBeEnabled();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      '任务调度',
      '同步日志',
      '数据质量',
      '运维工具',
    ]);

    await user.click(screen.getByRole('tab', { name: '运维工具' }));
    expect(screen.getByText('运维工具内容')).toBeInTheDocument();
  });

  it('普通用户仍看到权限不足，不能进入工作区', () => {
    permission.isAdmin = false;
    permission.isSuperAdmin = false;
    renderWithProviders(<TushareSyncView />);

    expect(screen.getByText('权限不足')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('主 Tab 支持方向键移动焦点并用 Enter 激活', async () => {
    const { user } = renderWithProviders(<TushareSyncView />);
    const taskTab = screen.getByRole('tab', { name: '任务调度' });

    act(() => taskTab.focus());
    await user.keyboard('{ArrowRight}{Enter}');

    expect(screen.getByRole('tab', { name: '同步日志' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('同步日志内容')).toBeInTheDocument();
  });
});
