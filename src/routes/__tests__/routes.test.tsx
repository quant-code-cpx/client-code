import type { ReactElement } from 'react';

import { Navigate } from 'react-router-dom';
import { renderHook } from '@testing-library/react';

import { AuthGuard } from 'src/routes/components';
import { useRouter } from 'src/routes/hooks/use-router';

// Lazy components are never rendered here; mock the layouts to avoid heavy imports
vi.mock('src/layouts/auth', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('src/layouts/dashboard', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useNavigate so useRouter tests need no router context
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock('react-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import { routesSection, createAgentRoutes } from 'src/routes/sections';

import { createNavData } from 'src/layouts/nav-config-dashboard';

// ----------------------------------------------------------------------

describe('路由结构 — 静态配置断言', () => {
  describe('受保护路由组', () => {
    it('routesSection[0] 的 element 最外层是 AuthGuard', () => {
      const rootElement = routesSection[0].element as ReactElement;
      expect(rootElement.type).toBe(AuthGuard);
    });

    it('受保护路由组包含 children 子路由', () => {
      expect(routesSection[0].children).toBeDefined();
      expect((routesSection[0].children as unknown[]).length).toBeGreaterThan(0);
    });
  });

  describe('Agent feature flag', () => {
    it('关闭时不暴露 Agent route 与导航', () => {
      expect(createAgentRoutes(false)).toEqual([]);
      expect(createNavData(false).some((item) => item.path === '/agent')).toBe(false);
    });

    it('开启时注册新建态、深链与导航', () => {
      expect(createAgentRoutes(true).map((route) => route.path)).toEqual([
        'agent',
        'agent/:conversationId',
      ]);
      expect(createNavData(true).some((item) => item.path === '/agent')).toBe(true);
    });
  });

  describe('公开路由 — /sign-in', () => {
    it('/sign-in 路由存在且 path 正确', () => {
      const signInRoute = routesSection.find((r) => r.path === 'sign-in');
      expect(signInRoute).toBeDefined();
    });

    it('/sign-in 路由的 element 不是 AuthGuard', () => {
      const signInRoute = routesSection.find((r) => r.path === 'sign-in');
      const el = signInRoute?.element as ReactElement | undefined;
      expect(el?.type).not.toBe(AuthGuard);
    });
  });

  describe('错误与 catch-all 路由', () => {
    it('/404 路由存在', () => {
      const route404 = routesSection.find((r) => r.path === '404');
      expect(route404).toBeDefined();
    });

    it('通配符 * 路由存在', () => {
      const catchAll = routesSection.find((r) => r.path === '*');
      expect(catchAll).toBeDefined();
    });
  });

  describe('向后兼容重定向', () => {
    const children = routesSection[0].children ?? [];

    function findRedirect(fromPath: string, toPath: string) {
      return children.some((r) => {
        if (r.path !== fromPath) return false;
        const el = r.element as ReactElement | undefined;
        return el?.type === Navigate && (el?.props as { to?: string })?.to === toPath;
      });
    }

    it.each([
      ['signal', '/strategy/signal'],
      ['signal/history', '/strategy/signal/history'],
      ['signal/history/compare', '/strategy/signal/history/compare'],
      ['event-study', '/research/event-study'],
      ['report', '/research/report'],
      ['pattern', '/stock/pattern'],
      ['user-manage', '/admin/user-manage'],
      ['stock/screener', '/stock'],
    ])('path "%s" 重定向到 "%s"', (fromPath, toPath) => {
      expect(findRedirect(fromPath, toPath)).toBe(true);
    });
  });
});

// ----------------------------------------------------------------------

describe('useRouter hook', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('push 导航到目标路径', () => {
    const { result } = renderHook(() => useRouter());
    result.current.push('/target');

    expect(mockNavigate).toHaveBeenCalledWith('/target', undefined);
  });

  it('replace 导航到目标路径（替换当前历史条目）', () => {
    const { result } = renderHook(() => useRouter());
    result.current.replace('/replaced');

    expect(mockNavigate).toHaveBeenCalledWith('/replaced', { replace: true });
  });

  it('back 回退到上一个路径', () => {
    const { result } = renderHook(() => useRouter());
    result.current.back();

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
