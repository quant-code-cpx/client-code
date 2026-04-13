import { http, HttpResponse } from 'msw';
import { act, render, screen, waitFor } from '@testing-library/react';

import { server } from 'src/test/mocks/server';
import { createMockProfile } from 'src/test/factories/user';

import { useAuth } from '../context';
import { AuthProvider } from '../provider';

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

/** Simple consumer component that exposes auth state as data-testid attributes */
function AuthConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="isAuthenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="isLoading">{String(auth.isLoading)}</span>
      <span data-testid="role">{auth.role ?? 'null'}</span>
      <button
        data-testid="signIn"
        onClick={() => auth.signIn('new-token')}
        type="button"
      >
        sign in
      </button>
      <button
        data-testid="signOut"
        onClick={() => auth.signOut()}
        type="button"
      >
        sign out
      </button>
    </div>
  );
}

function renderAuthProvider() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
}

// ----------------------------------------------------------------------

describe('AuthProvider — initialization', () => {
  it('starts in loading state', () => {
    server.use(
      http.post('/api/auth/refresh', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({ code: 0, data: { accessToken: 'init-token' } });
      }),
      http.post('/api/user/profile', () =>
        HttpResponse.json({ code: 0, data: createMockProfile() })
      )
    );

    renderAuthProvider();
    expect(screen.getByTestId('isLoading').textContent).toBe('true');
  });

  it('on successful refresh → isAuthenticated becomes true', async () => {
    server.use(
      http.post('/api/auth/refresh', () =>
        HttpResponse.json({ code: 0, data: { accessToken: 'init-token' } })
      ),
      http.post('/api/user/profile', () =>
        HttpResponse.json({ code: 0, data: createMockProfile({ role: 'ADMIN' }) })
      )
    );

    renderAuthProvider();

    await waitFor(() =>
      expect(screen.getByTestId('isLoading').textContent).toBe('false')
    );
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
  });

  it('on refresh failure → isAuthenticated is false and loading stops', async () => {
    server.use(
      http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 }))
    );

    renderAuthProvider();

    await waitFor(() =>
      expect(screen.getByTestId('isLoading').textContent).toBe('false')
    );
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
  });
});

// ----------------------------------------------------------------------

describe('AuthProvider — signIn / signOut', () => {
  beforeEach(() => {
    server.use(
      http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 }))
    );
  });

  it('signIn sets isAuthenticated to true', async () => {
    renderAuthProvider();

    await waitFor(() =>
      expect(screen.getByTestId('isLoading').textContent).toBe('false')
    );

    act(() => {
      screen.getByTestId('signIn').click();
    });

    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
  });

  it('signOut clears isAuthenticated', async () => {
    server.use(
      http.post('/api/auth/logout', () => HttpResponse.json({ code: 0, data: null }))
    );

    renderAuthProvider();

    await waitFor(() =>
      expect(screen.getByTestId('isLoading').textContent).toBe('false')
    );

    // First sign in
    act(() => {
      screen.getByTestId('signIn').click();
    });
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');

    // Then sign out
    await act(async () => {
      screen.getByTestId('signOut').click();
    });
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
  });
});

// ----------------------------------------------------------------------

describe('AuthProvider — BroadcastChannel cross-tab sync', () => {
  it('subscribes to BroadcastChannel on mount', async () => {
    const mockClose = vi.fn();
    const mockChannel = {
      onmessage: null as ((e: MessageEvent) => void) | null,
      postMessage: vi.fn(),
      close: mockClose,
    };
    const BroadcastChannelMock = vi.fn(() => mockChannel);
    vi.stubGlobal('BroadcastChannel', BroadcastChannelMock);

    server.use(
      http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 }))
    );

    const { unmount } = renderAuthProvider();

    await waitFor(() =>
      expect(screen.getByTestId('isLoading').textContent).toBe('false')
    );

    expect(BroadcastChannelMock).toHaveBeenCalledWith('quant-auth');

    // Simulate TOKEN_REFRESHED message from another tab
    act(() => {
      mockChannel.onmessage?.({
        data: { type: 'TOKEN_REFRESHED', token: 'cross-tab-token' },
      } as MessageEvent);
    });
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');

    // Simulate SIGNED_OUT message
    act(() => {
      mockChannel.onmessage?.({
        data: { type: 'SIGNED_OUT' },
      } as MessageEvent);
    });
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');

    unmount();
    expect(mockClose).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
