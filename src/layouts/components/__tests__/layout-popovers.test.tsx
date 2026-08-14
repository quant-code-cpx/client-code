import { screen, within } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { ThemePopover } from '../theme-popover';
import { AccountPopover } from '../account-popover';
import { WorkspacesPopover } from '../workspaces-popover';
import { NotificationsPopover } from '../notifications-popover';

const state = vi.hoisted(() => ({
  pathname: '/profile',
  routerPush: vi.fn(),
  signOut: vi.fn(),
  setThemePreset: vi.fn(),
  markAllRead: vi.fn(),
  markNotificationRead: vi.fn(),
  notifications: [] as Array<Record<string, unknown>>,
}));

vi.mock('src/routes/hooks', () => ({
  usePathname: () => state.pathname,
  useRouter: () => ({ push: state.routerPush }),
}));
vi.mock('src/auth', () => ({
  useAuth: () => ({
    userProfile: { nickname: '量化研究员', account: 'quant', email: 'quant@example.com' },
    signOut: state.signOut,
  }),
}));
vi.mock('src/contexts/sync-notification-context', () => ({
  useSyncNotification: () => ({
    notifications: state.notifications,
    markAllRead: state.markAllRead,
    markNotificationRead: state.markNotificationRead,
  }),
}));
vi.mock('src/theme', () => ({
  useThemePreset: () => ({
    currentThemePreset: {
      value: 'classic-blue',
      label: '经典蓝',
      description: '稳健的默认配色',
      swatches: ['#1f6feb', '#58a6ff', '#0d419d', '#ffffff'],
    },
    themePresets: [
      {
        value: 'classic-blue',
        label: '经典蓝',
        description: '稳健的默认配色',
        swatches: ['#1f6feb', '#58a6ff', '#0d419d', '#ffffff'],
      },
      {
        value: 'forest-green',
        label: '森林绿',
        description: '低刺激研究配色',
        swatches: ['#16825d', '#44aa88', '#0b5039', '#ffffff'],
      },
    ],
    setThemePreset: state.setThemePreset,
  }),
}));
vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function notification(
  id: string,
  type: string,
  title: string,
  isUnRead: boolean
): Record<string, unknown> {
  return {
    id,
    type,
    title,
    isUnRead,
    description: `${title}详情`,
    avatarUrl: null,
    postedAt: Date.now() - 60_000,
    payload: {},
  };
}

describe('NotificationsPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.notifications = [
      notification('n1', 'tushare-sync-completed', '同步完成', true),
      notification('n2', 'tushare-sync-failed', '同步失败', true),
      notification('n3', 'screener-subscription-alert', '订阅命中', false),
      notification('n4', 'screener-subscription-failed', '订阅异常', false),
    ];
  });

  it('未读计数与实际列表一致，单条和全部已读操作传递准确 ID', async () => {
    const { user } = renderWithProviders(<NotificationsPopover />);

    expect(screen.getByText('2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '打开通知' }));
    expect(await screen.findByText('You have 2 unread messages')).toBeInTheDocument();
    expect(screen.getByText('同步完成')).toBeInTheDocument();
    expect(screen.getByText('同步失败')).toBeInTheDocument();
    expect(screen.getByText('订阅命中')).toBeInTheDocument();
    expect(screen.getByText('订阅异常')).toBeInTheDocument();

    await user.click(screen.getByText('同步完成'));
    expect(state.markNotificationRead).toHaveBeenCalledWith('n1');
    await user.click(screen.getByRole('button', { name: '全部标记为已读' }));
    expect(state.markAllRead).toHaveBeenCalledOnce();
  });

  it('空通知显示明确空态且不提供无效的全部已读操作', async () => {
    state.notifications = [];
    const { user } = renderWithProviders(<NotificationsPopover />);
    await user.click(screen.getByRole('button', { name: '打开通知' }));

    expect(await screen.findByText('暂无通知')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '全部标记为已读' })).not.toBeInTheDocument();
  });
});

describe('AccountPopover', () => {
  beforeEach(() => vi.clearAllMocks());

  it('展示真实账户信息，标识当前入口并在选择后导航', async () => {
    const { user } = renderWithProviders(
      <AccountPopover
        data={[
          { label: '个人资料', href: '/profile' },
          { label: '账户设置', href: '/settings' },
        ]}
      />
    );

    expect(screen.getByText('量')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '账户菜单' }));
    expect(await screen.findByText('quant@example.com')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '个人资料' })).toHaveClass('Mui-selected');
    await user.click(screen.getByRole('menuitem', { name: '账户设置' }));

    expect(state.routerPush).toHaveBeenCalledWith('/settings');
    await waitForPopoverClose();
  });

  it('退出登录调用认证动作且不会误导航', async () => {
    const { user } = renderWithProviders(<AccountPopover />);
    await user.click(screen.getByRole('button', { name: '账户菜单' }));
    await user.click(await screen.findByRole('button', { name: '退出登录' }));

    expect(state.signOut).toHaveBeenCalledOnce();
    expect(state.routerPush).not.toHaveBeenCalled();
  });
});

describe('ThemePopover', () => {
  it('展示当前预设并只在选择时持久化目标主题', async () => {
    const { user } = renderWithProviders(<ThemePopover />);
    await user.click(screen.getByRole('button', { name: '主题切换按钮' }));

    expect(await screen.findByRole('menuitem', { name: /经典蓝/ })).toHaveClass('Mui-selected');
    expect(screen.getByText('低刺激研究配色')).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: /森林绿/ }));

    expect(state.setThemePreset).toHaveBeenCalledWith('forest-green');
    await waitForPopoverClose();
  });
});

describe('WorkspacesPopover', () => {
  it('默认选择首个工作区，切换后更新名称与计划', async () => {
    const { user } = renderWithProviders(
      <WorkspacesPopover
        data={[
          { id: 'research', name: '研究空间', logo: '/research.svg', plan: 'Pro' },
          { id: 'paper', name: '模拟交易', logo: '/paper.svg', plan: 'Free' },
        ]}
      />
    );

    const trigger = screen.getByRole('button', { name: /研究空间/ });
    expect(within(trigger).getByText('Pro')).toBeInTheDocument();
    await user.click(trigger);
    await user.click(await screen.findByRole('menuitem', { name: /模拟交易/ }));

    const updated = screen.getByRole('button', { name: /模拟交易/ });
    expect(within(updated).getByText('Free')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

async function waitForPopoverClose() {
  await new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}
