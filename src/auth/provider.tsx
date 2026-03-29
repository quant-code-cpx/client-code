import type { UserProfile } from 'src/api/user-manage';

import { useRef, useMemo, useEffect, useReducer, useCallback } from 'react';

import { authApi, tokenStorage, userManageApi, setAuthCallbacks } from 'src/api';

import { AuthContext } from './context';

import type { AuthContextValue } from './context';

// ----------------------------------------------------------------------

/** BroadcastChannel 消息类型：跨标签页同步 token 刷新与登出事件 */
type AuthBroadcastMessage = { type: 'TOKEN_REFRESHED'; token: string } | { type: 'SIGNED_OUT' };

const BROADCAST_CHANNEL_NAME = 'quant-auth';

type AuthProviderProps = {
  children: React.ReactNode;
};

// ----------------------------------------------------------------------

type AuthState = {
  accessToken: string | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
};

type AuthAction =
  | { type: 'AUTH_SUCCESS'; accessToken: string; userProfile: UserProfile | null }
  | { type: 'AUTH_FAILURE' }
  | { type: 'SIGN_IN'; accessToken: string }
  | { type: 'SIGN_OUT' }
  | { type: 'TOKEN_REFRESHED'; accessToken: string }
  | { type: 'PROFILE_LOADED'; userProfile: UserProfile | null };

function authReducer(state: AuthState, action: AuthAction): AuthState {
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

// ----------------------------------------------------------------------

export function AuthProvider({ children }: AuthProviderProps) {
  const [{ accessToken, userProfile, isLoading }, dispatch] = useReducer(authReducer, {
    accessToken: null,
    userProfile: null,
    isLoading: true,
  });

  // BroadcastChannel 实例引用，用于跨标签页广播 token 变更
  const channelRef = useRef<BroadcastChannel | null>(null);

  // 跨标签页同步：监听其他标签页的 token 刷新 / 登出事件
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;

    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
      const msg = event.data;
      if (msg.type === 'TOKEN_REFRESHED') {
        // 其他标签页刷新了 token，同步到本标签页内存
        tokenStorage.set(msg.token);
        dispatch({ type: 'TOKEN_REFRESHED', accessToken: msg.token });
      } else if (msg.type === 'SIGNED_OUT') {
        // 其他标签页已登出，本标签页同步清除状态
        tokenStorage.clear();
        dispatch({ type: 'SIGN_OUT' });
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // 注册 API 客户端的回调，使 token 刷新和强制登出能同步到 React 状态及其他标签页
  useEffect(() => {
    setAuthCallbacks({
      onTokenRefreshed: (token) => {
        dispatch({ type: 'TOKEN_REFRESHED', accessToken: token });
        channelRef.current?.postMessage({ type: 'TOKEN_REFRESHED', token });
      },
      onUnauthorized: () => {
        tokenStorage.clear();
        dispatch({ type: 'SIGN_OUT' });
        channelRef.current?.postMessage({ type: 'SIGNED_OUT' });
      },
    });
  }, []);

  // 应用启动时：通过 refresh token cookie（HttpOnly，JS 不可读）静默恢复会话。
  // access token 不再持久化到 localStorage，每次启动必须走此流程。
  // 使用单次 dispatch 将 accessToken / userProfile / isLoading 一起更新，避免多次
  // 独立 setState 触发多余渲染，从而减少子组件（如用户管理列表）的重复请求。
  useEffect(() => {
    authApi
      .refresh()
      .then(async ({ accessToken: newToken }) => {
        tokenStorage.set(newToken);
        const profile = await userManageApi.getProfile().catch(() => null);
        // 单次 dispatch → 单次渲染，auth 状态原子更新
        dispatch({ type: 'AUTH_SUCCESS', accessToken: newToken, userProfile: profile });
      })
      .catch(() => {
        // refresh token 已过期或不存在，清除状态，由 AuthGuard 重定向到登录页
        tokenStorage.clear();
        dispatch({ type: 'AUTH_FAILURE' });
      });
  }, []);

  const signIn = useCallback((token: string) => {
    tokenStorage.set(token);
    dispatch({ type: 'SIGN_IN', accessToken: token });
  }, []);

  const loadProfile = useCallback(async () => {
    const profile = await userManageApi.getProfile().catch(() => null);
    dispatch({ type: 'PROFILE_LOADED', userProfile: profile });
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // 即使接口失败也要清除本地状态
    } finally {
      tokenStorage.clear();
      dispatch({ type: 'SIGN_OUT' });
      // 通知其他标签页同步登出
      channelRef.current?.postMessage({ type: 'SIGNED_OUT' });
    }
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      isAuthenticated: !!accessToken,
      isLoading,
      role: userProfile?.role ?? null,
      userProfile,
      signIn,
      loadProfile,
      signOut,
    }),
    [accessToken, isLoading, userProfile, signIn, loadProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
