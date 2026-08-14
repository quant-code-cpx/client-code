import type { ReactNode } from 'react';

import { paths } from 'src/routes/paths';

import { isNavPathActive } from 'src/layouts/dashboard/nav';
import { createNavData } from 'src/layouts/nav-config-dashboard';

import { knowledgeMajors } from 'src/sections/knowledge-base/content/knowledge-catalog';

import { routesSection } from '../sections';

vi.mock('src/layouts/auth', () => ({
  AuthLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('src/layouts/dashboard', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('知识库路由与导航', () => {
  it('注册受保护的总览、大专题和小专题三类固定路由', () => {
    const protectedPaths = (routesSection[0].children ?? []).map((route) => route.path);

    expect(protectedPaths).toEqual(
      expect.arrayContaining([
        'knowledge',
        'knowledge/:majorSlug',
        'knowledge/:majorSlug/:topicSlug',
      ])
    );
  });

  it('集中生成知识库深链', () => {
    expect(paths.knowledge.root).toBe('/knowledge');
    expect(paths.knowledge.major('personal-finance')).toBe('/knowledge/personal-finance');
    expect(paths.knowledge.topic('personal-finance', 'money-income-wealth')).toBe(
      '/knowledge/personal-finance/money-income-wealth'
    );
  });

  it('知识库位于 AI 研究之后、预警监控之前，并只显示已发布大专题', () => {
    const navData = createNavData(true);
    const agentIndex = navData.findIndex((item) => item.path === '/agent');
    const knowledgeIndex = navData.findIndex((item) => item.path === '/knowledge');
    const alertIndex = navData.findIndex((item) => item.path === '/alert');
    const knowledge = navData[knowledgeIndex];

    expect(knowledgeIndex).toBe(agentIndex + 1);
    expect(alertIndex).toBe(knowledgeIndex + 1);
    expect(knowledge.children).toHaveLength(36);
    expect(knowledge.children?.map((item) => item.path)).toEqual(
      knowledgeMajors.map((major) => paths.knowledge.major(major.slug))
    );
  });

  it('小专题深链自动激活所属大专题导航', () => {
    const knowledge = createNavData(true).find((item) => item.path === '/knowledge');
    const personalFinance = knowledge?.children?.[0];

    if (!knowledge || !personalFinance) throw new Error('知识库导航未注册');

    expect(
      isNavPathActive(
        '/knowledge/personal-finance/money-income-wealth',
        personalFinance,
        knowledge.path
      )
    ).toBe(true);
  });
});
