import type { UserRole } from 'src/api/user-manage';

import { render, screen } from '@testing-library/react';

import { AuthContext } from 'src/auth/context';

import { ROLE_LEVEL, usePermission } from '../use-permission';

import type { AuthContextValue } from 'src/auth/context';

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function makeAuthContext(role: UserRole | null): AuthContextValue {
  return {
    isAuthenticated: !!role,
    isLoading: false,
    role,
    userProfile: null,
    signIn: () => {},
    loadProfile: async () => {},
    signOut: async () => {},
  };
}

/** Renders a component that exposes usePermission results as text nodes */
function PermissionConsumer({ role }: { role: UserRole | null }) {
  const { myLevel, hasRole, hasMinRole, canManage } = usePermission();
  return (
    <div>
      <span data-testid="myLevel">{myLevel}</span>
      <span data-testid="hasUserRole">{String(hasRole(['USER']))}</span>
      <span data-testid="hasAdminOrSuper">{String(hasRole(['ADMIN', 'SUPER_ADMIN']))}</span>
      <span data-testid="hasMinUser">{String(hasMinRole('USER'))}</span>
      <span data-testid="hasMinAdmin">{String(hasMinRole('ADMIN'))}</span>
      <span data-testid="hasMinSuper">{String(hasMinRole('SUPER_ADMIN'))}</span>
      <span data-testid="canManageUser">{String(canManage('USER'))}</span>
      <span data-testid="canManageAdmin">{String(canManage('ADMIN'))}</span>
      <span data-testid="canManageSuper">{String(canManage('SUPER_ADMIN'))}</span>
      {/* prevent unused-var warning for role param */}
      <span data-testid="role">{role ?? 'null'}</span>
    </div>
  );
}

function renderWithRole(role: UserRole | null) {
  render(
    <AuthContext.Provider value={makeAuthContext(role)}>
      <PermissionConsumer role={role} />
    </AuthContext.Provider>
  );
}

// ----------------------------------------------------------------------

describe('ROLE_LEVEL', () => {
  it('SUPER_ADMIN has highest level', () => {
    expect(ROLE_LEVEL.SUPER_ADMIN).toBeGreaterThan(ROLE_LEVEL.ADMIN);
    expect(ROLE_LEVEL.ADMIN).toBeGreaterThan(ROLE_LEVEL.USER);
  });

  it('USER has level 1', () => {
    expect(ROLE_LEVEL.USER).toBe(1);
  });

  it('ADMIN has level 2', () => {
    expect(ROLE_LEVEL.ADMIN).toBe(2);
  });

  it('SUPER_ADMIN has level 3', () => {
    expect(ROLE_LEVEL.SUPER_ADMIN).toBe(3);
  });
});

// ----------------------------------------------------------------------

describe('usePermission — hasRole', () => {
  it('USER matches ["USER"]', () => {
    renderWithRole('USER');
    expect(screen.getByTestId('hasUserRole').textContent).toBe('true');
    expect(screen.getByTestId('hasAdminOrSuper').textContent).toBe('false');
  });

  it('ADMIN matches ["ADMIN", "SUPER_ADMIN"]', () => {
    renderWithRole('ADMIN');
    expect(screen.getByTestId('hasAdminOrSuper').textContent).toBe('true');
    expect(screen.getByTestId('hasUserRole').textContent).toBe('false');
  });

  it('null role returns false for any hasRole check', () => {
    renderWithRole(null);
    expect(screen.getByTestId('hasUserRole').textContent).toBe('false');
    expect(screen.getByTestId('hasAdminOrSuper').textContent).toBe('false');
  });
});

// ----------------------------------------------------------------------

describe('usePermission — hasMinRole', () => {
  it('USER satisfies hasMinRole("USER") only', () => {
    renderWithRole('USER');
    expect(screen.getByTestId('hasMinUser').textContent).toBe('true');
    expect(screen.getByTestId('hasMinAdmin').textContent).toBe('false');
    expect(screen.getByTestId('hasMinSuper').textContent).toBe('false');
  });

  it('ADMIN satisfies hasMinRole("USER") and hasMinRole("ADMIN")', () => {
    renderWithRole('ADMIN');
    expect(screen.getByTestId('hasMinUser').textContent).toBe('true');
    expect(screen.getByTestId('hasMinAdmin').textContent).toBe('true');
    expect(screen.getByTestId('hasMinSuper').textContent).toBe('false');
  });

  it('SUPER_ADMIN satisfies all hasMinRole checks', () => {
    renderWithRole('SUPER_ADMIN');
    expect(screen.getByTestId('hasMinUser').textContent).toBe('true');
    expect(screen.getByTestId('hasMinAdmin').textContent).toBe('true');
    expect(screen.getByTestId('hasMinSuper').textContent).toBe('true');
  });

  it('null role fails all hasMinRole checks', () => {
    renderWithRole(null);
    expect(screen.getByTestId('hasMinUser').textContent).toBe('false');
    expect(screen.getByTestId('hasMinAdmin').textContent).toBe('false');
    expect(screen.getByTestId('hasMinSuper').textContent).toBe('false');
  });

  it('myLevel is 0 when role is null', () => {
    renderWithRole(null);
    expect(screen.getByTestId('myLevel').textContent).toBe('0');
  });
});

// ----------------------------------------------------------------------

describe('usePermission — canManage', () => {
  it('canManage("SUPER_ADMIN") is always false', () => {
    renderWithRole('SUPER_ADMIN');
    expect(screen.getByTestId('canManageSuper').textContent).toBe('false');
  });

  it('SUPER_ADMIN can manage ADMIN and USER', () => {
    renderWithRole('SUPER_ADMIN');
    expect(screen.getByTestId('canManageAdmin').textContent).toBe('true');
    expect(screen.getByTestId('canManageUser').textContent).toBe('true');
  });

  it('ADMIN can manage USER but not ADMIN or SUPER_ADMIN', () => {
    renderWithRole('ADMIN');
    expect(screen.getByTestId('canManageUser').textContent).toBe('true');
    expect(screen.getByTestId('canManageAdmin').textContent).toBe('false');
    expect(screen.getByTestId('canManageSuper').textContent).toBe('false');
  });

  it('USER cannot manage anyone', () => {
    renderWithRole('USER');
    expect(screen.getByTestId('canManageUser').textContent).toBe('false');
    expect(screen.getByTestId('canManageAdmin').textContent).toBe('false');
    expect(screen.getByTestId('canManageSuper').textContent).toBe('false');
  });

  it('null role cannot manage anyone', () => {
    renderWithRole(null);
    expect(screen.getByTestId('canManageUser').textContent).toBe('false');
    expect(screen.getByTestId('canManageAdmin').textContent).toBe('false');
    expect(screen.getByTestId('canManageSuper').textContent).toBe('false');
  });
});
