import type { ReactNode } from 'react';

import { createNavData } from 'src/layouts/nav-config-dashboard';

import { routesSection } from '../sections';

vi.mock('src/layouts/auth', () => ({
  AuthLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('src/layouts/dashboard', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('新闻时事模块入口', () => {
  it('NEWS-FE-ROUTE-001：在受保护路由中注册 /market/news', () => {
    const protectedChildren = routesSection[0].children ?? [];

    expect(protectedChildren.some((route) => route.path === 'market/news')).toBe(true);
  });

  it('NEWS-FE-ROUTE-002：在行情菜单中紧跟市场概览展示新闻时事', () => {
    const marketNav = createNavData().find((item) => item.path === '/market');
    const marketPaths = marketNav?.children?.map((item) => item.path) ?? [];
    const overviewIndex = marketPaths.indexOf('/market/overview');

    expect(marketPaths[overviewIndex + 1]).toBe('/market/news');
  });
});
