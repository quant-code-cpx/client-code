import { render, screen } from '@testing-library/react';

import { HasPermission } from '../has-permission';

// Mock src/auth so that usePermission (used inside HasPermission) can be controlled.
vi.mock('src/auth', () => ({
  useAuth: vi.fn(),
}));

import type { UserRole } from 'src/api/user-manage';

import { useAuth } from 'src/auth';

// ----------------------------------------------------------------------

function setRole(role: UserRole | null) {
  vi.mocked(useAuth).mockReturnValue({
    role,
    isAuthenticated: role !== null,
    isLoading: false,
    userProfile: null,
    signIn: vi.fn(),
    loadProfile: vi.fn(),
    signOut: vi.fn(),
  });
}

// ----------------------------------------------------------------------

describe('HasPermission — minRole', () => {
  it('renders children when user meets minimum role requirement', () => {
    setRole('ADMIN');
    render(
      <HasPermission minRole="ADMIN">
        <span>protected content</span>
      </HasPermission>
    );
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('does not render children when user is below minimum role', () => {
    setRole('USER');
    render(
      <HasPermission minRole="ADMIN">
        <span>protected content</span>
      </HasPermission>
    );
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('renders fallback when user lacks permission', () => {
    setRole('USER');
    render(
      <HasPermission minRole="ADMIN" fallback={<span>access denied</span>}>
        <span>admin panel</span>
      </HasPermission>
    );
    expect(screen.queryByText('admin panel')).not.toBeInTheDocument();
    expect(screen.getByText('access denied')).toBeInTheDocument();
  });

  it('renders nothing (no fallback) when user lacks permission and no fallback provided', () => {
    setRole('USER');
    const { container } = render(
      <HasPermission minRole="ADMIN">
        <span>admin only</span>
      </HasPermission>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('allows SUPER_ADMIN to see ADMIN-minimum content', () => {
    setRole('SUPER_ADMIN');
    render(
      <HasPermission minRole="ADMIN">
        <span>admin content</span>
      </HasPermission>
    );
    expect(screen.getByText('admin content')).toBeInTheDocument();
  });

  it('does not render for unauthenticated user', () => {
    setRole(null);
    render(
      <HasPermission minRole="USER">
        <span>member content</span>
      </HasPermission>
    );
    expect(screen.queryByText('member content')).not.toBeInTheDocument();
  });
});

// ----------------------------------------------------------------------

describe('HasPermission — roles (exact match)', () => {
  it('renders children when user role is in the allowed list', () => {
    setRole('SUPER_ADMIN');
    render(
      <HasPermission roles={['SUPER_ADMIN']}>
        <span>super admin only</span>
      </HasPermission>
    );
    expect(screen.getByText('super admin only')).toBeInTheDocument();
  });

  it('does not render when user role is not in the allowed list', () => {
    setRole('ADMIN');
    render(
      <HasPermission roles={['SUPER_ADMIN']}>
        <span>super admin only</span>
      </HasPermission>
    );
    expect(screen.queryByText('super admin only')).not.toBeInTheDocument();
  });

  it('renders when user matches one of multiple allowed roles', () => {
    setRole('ADMIN');
    render(
      <HasPermission roles={['ADMIN', 'SUPER_ADMIN']}>
        <span>admin area</span>
      </HasPermission>
    );
    expect(screen.getByText('admin area')).toBeInTheDocument();
  });
});
