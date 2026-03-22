import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from 'src/auth';

// ----------------------------------------------------------------------

type AuthGuardProps = {
  children: React.ReactNode;
};

/**
 * 路由守卫：未登录则重定向到 /sign-in，
 * 同时保存目标路径，登录后可回跳。
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 等待初始化完成（校验本地 token），避免闪跳
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
