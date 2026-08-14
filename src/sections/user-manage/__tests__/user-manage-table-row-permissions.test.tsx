import type { AuthContextValue } from 'src/auth/context';
import type { UserRole, UserManageItem } from 'src/api/user-manage';

import { screen } from '@testing-library/react';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';

import { renderWithProviders } from 'src/test/test-utils';

import { UserManageTableRow } from '../user-manage-table-row';

const handlers = {
  onEdit: vi.fn(),
  onSelect: vi.fn(),
  onDelete: vi.fn(),
  onRestore: vi.fn(),
  onUpdateRole: vi.fn(),
  onToggleStatus: vi.fn(),
  onResetPassword: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UserManageTableRow 权限入口', () => {
  it('ADMIN 管理 USER 时不展示后端仅 SUPER_ADMIN 可用的角色调整与恢复入口', async () => {
    const active = renderRow('ADMIN', userRow());
    await active.user.click(screen.getByRole('button', { name: '打开 target_user 的操作菜单' }));

    expect(screen.queryByRole('menuitem', { name: '调整角色' })).not.toBeInTheDocument();
    active.unmount();

    renderRow('ADMIN', userRow({ status: 'DELETED' }));

    expect(screen.getByRole('button', { name: '打开 target_user 的操作菜单' })).toBeDisabled();
    expect(screen.queryByRole('menuitem', { name: '恢复用户' })).not.toBeInTheDocument();
  });

  it('SUPER_ADMIN 管理 USER 时展示角色调整与恢复入口', async () => {
    const active = renderRow('SUPER_ADMIN', userRow());
    await active.user.click(screen.getByRole('button', { name: '打开 target_user 的操作菜单' }));

    expect(screen.getByRole('menuitem', { name: '调整角色' })).toBeInTheDocument();
    active.unmount();

    const deleted = renderRow('SUPER_ADMIN', userRow({ status: 'DELETED' }));
    await deleted.user.click(screen.getByRole('button', { name: '打开 target_user 的操作菜单' }));

    expect(screen.getByRole('menuitem', { name: '恢复用户' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '编辑信息' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '重置密码' })).not.toBeInTheDocument();
  });
});

function renderRow(role: UserRole, row: UserManageItem) {
  return renderWithProviders(
    <Table>
      <TableBody>
        <UserManageTableRow row={row} selected={false} {...handlers} />
      </TableBody>
    </Table>,
    { authContext: authContext(role) }
  );
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
