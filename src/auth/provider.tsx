import { useRef, useMemo, useEffect, useReducer, useCallback } from 'react';

import { clearAgentDrafts } from 'src/utils/agent-draft-storage';

import { destroySocket, refreshSocketAuth } from 'src/lib/socket';
import { authApi, tokenStorage, userManageApi, setAuthCallbacks } from 'src/api';

import { AuthContext } from './context';
import { authReducer } from './auth-reducer';

import type { AuthContextValue } from './context';

// ----------------------------------------------------------------------

/** BroadcastChannel 消息类型：跨标签页同步 token 刷新与登出事件 */
type AuthBroadcastMessage = { type: 'TOKEN_REFRESHED'; token: string } | { type: 'SIGNED_OUT' };

const BROADCAST_CHANNEL_NAME = 'quant-auth';
const AUTH_SYNC_GRACE_MS = 250;

type AuthProviderProps = {
  children: React.ReactNode;
};

// ----------------------------------------------------------------------

export function AuthProvider({ children }: AuthProviderProps) {
  const [{ accessToken, userProfile, isLoading }, dispatch] = useReducer(authReducer, {
    accessToken: null,
    userProfile: null,
    isLoading: true,
  });

  // BroadcastChannel 实例引用，用于跨标签页广播 token 变更
  const channelRef = useRef<BroadcastChannel | null>(null);
  const latestSynchronizedTokenRef = useRef<string | null>(null);
  const sessionRestoreRef = useRef<
    Promise<{ accessToken: string; userProfile: Awaited<ReturnType<typeof userManageApi.getProfile>> | null }> | null
  >(null);

  // 跨标签页同步：监听其他标签页的 token 刷新 / 登出事件
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;

    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
      const msg = event.data;
      if (msg.type === 'TOKEN_REFRESHED') {
        // 其他标签页刷新了 token，同步到本标签页内存
        latestSynchronizedTokenRef.current = msg.token;
        tokenStorage.set(msg.token);
        refreshSocketAuth();
        dispatch({ type: 'TOKEN_REFRESHED', accessToken: msg.token });
      } else if (msg.type === 'SIGNED_OUT') {
        // 其他标签页已登出，本标签页同步清除状态
        latestSynchronizedTokenRef.current = null;
        tokenStorage.clear();
        destroySocket();
        clearAgentDrafts();
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
        latestSynchronizedTokenRef.current = token;
        refreshSocketAuth();
        dispatch({ type: 'TOKEN_REFRESHED', accessToken: token });
        channelRef.current?.postMessage({ type: 'TOKEN_REFRESHED', token });
      },
      onUnauthorized: () => {
        latestSynchronizedTokenRef.current = null;
        tokenStorage.clear();
        destroySocket();
        clearAgentDrafts();
        dispatch({ type: 'SIGN_OUT' });
        // 当前标签刷新失败不等于用户主动登出，不能让陈旧标签清空其他标签的会话。
      },
    });
  }, []);

  // 应用启动时：通过 refresh token cookie（HttpOnly，JS 不可读）静默恢复会话。
  // access token 不再持久化到 localStorage，每次启动必须走此流程。
  // 使用单次 dispatch 将 accessToken / userProfile / isLoading 一起更新，避免多次
  // 独立 setState 触发多余渲染，从而减少子组件（如用户管理列表）的重复请求。
  useEffect(() => {
    if (!sessionRestoreRef.current) {
      sessionRestoreRef.current = authApi.refresh().then(async ({ accessToken: newToken }) => {
        latestSynchronizedTokenRef.current = newToken;
        tokenStorage.set(newToken);
        refreshSocketAuth();
        channelRef.current?.postMessage({ type: 'TOKEN_REFRESHED', token: newToken });
        const profile = await userManageApi.getProfile().catch(() => null);
        return { accessToken: newToken, userProfile: profile };
      });
    }

    let active = true;
    sessionRestoreRef.current
      .then(({ accessToken: newToken, userProfile: profile }) => {
        if (!active) return;
        // 单次 dispatch → 单次渲染，auth 状态原子更新
        dispatch({ type: 'AUTH_SUCCESS', accessToken: newToken, userProfile: profile });
      })
      .catch(async () => {
        if (!active) return;

        // 并发标签可能刚完成轮换并广播新 Token。给广播一个极短窗口；若收到，
        // 复用它恢复当前标签，避免先失败的旧请求把成功登录态覆盖成登出。
        await new Promise((resolve) => setTimeout(resolve, AUTH_SYNC_GRACE_MS));
        if (!active) return;
        const synchronizedToken = latestSynchronizedTokenRef.current;
        if (synchronizedToken) {
          const profile = await userManageApi.getProfile().catch(() => null);
          if (active) {
            dispatch({
              type: 'AUTH_SUCCESS',
              accessToken: synchronizedToken,
              userProfile: profile,
            });
          }
          return;
        }

        // refresh token 已过期或不存在，清除状态，由 AuthGuard 重定向到登录页
        tokenStorage.clear();
        destroySocket();
        clearAgentDrafts();
        dispatch({ type: 'AUTH_FAILURE' });
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback((token: string) => {
    latestSynchronizedTokenRef.current = token;
    tokenStorage.set(token);
    refreshSocketAuth();
    dispatch({ type: 'SIGN_IN', accessToken: token });
    channelRef.current?.postMessage({ type: 'TOKEN_REFRESHED', token });
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
      latestSynchronizedTokenRef.current = null;
      tokenStorage.clear();
      destroySocket();
      clearAgentDrafts();
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
