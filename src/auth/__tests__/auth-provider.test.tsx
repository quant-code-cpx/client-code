import type { ReactNode } from 'react';

import { StrictMode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';

import { useAuth } from 'src/auth';

import { AuthProvider } from '../provider';

// Mock the API layer so the provider can be tested in isolation.
vi.mock('src/api', () => {
  const mockTokenStorage = {
    get: vi.fn(() => null as string | null),
    set: vi.fn(),
    clear: vi.fn(),
  };
  return {
    authApi: {
      refresh: vi.fn(),
      logout: vi.fn(),
    },
    userManageApi: {
      getProfile: vi.fn(),
    },
    tokenStorage: mockTokenStorage,
    setAuthCallbacks: vi.fn(),
  };
});

const { mockDestroySocket, mockRefreshSocketAuth } = vi.hoisted(() => ({
  mockDestroySocket: vi.fn(),
  mockRefreshSocketAuth: vi.fn(),
}));

vi.mock('src/lib/socket', () => ({
  destroySocket: mockDestroySocket,
  refreshSocketAuth: mockRefreshSocketAuth,
}));

import type { UserProfile } from 'src/api/user-manage';

// Lazy imports AFTER vi.mock so Vitest can apply hoisting.
import { authApi, tokenStorage, userManageApi, setAuthCallbacks } from 'src/api';

// ----------------------------------------------------------------------

const mockProfile: UserProfile = {
  id: 1,
  account: 'testuser',
  nickname: 'Test User',
  email: 'test@example.com',
  wechat: null,
  role: 'USER',
  status: 'ACTIVE',
  backtestQuota: 10,
  watchlistLimit: 5,
  createdAt: '2024-01-01',
};

// A consumer component that exposes the auth context to assertions.
function AuthConsumer() {
  const { isAuthenticated, isLoading, role, userProfile } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="role">{role ?? 'none'}</span>
      <span data-testid="profile">{userProfile?.account ?? 'none'}</span>
    </div>
  );
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

// ----------------------------------------------------------------------

beforeEach(() => {
  mockDestroySocket.mockReset();
  mockRefreshSocketAuth.mockReset();
});

describe('AuthProvider — initialization', () => {
  beforeEach(() => {
    vi.mocked(authApi.refresh).mockReset();
    vi.mocked(authApi.logout).mockReset();
    vi.mocked(userManageApi.getProfile).mockReset();
    vi.mocked(tokenStorage.get).mockReturnValue(null);
    vi.mocked(tokenStorage.set).mockReset();
    vi.mocked(tokenStorage.clear).mockReset();
  });

  it('shows loading state before refresh resolves', () => {
    // Never resolves during this test
    vi.mocked(authApi.refresh).mockReturnValue(new Promise(() => {}));
    vi.mocked(userManageApi.getProfile).mockResolvedValue(mockProfile);

    render(<AuthConsumer />, { wrapper });

    expect(screen.getByTestId('loading').textContent).toBe('true');
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('AUTH_SUCCESS: refresh success → sets token, loads profile, marks authenticated', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: 'fresh-token' });
    vi.mocked(userManageApi.getProfile).mockResolvedValue(mockProfile);

    render(<AuthConsumer />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('profile').textContent).toBe('testuser');
    expect(vi.mocked(tokenStorage.set)).toHaveBeenCalledWith('fresh-token');
    expect(mockRefreshSocketAuth).toHaveBeenCalledTimes(1);
  });

  it('[REG] React StrictMode 初始化只恢复一次会话', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: 'strict-token' });
    vi.mocked(userManageApi.getProfile).mockResolvedValue(mockProfile);

    render(
      <StrictMode>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </StrictMode>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    expect(vi.mocked(authApi.refresh)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(userManageApi.getProfile)).toHaveBeenCalledTimes(1);
    expect(mockRefreshSocketAuth).toHaveBeenCalledTimes(1);
  });

  it('AUTH_SUCCESS with null profile: refresh success but getProfile fails → still authenticated', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: 'fresh-token' });
    vi.mocked(userManageApi.getProfile).mockRejectedValue(new Error('network error'));

    render(<AuthConsumer />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // App should still be authenticated even when getProfile fails — profile is null
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('profile').textContent).toBe('none');
  });

  it('AUTH_FAILURE: refresh failure → clears token and marks unauthenticated', async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('refresh expired'));

    render(<AuthConsumer />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(vi.mocked(tokenStorage.clear)).toHaveBeenCalled();
    expect(mockDestroySocket).toHaveBeenCalledTimes(1);
  });

  it('API client 刷新 token 时重连 WebSocket', () => {
    vi.mocked(authApi.refresh).mockReturnValue(new Promise(() => {}));

    render(<AuthConsumer />, { wrapper });

    const callbacks = vi.mocked(setAuthCallbacks).mock.calls.at(-1)?.[0];
    act(() => callbacks?.onTokenRefreshed?.('refreshed-by-api'));

    expect(mockRefreshSocketAuth).toHaveBeenCalledTimes(1);
  });
});

// ----------------------------------------------------------------------

describe('AuthProvider — signIn / signOut', () => {
  function SignInConsumer() {
    const { isAuthenticated, signIn, signOut } = useAuth();
    return (
      <div>
        <span data-testid="authenticated">{String(isAuthenticated)}</span>
        <button type="button" onClick={() => signIn('manual-token')}>
          sign in
        </button>
        <button type="button" onClick={() => signOut()}>
          sign out
        </button>
      </div>
    );
  }

  it('signIn stores token in tokenStorage and marks authenticated', async () => {
    // Refresh fails so we start unauthenticated
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('no cookie'));

    render(<SignInConsumer />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByText('sign in').click();
    });

    expect(vi.mocked(tokenStorage.set)).toHaveBeenCalledWith('manual-token');
    expect(mockRefreshSocketAuth).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
  });

  it('signOut calls authApi.logout, clears tokenStorage, and marks unauthenticated', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: 'fresh-token' });
    vi.mocked(userManageApi.getProfile).mockResolvedValue(mockProfile);
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    render(<SignInConsumer />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    await act(async () => {
      screen.getByText('sign out').click();
    });

    expect(vi.mocked(authApi.logout)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(tokenStorage.clear)).toHaveBeenCalled();
    expect(mockDestroySocket).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('signOut clears state even when authApi.logout throws', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: 'fresh-token' });
    vi.mocked(userManageApi.getProfile).mockResolvedValue(mockProfile);
    vi.mocked(authApi.logout).mockRejectedValue(new Error('network error'));

    render(<SignInConsumer />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    await act(async () => {
      screen.getByText('sign out').click();
    });

    // State should be cleared even on logout API failure
    expect(vi.mocked(tokenStorage.clear)).toHaveBeenCalled();
    expect(mockDestroySocket).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });
});

// ----------------------------------------------------------------------

describe('AuthProvider — BroadcastChannel cross-tab sync', () => {
  type MessageHandler = (event: MessageEvent) => void;
  type MockBroadcastChannel = {
    onmessage: MessageHandler | null;
    postMessage: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };

  let mockChannel: MockBroadcastChannel;

  beforeEach(() => {
    vi.mocked(authApi.refresh).mockReset();
    vi.mocked(authApi.logout).mockReset();
    vi.mocked(userManageApi.getProfile).mockReset();
    vi.mocked(tokenStorage.get).mockReturnValue(null);
    vi.mocked(tokenStorage.set).mockReset();
    vi.mocked(tokenStorage.clear).mockReset();
    vi.mocked(setAuthCallbacks).mockReset();
    mockChannel = {
      onmessage: null,
      postMessage: vi.fn(),
      close: vi.fn(),
    };
    vi.stubGlobal(
      'BroadcastChannel',
      vi.fn(() => mockChannel)
    );

    vi.mocked(authApi.refresh).mockRejectedValue(new Error('no cookie'));
    vi.mocked(authApi.logout).mockResolvedValue(undefined);
    vi.mocked(userManageApi.getProfile).mockRejectedValue(new Error('profile unavailable'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('updates token when another tab broadcasts TOKEN_REFRESHED', async () => {
    render(<AuthConsumer />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Simulate another tab broadcasting a token refresh
    await act(async () => {
      mockChannel.onmessage?.({
        data: { type: 'TOKEN_REFRESHED', token: 'cross-tab-token' },
      } as MessageEvent);
    });

    expect(vi.mocked(tokenStorage.set)).toHaveBeenCalledWith('cross-tab-token');
    expect(mockRefreshSocketAuth).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
  });

  it('[RACE] startup refresh failure yields to a token refreshed by another tab', async () => {
    let rejectRefresh: ((reason?: unknown) => void) | undefined;
    vi.mocked(authApi.refresh).mockReturnValue(
      new Promise((_, reject) => {
        rejectRefresh = reject;
      })
    );
    vi.mocked(userManageApi.getProfile).mockResolvedValue(mockProfile);

    render(<AuthConsumer />, { wrapper });

    await act(async () => {
      mockChannel.onmessage?.({
        data: { type: 'TOKEN_REFRESHED', token: 'winner-tab-token' },
      } as MessageEvent);
      rejectRefresh?.(new Error('stale refresh token'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('profile').textContent).toBe('testuser');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(vi.mocked(tokenStorage.clear)).not.toHaveBeenCalled();
  });

  it('broadcasts a token restored successfully during startup', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: 'startup-token' });
    vi.mocked(userManageApi.getProfile).mockResolvedValue(mockProfile);

    render(<AuthConsumer />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    expect(mockChannel.postMessage).toHaveBeenCalledWith({
      type: 'TOKEN_REFRESHED',
      token: 'startup-token',
    });
  });

  it('does not broadcast SIGNED_OUT when only this tab becomes unauthorized', async () => {
    render(<AuthConsumer />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    const callbacks = vi.mocked(setAuthCallbacks).mock.calls.at(-1)?.[0];
    act(() => callbacks?.onUnauthorized?.());

    expect(mockChannel.postMessage).not.toHaveBeenCalledWith({ type: 'SIGNED_OUT' });
  });

  it('clears auth state when another tab broadcasts SIGNED_OUT', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: 'fresh-token' });
    vi.mocked(userManageApi.getProfile).mockResolvedValue(mockProfile);

    render(<AuthConsumer />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    // Simulate another tab signing out
    await act(async () => {
      mockChannel.onmessage?.({
        data: { type: 'SIGNED_OUT' },
      } as MessageEvent);
    });

    expect(vi.mocked(tokenStorage.clear)).toHaveBeenCalled();
    expect(mockDestroySocket).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('closes BroadcastChannel on unmount', async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('no cookie'));

    const { unmount } = render(<AuthConsumer />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    unmount();

    expect(mockChannel.close).toHaveBeenCalledTimes(1);
  });
});
