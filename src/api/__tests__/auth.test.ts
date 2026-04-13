import { http, HttpResponse } from 'msw';

import { server } from 'src/test/mocks/server';

import { authApi } from '../auth';
import { tokenStorage } from '../client';

// ----------------------------------------------------------------------

describe('authApi.getCaptcha', () => {
  it('returns captchaId and svgImage', async () => {
    const result = await authApi.getCaptcha();
    expect(result.captchaId).toBe('cap-001');
    expect(result.svgImage).toBe('<svg>mock</svg>');
  });
});

// ----------------------------------------------------------------------

describe('authApi.login', () => {
  it('sends login payload and returns accessToken', async () => {
    let captured: unknown = null;

    server.use(
      http.post('/api/auth/login', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({ code: 0, data: { accessToken: 'login-token' } });
      })
    );

    const result = await authApi.login({
      account: 'admin',
      password: 'pass123',
      captchaId: 'cap-001',
      captchaCode: 'ABCD',
    });

    expect(result.accessToken).toBe('login-token');
    expect(captured).toEqual({
      account: 'admin',
      password: 'pass123',
      captchaId: 'cap-001',
      captchaCode: 'ABCD',
    });
  });

  it('throws on login failure (400 with message)', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ message: '验证码错误' }, { status: 400 })
      )
    );

    await expect(
      authApi.login({ account: 'a', password: 'b', captchaId: 'x', captchaCode: 'y' })
    ).rejects.toThrow('验证码错误');
  });
});

// ----------------------------------------------------------------------

describe('authApi.refresh', () => {
  afterEach(() => {
    tokenStorage.clear();
  });

  it('returns new accessToken', async () => {
    const result = await authApi.refresh();
    expect(result.accessToken).toBe('refreshed-token');
  });

  it('throws when refresh endpoint returns 401', async () => {
    server.use(
      http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 }))
    );

    await expect(authApi.refresh()).rejects.toThrow();
  });
});

// ----------------------------------------------------------------------

describe('authApi.logout', () => {
  it('calls /api/auth/logout and resolves', async () => {
    let called = false;

    server.use(
      http.post('/api/auth/logout', () => {
        called = true;
        return HttpResponse.json({ code: 0, data: null });
      })
    );

    await expect(authApi.logout()).resolves.not.toThrow();
    expect(called).toBe(true);
  });
});
