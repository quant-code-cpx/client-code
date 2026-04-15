import { authApi } from '../auth';

// Mock apiClient so tests verify endpoint/params without real network calls.
vi.mock('src/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

 
import { apiClient } from 'src/api/client';

// ----------------------------------------------------------------------

describe('authApi.getCaptcha', () => {
  it('calls POST /api/auth/captcha with no body', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ captchaId: 'id-1', svgImage: '<svg/>' });

    const result = await authApi.getCaptcha();

    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith('/api/auth/captcha');
    expect(result.captchaId).toBe('id-1');
  });
});

// ----------------------------------------------------------------------

describe('authApi.login', () => {
  it('calls POST /api/auth/login with complete DTO', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ accessToken: 'tok' });

    await authApi.login({
      account: 'admin',
      password: 'secret',
      captchaId: 'cap-id',
      captchaCode: 'ABCD',
    });

    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith('/api/auth/login', {
      account: 'admin',
      password: 'secret',
      captchaId: 'cap-id',
      captchaCode: 'ABCD',
    });
  });

  it('returns accessToken from server response', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ accessToken: 'user-token' });

    const result = await authApi.login({
      account: 'u',
      password: 'p',
      captchaId: 'cid',
      captchaCode: 'cc',
    });

    expect(result.accessToken).toBe('user-token');
  });

  it('propagates error when login fails', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('验证码错误'));

    await expect(
      authApi.login({ account: 'u', password: 'p', captchaId: 'cid', captchaCode: 'wrong' })
    ).rejects.toThrow('验证码错误');
  });
});

// ----------------------------------------------------------------------

describe('authApi.refresh', () => {
  it('calls POST /api/auth/refresh with no body', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ accessToken: 'refreshed' });

    await authApi.refresh();

    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith('/api/auth/refresh');
  });
});

// ----------------------------------------------------------------------

describe('authApi.logout', () => {
  it('calls POST /api/auth/logout', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce(undefined);

    await authApi.logout();

    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith('/api/auth/logout');
  });
});
