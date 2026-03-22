import type { UserRole } from 'src/api/user-manage';

import { useAuth } from 'src/auth';

// ----------------------------------------------------------------------

/** 角色等级映射（数值越大权限越高） */
export const ROLE_LEVEL: Record<UserRole, number> = {
  SUPER_ADMIN: 3,
  ADMIN: 2,
  USER: 1,
};

// ----------------------------------------------------------------------

/**
 * usePermission — 权限控制 Hook
 *
 * 类似 Vue v-permission 的功能，在 React 中通过 Hook 实现：
 *
 * @example
 * const { hasMinRole, canManage } = usePermission();
 * // 判断是否是管理员以上
 * if (hasMinRole('ADMIN')) { ... }
 * // 判断是否可以操作某角色的用户（必须高于目标角色）
 * if (canManage('USER')) { ... }
 */
export function usePermission() {
  const { role } = useAuth();
  const myLevel = role ? ROLE_LEVEL[role] : 0;

  return {
    /** 当前角色 */
    role,
    /** 当前角色等级 */
    myLevel,

    /**
     * 判断是否拥有指定角色中的任意一个
     * @example hasRole(['ADMIN', 'SUPER_ADMIN'])
     */
    hasRole: (roles: UserRole[]) => !!role && roles.includes(role),

    /**
     * 判断是否达到最低角色要求（包含该角色及以上）
     * @example hasMinRole('ADMIN') // true for ADMIN and SUPER_ADMIN
     */
    hasMinRole: (minRole: UserRole) => myLevel >= ROLE_LEVEL[minRole],

    /**
     * 判断是否可以操作指定角色的用户
     * - SUPER_ADMIN 可操作所有角色（包括同级）
     * - 其他角色需严格高于目标角色
     * @example canManage('USER') // true for ADMIN and SUPER_ADMIN
     * @example canManage('ADMIN') // true only for SUPER_ADMIN
     * @example canManage('SUPER_ADMIN') // true only for SUPER_ADMIN
     */
    canManage: (targetRole: UserRole) => role === 'SUPER_ADMIN' || myLevel > ROLE_LEVEL[targetRole],
  };
}
