import type { UserRole, UserProfile } from 'src/api/user-manage';

import { useContext, createContext } from 'react';

// ----------------------------------------------------------------------

export interface AuthContextValue {
  /** 是否已登录 */
  isAuthenticated: boolean;
  /** 初始化加载中（校验已有 token） */
  isLoading: boolean;
  /** 当前用户角色，未登录时为 null */
  role: UserRole | null;
  /** 当前用户完整资料，未登录时为 null */
  userProfile: UserProfile | null;
  /** 登录成功后保存 token */
  signIn: (accessToken: string) => void;
  /** 主动拉取并刷新当前用户资料（登录后调用） */
  loadProfile: () => Promise<void>;
  /** 登出（调用接口 + 清除本地状态） */
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内部使用');
  return ctx;
}
