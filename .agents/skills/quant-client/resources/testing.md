# Testing Guide — Full Reference

> Load this file when: writing tests, reviewing test quality, or setting up a new test module.
> Test runner: **Vitest**. Component testing: **@testing-library/react**. API mocking: **MSW** (Mock Service Worker).

---

## Core Principles (Non-Negotiable)

**Tests must be based on business logic. Never assume existing code is bug-free.**

1. **Business behavior first**: Each test must correspond to a real business rule. Understand the module's purpose before writing tests.

2. **Do NOT trust existing implementation**: Think independently about what the correct behavior should be. If the code is wrong, the test should fail.

3. **Cover boundaries and error paths**: Beyond the happy path, cover:

   - 401 token expiry: refresh / retry / sign-out flow
   - Concurrent requests should only trigger one refresh (not N)
   - `canManage('SUPER_ADMIN')` must return `false` for everyone including SUPER_ADMIN
   - `signOut` must clear local state even when the API throws
   - API parameter naming (`code` vs `tsCode`) must match backend DTO

4. **Forbidden test types**:

   - Only verifying "doesn't throw" without checking return value
   - Only verifying mock was called without checking call arguments
   - Copy-pasting current code output as the expected value (unless explicitly a regression test)
   - Testing internal implementation (e.g. how many times `useState` was called)

5. **Tests as documentation**: `describe` / `it` descriptions must clearly express business meaning.

### ✅ Good examples

```ts
// Business rule: SUPER_ADMIN is protected — no one can manage them
it('SUPER_ADMIN CANNOT manage another SUPER_ADMIN', () => {
  setRole('SUPER_ADMIN');
  const { result } = renderHook(() => usePermission());
  expect(result.current.canManage('SUPER_ADMIN')).toBe(false);
});

// Business rule: signOut must clear state even when logout API fails
it('signOut clears state even when authApi.logout throws', async () => {
  vi.mocked(authApi.logout).mockRejectedValue(new Error('network error'));
  await act(async () => {
    await signOut();
  });
  expect(store.getState().isAuthenticated).toBe(false);
  expect(tokenStorage.getAccessToken()).toBeNull();
});
```

### ❌ Forbidden examples

```ts
// No business behavior checked
it('should work', () => {
  expect(() => formatNumber(123)).not.toThrow();
});

// Copy-pasted output — if formatNumber has a bug (should be '123.00'), this passes
it('returns correct value', () => {
  expect(formatNumber(123)).toBe('123');
});
```

---

## File Structure

```
src/
├── utils/
│   ├── format-number.ts
│   └── __tests__/
│       └── format-number.test.ts    ← import from '../format-number'
├── api/
│   ├── client.ts
│   └── __tests__/
│       └── client.test.ts
├── auth/
│   ├── auth-reducer.ts
│   └── __tests__/
│       └── auth-reducer.test.ts
└── test/                            ← shared infrastructure
    ├── setup.ts
    └── test-utils.tsx
```

**Naming**:

| Type           | Format                 | Example                 |
| -------------- | ---------------------- | ----------------------- |
| Unit test      | `<module>.test.ts`     | `format-number.test.ts` |
| Component test | `<component>.test.tsx` | `label.test.tsx`        |

**Import path**: always `../` (one level up from `__tests__/`):

```ts
// ✅ Correct
import { fNumber } from '../format-number';

// ❌ Wrong
import { fNumber } from './format-number';
```

---

## Unit Test Template (utility functions)

```ts
import { describe, it, expect } from 'vitest';
import { fWanYuan } from '../format-number';

describe('fWanYuan', () => {
  it('formats 10000 wan as 1.00 yi', () => {
    expect(fWanYuan(10000)).toBe('1.00亿');
  });

  it('formats values below 10000 wan in wan', () => {
    expect(fWanYuan(500)).toBe('500.00万');
  });

  it('returns "-" for null input', () => {
    expect(fWanYuan(null)).toBe('-');
  });

  it('returns "-" for undefined input', () => {
    expect(fWanYuan(undefined)).toBe('-');
  });

  it('appends suffix when provided', () => {
    expect(fWanYuan(50000, 2, '元')).toBe('5.00亿元');
  });
});
```

---

## Component Test Template (with MSW)

```tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { MyComponent } from '../my-component';

// ── MSW server setup ──────────────────────────────────────────
const server = setupServer(
  http.post('/api/some-endpoint', () => HttpResponse.json({ data: [{ id: 1, name: 'Test Item' }] }))
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

// ── Tests ─────────────────────────────────────────────────────
describe('MyComponent', () => {
  it('displays fetched items after loading', async () => {
    render(<MyComponent />);

    // Loading state
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Data rendered
    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });
  });

  it('shows error message when API fails', async () => {
    server.use(
      http.post('/api/some-endpoint', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 })
      )
    );

    render(<MyComponent />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('加载');
    });
  });
});
```

---

## Hook Test Template

```ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useMyHook } from '../use-my-hook';

describe('useMyHook', () => {
  it('initial state is correct', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(false);
  });

  it('toggle flips value', () => {
    const { result } = renderHook(() => useMyHook());
    act(() => {
      result.current.onToggle();
    });
    expect(result.current.value).toBe(true);
  });
});
```

---

## When to Update Tests

| Source file change                         | Required test update                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| Add exported function                      | Add test cases in `__tests__/`                                            |
| Change function signature or behavior      | Update affected assertions                                                |
| Delete function                            | Remove corresponding test cases                                           |
| Add new source module                      | Create `__tests__/<module>.test.ts` covering main paths + null/edge cases |
| Change type definitions (e.g. `AuthState`) | Check mock objects still match the new type                               |

**Workflow**: After completing Phase 2 implementation code, before running `yarn build`, check whether tests need to be added or updated.

---

## Test Scripts

```bash
npm test              # Run all tests (CI)
npm run test:watch    # Watch mode for development
npm run test:coverage # Coverage report (html + lcov)
npm run test:ui       # Vitest visual UI
```
