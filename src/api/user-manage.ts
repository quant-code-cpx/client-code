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
};
