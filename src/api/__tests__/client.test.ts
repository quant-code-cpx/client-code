import { tokenStorage } from '../client';

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
