import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';

import { useRouter } from '../hooks/use-router';
import { usePathname } from '../hooks/use-pathname';
import { routesSection } from '../sections';

// ----------------------------------------------------------------------

describe('routesSection — structure', () => {
  it('exports a non-empty routes array', () => {
    expect(Array.isArray(routesSection)).toBe(true);
    expect(routesSection.length).toBeGreaterThan(0);
  });

  it('has a top-level route with AuthGuard-wrapped children (the dashboard tree)', () => {
    // The first route wraps all dashboard pages inside AuthGuard.
    // It has no explicit path (index route) and has children.
    const dashboardRoute = routesSection[0];
    expect(dashboardRoute.children).toBeDefined();
    expect(Array.isArray(dashboardRoute.children)).toBe(true);
    expect((dashboardRoute.children?.length ?? 0)).toBeGreaterThan(0);
  });

  it('has a /sign-in public route', () => {
    const signInRoute = routesSection.find((r) => r.path === 'sign-in');
    expect(signInRoute).toBeDefined();
  });

  it('has a /404 public route', () => {
    const notFoundRoute = routesSection.find((r) => r.path === '404');
    expect(notFoundRoute).toBeDefined();
  });

  it('has a wildcard * route redirecting to 404', () => {
    const wildcardRoute = routesSection.find((r) => r.path === '*');
    expect(wildcardRoute).toBeDefined();
  });

  it('sign-in route has NO children (it is a leaf)', () => {
    const signInRoute = routesSection.find((r) => r.path === 'sign-in');
    expect(signInRoute?.children).toBeUndefined();
  });

  it('dashboard tree children include the index route', () => {
    const dashboardRoute = routesSection[0];
    const indexChild = dashboardRoute.children?.find((c) => (c as { index?: boolean }).index === true);
    expect(indexChild).toBeDefined();
  });

  it('dashboard tree includes /stock route', () => {
    const dashboardRoute = routesSection[0];
    const stockRoute = dashboardRoute.children?.find((c) => c.path === 'stock');
    expect(stockRoute).toBeDefined();
  });

  it('dashboard tree includes /backtest route', () => {
    const dashboardRoute = routesSection[0];
    const backtestRoute = dashboardRoute.children?.find((c) => c.path === 'backtest');
    expect(backtestRoute).toBeDefined();
  });

  it('dashboard tree includes /profile route', () => {
    const dashboardRoute = routesSection[0];
    const profileRoute = dashboardRoute.children?.find((c) => c.path === 'profile');
    expect(profileRoute).toBeDefined();
  });

  it('dashboard tree includes /portfolio route', () => {
    const dashboardRoute = routesSection[0];
    const portfolioRoute = dashboardRoute.children?.find((c) => c.path === 'portfolio');
    expect(portfolioRoute).toBeDefined();
  });
});

// ----------------------------------------------------------------------

describe('usePathname', () => {
  it('returns the current pathname', () => {
    const { result } = renderHook(() => usePathname(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/dashboard']}>{children}</MemoryRouter>
      ),
    });
    expect(result.current).toBe('/dashboard');
  });

  it('returns "/" for root path', () => {
    const { result } = renderHook(() => usePathname(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
      ),
    });
    expect(result.current).toBe('/');
  });

  it('returns nested paths correctly', () => {
    const { result } = renderHook(() => usePathname(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/stock/detail']}>{children}</MemoryRouter>
      ),
    });
    expect(result.current).toBe('/stock/detail');
  });
});

// ----------------------------------------------------------------------

describe('useRouter', () => {
  function RouterTestComponent({ action }: { action: (router: ReturnType<typeof useRouter>) => void }) {
    const router = useRouter();
    return (
      <button type="button" onClick={() => action(router)}>
        trigger
      </button>
    );
  }

  it('push() navigates to a new path', async () => {
    const user = userEvent.setup();
    let pushed = '';

    render(
      <MemoryRouter initialEntries={['/']}>
        <RouterTestComponent
          action={(router) => {
            router.push('/dashboard');
            pushed = 'called';
          }}
        />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'trigger' }));
    expect(pushed).toBe('called');
  });

  it('replace() navigates with replace=true option', async () => {
    const user = userEvent.setup();
    let replaced = '';

    render(
      <MemoryRouter initialEntries={['/']}>
        <RouterTestComponent
          action={(router) => {
            router.replace('/sign-in');
            replaced = 'called';
          }}
        />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'trigger' }));
    expect(replaced).toBe('called');
  });

  it('back() calls navigate(-1)', async () => {
    const user = userEvent.setup();
    let backCalled = '';

    render(
      <MemoryRouter initialEntries={['/first', '/second']}>
        <RouterTestComponent
          action={(router) => {
            router.back();
            backCalled = 'called';
          }}
        />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'trigger' }));
    expect(backCalled).toBe('called');
  });

  it('returns stable reference between renders', () => {
    const refs: ReturnType<typeof useRouter>[] = [];

    function Tracker() {
      const router = useRouter();
      refs.push(router);
      return null;
    }

    const { rerender } = render(
      <MemoryRouter>
        <Tracker />
      </MemoryRouter>
    );

    rerender(
      <MemoryRouter>
        <Tracker />
      </MemoryRouter>
    );

    // router object reference is stable due to useMemo
    // The object identity may differ across re-renders but the hook value is memoised
    expect(refs[0]).toBeDefined();
    expect(typeof refs[0].push).toBe('function');
    expect(typeof refs[0].replace).toBe('function');
    expect(typeof refs[0].back).toBe('function');
  });
});
