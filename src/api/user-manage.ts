import { apiClient } from './client';

// ----------------------------------------------------------------------
// 类型定义
// ----------------------------------------------------------------------

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type UserStatus = 'ACTIVE' | 'DEACTIVATED' | 'DELETED';
export type UserStatusFilter = UserStatus | 'LOCKED';
export type UserSortableField =
  | 'createdAt'
  | 'updatedAt'
  | 'lastLoginAt'
  | 'account'
  | 'role'
  | 'status';
export type AuditResult = 'success' | 'failure' | 'blocked';

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

/** 用户列表筛选状态显示名称 */
export const STATUS_FILTER_LABEL: Record<UserStatusFilter, string> = {
  ...STATUS_LABEL,
  LOCKED: '已锁定',
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
  updatedAt?: string | null;
  lastLoginAt?: string | null;
  lockedUntil?: string | null;
  loginFailCount?: number;
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
  lockedOnly?: boolean;
  includeDeleted?: boolean;
  createdFrom?: string;
  createdTo?: string;
  lastLoginFrom?: string;
  lastLoginTo?: string;
  sortBy?: UserSortableField;
  sortOrder?: 'asc' | 'desc';
}

/** 用户摘要 KPI */
export interface UserStatsResult {
  total: number;
  todayNew: number;
  active30d: number;
  deactivated: number;
  locked: number;
}

/** 用户搜索结果（用于审计筛选 Autocomplete） */
export interface UserSearchItem {
  id: number;
  role: UserRole;
  account: string;
  nickname: string;
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
  /** 回测任务数量限制（-1 为不限） */
  backtestQuota?: number;
  /** 监控股票数量限制（-1 为不限） */
  watchlistLimit?: number;
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
  /** 是否由系统邮件直发；本期仅预留字段，默认不传 */
  notifyEmail?: boolean;
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

/** 调整角色 DTO */
export interface UpdateUserRoleDto {
  id: number;
  role: Exclude<UserRole, 'SUPER_ADMIN'>;
  reason: string;
}

/** 删除影响清单 */
export interface DeleteImpactResult {
  alertCount?: number;
  strategyCount: number;
  backtestCount: number;
  watchlistCount: number;
  subscriptionCount: number;
}

/** 批量操作结果 */
export interface UserBulkOperationResult {
  success: number[];
  failed: { id: number; reason: string }[];
}

/** 审计操作类型 */
export type AuditAction =
  | 'USER_CREATE'
  | 'USER_DELETE'
  | 'USER_RESTORE'
  | 'USER_UNLOCK'
  | 'USER_UPDATE_ROLE'
  | 'USER_UPDATE_STATUS'
  | 'USER_UPDATE_INFO'
  | 'USER_RESET_PASSWORD'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'TOKEN_REFRESH'
  | 'USER_BULK_UPDATE_STATUS'
  | 'USER_BULK_UPDATE_QUOTA';

/** 审计操作显示名称 */
export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  USER_CREATE: '创建用户',
  USER_DELETE: '删除用户',
  USER_RESTORE: '恢复用户',
  USER_UNLOCK: '解锁用户',
  USER_UPDATE_ROLE: '调整角色',
  USER_UPDATE_STATUS: '修改状态',
  USER_UPDATE_INFO: '更新信息',
  USER_RESET_PASSWORD: '重置密码',
  LOGIN_SUCCESS: '登录成功',
  LOGIN_FAILED: '登录失败',
  LOGOUT: '登出',
  TOKEN_REFRESH: '刷新令牌',
  USER_BULK_UPDATE_STATUS: '批量修改状态',
  USER_BULK_UPDATE_QUOTA: '批量调整配额',
};

/** 审计日志字段级变化 */
export interface AuditLogChange {
  field: string;
  before: unknown;
  after: unknown;
}

/** 审计详情结构化约定；兼容历史 Record 结构 */
export type AuditLogDetails = Record<string, unknown> & {
  reason?: string;
  result?: AuditResult;
  changes?: AuditLogChange[];
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
  result?: AuditResult;
  details: AuditLogDetails | null;
  ipAddress: string | null;
  userAgent?: string | null;
  createdAt: string;
}

/** 审计日志查询参数 */
export interface AuditLogQuery {
  page?: number;
  pageSize?: number;
  operatorId?: number;
  targetId?: number;
  action?: AuditAction;
  actions?: AuditAction[];
  result?: AuditResult;
  operatorAccount?: string;
  targetAccount?: string;
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

  /** 用户摘要 KPI */
  stats: (signal?: AbortSignal): Promise<UserStatsResult> =>
    apiClient.post<UserStatsResult>('/api/user/stats', {}, signal),

  /** 用户模糊搜索 */
  search: (
    data: { keyword: string; limit?: number },
    signal?: AbortSignal
  ): Promise<UserSearchItem[]> =>
    apiClient.post<UserSearchItem[]>('/api/user/search', data, signal),

  /** 创建用户 */
  create: (data: CreateUserDto): Promise<CreatedUserResult> =>
    apiClient.post<CreatedUserResult>('/api/user/create', data),

  /** 获取指定用户详情 */
  detail: (id: number): Promise<UserManageItem> =>
    apiClient.post<UserManageItem>('/api/user/detail', { id }),

  /** 更新用户信息（管理员以上） */
  update: (data: AdminUpdateUserDto): Promise<UserManageItem> =>
    apiClient.post<UserManageItem>('/api/user/update', data),

  /** 调整用户角色 */
  updateRole: (data: UpdateUserRoleDto): Promise<UserManageItem> =>
    apiClient.post<UserManageItem>('/api/user/update-role', data),

  /** 修改用户状态（启用/禁用） */
  updateStatus: (data: UpdateUserStatusDto): Promise<void> =>
    apiClient.post<void>('/api/user/update-status', data),

  /** 重置用户密码 */
  resetPassword: (dto: ResetPasswordDto): Promise<ResetPasswordResult> =>
    apiClient.post<ResetPasswordResult>('/api/user/reset-password', dto),

  /** 解锁用户 */
  unlock: (id: number): Promise<UserManageItem> =>
    apiClient.post<UserManageItem>('/api/user/unlock', { id }),

  /** 删除用户（软删除） */
  delete: (id: number): Promise<void> => apiClient.post<void>('/api/user/delete', { id }),

  /** 恢复软删除用户 */
  restore: (id: number): Promise<UserManageItem> =>
    apiClient.post<UserManageItem>('/api/user/restore', { id }),

  /** 删除前影响清单 */
  deleteImpact: (id: number): Promise<DeleteImpactResult> =>
    apiClient.post<DeleteImpactResult>('/api/user/delete-impact', { id }),

  /** 批量修改状态 */
  bulkUpdateStatus: (data: {
    ids: number[];
    status: 'ACTIVE' | 'DEACTIVATED';
  }): Promise<UserBulkOperationResult> =>
    apiClient.post<UserBulkOperationResult>('/api/user/bulk-update-status', data),

  /** 用户自助修改密码 */
  changePassword: (dto: ChangePasswordDto): Promise<void> =>
    apiClient.post<void>('/api/user/profile/change-password', dto),

  /** 用户自助修改资料 */
  updateProfile: (dto: UpdateProfileDto): Promise<UserProfile> =>
    apiClient.post<UserProfile>('/api/user/profile/update', dto),

  /** 查询管理员操作审计日志（ADMIN 及以上） */
  getAuditLogs: (query: AuditLogQuery, signal?: AbortSignal): Promise<AuditLogResult> =>
    apiClient.post<AuditLogResult>('/api/user/audit-log/list', query, signal),
};
