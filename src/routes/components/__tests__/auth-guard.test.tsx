import { render, screen } from '@testing-library/react';

import { AuthContext } from 'src/auth/context';

import { AuthGuard } from '../auth-guard';

import type { AuthContextValue } from 'src/auth/context';

// ----------------------------------------------------------------------
// Mock react-router-dom hooks so the test doesn't need a real Router context.
// AuthGuard logic under test: useAuth() → redirect vs render children.
// ----------------------------------------------------------------------

const mockNavigateFn = vi.fn();
const mockLocationValue = { pathname: '/dashboard', search: '', hash: '', state: null, key: 'default' };

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useLocation: () => mockLocationValue,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate-to" data-to={to} />,
  };
});

// ----------------------------------------------------------------------

function makeAuthCtx(overrides?: Partial<AuthContextValue>): AuthContextValue {
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

function renderGuard(authCtx: AuthContextValue) {
  return render(
    <AuthContext.Provider value={authCtx}>
      <AuthGuard>
        <div data-testid="protected-content">Protected</div>
      </AuthGuard>
    </AuthContext.Provider>
  );
}

// ----------------------------------------------------------------------

describe('AuthGuard — unauthenticated user', () => {
  it('does not render protected content when not authenticated', () => {
    renderGuard(makeAuthCtx({ isAuthenticated: false, isLoading: false }));
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders Navigate component pointing to /sign-in', () => {
    renderGuard(makeAuthCtx({ isAuthenticated: false, isLoading: false }));
    const nav = screen.getByTestId('navigate-to');
    expect(nav).toBeInTheDocument();
    expect(nav.getAttribute('data-to')).toBe('/sign-in');
  });

  it('renders Navigate (not children) when not authenticated in test mode', () => {
    // import.meta.env.MODE === "test" in vitest — guard redirects
    renderGuard(makeAuthCtx({ isAuthenticated: false, isLoading: false }));
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('navigate-to')).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------------

describe('AuthGuard — authenticated user', () => {
  it('renders protected children when authenticated', () => {
    renderGuard(makeAuthCtx({ isAuthenticated: true, isLoading: false }));
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });

  it('does NOT render Navigate when authenticated', () => {
    renderGuard(makeAuthCtx({ isAuthenticated: true, isLoading: false }));
    expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument();
  });

  it('renders multiple children when authenticated', () => {
    render(
      <AuthContext.Provider value={makeAuthCtx({ isAuthenticated: true, isLoading: false })}>
        <AuthGuard>
          <div data-testid="child-a">A</div>
          <div data-testid="child-b">B</div>
        </AuthGuard>
      </AuthContext.Provider>
    );
    expect(screen.getByTestId('child-a')).toBeInTheDocument();
    expect(screen.getByTestId('child-b')).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------------

describe('AuthGuard — loading state', () => {
  it('renders nothing while isLoading is true (unauthenticated)', () => {
    const { container } = renderGuard(
      makeAuthCtx({ isAuthenticated: false, isLoading: true })
    );
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument();
    expect(container.textContent).toBe('');
  });

  it('renders nothing while isLoading is true (authenticated)', () => {
    const { container } = renderGuard(
      makeAuthCtx({ isAuthenticated: true, isLoading: true })
    );
    // isLoading takes priority — renders null regardless of auth state
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(container.textContent).toBe('');
  });
});
