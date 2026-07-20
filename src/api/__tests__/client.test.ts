import { apiClient, tokenStorage, setAuthCallbacks, authenticatedFetch } from '../client';

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function jsonResp(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key: string) => (key === 'content-type' ? 'application/json' : null) },
    json: () => Promise.resolve(data),
  };
}

function textResp(status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (_key: string) => 'text/plain' },
    json: () => Promise.reject(new Error('not json')),
  };
}

const mockFetch = vi.fn();

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

describe('apiClient.post', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    tokenStorage.clear();
    setAuthCallbacks({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends POST with JSON body and Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce(jsonResp({ data: 'ok' }));

    await apiClient.post('/api/test', { foo: 'bar' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/test');
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ foo: 'bar' }));
    const headers = new Headers(options.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('includes Bearer Authorization header when token is set', async () => {
    tokenStorage.set('my-access-token');
    mockFetch.mockResolvedValueOnce(jsonResp({ data: 'ok' }));

    await apiClient.post('/api/test');

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(options.headers);
    expect(headers.get('Authorization')).toBe('Bearer my-access-token');
  });

  it('omits Authorization header when no token is stored', async () => {
    mockFetch.mockResolvedValueOnce(jsonResp({ data: 'ok' }));

    await apiClient.post('/api/test');

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(options.headers);
    expect(headers.has('Authorization')).toBe(false);
  });

  it('unwraps { data } wrapper in response body', async () => {
    mockFetch.mockResolvedValueOnce(jsonResp({ code: 0, data: { value: 42 } }));

    const result = await apiClient.post<{ value: number }>('/api/test');

    expect(result).toEqual({ value: 42 });
  });

  it('throws server business message when wrapped response code is non-zero', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResp({ code: 1004, data: null, message: '验证码有误或已过期' })
    );

    await expect(apiClient.post('/api/auth/login')).rejects.toThrow('验证码有误或已过期');
  });

  it('keeps compatibility with data-only JSON responses without business code', async () => {
    mockFetch.mockResolvedValueOnce(jsonResp({ data: { value: 7 } }));

    const result = await apiClient.post<{ value: number }>('/api/raw-data');

    expect(result).toEqual({ value: 7 });
  });

  it('returns null for non-JSON response', async () => {
    mockFetch.mockResolvedValueOnce(textResp(200));

    const result = await apiClient.post('/api/test');

    expect(result).toBeNull();
  });

  it('throws error with message from server on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResp({ message: 'not found' }, 404));

    await expect(apiClient.post('/api/test')).rejects.toThrow('not found');
  });

  it('joins array message from server on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResp({ message: ['field A is required', 'field B is required'] }, 400)
    );

    await expect(apiClient.post('/api/test')).rejects.toThrow(
      'field A is required；field B is required'
    );
  });

  it('falls back to generic message when server provides no message', async () => {
    mockFetch.mockResolvedValueOnce(jsonResp({}, 500));

    await expect(apiClient.post('/api/test')).rejects.toThrow('请求失败');
  });

  it('refreshes token on 401 and retries with new token', async () => {
    tokenStorage.set('expired-token');
    mockFetch
      .mockResolvedValueOnce(jsonResp({}, 401))
      .mockResolvedValueOnce(jsonResp({ data: { accessToken: 'new-token' } }))
      .mockResolvedValueOnce(jsonResp({ data: 'success' }));

    const result = await apiClient.post('/api/protected');

    expect(result).toBe('success');
    // First call: original request
    // Second call: /api/auth/refresh
    // Third call: retry with new token
    expect(mockFetch).toHaveBeenCalledTimes(3);

    const retryCall = mockFetch.mock.calls[2] as [string, RequestInit];
    const retryHeaders = new Headers(retryCall[1].headers);
    expect(retryHeaders.get('Authorization')).toBe('Bearer new-token');
  });

  it('calls onTokenRefreshed callback after successful refresh', async () => {
    const onTokenRefreshed = vi.fn();
    setAuthCallbacks({ onTokenRefreshed });
    mockFetch
      .mockResolvedValueOnce(jsonResp({}, 401))
      .mockResolvedValueOnce(jsonResp({ data: { accessToken: 'refreshed-token' } }))
      .mockResolvedValueOnce(jsonResp({ data: null }));

    await apiClient.post('/api/protected');

    expect(onTokenRefreshed).toHaveBeenCalledWith('refreshed-token');
  });

  it('calls onUnauthorized callback when refresh fails and clears token', async () => {
    const onUnauthorized = vi.fn();
    setAuthCallbacks({ onUnauthorized });
    tokenStorage.set('expired-token');

    mockFetch
      .mockResolvedValueOnce(jsonResp({}, 401))
      .mockResolvedValueOnce(jsonResp({}, 401)) // refresh also fails
      .mockResolvedValueOnce(jsonResp({})); // logout fire-and-forget

    await expect(apiClient.post('/api/protected')).rejects.toThrow('登录已过期，请重新登录');

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(tokenStorage.get()).toBeNull();
  });

  it('calls logout endpoint when refresh fails, then clears state', async () => {
    setAuthCallbacks({ onUnauthorized: vi.fn() });
    tokenStorage.set('expired-token');

    mockFetch
      .mockResolvedValueOnce(jsonResp({}, 401))
      .mockResolvedValueOnce(jsonResp({}, 401)) // refresh fails
      .mockResolvedValueOnce(jsonResp({})); // logout call (fire-and-forget)

    await expect(apiClient.post('/api/protected')).rejects.toThrow();

    // logout endpoint should be called (even if we can't await it from the outside)
    await vi.waitFor(() => {
      const calls = mockFetch.mock.calls.map(([url]) => url as string);
      expect(calls).toContain('/api/auth/logout');
    });
  });

  it('does not send duplicate refresh requests for concurrent 401s', async () => {
    tokenStorage.set('expired-token');
    mockFetch
      .mockResolvedValueOnce(jsonResp({}, 401)) // request A - 401
      .mockResolvedValueOnce(jsonResp({}, 401)) // request B - 401
      .mockResolvedValueOnce(jsonResp({ data: { accessToken: 'new-token' } })) // single refresh
      .mockResolvedValueOnce(jsonResp({ data: 'result-a' })) // retry A
      .mockResolvedValueOnce(jsonResp({ data: 'result-b' })); // retry B

    const [resultA, resultB] = await Promise.all([
      apiClient.post('/api/a'),
      apiClient.post('/api/b'),
    ]);

    expect(resultA).toBe('result-a');
    expect(resultB).toBe('result-b');

    const refreshCalls = mockFetch.mock.calls.filter(
      ([url]) => (url as string) === '/api/auth/refresh'
    );
    // Only ONE refresh call should have been made despite two concurrent 401s
    expect(refreshCalls).toHaveLength(1);
  });

  it('reuses a token refreshed by another request when a late 401 arrives', async () => {
    tokenStorage.set('expired-token');
    let resolveLate401: ((response: ReturnType<typeof jsonResp>) => void) | undefined;
    const late401 = new Promise<ReturnType<typeof jsonResp>>((resolve) => {
      resolveLate401 = resolve;
    });
    let requestACount = 0;
    let requestBCount = 0;

    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/a') {
        requestACount += 1;
        if (requestACount === 1) return Promise.resolve(jsonResp({}, 401));
        resolveLate401?.(jsonResp({}, 401));
        return Promise.resolve(jsonResp({ data: 'result-a' }));
      }
      if (url === '/api/b') {
        requestBCount += 1;
        return requestBCount === 1
          ? late401
          : Promise.resolve(jsonResp({ data: 'result-b' }));
      }
      if (url === '/api/auth/refresh') {
        return Promise.resolve(jsonResp({ data: { accessToken: 'fresh-token' } }));
      }
      return Promise.resolve(jsonResp({}));
    });

    await expect(
      Promise.all([apiClient.post('/api/a'), apiClient.post('/api/b')])
    ).resolves.toEqual(['result-a', 'result-b']);

    expect(
      mockFetch.mock.calls.filter(([url]) => (url as string) === '/api/auth/refresh')
    ).toHaveLength(1);
    const retryB = mockFetch.mock.calls.find(
      ([url], index) => url === '/api/b' && index > 1
    ) as [string, RequestInit] | undefined;
    expect(new Headers(retryB?.[1].headers).get('Authorization')).toBe('Bearer fresh-token');
  });

  it('expires the session only once when concurrent callers share a failed refresh', async () => {
    const onUnauthorized = vi.fn();
    setAuthCallbacks({ onUnauthorized });
    tokenStorage.set('expired-token');
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/auth/refresh') return Promise.resolve(jsonResp({}, 401));
      return Promise.resolve(jsonResp({}, url === '/api/auth/logout' ? 200 : 401));
    });

    const results = await Promise.allSettled([
      apiClient.post('/api/a'),
      apiClient.post('/api/b'),
    ]);

    expect(results.every((result) => result.status === 'rejected')).toBe(true);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(
      mockFetch.mock.calls.filter(([url]) => (url as string) === '/api/auth/logout')
    ).toHaveLength(1);
  });

  it('shares one refresh between JSON and raw streaming requests', async () => {
    tokenStorage.set('expired-token');
    const rawResponse = jsonResp({ data: 'raw' });
    mockFetch
      .mockResolvedValueOnce(jsonResp({}, 401))
      .mockResolvedValueOnce(jsonResp({}, 401))
      .mockResolvedValueOnce(jsonResp({ data: { accessToken: 'shared-token' } }))
      .mockResolvedValueOnce(jsonResp({ data: 'json' }))
      .mockResolvedValueOnce(rawResponse);

    const [jsonResult, streamResponse] = await Promise.all([
      apiClient.post('/api/json'),
      authenticatedFetch('/api/stream', { headers: { Accept: 'text/event-stream' } }),
    ]);

    expect(jsonResult).toBe('json');
    expect(streamResponse).toBe(rawResponse);
    expect(
      mockFetch.mock.calls.filter(([url]) => (url as string) === '/api/auth/refresh')
    ).toHaveLength(1);

    const replayHeaders = mockFetch.mock.calls.slice(-2).map(([, init]) => new Headers(init.headers));
    expect(replayHeaders.every((headers) => headers.get('Authorization') === 'Bearer shared-token')).toBe(
      true
    );
  });

  it('returns raw responses without parsing their body', async () => {
    const rawResponse = textResp(200);
    mockFetch.mockResolvedValueOnce(rawResponse);

    const result = await authenticatedFetch('/api/raw', { headers: { Accept: 'text/event-stream' } });

    expect(result).toBe(rawResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ----------------------------------------------------------------------

describe('setAuthCallbacks', () => {
  it('registers callbacks that are triggered by apiClient internals', () => {
    const onUnauthorized = vi.fn();
    setAuthCallbacks({ onUnauthorized });
    // The callback itself is just a reference; verifying it was stored is tested
    // indirectly in the 401 → refresh-failure tests above.
    // Here we verify the registration call itself does not throw.
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
