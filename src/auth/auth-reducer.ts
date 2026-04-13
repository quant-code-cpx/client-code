import type { UserProfile } from 'src/api/user-manage';

// ----------------------------------------------------------------------

export type AuthState = {
  accessToken: string | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
};

export type AuthAction =
  | { type: 'AUTH_SUCCESS'; accessToken: string; userProfile: UserProfile | null }
  | { type: 'AUTH_FAILURE' }
  | { type: 'SIGN_IN'; accessToken: string }
  | { type: 'SIGN_OUT' }
  | { type: 'TOKEN_REFRESHED'; accessToken: string }
  | { type: 'PROFILE_LOADED'; userProfile: UserProfile | null };

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_SUCCESS':
      return { accessToken: action.accessToken, userProfile: action.userProfile, isLoading: false };
    case 'AUTH_FAILURE':
      return { accessToken: null, userProfile: null, isLoading: false };
    case 'SIGN_IN':
      return { ...state, accessToken: action.accessToken };
    case 'SIGN_OUT':
      return { ...state, accessToken: null, userProfile: null };
    case 'TOKEN_REFRESHED':
      return { ...state, accessToken: action.accessToken };
    case 'PROFILE_LOADED':
      return { ...state, userProfile: action.userProfile };
    default:
      return state;
  }
}
