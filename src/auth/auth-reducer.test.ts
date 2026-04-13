import type { UserProfile } from 'src/api/user-manage';

import { authReducer } from './auth-reducer';

import type { AuthState } from './auth-reducer';

// ----------------------------------------------------------------------

const initialState: AuthState = {
  accessToken: null,
  userProfile: null,
  isLoading: true,
};

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

describe('authReducer', () => {
  it('AUTH_SUCCESS sets token, profile, and stops loading', () => {
    const result = authReducer(initialState, {
      type: 'AUTH_SUCCESS',
      accessToken: 'token-abc',
      userProfile: mockProfile,
    });

    expect(result.accessToken).toBe('token-abc');
    expect(result.userProfile).toEqual(mockProfile);
    expect(result.isLoading).toBe(false);
  });

  it('AUTH_FAILURE clears state and stops loading', () => {
    const loggedInState: AuthState = {
      accessToken: 'token-abc',
      userProfile: mockProfile,
      isLoading: true,
    };

    const result = authReducer(loggedInState, { type: 'AUTH_FAILURE' });

    expect(result.accessToken).toBeNull();
    expect(result.userProfile).toBeNull();
    expect(result.isLoading).toBe(false);
  });

  it('SIGN_IN sets accessToken', () => {
    const result = authReducer(initialState, {
      type: 'SIGN_IN',
      accessToken: 'new-token',
    });

    expect(result.accessToken).toBe('new-token');
    expect(result.isLoading).toBe(true); // preserves existing isLoading
  });

  it('SIGN_OUT clears token and profile', () => {
    const loggedInState: AuthState = {
      accessToken: 'token-abc',
      userProfile: mockProfile,
      isLoading: false,
    };

    const result = authReducer(loggedInState, { type: 'SIGN_OUT' });

    expect(result.accessToken).toBeNull();
    expect(result.userProfile).toBeNull();
    expect(result.isLoading).toBe(false); // preserves isLoading
  });

  it('TOKEN_REFRESHED updates accessToken', () => {
    const loggedInState: AuthState = {
      accessToken: 'old-token',
      userProfile: mockProfile,
      isLoading: false,
    };

    const result = authReducer(loggedInState, {
      type: 'TOKEN_REFRESHED',
      accessToken: 'refreshed-token',
    });

    expect(result.accessToken).toBe('refreshed-token');
    expect(result.userProfile).toEqual(mockProfile); // preserved
  });

  it('PROFILE_LOADED updates userProfile', () => {
    const result = authReducer(
      { ...initialState, isLoading: false, accessToken: 'token' },
      { type: 'PROFILE_LOADED', userProfile: mockProfile }
    );

    expect(result.userProfile).toEqual(mockProfile);
    expect(result.accessToken).toBe('token'); // preserved
  });

  it('PROFILE_LOADED with null clears profile', () => {
    const result = authReducer(
      { ...initialState, isLoading: false, userProfile: mockProfile },
      { type: 'PROFILE_LOADED', userProfile: null }
    );

    expect(result.userProfile).toBeNull();
  });

  it('unknown action returns same state', () => {
    const result = authReducer(initialState, { type: 'UNKNOWN' } as any);
    expect(result).toBe(initialState);
  });
});
