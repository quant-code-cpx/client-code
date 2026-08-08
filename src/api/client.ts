// ----------------------------------------------------------------------
// 统一 API 客户端
// API_BASE_URL: 开发环境留空（Vite 代理处理），生产环境通过 VITE_API_URL 配置。
// VITE_API_BASE_URL 保留兼容现有部署。
// ----------------------------------------------------------------------

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  '';
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

// ---------- Token 存储（内存，非 localStorage） ----------

let accessToken: string | null = null;
let sessionExpired = false;
let tokenEpoch = 0;

export const tokenStorage = {
  get: (): string | null => accessToken,
  set: (token: string): void => {
    tokenEpoch += 1;
    accessToken = token;
    sessionExpired = false;
  },
  clear: (): void => {
    tokenEpoch += 1;
    accessToken = null;
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

// ---------- Token 单飞刷新 ----------

let refreshPromise: Promise<string> | null = null;

interface ApiWrapper<T> {
  code: number | string;
  data: T;
  message?: string | string[];
}

type ApiErrorBody = {
  code?: number | string;
  data?: unknown;
  details?: unknown;
  message?: string | string[];
  requestId?: string;
};

export class ApiError extends Error {
  readonly status: number;

  readonly code?: number | string;

  readonly details?: unknown;

  readonly requestId?: string;

  constructor(
    message: string,
    options: {
      status: number;
      code?: number | string;
      details?: unknown;
      requestId?: string;
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId;
  }
}

export type ApiRequestOptions = {
  retryOnUnauthorized?: boolean;
  timeoutMs?: number;
};

class TokenStateChangedError extends Error {
  constructor() {
    super('Token state changed while refreshing');
    this.name = 'TokenStateChangedError';
  }
}

type TimeoutSignal = {
  signal: AbortSignal | undefined;
  didTimeout: () => boolean;
  cleanup: () => void;
};

function createTimeoutSignal(signal: AbortSignal | undefined, timeoutMs: number | undefined): TimeoutSignal {
  if (!timeoutMs || timeoutMs <= 0) {
    return { signal, didTimeout: () => false, cleanup: () => {} };
  }

  const controller = new AbortController();
  let timedOut = false;
  const abortFromParent = () => controller.abort();

  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abortFromParent, { once: true });

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abortFromParent);
    },
  };
}

function resolveApiInput(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input !== 'string') return input;
  if (/^[a-z][a-z\d+.-]*:/i.test(input)) return input;
  return `${API_BASE_URL}${input}`;
}

function mergeHeaders(input: RequestInfo | URL, init: RequestInit, token: string | null): Headers {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));

  if (token) headers.set('Authorization', `Bearer ${token}`);
  else headers.delete('Authorization');

  return headers;
}

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshStartEpoch = tokenEpoch;
    const timeout = createTimeoutSignal(undefined, 10_000);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        signal: timeout.signal,
      });

      if (!response.ok) throw new Error('Refresh failed');

      const json = (await response.json()) as ApiWrapper<{ accessToken: string }> & {
        accessToken?: string;
      };
      const token = json.data?.accessToken ?? json.accessToken;
      if (!token) throw new Error('Refresh response missing access token');
      if (tokenEpoch !== refreshStartEpoch) throw new TokenStateChangedError();

      tokenStorage.set(token);
      authCallbacks.onTokenRefreshed?.(token);
      return token;
    } finally {
      timeout.cleanup();
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function expireSession(): void {
  if (sessionExpired) return;
  sessionExpired = true;
  // 刷新失败只结束当前页面的内存会话。这里不能调用 logout：多个标签共享
  // HttpOnly Refresh Cookie，一个陈旧标签的失败不应撤销其他标签刚轮换成功的 Token。
  // 服务端撤销只属于用户明确执行的 signOut。
  tokenStorage.clear();
  authCallbacks.onUnauthorized?.();
}

export type AuthenticatedFetchOptions = {
  retryOnUnauthorized?: boolean;
};

/**
 * Bearer-authenticated raw fetch. JSON and streaming clients share one refresh promise.
 * A request is replayed at most once after a 401.
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const resolvedInput = resolveApiInput(input);
  const requestToken = tokenStorage.get();
  const replayableInput = (): RequestInfo | URL =>
    resolvedInput instanceof Request ? resolvedInput.clone() : resolvedInput;
  const requestInit: RequestInit = {
    ...init,
    credentials: init.credentials ?? 'include',
    headers: mergeHeaders(input, init, requestToken),
  };
  const response = await fetch(replayableInput(), requestInit);

  if (response.status !== 401 || options.retryOnUnauthorized === false) return response;
  void response.body?.cancel().catch(() => {});

  let refreshedToken: string | null;
  const currentToken = tokenStorage.get();
  if (currentToken !== requestToken) {
    refreshedToken = currentToken;
  } else {
    try {
      refreshedToken = await refreshAccessToken();
    } catch (error) {
      if (error instanceof TokenStateChangedError) {
        refreshedToken = tokenStorage.get();
      } else {
        expireSession();
        throw new Error('登录已过期，请重新登录');
      }
    }
  }

  // 用户已在请求期间主动登出时，不得把旧请求的 401 转换为刷新会话。
  if (!refreshedToken) {
    return response;
  }

  const retryResponse = await fetch(replayableInput(), {
    ...requestInit,
    headers: mergeHeaders(input, init, refreshedToken),
  });
  if (retryResponse.status === 401) {
    void retryResponse.body?.cancel().catch(() => {});
    expireSession();
    throw new Error('登录已过期，请重新登录');
  }
  return retryResponse;
}

// ---------- JSON 请求 ----------

function responseMessage(body: unknown): string {
  if (body === null || typeof body !== 'object') return '请求失败';

  const message = (body as { message?: string | string[] }).message;
  if (Array.isArray(message)) return message.join('；');
  return message ?? '请求失败';
}

function toApiError(response: Response, body: unknown): ApiError {
  const errorBody = body as ApiErrorBody;
  const nestedDetails =
    errorBody?.data && typeof errorBody.data === 'object' && !Array.isArray(errorBody.data)
      ? (errorBody.data as { details?: unknown }).details
      : undefined;
  return new ApiError(responseMessage(body), {
    status: response.status,
    code: errorBody?.code,
    details: errorBody?.details ?? nestedDetails,
    requestId: errorBody?.requestId,
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null as T;

  const json = (await response.json()) as ApiWrapper<T> & ApiErrorBody;
  if (json !== null && typeof json === 'object' && 'data' in json) {
    if ('code' in json && json.code !== 0 && json.code !== '0') throw toApiError(response, json);
    return json.data;
  }
  return json as T;
}

async function request<T>(
  url: string,
  options: RequestInit = {},
  requestOptions: ApiRequestOptions = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const timeout = createTimeoutSignal(
    options.signal ?? undefined,
    requestOptions.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
  );

  let response: Response;
  try {
    response = await authenticatedFetch(
      url,
      { ...options, headers, signal: timeout.signal },
      { retryOnUnauthorized: requestOptions.retryOnUnauthorized }
    );
  } catch (error) {
    if (timeout.didTimeout()) {
      throw new ApiError('请求超时，请稍后重试', { status: 408, code: 'REQUEST_TIMEOUT' });
    }
    throw error;
  } finally {
    timeout.cleanup();
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw toApiError(response, errorBody);
  }

  return parseResponse<T>(response);
}

// ---------- 对外暴露的 API 方法 ----------

export const apiClient = {
  post: <T>(
    url: string,
    body?: unknown,
    signal?: AbortSignal,
    requestOptions?: ApiRequestOptions
  ): Promise<T> =>
    request<T>(
      url,
      {
        method: 'POST',
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      },
      requestOptions
    ),

  get: <T>(url: string, signal?: AbortSignal, requestOptions?: ApiRequestOptions): Promise<T> =>
    request<T>(url, { method: 'GET', signal }, requestOptions),

  put: <T>(
    url: string,
    body?: unknown,
    signal?: AbortSignal,
    requestOptions?: ApiRequestOptions
  ): Promise<T> =>
    request<T>(
      url,
      {
        method: 'PUT',
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      },
      requestOptions
    ),

  patch: <T>(
    url: string,
    body?: unknown,
    signal?: AbortSignal,
    requestOptions?: ApiRequestOptions
  ): Promise<T> =>
    request<T>(
      url,
      {
        method: 'PATCH',
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      },
      requestOptions
    ),

  delete: <T>(url: string, signal?: AbortSignal, requestOptions?: ApiRequestOptions): Promise<T> =>
    request<T>(url, { method: 'DELETE', signal }, requestOptions),
};
