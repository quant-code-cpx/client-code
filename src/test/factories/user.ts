import type { UserProfile } from 'src/api/user-manage';

// ----------------------------------------------------------------------

export function createMockProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    id: 1,
    account: 'testuser',
    nickname: 'Test User',
    email: 'test@example.com',
    wechat: null,
    role: 'USER',
    status: 'ACTIVE',
    backtestQuota: 10,
    watchlistLimit: 5,
    createdAt: '2024-01-01',
    ...overrides,
  };
}
