import { apiClient } from './client';

// ----------------------------------------------------------------------
// 类型定义
// ----------------------------------------------------------------------

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type UserStatus = 'ACTIVE' | 'DEACTIVATED' | 'DELETED';

/** 用户角色显示名称 */
export const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: '超级管理员',
  ADMIN: '管理员',
  USER: '普通用户',
};

/** 用户状态显示名称 */
export const STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: '正常',
  DEACTIVATED: '已禁用',
  DELETED: '已删除',
};

/** 完整用户信息（个人资料 / 管理列表通用） */
export interface UserProfile {
  id: number;
  account: string;
  nickname: string;
  email: string | null;
  wechat: string | null;
  role: UserRole;
  status: UserStatus;
  backtestQuota: number;
  watchlistLimit: number;
  createdAt?: string;
}

/** 用户管理列表中的单条记录（与 UserProfile 相同结构） */
export type UserManageItem = UserProfile;

/** 分页查询参数 */
export interface UserListQuery {
  page: number;
  pageSize: number;
  account?: string;
  status?: UserStatus;
  role?: UserRole;
}

/** 分页结果 */
export interface UserListResult {
  items: UserManageItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** 创建用户 DTO */
export interface CreateUserDto {
  account: string;
  nickname: string;
  role?: UserRole;
  /** 初始密码（至少8位） */
  password: string;
}

/** 创建用户响应（含初始密码，仅本次返回） */
export interface CreatedUserResult extends UserManageItem {
  initialPassword: string;
}

/** 重置密码 DTO */
export interface ResetPasswordDto {
  id: number;
  /** 新密码（至少8位） */
  newPassword: string;
}

/** 重置密码响应 */
export interface ResetPasswordResult {
  newPassword: string;
}

/** 管理员更新用户 DTO */
export interface AdminUpdateUserDto {
  id: number;
  nickname?: string;
  email?: string;
  wechat?: string;
  backtestQuota?: number;
  watchlistLimit?: number;
}

/** 更新用户状态 DTO */
export interface UpdateUserStatusDto {
  id: number;
  status: 'ACTIVE' | 'DEACTIVATED';
}

/** 审计操作类型 */
export type AuditAction =
  | 'USER_CREATE'
  | 'USER_DELETE'
  | 'USER_UPDATE_STATUS'
  | 'USER_UPDATE_INFO'
  | 'USER_RESET_PASSWORD';

/** 审计操作显示名称 */
export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  USER_CREATE: '创建用户',
  USER_DELETE: '删除用户',
  USER_UPDATE_STATUS: '修改状态',
  USER_UPDATE_INFO: '更新信息',
  USER_RESET_PASSWORD: '重置密码',
};

/** 修改密码 DTO */
export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

/** 修改个人资料 DTO */
export interface UpdateProfileDto {
  nickname?: string;
  email?: string;
  wechat?: string;
}

/** 审计日志条目 */
export interface AuditLogItem {
  id: number;
  operatorId: number;
  operatorAccount: string;
  action: AuditAction;
  targetId: number | null;
  targetAccount: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

/** 审计日志查询参数 */
export interface AuditLogQuery {
  page?: number;
  pageSize?: number;
  operatorId?: number;
  targetId?: number;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
}

/** 审计日志分页结果 */
export interface AuditLogResult {
  total: number;
  page: number;
  pageSize: number;
  items: AuditLogItem[];
}

// ----------------------------------------------------------------------
// API 封装
// ----------------------------------------------------------------------

export const userManageApi = {
  /** 获取当前用户个人资料 */
  getProfile: (): Promise<UserProfile> => apiClient.post<UserProfile>('/api/user/profile/detail'),

  /** 用户列表（分页 + 筛选） */
  list: (query: UserListQuery, signal?: AbortSignal): Promise<UserListResult> =>
    apiClient.post<UserListResult>('/api/user/list', query, signal),

  /** 创建用户 */
  create: (data: CreateUserDto): Promise<CreatedUserResult> =>
    apiClient.post<CreatedUserResult>('/api/user/create', data),

  /** 获取指定用户详情 */
  detail: (id: number): Promise<UserManageItem> =>
    apiClient.post<UserManageItem>('/api/user/detail', { id }),

  /** 更新用户信息（管理员以上） */
  update: (data: AdminUpdateUserDto): Promise<UserManageItem> =>
    apiClient.post<UserManageItem>('/api/user/update', data),

  /** 修改用户状态（启用/禁用） */
  updateStatus: (data: UpdateUserStatusDto): Promise<void> =>
    apiClient.post<void>('/api/user/update-status', data),

  /** 重置用户密码 */
  resetPassword: (dto: ResetPasswordDto): Promise<ResetPasswordResult> =>
    apiClient.post<ResetPasswordResult>('/api/user/reset-password', dto),

  /** 删除用户（软删除） */
  delete: (id: number): Promise<void> => apiClient.post<void>('/api/user/delete', { id }),

  /** 用户自助修改密码 */
  changePassword: (dto: ChangePasswordDto): Promise<void> =>
    apiClient.post<void>('/api/user/profile/change-password', dto),

  /** 用户自助修改资料 */
  updateProfile: (dto: UpdateProfileDto): Promise<UserProfile> =>
    apiClient.post<UserProfile>('/api/user/profile/update', dto),

  /** 查询管理员操作审计日志（ADMIN 及以上） */
  getAuditLogs: (query: AuditLogQuery): Promise<AuditLogResult> =>
    apiClient.post<AuditLogResult>('/api/user/audit-log/list', query),
};
