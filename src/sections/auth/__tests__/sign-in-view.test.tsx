import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';

import { server } from 'src/test/mocks/server';
import { theme } from 'src/test/test-utils';
import { AuthContext } from 'src/auth/context';

import { SignInView } from '../sign-in-view';

import type { AuthContextValue } from 'src/auth/context';

// ----------------------------------------------------------------------
// Test helpers
// ----------------------------------------------------------------------

function makeAuthContext(overrides?: Partial<AuthContextValue>): AuthContextValue {
  return {
    isAuthenticated: false,
    isLoading: false,
    role: null,
    userProfile: null,
    signIn: vi.fn(),
    loadProfile: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderSignIn(authCtx?: Partial<AuthContextValue>) {
  const ctx = makeAuthContext(authCtx);
  return {
    ctx,
    user: userEvent.setup(),
    ...render(
      <MemoryRouter initialEntries={['/sign-in']}>
        <ThemeProvider theme={theme}>
          <AuthContext.Provider value={ctx}>
            <SignInView />
          </AuthContext.Provider>
        </ThemeProvider>
      </MemoryRouter>
    ),
  };
}

// ----------------------------------------------------------------------

describe('SignInView — initial render', () => {
  it('renders the login form with account / password / captcha inputs', async () => {
    renderSignIn();
    await waitFor(() => {
      expect(screen.getByLabelText('账号')).toBeInTheDocument();
      expect(screen.getByLabelText('密码')).toBeInTheDocument();
      expect(screen.getByLabelText('验证码')).toBeInTheDocument();
    });
  });

  it('renders the sign-in button', async () => {
    renderSignIn();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /登 录/ })).toBeInTheDocument();
    });
  });

  it('renders page title "用户登录"', () => {
    renderSignIn();
    expect(screen.getByText('用户登录')).toBeInTheDocument();
  });

  it('shows captcha image or skeleton after getCaptcha resolves', async () => {
    renderSignIn();
    // Captcha SVG container should eventually render
    await waitFor(() => {
      expect(screen.getByTitle('点击刷新验证码')).toBeInTheDocument();
    });
  });
});

// ----------------------------------------------------------------------

describe('SignInView — captcha SVG', () => {
  it('calls authApi.getCaptcha on mount', async () => {
    let captchaCallCount = 0;
    server.use(
      http.post('/api/auth/captcha', () => {
        captchaCallCount += 1;
        return HttpResponse.json({
          code: 0,
          data: { captchaId: 'cap-001', svgImage: '<svg><text>ABCD</text></svg>' },
        });
      })
    );
    renderSignIn();
    await waitFor(() => expect(captchaCallCount).toBe(1));
  });

  it('refreshes captcha when clicking the captcha box', async () => {
    let captchaCallCount = 0;
    server.use(
      http.post('/api/auth/captcha', () => {
        captchaCallCount += 1;
        return HttpResponse.json({
          code: 0,
          data: { captchaId: `cap-${captchaCallCount}`, svgImage: '<svg><text>REFRESH</text></svg>' },
        });
      })
    );

    const { user } = renderSignIn();
    await waitFor(() => expect(captchaCallCount).toBe(1));

    await user.click(screen.getByTitle('点击刷新验证码'));
    await waitFor(() => expect(captchaCallCount).toBe(2));
  });

  it('shows error when captcha fetch fails', async () => {
    server.use(
      http.post('/api/auth/captcha', () => new HttpResponse(null, { status: 500 }))
    );
    renderSignIn();
    await waitFor(() => {
      expect(screen.getByText(/获取验证码失败/)).toBeInTheDocument();
    });
  });
});

// ----------------------------------------------------------------------

describe('SignInView — form validation', () => {
  it('shows error when account is empty on submit', async () => {
    const { user } = renderSignIn();
    await waitFor(() => screen.getByRole('button', { name: /登 录/ }));
    await user.click(screen.getByRole('button', { name: /登 录/ }));
    expect(screen.getByText('请输入账号')).toBeInTheDocument();
  });

  it('shows error when password is empty on submit', async () => {
    const { user } = renderSignIn();
    await waitFor(() => screen.getByRole('button', { name: /登 录/ }));
    await user.type(screen.getByLabelText('账号'), 'admin');
    await user.click(screen.getByRole('button', { name: /登 录/ }));
    expect(screen.getByText('请输入密码')).toBeInTheDocument();
  });

  it('shows error when captcha code is empty on submit', async () => {
    const { user } = renderSignIn();
    await waitFor(() => screen.getByRole('button', { name: /登 录/ }));
    await user.type(screen.getByLabelText('账号'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'pass123');
    await user.click(screen.getByRole('button', { name: /登 录/ }));
    expect(screen.getByText('请输入验证码')).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------------

describe('SignInView — form submission', () => {
  it('calls authApi.login and signIn on success', async () => {
    const signInMock = vi.fn();
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ code: 0, data: { accessToken: 'test-access-token' } })
      )
    );

    const { user } = renderSignIn({ signIn: signInMock });

    // Wait for captcha to load
    await waitFor(() => screen.getByTitle('点击刷新验证码'));

    await user.type(screen.getByLabelText('账号'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'pass123');
    await user.type(screen.getByLabelText('验证码'), 'ABCD');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /登 录/ }));
    });

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith('test-access-token');
    });
  });

  it('refreshes captcha after login failure', async () => {
    // Track captcha refresh calls
    let captchaCallCount = 0;
    server.use(
      http.post('/api/auth/captcha', () => {
        captchaCallCount += 1;
        return HttpResponse.json({
          code: 0,
          data: { captchaId: `cap-${captchaCallCount}`, svgImage: '<svg><text>TEST</text></svg>' },
        });
      }),
      http.post('/api/auth/login', () =>
        HttpResponse.json({ message: '账号或密码错误' }, { status: 400 })
      )
    );

    const { user } = renderSignIn();
    // Wait for initial captcha
    await waitFor(() => expect(captchaCallCount).toBe(1));

    await user.type(screen.getByLabelText('账号'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'wrongpass');
    await user.type(screen.getByLabelText('验证码'), 'ABCD');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /登 录/ }));
    });

    // Captcha should be refreshed after login failure
    await waitFor(() => expect(captchaCallCount).toBe(2));
  });

  it('dismisses validation error on close button click', async () => {
    const { user } = renderSignIn();
    await waitFor(() => screen.getByRole('button', { name: /登 录/ }));

    // Trigger validation error
    await user.click(screen.getByRole('button', { name: /登 录/ }));
    expect(screen.getByText('请输入账号')).toBeInTheDocument();

    // Close the alert
    const closeBtn = screen.getByTitle('Close');
    await user.click(closeBtn);
    expect(screen.queryByText('请输入账号')).not.toBeInTheDocument();
  });
});

// ----------------------------------------------------------------------

describe('SignInView — password visibility toggle', () => {
  it('toggles password visibility with the eye icon button', async () => {
    const { user } = renderSignIn();
    const passwordInput = screen.getByLabelText('密码') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleBtn = passwordInput.closest('div')?.querySelector('button');
    if (toggleBtn) {
      await user.click(toggleBtn);
      expect(passwordInput.type).toBe('text');
      await user.click(toggleBtn);
      expect(passwordInput.type).toBe('password');
    }
  });
});
