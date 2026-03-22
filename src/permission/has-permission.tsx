import type { ReactNode } from 'react';
import type { UserRole } from 'src/api/user-manage';

import { usePermission } from './use-permission';

// ----------------------------------------------------------------------

interface HasPermissionProps {
  /**
   * 至少需要达到的角色等级（包含该角色及以上）
   * @example minRole="ADMIN"  → ADMIN 和 SUPER_ADMIN 均可见
   */
  minRole?: UserRole;
  /**
   * 精确匹配角色列表（拥有其中任一角色即可）
   * @example roles={['SUPER_ADMIN']}
   */
  roles?: UserRole[];
  /** 有权限时渲染的内容 */
  children: ReactNode;
  /** 无权限时的兜底内容（默认不渲染任何内容） */
  fallback?: ReactNode;
}

/**
 * HasPermission — 权限控制组件
 *
 * 类似 Vue 的 v-permission 指令，在 JSX 中声明式地控制渲染。
 *
 * @example
 * // 仅管理员以上可见
 * <HasPermission minRole="ADMIN">
 *   <Button>创建用户</Button>
 * </HasPermission>
 *
 * @example
 * // 仅超级管理员可见，无权限时显示提示
 * <HasPermission roles={['SUPER_ADMIN']} fallback={<Typography>无权限</Typography>}>
 *   <DangerButton />
 * </HasPermission>
 */
export function HasPermission({ minRole, roles, children, fallback = null }: HasPermissionProps) {
  const { hasMinRole, hasRole } = usePermission();

  let allowed = true;
  if (minRole) {
    allowed = hasMinRole(minRole);
  } else if (roles) {
    allowed = hasRole(roles);
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
}
