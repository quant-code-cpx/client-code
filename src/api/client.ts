// ----------------------------------------------------------------------
// 统一 API 客户端
// BASE_URL: 开发环境留空（Vite 代理处理），生产环境通过 VITE_API_BASE_URL 配置
// ----------------------------------------------------------------------

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? '';

// ---------- Token 存储（内存，非 localStorage） ----------
// Access token 存内存而非 localStorage，防止 XSS 通过 localStorage 窃取 token。
// 页面刷新后通过 HttpOnly Cookie 携带的 refresh token 静默重新获取 access token。

let _accessToken: string | null = null;

export const tokenStorage = {
  get: (): string | null => _accessToken,
  set: (token: string): void => {
    _accessToken = token;
  },
  clear: (): void => {
    _accessToken = null;
  },
};

// ---------- Auth 回调（由 AuthProvider 注册，避免循环依赖） ----------

type AuthCallbacks = {
  onTokenRefreshed?: (token: string) => void;
  onUnauthorized?: () => void;
};

let authCallbacks: AuthCallbacks = {};

export function setAuthCallbacks(callbacks: AuthCallbacks): void {
  authCallbacks = callbacks;
}

// ---------- Token 刷新队列（防止并发重复刷新） ----------

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function attemptRefresh(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      refreshQueue.push((token) => {
        if (token) resolve(token);
        else reject(new Error('Token refresh failed'));
      });
    });
  }

  isRefreshing = true;

  try {
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Refresh failed');

    const json: ApiWrapper<{ accessToken: string }> = await response.json();
    const accessToken =
      json.data?.accessToken ?? (json as unknown as { accessToken: string }).accessToken;
    tokenStorage.set(accessToken);
    authCallbacks.onTokenRefreshed?.(accessToken);
    refreshQueue.forEach((cb) => cb(accessToken));
    return accessToken;
  } catch (err) {
    refreshQueue.forEach((cb) => cb(null));
    throw err;
  } finally {
    isRefreshing = false;
    refreshQueue = [];
  }
}

// ---------- 核心请求函数 ----------

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Token 过期 → 尝试刷新后重试
  if (response.status === 401) {
    try {
      const newToken = await attemptRefresh();
      const retryResponse = await fetch(`${BASE_URL}${url}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
        credentials: 'include',
      });

      if (!retryResponse.ok) {
        const errBody = await retryResponse.json().catch(() => ({}));
        const raw = errBody as { message?: string | string[] };
        const msg = Array.isArray(raw.message)
          ? raw.message.join('；')
          : (raw.message ?? '请求失败');
        throw new Error(msg);
      }

      return parseResponse<T>(retryResponse);
    } catch {
      // Refresh token is also expired/invalid → best-effort server-side logout to clear the
      // refresh_token cookie and revoke the session, then clear local state.
      // NOTE: We use raw fetch (not apiClient) here to avoid triggering another refresh
      // attempt (apiClient retries 401s via attemptRefresh, which would cause an infinite loop).
      const currentToken = tokenStorage.get();
      fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
      }).catch(() => {});
      tokenStorage.clear();
      authCallbacks.onUnauthorized?.();
      throw new Error('登录已过期，请重新登录');
    }
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const raw = errBody as { message?: string | string[] };
    const msg = Array.isArray(raw.message) ? raw.message.join('；') : (raw.message ?? '请求失败');
    throw new Error(msg);
  }

  return parseResponse<T>(response);
}

// 统一响应包装器
interface ApiWrapper<T> {
  code: number;
  data: T;
  message?: string | string[];
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return null as T;
  }
  const json = (await response.json()) as ApiWrapper<T>;
  // 服务端统一包装格式：{ code, data, message? }
  // 若响应体本身就含 data 字段则解包，否则原样返回（兼容无包装场景）
  if (json !== null && typeof json === 'object' && 'data' in json) {
    return json.data;
  }
  return json as unknown as T;
}

// ---------- 对外暴露的 API 方法 ----------

export const apiClient = {
  post: <T>(url: string, body?: unknown): Promise<T> =>
    request<T>(url, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  get: <T>(url: string): Promise<T> => request<T>(url, { method: 'GET' }),
};
