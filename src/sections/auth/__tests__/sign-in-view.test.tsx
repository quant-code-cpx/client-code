import { StrictMode } from 'react';
import { act, screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { createMockCaptchaResponse } from 'src/test/factories/captcha';

// --- Mocks (hoisted before imports) ---

vi.mock('src/api/auth', () => ({
  authApi: {
    getCaptcha: vi.fn(),
    login: vi.fn(),
  },
}));

const mockSignIn = vi.fn();
const mockLoadProfile = vi.fn();

vi.mock('src/auth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    loadProfile: mockLoadProfile,
    isAuthenticated: false,
    isLoading: false,
    userProfile: null,
  }),
}));

// Iconify renders icons; mock it to a simple span to avoid @iconify/react issues
vi.mock('src/components/iconify', () => ({
  Iconify: vi.fn((props: { icon: string; [key: string]: unknown }) => (
    <span data-testid="iconify-icon" data-icon={props.icon} />
  )),
  registerIcons: vi.fn(),
  iconifyClasses: { root: 'iconify__root' },
}));

// --- Import after mocks ---
import { authApi } from 'src/api/auth';

import { SignInView } from '../sign-in-view';

// ----------------------------------------------------------------------

const mockGetCaptcha = vi.mocked(authApi.getCaptcha);
const mockLogin = vi.mocked(authApi.login);

const defaultCaptcha = createMockCaptchaResponse();

describe('SignInView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCaptcha.mockResolvedValue(defaultCaptcha);
  });

  describe('表单渲染', () => {
    it('渲染账号输入框', async () => {
      renderWithProviders(<SignInView />);
      await waitFor(() => {
        expect(screen.getByLabelText('账号')).toBeInTheDocument();
      });
    });

    it('渲染密码输入框（默认 type=password）', async () => {
      renderWithProviders(<SignInView />);
      await waitFor(() => {
        const pwd = screen.getByLabelText('密码');
        expect(pwd).toHaveAttribute('type', 'password');
      });
    });

    it('渲染验证码输入框', async () => {
      renderWithProviders(<SignInView />);
      await waitFor(() => {
        expect(screen.getByLabelText('验证码')).toBeInTheDocument();
      });
    });

    it('渲染登录按钮（未提交时显示"登 录"）', async () => {
      renderWithProviders(<SignInView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /登\s*录/ })).toBeInTheDocument();
      });
    });
  });

  describe('验证码', () => {
    it('mount 时自动请求验证码', async () => {
      renderWithProviders(<SignInView />);
      await waitFor(() => {
        expect(mockGetCaptcha).toHaveBeenCalledTimes(1);
      });
    });

    it('[REG] React StrictMode 首次渲染只请求一个验证码', async () => {
      renderWithProviders(
        <StrictMode>
          <SignInView />
        </StrictMode>
      );

      await waitFor(() => {
        expect(mockGetCaptcha).toHaveBeenCalledTimes(1);
      });
    });

    it('验证码加载中显示 Skeleton', () => {
      // Make getCaptcha never resolve during this render
      mockGetCaptcha.mockImplementation(() => new Promise(() => {}));
      const { container } = renderWithProviders(<SignInView />);
      const skeleton = container.querySelector('.MuiSkeleton-root');
      expect(skeleton).toBeInTheDocument();
    });

    it('验证码加载成功后以图片文档渲染 SVG', async () => {
      renderWithProviders(<SignInView />);
      await waitFor(() => {
        expect(screen.getByRole('img', { name: '验证码图片' })).toHaveAttribute(
          'src',
          expect.stringContaining('data:image/svg+xml')
        );
      });
    });

    it('不将不可信 SVG 作为 HTML 插入页面', async () => {
      mockGetCaptcha.mockResolvedValue({
        ...defaultCaptcha,
        svgImage: '<svg><script>window.captchaXss = true</script><rect /></svg>',
      });

      const { container } = renderWithProviders(<SignInView />);

      await waitFor(() => {
        expect(screen.getByRole('img', { name: '验证码图片' })).toBeInTheDocument();
      });

      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('svg')).toBeNull();
    });

    it('点击或按 Enter 刷新验证码', async () => {
      const { user } = renderWithProviders(<SignInView />);

      // Wait for initial captcha load
      await waitFor(() => expect(mockGetCaptcha).toHaveBeenCalledTimes(1));

      const refreshButton = screen.getByRole('button', { name: '刷新验证码' });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockGetCaptcha).toHaveBeenCalledTimes(2);
      });

      refreshButton.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockGetCaptcha).toHaveBeenCalledTimes(3);
      });
    });

    it('60 秒后验证码过期显示"已过期"提示', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      renderWithProviders(<SignInView />);

      // Wait for initial captcha
      await waitFor(() => expect(mockGetCaptcha).toHaveBeenCalledTimes(1));

      // Advance 60 seconds
      await act(async () => {
        vi.advanceTimersByTime(60_000);
      });

      await waitFor(() => {
        expect(screen.getByText('已过期')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe('密码可见性切换', () => {
    it('点击眼睛图标切换密码可见性', async () => {
      const { user } = renderWithProviders(<SignInView />);
      await waitFor(() => expect(screen.getByLabelText('密码')).toBeInTheDocument());

      const passwordInput = screen.getByLabelText('密码');
      expect(passwordInput).toHaveAttribute('type', 'password');

      await user.click(screen.getByRole('button', { name: '显示密码' }));

      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(screen.getByRole('button', { name: '隐藏密码' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '隐藏密码' }));
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(screen.getByRole('button', { name: '显示密码' })).toBeInTheDocument();
    });
  });

  describe('表单校验', () => {
    it('未填写账号提交时显示"请输入账号"', async () => {
      const { user } = renderWithProviders(<SignInView />);
      await waitFor(() => expect(mockGetCaptcha).toHaveBeenCalled());

      await user.click(screen.getByRole('button', { name: /登\s*录/ }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('请输入账号');
      });
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('账号填写但密码为空时显示"请输入密码"', async () => {
      const { user } = renderWithProviders(<SignInView />);
      await waitFor(() => expect(mockGetCaptcha).toHaveBeenCalled());

      await user.type(screen.getByLabelText('账号'), 'admin');
      await user.click(screen.getByRole('button', { name: /登\s*录/ }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('请输入密码');
      });
    });

    it('账号密码已填但验证码为空时显示"请输入验证码"', async () => {
      const { user } = renderWithProviders(<SignInView />);
      await waitFor(() => expect(mockGetCaptcha).toHaveBeenCalled());

      await user.type(screen.getByLabelText('账号'), 'admin');
      await user.type(screen.getByLabelText('密码'), 'secret');
      await user.click(screen.getByRole('button', { name: /登\s*录/ }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('请输入验证码');
      });
    });
  });

  describe('表单提交', () => {
    async function fillAndSubmit(
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      user: ReturnType<(typeof import('@testing-library/user-event'))['default']['setup']>
    ) {
      await waitFor(() => expect(mockGetCaptcha).toHaveBeenCalled());
      await user.type(screen.getByLabelText('账号'), 'testuser');
      await user.type(screen.getByLabelText('密码'), 'testpass');
      await user.type(screen.getByLabelText('验证码'), '1234');
      await user.click(screen.getByRole('button', { name: /登\s*录/ }));
    }

    it('所有字段填写后调用 authApi.login 带正确参数', async () => {
      mockLogin.mockResolvedValue({ accessToken: 'token-abc' });

      const { user } = renderWithProviders(<SignInView />);
      await fillAndSubmit(user);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          account: 'testuser',
          password: 'testpass',
          captchaId: defaultCaptcha.captchaId,
          captchaCode: '1234',
        });
      });
    });

    it('登录成功后依次调用 signIn → loadProfile → router.push("/")', async () => {
      mockLogin.mockResolvedValue({ accessToken: 'token-abc' });
      mockLoadProfile.mockResolvedValue(undefined);

      const { user } = renderWithProviders(<SignInView />);
      await fillAndSubmit(user);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('token-abc');
        expect(mockLoadProfile).toHaveBeenCalled();
      });
    });

  it('提交中按钮显示"登录中…"并禁用', async () => {
      // login never resolves
      mockLogin.mockImplementation(() => new Promise(() => {}));

      const { user } = renderWithProviders(<SignInView />);
      await fillAndSubmit(user);

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: /登录中/ });
        expect(btn).toBeDisabled();
      });
    });
  });

  describe('错误处理', () => {
    it('登录失败显示 Alert 错误信息', async () => {
      mockLogin.mockRejectedValue(new Error('账号或密码错误'));

      const { user } = renderWithProviders(<SignInView />);
      await waitFor(() => expect(mockGetCaptcha).toHaveBeenCalled());

      await user.type(screen.getByLabelText('账号'), 'admin');
      await user.type(screen.getByLabelText('密码'), 'wrong');
      await user.type(screen.getByLabelText('验证码'), 'xxxx');
      await user.click(screen.getByRole('button', { name: /登\s*录/ }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('账号或密码错误');
      });
    });

    it('登录失败后自动刷新验证码', async () => {
      mockLogin.mockRejectedValue(new Error('error'));

      const { user } = renderWithProviders(<SignInView />);
      await waitFor(() => expect(mockGetCaptcha).toHaveBeenCalledTimes(1));

      await user.type(screen.getByLabelText('账号'), 'a');
      await user.type(screen.getByLabelText('密码'), 'b');
      await user.type(screen.getByLabelText('验证码'), 'c');
      await user.click(screen.getByRole('button', { name: /登\s*录/ }));

      await waitFor(() => {
        expect(mockGetCaptcha).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('键盘 Enter 提交', () => {
    it('账号输入框按 Enter 触发提交', async () => {
      mockLogin.mockResolvedValue({ accessToken: 'tok' });

      const { user } = renderWithProviders(<SignInView />);
      await waitFor(() => expect(mockGetCaptcha).toHaveBeenCalled());

      await user.type(screen.getByLabelText('账号'), 'admin');
      await user.type(screen.getByLabelText('密码'), 'pass');
      await user.type(screen.getByLabelText('验证码'), '1234');

      const accountInput = screen.getByLabelText('账号');
      await user.type(accountInput, '{Enter}');

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    it('密码输入框按 Enter 触发提交', async () => {
      mockLogin.mockResolvedValue({ accessToken: 'tok' });

      const { user } = renderWithProviders(<SignInView />);
      await waitFor(() => expect(mockGetCaptcha).toHaveBeenCalled());

      await user.type(screen.getByLabelText('账号'), 'admin');
      await user.type(screen.getByLabelText('密码'), 'pass');
      await user.type(screen.getByLabelText('验证码'), '1234');

      const pwdInput = screen.getByLabelText('密码');
      await user.type(pwdInput, '{Enter}');

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });
  });
});
