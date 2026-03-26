import type { UserProfile } from 'src/api/user-manage';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

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

export function AuthProvider({ children }: AuthProviderProps) {
  // access token 仅存内存（不持久化到 localStorage），防止 XSS 窃取
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
        setAccessToken(msg.token);
      } else if (msg.type === 'SIGNED_OUT') {
        // 其他标签页已登出，本标签页同步清除状态
        tokenStorage.clear();
        setAccessToken(null);
        setUserProfile(null);
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
        setAccessToken(token);
        channelRef.current?.postMessage({ type: 'TOKEN_REFRESHED', token });
      },
      onUnauthorized: () => {
        tokenStorage.clear();
        setAccessToken(null);
        setUserProfile(null);
        channelRef.current?.postMessage({ type: 'SIGNED_OUT' });
      },
    });
  }, []);

  // 应用启动时：通过 refresh token cookie（HttpOnly，JS 不可读）静默恢复会话。
  // access token 不再持久化到 localStorage，每次启动必须走此流程。
  useEffect(() => {
    authApi
      .refresh()
      .then(async ({ accessToken: newToken }) => {
        tokenStorage.set(newToken);
        setAccessToken(newToken);
        // 校验成功后同步拉取用户资料（获取 role 等信息）
        const profile = await userManageApi.getProfile().catch(() => null);
        setUserProfile(profile);
      })
      .catch(() => {
        // refresh token 已过期或不存在，清除状态，由 AuthGuard 重定向到登录页
        tokenStorage.clear();
        setAccessToken(null);
        setUserProfile(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const signIn = useCallback((token: string) => {
    tokenStorage.set(token);
    setAccessToken(token);
  }, []);

  const loadProfile = useCallback(async () => {
    const profile = await userManageApi.getProfile().catch(() => null);
    setUserProfile(profile);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // 即使接口失败也要清除本地状态
    } finally {
      tokenStorage.clear();
      setAccessToken(null);
      setUserProfile(null);
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
