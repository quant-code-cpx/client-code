import { http, HttpResponse } from 'msw';

import { server } from 'src/test/mocks/server';

import { apiClient, setAuthCallbacks, tokenStorage } from '../client';

// ----------------------------------------------------------------------

describe('tokenStorage', () => {
  afterEach(() => {
    tokenStorage.clear();
  });

  it('starts with null token', () => {
    expect(tokenStorage.get()).toBeNull();
  });

  it('stores and retrieves token', () => {
    tokenStorage.set('test-token-123');
    expect(tokenStorage.get()).toBe('test-token-123');
  });

  it('clears token', () => {
    tokenStorage.set('test-token-123');
    tokenStorage.clear();
    expect(tokenStorage.get()).toBeNull();
  });

  it('overwrites previous token', () => {
    tokenStorage.set('token-1');
    tokenStorage.set('token-2');
    expect(tokenStorage.get()).toBe('token-2');
  });
});

// ----------------------------------------------------------------------

describe('setAuthCallbacks', () => {
  afterEach(() => {
    setAuthCallbacks({});
    tokenStorage.clear();
  });

  it('registers and triggers onTokenRefreshed', async () => {
    const onTokenRefreshed = vi.fn();
    setAuthCallbacks({ onTokenRefreshed });

    server.use(
      http.post('/api/auth/refresh', () =>
        HttpResponse.json({ code: 0, data: { accessToken: 'callback-token' } })
      )
    );

    // Trigger a 401 so refresh kicks in
    server.use(
      http.post('/api/test/callback', ({ request }) => {
        const auth = request.headers.get('Authorization');
        if (!auth) return new HttpResponse(null, { status: 401 });
        return HttpResponse.json({ code: 0, data: { ok: true } });
      })
    );

    await apiClient.post('/api/test/callback');
    expect(onTokenRefreshed).toHaveBeenCalledWith('callback-token');
  });

  it('registers and triggers onUnauthorized when refresh fails', async () => {
    const onUnauthorized = vi.fn();
    setAuthCallbacks({ onUnauthorized });

    server.use(
      http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 })),
      http.post('/api/test/unauth', () => new HttpResponse(null, { status: 401 }))
    );

    await expect(apiClient.post('/api/test/unauth')).rejects.toThrow('登录已过期');
    expect(onUnauthorized).toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------------

describe('apiClient.post', () => {
  afterEach(() => {
    tokenStorage.clear();
    setAuthCallbacks({});
  });

  it('sends a POST request and returns unwrapped data', async () => {
    server.use(
      http.post('/api/test/hello', () =>
        HttpResponse.json({ code: 0, data: { message: 'hello' } })
      )
    );

    const result = await apiClient.post<{ message: string }>('/api/test/hello', { key: 'val' });
    expect(result.message).toBe('hello');
  });

  it('sends Bearer Authorization header when token is set', async () => {
    tokenStorage.set('my-token');
    let capturedAuth: string | null = null;

    server.use(
      http.post('/api/test/auth-check', ({ request }) => {
        capturedAuth = request.headers.get('Authorization');
        return HttpResponse.json({ code: 0, data: null });
      })
    );

    await apiClient.post('/api/test/auth-check');
    expect(capturedAuth).toBe('Bearer my-token');
  });

  it('does not send Authorization header when no token', async () => {
    let capturedAuth: string | null = null;

    server.use(
      http.post('/api/test/no-token', ({ request }) => {
        capturedAuth = request.headers.get('Authorization');
        return HttpResponse.json({ code: 0, data: null });
      })
    );

    await apiClient.post('/api/test/no-token');
    expect(capturedAuth).toBeNull();
  });

  it('throws on non-2xx response with server error message', async () => {
    server.use(
      http.post('/api/test/error', () =>
        HttpResponse.json({ message: '参数错误' }, { status: 400 })
      )
    );

    await expect(apiClient.post('/api/test/error')).rejects.toThrow('参数错误');
  });

  it('throws on non-2xx response with array message joined by ；', async () => {
    server.use(
      http.post('/api/test/array-error', () =>
        HttpResponse.json({ message: ['错误1', '错误2'] }, { status: 400 })
      )
    );

    await expect(apiClient.post('/api/test/array-error')).rejects.toThrow('错误1；错误2');
  });

  it('on 401: refreshes token and retries the original request', async () => {
    let callCount = 0;

    server.use(
      http.post('/api/auth/refresh', () =>
        HttpResponse.json({ code: 0, data: { accessToken: 'refreshed-token' } })
      ),
      http.post('/api/test/retry', ({ request }) => {
        callCount += 1;
        const auth = request.headers.get('Authorization');
        if (callCount === 1) return new HttpResponse(null, { status: 401 });
        // Second call (after refresh) should carry refreshed token
        if (auth === 'Bearer refreshed-token') {
          return HttpResponse.json({ code: 0, data: { success: true } });
        }
        return new HttpResponse(null, { status: 403 });
      })
    );

    const result = await apiClient.post<{ success: boolean }>('/api/test/retry');
    expect(result.success).toBe(true);
    expect(callCount).toBe(2);
    expect(tokenStorage.get()).toBe('refreshed-token');
  });

  it('on 401 with refresh failure: clears token and throws', async () => {
    tokenStorage.set('old-token');

    server.use(
      http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 })),
      http.post('/api/test/expire', () => new HttpResponse(null, { status: 401 }))
    );

    await expect(apiClient.post('/api/test/expire')).rejects.toThrow('登录已过期，请重新登录');
    expect(tokenStorage.get()).toBeNull();
  });
});

// ----------------------------------------------------------------------

describe('parseResponse', () => {
  afterEach(() => {
    tokenStorage.clear();
  });

  it('unwraps { code, data } wrapper format', async () => {
    server.use(
      http.post('/api/test/wrapped', () =>
        HttpResponse.json({ code: 0, data: { value: 42 } })
      )
    );

    const result = await apiClient.post<{ value: number }>('/api/test/wrapped');
    expect(result.value).toBe(42);
  });

  it('returns null for non-JSON response', async () => {
    server.use(
      http.post('/api/test/non-json', () =>
        new HttpResponse('plain text', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        })
      )
    );

    const result = await apiClient.post('/api/test/non-json');
    expect(result).toBeNull();
  });
});

// ----------------------------------------------------------------------

describe('concurrent 401 requests queue refresh once', () => {
  afterEach(() => {
    tokenStorage.clear();
    setAuthCallbacks({});
  });

  it('does not trigger multiple refresh calls for concurrent 401s', async () => {
    let refreshCount = 0;
    let callCount = 0;

    server.use(
      http.post('/api/auth/refresh', async () => {
        refreshCount += 1;
        // Simulate slight delay to allow queuing
        await new Promise((resolve) => setTimeout(resolve, 10));
        return HttpResponse.json({ code: 0, data: { accessToken: 'queued-token' } });
      }),
      http.post('/api/test/concurrent', ({ request }) => {
        callCount += 1;
        const auth = request.headers.get('Authorization');
        // First batch (no token) → 401, subsequent (after refresh) → 200
        if (!auth || auth === 'Bearer ') {
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json({ code: 0, data: { callCount } });
      })
    );

    const [r1, r2, r3] = await Promise.all([
      apiClient.post('/api/test/concurrent'),
      apiClient.post('/api/test/concurrent'),
      apiClient.post('/api/test/concurrent'),
    ]);

    // Refresh should happen only once despite multiple 401s
    expect(refreshCount).toBe(1);
    expect(r1).toBeDefined();
    expect(r2).toBeDefined();
    expect(r3).toBeDefined();
  });
});
