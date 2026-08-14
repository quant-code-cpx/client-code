import type { AuthContextValue } from 'src/auth/context';
import type {
  UserRole,
  UserManageItem,
  UserListResult,
  userManageApi as UserManageApi,
} from 'src/api/user-manage';

import { act, screen, within, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  stats: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateRole: vi.fn(),
  updateStatus: vi.fn(),
  resetPassword: vi.fn(),
  delete: vi.fn(),
  restore: vi.fn(),
  getAuditLogs: vi.fn(),
}));

vi.mock('src/api/user-manage', async (importOriginal) => {
  const actual = await importOriginal<{ userManageApi: typeof UserManageApi }>();
  return { ...actual, userManageApi: api };
});

vi.mock('src/components/date-picker', () => ({
  DatePicker: ({ label }: { label: string }) => <input aria-label={label} />,
}));

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { UserManageView } from '../view/user-manage-view';

const EMPTY_RESULT: UserListResult = { items: [], total: 0, page: 1, pageSize: 20 };

beforeEach(() => {
  vi.clearAllMocks();
  api.list.mockResolvedValue(EMPTY_RESULT);
  api.stats.mockResolvedValue({ total: 0, todayNew: 0, active30d: 0, deactivated: 0, locked: 0 });
  api.updateStatus.mockResolvedValue(undefined);
  api.getAuditLogs.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
});

describe('UserManageView 核心行为', () => {
  it('普通用户看到权限不足，且不请求管理 API', async () => {
    renderView({ role: 'USER' });

    expect(screen.getByText('权限不足')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '新增用户' })).not.toBeInTheDocument();
    await waitFor(() => expect(api.list).not.toHaveBeenCalled());
    expect(api.stats).not.toHaveBeenCalled();
  });

  it('按 URL 状态生成准确的列表 Body，并保留加载态直到请求完成', async () => {
    const pending = deferred<UserListResult>();
    api.list.mockReturnValueOnce(pending.promise);

    const { container } = renderView({
      path:
        '/admin/user-manage?page=2&pageSize=50&account=%20alice%20&status=LOCKED&role=USER&includeDeleted=1&createdFrom=2026-08-01&createdTo=2026-08-13&sortBy=account&sortOrder=asc',
    });

    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(1));
    expect(api.list.mock.calls[0][0]).toEqual({
      page: 2,
      pageSize: 50,
      account: 'alice',
      status: undefined,
      role: 'USER',
      lockedOnly: true,
      includeDeleted: true,
      createdFrom: '2026-08-01',
      createdTo: '2026-08-13',
      sortBy: 'account',
      sortOrder: 'asc',
    });
    expect(api.list.mock.calls[0][1]).toBeInstanceOf(AbortSignal);
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(6);
    expect(screen.queryByText('暂无数据')).not.toBeInTheDocument();

    await act(async () => pending.resolve(EMPTY_RESULT));
    expect(await screen.findByText('暂无数据')).toBeInTheDocument();
  });

  it('请求失败显示可重试错误；重试成功后恢复表格数据并清除错误', async () => {
    api.list.mockRejectedValueOnce(new Error('用户列表暂不可用')).mockResolvedValueOnce({
      items: [userRow()],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    const { user } = renderView();

    expect(await screen.findByText('用户列表暂不可用')).toBeInTheDocument();
    expect(screen.getByText('暂无数据')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重试' }));

    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('target_user')).toBeInTheDocument();
    expect(screen.queryByText('用户列表暂不可用')).not.toBeInTheDocument();
  });

  it('点击状态 KPI 更新筛选并以 ACTIVE 重新请求第一页', async () => {
    const { user } = renderView({ path: '/admin/user-manage?page=3' });

    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(1));
    await screen.findByText('30日活跃');
    await user.click(screen.getByRole('button', { name: /30日活跃/ }));

    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
    expect(api.list.mock.calls[1][0]).toMatchObject({ page: 1, status: 'ACTIVE' });
  });

  it('管理员禁用 USER 时提交准确 Body，确认成功后刷新列表', async () => {
    api.list.mockResolvedValue({ items: [userRow()], total: 1, page: 1, pageSize: 20 });

    const { user } = renderView();
    await screen.findByText('target_user');
    await user.click(screen.getByRole('button', { name: '打开 target_user 的操作菜单' }));
    await user.click(screen.getByRole('menuitem', { name: '禁用账号' }));

    const dialog = await screen.findByRole('dialog', { name: '禁用账号' });
    expect(within(dialog).getByText(/确定要禁用账号「target_user」/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '禁用' }));

    await waitFor(() =>
      expect(api.updateStatus).toHaveBeenCalledWith({ id: 2, status: 'DEACTIVATED' })
    );
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('dialog', { name: '禁用账号' })).not.toBeInTheDocument();
  });

  it('核心动作失败保留确认框并展示错误，允许再次确认', async () => {
    api.list.mockResolvedValue({ items: [userRow()], total: 1, page: 1, pageSize: 20 });
    api.updateStatus.mockRejectedValueOnce(new Error('状态更新失败')).mockResolvedValueOnce(undefined);

    const { user } = renderView();
    await screen.findByText('target_user');
    await user.click(screen.getByRole('button', { name: '打开 target_user 的操作菜单' }));
    await user.click(screen.getByRole('menuitem', { name: '禁用账号' }));

    const dialog = await screen.findByRole('dialog', { name: '禁用账号' });
    await user.click(within(dialog).getByRole('button', { name: '禁用' }));
    expect(await within(dialog).findByText('状态更新失败')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: '禁用' }));
    await waitFor(() => expect(api.updateStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '禁用账号' })).not.toBeInTheDocument());
  });
});

function renderView({
  role = 'ADMIN',
  path = '/admin/user-manage',
}: { role?: UserRole; path?: string } = {}) {
  return renderWithProviders(<UserManageView />, {
    initialEntries: [path],
    authContext: authContext(role),
  });
}

function authContext(role: UserRole): AuthContextValue {
  return {
    role,
    isLoading: false,
    isAuthenticated: true,
    userProfile: userRow({ id: 1, account: 'operator', role }),
    signIn: vi.fn(),
    signOut: vi.fn(),
    loadProfile: vi.fn(),
  };
}

function userRow(overrides: Partial<UserManageItem> = {}): UserManageItem {
  return {
    id: 2,
    role: 'USER',
    status: 'ACTIVE',
    account: 'target_user',
    nickname: '目标用户',
    email: null,
    wechat: null,
    backtestQuota: 10,
    watchlistLimit: 20,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}
