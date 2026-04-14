import type { AuthContextValue } from 'src/auth/context';

import { act, useState } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { AuthGuard } from 'src/routes/components/auth-guard';

import {
  createLoadingContext,
  createAuthenticatedContext,
  createUnauthenticatedContext,
} from 'src/test/factories/auth-context';

import { AuthContext } from 'src/auth/context';

// ----------------------------------------------------------------------

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-from">{location.state?.from?.pathname ?? ''}</div>;
}

function makeRouter(authValue: AuthContextValue, initialPath = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <AuthContext.Provider value={authValue}>
              <AuthGuard>
                <div>Protected Content</div>
              </AuthGuard>
            </AuthContext.Provider>
          }
        />
        <Route
          path="/sign-in"
          element={
            <>
              <div>Sign In Page</div>
              <LocationDisplay />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

// ----------------------------------------------------------------------

describe('AuthGuard', () => {
  it('isLoading=true 期间不渲染任何内容（不闪跳）', () => {
    makeRouter(createLoadingContext());

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign In Page')).not.toBeInTheDocument();
  });

  it('未认证时重定向到 /sign-in', () => {
    makeRouter(createUnauthenticatedContext());

    expect(screen.getByText('Sign In Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('未认证重定向时携带 state.from 保存原始路径', () => {
    makeRouter(createUnauthenticatedContext());

    expect(screen.getByTestId('location-from').textContent).toBe('/dashboard');
  });

  it('已认证时正常渲染子组件', () => {
    makeRouter(createAuthenticatedContext());

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('已认证时不跳转到 /sign-in', () => {
    makeRouter(createAuthenticatedContext());

    expect(screen.queryByText('Sign In Page')).not.toBeInTheDocument();
  });

  it('isLoading 从 true 变为 false 后，已认证则显示子组件', () => {
    let setAuth!: React.Dispatch<React.SetStateAction<AuthContextValue>>;

    function AuthController() {
      const [auth, setAuthState] = useState<AuthContextValue>(createLoadingContext());
      setAuth = setAuthState;
      return (
        <AuthContext.Provider value={auth}>
          <AuthGuard>
            <div>Protected Content</div>
          </AuthGuard>
        </AuthContext.Provider>
      );
    }

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<AuthController />} />
          <Route path="/sign-in" element={<div>Sign In Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

    act(() => {
      setAuth(createAuthenticatedContext());
    });

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('isLoading 从 true 变为 false 后，未认证则重定向到 /sign-in', () => {
    let setAuth!: React.Dispatch<React.SetStateAction<AuthContextValue>>;

    function AuthController() {
      const [auth, setAuthState] = useState<AuthContextValue>(createLoadingContext());
      setAuth = setAuthState;
      return (
        <AuthContext.Provider value={auth}>
          <AuthGuard>
            <div>Protected Content</div>
          </AuthGuard>
        </AuthContext.Provider>
      );
    }

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<AuthController />} />
          <Route path="/sign-in" element={<div>Sign In Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Sign In Page')).not.toBeInTheDocument();

    act(() => {
      setAuth(createUnauthenticatedContext());
    });

    expect(screen.getByText('Sign In Page')).toBeInTheDocument();
  });
});
