import type { ReactElement } from 'react';

import { Navigate } from 'react-router-dom';
import { renderHook } from '@testing-library/react';

import { AuthGuard } from 'src/routes/components';
import { useRouter } from 'src/routes/hooks/use-router';

import { CONFIG } from 'src/config-global';

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

import {
  routesSection,
  createAgentRoutes,
  legacyReportDetailPath,
  LegacyReportDetailRedirect,
} from 'src/routes/sections';

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
      const agentRoutes = createAgentRoutes(true);

      expect(agentRoutes.map((route) => route.path)).toEqual(['agent', 'agent/:conversationId']);
      agentRoutes.forEach((route) => {
        expect(route.handle).toMatchObject({ title: `智能研究 - ${CONFIG.appName}` });
      });
      expect(createNavData(true).some((item) => item.path === '/agent')).toBe(true);
    });
  });

  describe('模型供应商权限', () => {
    it('仅超级管理员显示模型供应商导航', () => {
      expect(createNavData(true, 'SUPER_ADMIN').some((item) => item.path === '/admin/model-providers')).toBe(true);
      expect(createNavData(true, 'ADMIN').some((item) => item.path === '/admin/model-providers')).toBe(false);
      expect(createNavData(true, 'USER').some((item) => item.path === '/admin/model-providers')).toBe(false);
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

  describe('页面元数据', () => {
    const protectedRoutes = routesSection[0].children ?? [];
    const expectedMetadataByPath = {
      index: {
        title: `市场快报 - ${CONFIG.appName}`,
        description: '量化研究平台首页仪表盘：指数行情、市场情绪、资金流向、主力动态一览',
        keywords: '量化,A股,行情,资金流向,市场情绪,回测,仪表盘',
      },
      stock: { title: `股票 - ${CONFIG.appName}` },
      'stock/detail': { title: `股票详情 - ${CONFIG.appName}` },
      'market/overview': { title: `市场概览 - ${CONFIG.appName}` },
      'market/news': { title: `新闻时事 - ${CONFIG.appName}` },
      'market/money-flow': { title: `资金动态 - ${CONFIG.appName}` },
      'market/industry': { title: `行业分析 - ${CONFIG.appName}` },
      'market/index': { title: `指数详情 - ${CONFIG.appName}` },
      'market/industry-rotation': { title: `行业轮动分析 - ${CONFIG.appName}` },
      'tushare-sync': { title: `数据同步 - ${CONFIG.appName}` },
      'factor/library': { title: `因子库 - ${CONFIG.appName}` },
      'factor/detail/:name': { title: `因子详情 - ${CONFIG.appName}` },
      'factor/correlation': { title: `因子相关性 - ${CONFIG.appName}` },
      'factor/screening': { title: `因子选股 - ${CONFIG.appName}` },
      'factor/advanced-analysis': { title: `因子高级分析 - ${CONFIG.appName}` },
      'factor/admin': { title: `因子管理 - ${CONFIG.appName}` },
      strategy: { title: `策略管理 - ${CONFIG.appName}` },
      'strategy/:id': { title: `策略详情 - ${CONFIG.appName}` },
      backtest: { title: `回测工作台 - ${CONFIG.appName}` },
      'backtest/runs': { title: `回测历史 - ${CONFIG.appName}` },
      'backtest/runs/:runId': { title: `回测详情 - ${CONFIG.appName}` },
      'backtest/walk-forward': { title: `Walk-Forward 验证 - ${CONFIG.appName}` },
      'backtest/walk-forward/create': { title: `新建 WF 任务 - ${CONFIG.appName}` },
      'backtest/walk-forward/:wfRunId': { title: `WF 任务详情 - ${CONFIG.appName}` },
      'backtest/comparison': { title: `多策略对比历史 - ${CONFIG.appName}` },
      'backtest/comparison/create': { title: `多策略对比 - ${CONFIG.appName}` },
      'backtest/comparison/:groupId': { title: `策略对比详情 - ${CONFIG.appName}` },
      'research/watchlist': { title: `自选股 - ${CONFIG.appName}` },
      'research/notes': { title: `研究笔记 - ${CONFIG.appName}` },
      'research/notes/:noteId': { title: `笔记详情 - ${CONFIG.appName}` },
      'stock/subscription': { title: `条件订阅 - ${CONFIG.appName}` },
      'stock/subscription/new': { title: `新建条件订阅 - ${CONFIG.appName}` },
      'stock/subscription/:id/edit': { title: `编辑条件订阅 - ${CONFIG.appName}` },
      'stock/subscription/:id': { title: `订阅详情 - ${CONFIG.appName}` },
      profile: { title: `个人资料 - ${CONFIG.appName}` },
      portfolio: { title: `我的组合 - ${CONFIG.appName}` },
      'portfolio/:id': { title: `组合详情 - ${CONFIG.appName}` },
      alert: { title: `事件日历 - ${CONFIG.appName}` },
      'alert/price-rules': { title: `价格预警 - ${CONFIG.appName}` },
      'alert/anomalies': { title: `异动监控 - ${CONFIG.appName}` },
      'alert/limit-list': { title: `涨跌停明细 - ${CONFIG.appName}` },
      'strategy/signal': { title: `策略信号 - ${CONFIG.appName}` },
      'strategy/signal/history': { title: `信号历史 - ${CONFIG.appName}` },
      'strategy/signal/history/compare': { title: `信号历史对比 - ${CONFIG.appName}` },
      'research/event-study': { title: `事件驱动研究 - ${CONFIG.appName}` },
      'research/report': { title: `量化报告 - ${CONFIG.appName}` },
      'research/report/:id': { title: `报告详情 - ${CONFIG.appName}` },
      'stock/pattern': { title: `形态匹配 - ${CONFIG.appName}` },
      'admin/user-manage': { title: `用户管理 - ${CONFIG.appName}` },
      'admin/model-providers': { title: `模型供应商 - ${CONFIG.appName}` },
    };

    it('每个原页面标题迁移到对应的 route handle', () => {
      Object.entries(expectedMetadataByPath).forEach(([path, expected]) => {
        const route =
          path === 'index'
            ? protectedRoutes.find((candidate) => candidate.index === true)
            : protectedRoutes.find((candidate) => candidate.path === path);

        expect(route?.handle, path).toMatchObject(expected);
      });
    });

    it('登录与 404 路由保留原页面标题', () => {
      const signInRoute = routesSection.find((route) => route.path === 'sign-in');
      const notFoundRoutes = routesSection.filter((route) => route.path === '404' || route.path === '*');

      expect(signInRoute?.handle).toMatchObject({ title: `Sign in - ${CONFIG.appName}` });
      expect(notFoundRoutes).toHaveLength(2);
      notFoundRoutes.forEach((route) => {
        expect(route.handle).toMatchObject({
          title: `404 page not found! | Error - ${CONFIG.appName}`,
        });
      });
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

    it.each(['report/:id', 'reports/:id'])('path "%s" 使用保留动态 id 的重定向', (path) => {
      const route = children.find((candidate) => candidate.path === path);
      const element = route?.element as ReactElement | undefined;

      expect(element?.type).toBe(LegacyReportDetailRedirect);
    });

    it('旧报告详情 id 映射到新详情路径', () => {
      expect(legacyReportDetailPath('report-123')).toBe('/research/report/report-123');
      expect(legacyReportDetailPath(undefined)).toBe('/research/report');
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
