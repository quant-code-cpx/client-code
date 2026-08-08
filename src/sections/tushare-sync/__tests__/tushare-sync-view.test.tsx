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
  SyncStatusOverviewPanel: ({
    onGoLogs,
    onGoQuality,
    refreshKey = 0,
  }: {
    onGoLogs?: (filters?: {
      task?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    }) => void;
    onGoQuality?: () => void;
    refreshKey?: number;
  }) => (
    <div>
      状态总览内容
      <span>运行概览刷新 {refreshKey}</span>
      <button
        onClick={() =>
          onGoLogs?.({
            task: 'DAILY',
            status: 'FAILED',
            startDate: '2026-08-08',
            endDate: '2026-08-08',
          })
        }
      >
        查看失败日志
      </button>
      <button onClick={onGoQuality}>查看数据缺口</button>
    </div>
  ),
}));
vi.mock('../sync-plan-tab', () => ({
  SyncPlanTab: ({ refreshKey = 0 }: { refreshKey?: number }) => (
    <div>
      任务调度内容
      <span>任务调度刷新 {refreshKey}</span>
    </div>
  ),
}));
vi.mock('../sync-log-tab', () => ({
  SyncLogTab: ({ initialFilters }: { initialFilters?: { task?: string } }) => (
    <div>同步日志内容 {initialFilters?.task ?? ''}</div>
  ),
}));
vi.mock('../data-quality-tab', () => ({
  DataQualityTab: ({ focusPanel }: { focusPanel?: string }) => (
    <div>数据质量内容 {focusPanel === 'tools' ? '数据缺口查询' : ''}</div>
  ),
}));
vi.mock('../ops-tab', () => ({ OpsTab: () => <div>运维工具内容</div> }));

describe('TushareSyncView feature gate', () => {
  beforeEach(() => {
    permission.isAdmin = true;
    permission.isSuperAdmin = false;
    sessionStorage.clear();
  });

  it('ADMIN 默认进入运行概览，保留四个工作 Tab、WS 状态和占位入口', async () => {
    const { user } = renderWithProviders(<TushareSyncView />);

    expect(screen.getByRole('heading', { name: '数据运维' })).toBeInTheDocument();
    expect(screen.getByText('管理员（只读）')).toBeInTheDocument();
    expect(screen.getByText('实时在线')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '告警订阅' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '审计' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '刷新当前工作区' })).toBeEnabled();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      '运行概览',
      '任务调度',
      '同步日志',
      '数据质量',
      '运维工具',
    ]);
    expect(screen.getByRole('tab', { name: '运行概览' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByText('状态总览内容')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '任务调度' }));
    await user.click(screen.getByRole('tab', { name: '同步日志' }));

    expect(screen.getByText('任务调度内容')).toBeInTheDocument();
    expect(screen.getByText('状态总览内容')).toBeInTheDocument();
  });

  it('用户主动切换后会记住本会话的工作区', async () => {
    const firstRender = renderWithProviders(<TushareSyncView />);

    await firstRender.user.click(screen.getByRole('tab', { name: '运维工具' }));
    expect(sessionStorage.getItem('tushare-sync:active-tab:v1')).toBe('ops');
    firstRender.unmount();

    renderWithProviders(<TushareSyncView />);

    expect(screen.getByRole('tab', { name: '运维工具' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('运维工具内容')).toBeInTheDocument();
  });

  it('运行概览可带条件跳转同步日志，并定位数据质量缺口工具', async () => {
    const { user } = renderWithProviders(<TushareSyncView />);

    await user.click(screen.getByRole('button', { name: '查看失败日志' }));

    expect(screen.getByRole('tab', { name: '同步日志' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('同步日志内容 DAILY')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '运行概览' }));
    await user.click(screen.getByRole('button', { name: '查看数据缺口' }));

    expect(screen.getByRole('tab', { name: '数据质量' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('数据质量内容 数据缺口查询')).toBeInTheDocument();
  });

  it('页头刷新仅更新当前工作区', async () => {
    const { user } = renderWithProviders(<TushareSyncView />);

    await user.click(screen.getByRole('button', { name: '刷新当前工作区' }));
    expect(screen.getByText('运行概览刷新 1')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '任务调度' }));
    await user.click(screen.getByRole('button', { name: '刷新当前工作区' }));

    expect(screen.getByText('任务调度刷新 1')).toBeInTheDocument();
    expect(screen.getByText('运行概览刷新 1')).toBeInTheDocument();
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
    const overviewTab = screen.getByRole('tab', { name: '运行概览' });

    act(() => overviewTab.focus());
    await user.keyboard('{ArrowRight}{Enter}');

    expect(screen.getByRole('tab', { name: '任务调度' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('任务调度内容')).toBeInTheDocument();
  });
});
