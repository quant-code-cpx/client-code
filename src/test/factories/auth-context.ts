import type { AuthContextValue } from 'src/auth/context';

import { vi } from 'vitest';

import { createMockUserProfile } from './user';

// ----------------------------------------------------------------------

/** 生成已认证状态的 AuthContext 值 */
export function createAuthenticatedContext(
  overrides?: Partial<AuthContextValue>
): AuthContextValue {
  return {
    isAuthenticated: true,
    isLoading: false,
    role: 'USER',
    userProfile: createMockUserProfile(),
    signIn: vi.fn(),
    loadProfile: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/** 生成未认证状态的 AuthContext 值 */
export function createUnauthenticatedContext(
  overrides?: Partial<AuthContextValue>
): AuthContextValue {
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

/** 生成加载中状态的 AuthContext 值 */
export function createLoadingContext(overrides?: Partial<AuthContextValue>): AuthContextValue {
  return {
    isAuthenticated: false,
    isLoading: true,
    role: null,
    userProfile: null,
    signIn: vi.fn(),
    loadProfile: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
