import type { UserProfile } from 'src/api/user-manage';

import { useMemo, useState, useEffect, useCallback } from 'react';

import { authApi, tokenStorage, userManageApi, setAuthCallbacks } from 'src/api';

import { AuthContext } from './context';

import type { AuthContextValue } from './context';

// ----------------------------------------------------------------------

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  // 用 state 驱动 isAuthenticated，确保登录/登出后 UI 同步更新
  const [accessToken, setAccessToken] = useState<string | null>(() => tokenStorage.get());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 注册 API 客户端的回调，使 token 刷新和强制登出能同步到 React 状态
  useEffect(() => {
    setAuthCallbacks({
      onTokenRefreshed: (token) => setAccessToken(token),
      onUnauthorized: () => {
        tokenStorage.clear();
        setAccessToken(null);
      },
    });
  }, []);

  // 应用启动时：若存在本地 token，通过刷新接口验证会话有效性，并从接口拉取用户资料
  useEffect(() => {
    const storedToken = tokenStorage.get();

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

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
        // 会话已过期，清除本地 token
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
