import type { UserProfile } from 'src/api/user-manage';

import { screen, waitFor } from '@testing-library/react';

import { userManageApi } from 'src/api/user-manage';
import { renderWithProviders } from 'src/test/test-utils';

import { ProfileView } from '../view/profile-view';

const auth = vi.hoisted(() => ({
  userProfile: null as UserProfile | null,
  loadProfile: vi.fn(),
}));

vi.mock('src/auth', () => ({
  useAuth: () => auth,
}));

vi.mock('src/api/user-manage', () => ({
  ROLE_LABEL: {
    SUPER_ADMIN: '超级管理员',
    ADMIN: '管理员',
    USER: '普通用户',
  },
  STATUS_LABEL: {
    ACTIVE: '正常',
    DEACTIVATED: '已禁用',
    DELETED: '已删除',
  },
  userManageApi: {
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}));

const profile: UserProfile = {
  id: 7,
  account: 'researcher',
  nickname: '量化研究员',
  email: 'quant@example.com',
  wechat: 'quant-wechat',
  role: 'ADMIN',
  status: 'ACTIVE',
  backtestQuota: 12,
  watchlistLimit: 88,
  createdAt: '2026-08-01T08:30:00.000Z',
};

describe('ProfileView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.userProfile = profile;
    auth.loadProfile.mockResolvedValue(undefined);
    vi.mocked(userManageApi.updateProfile).mockResolvedValue(profile);
    vi.mocked(userManageApi.changePassword).mockResolvedValue(undefined);
  });

  it('正常展示账号资料、角色状态与配额', () => {
    renderWithProviders(<ProfileView />);

    expect(screen.getByRole('heading', { name: '量化研究员' })).toBeInTheDocument();
    expect(screen.getByText('researcher')).toBeInTheDocument();
    expect(screen.getByText('管理员')).toBeInTheDocument();
    expect(screen.getByText('正常')).toBeInTheDocument();
    expect(screen.getByText('quant@example.com')).toBeInTheDocument();
    expect(screen.getByText('quant-wechat')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
  });

  it('资料未加载时安全展示空值状态', () => {
    auth.userProfile = null;
    renderWithProviders(<ProfileView />);

    expect(screen.getByRole('heading', { name: '—' })).toBeInTheDocument();
    expect(screen.getAllByText('未设置')).toHaveLength(2);
    expect(screen.getAllByText('0')).toHaveLength(2);
  });

  it('修改资料预填当前值，提交准确 Body、刷新资料并展示成功态', async () => {
    const { user } = renderWithProviders(<ProfileView />);
    await user.click(screen.getByRole('button', { name: '修改资料' }));

    expect(screen.getByRole('textbox', { name: '昵称' })).toHaveValue('量化研究员');
    expect(screen.getByRole('textbox', { name: '邮箱' })).toHaveValue('quant@example.com');
    expect(screen.getByRole('textbox', { name: '微信号' })).toHaveValue('quant-wechat');

    await user.clear(screen.getByRole('textbox', { name: '昵称' }));
    await user.type(screen.getByRole('textbox', { name: '昵称' }), '新昵称');
    await user.clear(screen.getByRole('textbox', { name: '邮箱' }));
    await user.type(screen.getByRole('textbox', { name: '邮箱' }), 'new@example.com');
    await user.clear(screen.getByRole('textbox', { name: '微信号' }));
    await user.type(screen.getByRole('textbox', { name: '微信号' }), 'new-wechat');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(userManageApi.updateProfile).toHaveBeenCalledWith({
      nickname: '新昵称',
      email: 'new@example.com',
      wechat: 'new-wechat',
    });
    await waitFor(() => expect(auth.loadProfile).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('资料已更新')).toBeInTheDocument();
  });

  it('修改资料失败显示服务端错误，且不刷新资料', async () => {
    vi.mocked(userManageApi.updateProfile).mockRejectedValueOnce(new Error('邮箱已被占用'));
    const { user } = renderWithProviders(<ProfileView />);

    await user.click(screen.getByRole('button', { name: '修改资料' }));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByText('邮箱已被占用')).toBeInTheDocument();
    expect(auth.loadProfile).not.toHaveBeenCalled();
  });

  it('修改资料提交期间锁住保存和取消，避免重复请求', async () => {
    let resolveUpdate!: (value: UserProfile) => void;
    vi.mocked(userManageApi.updateProfile).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        })
    );
    const { user } = renderWithProviders(<ProfileView />);

    await user.click(screen.getByRole('button', { name: '修改资料' }));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled();
    expect(userManageApi.updateProfile).toHaveBeenCalledTimes(1);

    resolveUpdate(profile);
    await waitFor(() => expect(auth.loadProfile).toHaveBeenCalledTimes(1));
  });

  it.each([
    ['', 'newPassword', 'newPassword', '请输入旧密码'],
    ['oldPassword', 'short', 'short', '新密码至少 8 位'],
    ['oldPassword', 'newPassword', 'otherPassword', '两次输入的新密码不一致'],
  ])('密码表单拦截无效输入 %#', async (oldPassword, newPassword, confirmation, message) => {
    const { user } = renderWithProviders(<ProfileView />);
    await user.click(screen.getByRole('button', { name: '修改密码' }));

    if (oldPassword) await user.type(screen.getByLabelText('旧密码'), oldPassword);
    if (newPassword) await user.type(screen.getByLabelText('新密码'), newPassword);
    if (confirmation) await user.type(screen.getByLabelText('确认密码'), confirmation);
    await user.click(screen.getByRole('button', { name: '确认修改' }));

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(userManageApi.changePassword).not.toHaveBeenCalled();
  });

  it('修改密码提交准确 Body、可切换可见性并展示成功态', async () => {
    const { user } = renderWithProviders(<ProfileView />);
    await user.click(screen.getByRole('button', { name: '修改密码' }));

    const oldPassword = screen.getByLabelText('旧密码');
    expect(oldPassword).toHaveAttribute('type', 'password');
    await user.click(screen.getAllByRole('button', { name: '显示密码' })[0]);
    expect(oldPassword).toHaveAttribute('type', 'text');

    await user.type(oldPassword, 'oldPassword');
    await user.type(screen.getByLabelText('新密码'), 'newPassword');
    await user.type(screen.getByLabelText('确认密码'), 'newPassword');
    await user.click(screen.getByRole('button', { name: '确认修改' }));

    expect(userManageApi.changePassword).toHaveBeenCalledWith({
      oldPassword: 'oldPassword',
      newPassword: 'newPassword',
    });
    expect(await screen.findByText('密码已修改')).toBeInTheDocument();
  });

  it('修改密码失败显示服务端错误', async () => {
    vi.mocked(userManageApi.changePassword).mockRejectedValueOnce(new Error('旧密码错误'));
    const { user } = renderWithProviders(<ProfileView />);
    await user.click(screen.getByRole('button', { name: '修改密码' }));
    await user.type(screen.getByLabelText('旧密码'), 'oldPassword');
    await user.type(screen.getByLabelText('新密码'), 'newPassword');
    await user.type(screen.getByLabelText('确认密码'), 'newPassword');
    await user.click(screen.getByRole('button', { name: '确认修改' }));

    expect(await screen.findByText('旧密码错误')).toBeInTheDocument();
  });
});
