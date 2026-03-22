import { apiClient } from './client';

// ----------------------------------------------------------------------
// Auth 相关接口类型定义
// ----------------------------------------------------------------------

export interface CaptchaResponse {
  /** 验证码唯一标识，登录时需回传给 /api/auth/login */
  captchaId: string;
  /** SVG 字符串，前端直接渲染（字段名来自真实接口响应）*/
  svgImage: string;
}

export interface LoginDto {
  /** 登录账号 */
  account: string;
  /** 密码 */
  password: string;
  /** 验证码 ID（由 getCaptcha 获取） */
  captchaId: string;
  /** 验证码文本（不区分大小写） */
  captchaCode: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

// ----------------------------------------------------------------------
// Auth API 封装
// ----------------------------------------------------------------------

export const authApi = {
  /**
   * 获取图片验证码
   * POST /api/auth/captcha
   */
  getCaptcha: (): Promise<CaptchaResponse> => apiClient.post<CaptchaResponse>('/api/auth/captcha'),

  /**
   * 登录（验证码 + 账号密码）
   * POST /api/auth/login
   */
  login: (data: LoginDto): Promise<LoginResponse> =>
    apiClient.post<LoginResponse>('/api/auth/login', data),

  /**
   * 刷新 AccessToken（依赖 HttpOnly Cookie refresh_token）
   * POST /api/auth/refresh
   */
  refresh: (): Promise<RefreshResponse> => apiClient.post<RefreshResponse>('/api/auth/refresh'),

  /**
   * 登出
   * POST /api/auth/logout
   */
  logout: (): Promise<void> => apiClient.post<void>('/api/auth/logout'),
};
