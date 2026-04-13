import type { UserRole } from 'src/api/user-manage';

import { render, screen } from '@testing-library/react';

import { AuthContext } from 'src/auth/context';

import { HasPermission } from '../has-permission';

import type { AuthContextValue } from 'src/auth/context';

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

function renderWithRole(role: UserRole | null, ui: React.ReactElement) {
  return render(
    <AuthContext.Provider value={makeAuthContext(role)}>{ui}</AuthContext.Provider>
  );
}

// ----------------------------------------------------------------------

describe('HasPermission — minRole prop', () => {
  it('renders children when user meets minRole requirement', () => {
    renderWithRole(
      'ADMIN',
      <HasPermission minRole="ADMIN">
        <span>admin content</span>
      </HasPermission>
    );
    expect(screen.getByText('admin content')).toBeInTheDocument();
  });

  it('does not render children when user is below minRole', () => {
    renderWithRole(
      'USER',
      <HasPermission minRole="ADMIN">
        <span>admin content</span>
      </HasPermission>
    );
    expect(screen.queryByText('admin content')).not.toBeInTheDocument();
  });

  it('renders fallback when user lacks permission', () => {
    renderWithRole(
      'USER',
      <HasPermission minRole="ADMIN" fallback={<span>no access</span>}>
        <span>admin content</span>
      </HasPermission>
    );
    expect(screen.queryByText('admin content')).not.toBeInTheDocument();
    expect(screen.getByText('no access')).toBeInTheDocument();
  });

  it('SUPER_ADMIN always passes minRole="SUPER_ADMIN"', () => {
    renderWithRole(
      'SUPER_ADMIN',
      <HasPermission minRole="SUPER_ADMIN">
        <span>super only</span>
      </HasPermission>
    );
    expect(screen.getByText('super only')).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------------

describe('HasPermission — roles prop', () => {
  it('renders children when user role is in roles list', () => {
    renderWithRole(
      'ADMIN',
      <HasPermission roles={['ADMIN', 'SUPER_ADMIN']}>
        <span>restricted</span>
      </HasPermission>
    );
    expect(screen.getByText('restricted')).toBeInTheDocument();
  });

  it('does not render children when user role is not in roles list', () => {
    renderWithRole(
      'USER',
      <HasPermission roles={['ADMIN', 'SUPER_ADMIN']}>
        <span>restricted</span>
      </HasPermission>
    );
    expect(screen.queryByText('restricted')).not.toBeInTheDocument();
  });

  it('renders fallback when role not in list', () => {
    renderWithRole(
      'USER',
      <HasPermission roles={['SUPER_ADMIN']} fallback={<span>fallback</span>}>
        <span>super content</span>
      </HasPermission>
    );
    expect(screen.getByText('fallback')).toBeInTheDocument();
    expect(screen.queryByText('super content')).not.toBeInTheDocument();
  });
});

// ----------------------------------------------------------------------

describe('HasPermission — no minRole or roles prop', () => {
  it('renders children when neither minRole nor roles is specified', () => {
    renderWithRole(
      null,
      <HasPermission>
        <span>always visible</span>
      </HasPermission>
    );
    expect(screen.getByText('always visible')).toBeInTheDocument();
  });
});
