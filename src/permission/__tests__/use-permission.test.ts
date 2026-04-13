import type { UserRole } from 'src/api/user-manage';

import { renderHook } from '@testing-library/react';

import { ROLE_LEVEL, usePermission } from '../use-permission';

// Mock src/auth so that usePermission can be tested without a real AuthProvider.
vi.mock('src/auth', () => ({
  useAuth: vi.fn(),
}));

// Import AFTER vi.mock so Vitest can hoist the mock correctly.
// eslint-disable-next-line import/first
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

describe('ROLE_LEVEL', () => {
  it('SUPER_ADMIN has the highest level', () => {
    expect(ROLE_LEVEL.SUPER_ADMIN).toBeGreaterThan(ROLE_LEVEL.ADMIN);
    expect(ROLE_LEVEL.SUPER_ADMIN).toBeGreaterThan(ROLE_LEVEL.USER);
  });

  it('ADMIN has a higher level than USER', () => {
    expect(ROLE_LEVEL.ADMIN).toBeGreaterThan(ROLE_LEVEL.USER);
  });

  it('USER has the lowest positive level', () => {
    expect(ROLE_LEVEL.USER).toBeGreaterThan(0);
  });
});

// ----------------------------------------------------------------------

describe('usePermission — hasRole', () => {
  it('returns true when current role is in the list', () => {
    setRole('ADMIN');
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasRole(['ADMIN', 'SUPER_ADMIN'])).toBe(true);
  });

  it('returns false when current role is NOT in the list', () => {
    setRole('USER');
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasRole(['ADMIN', 'SUPER_ADMIN'])).toBe(false);
  });

  it('returns false when unauthenticated (role is null)', () => {
    setRole(null);
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasRole(['USER', 'ADMIN', 'SUPER_ADMIN'])).toBe(false);
  });

  it('matches exact single role', () => {
    setRole('SUPER_ADMIN');
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasRole(['SUPER_ADMIN'])).toBe(true);
    expect(result.current.hasRole(['ADMIN'])).toBe(false);
  });
});

// ----------------------------------------------------------------------

describe('usePermission — hasMinRole', () => {
  it('SUPER_ADMIN passes all minimum role requirements', () => {
    setRole('SUPER_ADMIN');
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasMinRole('SUPER_ADMIN')).toBe(true);
    expect(result.current.hasMinRole('ADMIN')).toBe(true);
    expect(result.current.hasMinRole('USER')).toBe(true);
  });

  it('ADMIN passes USER and ADMIN minimums but NOT SUPER_ADMIN', () => {
    setRole('ADMIN');
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasMinRole('ADMIN')).toBe(true);
    expect(result.current.hasMinRole('USER')).toBe(true);
    expect(result.current.hasMinRole('SUPER_ADMIN')).toBe(false);
  });

  it('USER passes only USER minimum, not ADMIN or SUPER_ADMIN', () => {
    setRole('USER');
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasMinRole('USER')).toBe(true);
    expect(result.current.hasMinRole('ADMIN')).toBe(false);
    expect(result.current.hasMinRole('SUPER_ADMIN')).toBe(false);
  });

  it('unauthenticated user fails ALL minimum role requirements', () => {
    setRole(null);
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasMinRole('USER')).toBe(false);
    expect(result.current.hasMinRole('ADMIN')).toBe(false);
    expect(result.current.hasMinRole('SUPER_ADMIN')).toBe(false);
  });
});

// ----------------------------------------------------------------------

describe('usePermission — canManage', () => {
  it('SUPER_ADMIN can manage ADMIN and USER', () => {
    setRole('SUPER_ADMIN');
    const { result } = renderHook(() => usePermission());
    expect(result.current.canManage('ADMIN')).toBe(true);
    expect(result.current.canManage('USER')).toBe(true);
  });

  it('SUPER_ADMIN CANNOT manage another SUPER_ADMIN', () => {
    setRole('SUPER_ADMIN');
    const { result } = renderHook(() => usePermission());
    // SUPER_ADMIN accounts are protected — nobody can manage them
    expect(result.current.canManage('SUPER_ADMIN')).toBe(false);
  });

  it('ADMIN can manage USER but NOT ADMIN or SUPER_ADMIN', () => {
    setRole('ADMIN');
    const { result } = renderHook(() => usePermission());
    expect(result.current.canManage('USER')).toBe(true);
    expect(result.current.canManage('ADMIN')).toBe(false);
    expect(result.current.canManage('SUPER_ADMIN')).toBe(false);
  });

  it('USER cannot manage anyone', () => {
    setRole('USER');
    const { result } = renderHook(() => usePermission());
    expect(result.current.canManage('USER')).toBe(false);
    expect(result.current.canManage('ADMIN')).toBe(false);
    expect(result.current.canManage('SUPER_ADMIN')).toBe(false);
  });

  it('unauthenticated user cannot manage anyone', () => {
    setRole(null);
    const { result } = renderHook(() => usePermission());
    expect(result.current.canManage('USER')).toBe(false);
    expect(result.current.canManage('ADMIN')).toBe(false);
    expect(result.current.canManage('SUPER_ADMIN')).toBe(false);
  });
});
