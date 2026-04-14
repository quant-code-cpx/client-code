import { test as teardown, request } from '@playwright/test';

import { apiPost } from './fixtures/api-helper';

teardown('清理测试状态', async () => {
  // 使用 API 请求上下文清理测试数据
  const ctx = await request.newContext({
    baseURL: 'http://localhost:3039',
  });

  try {
    // 清理以 [E2E] 为前缀的测试组合
    const portfolios = await apiPost<{ id: string; name: string }[]>(
      ctx,
      '/api/portfolio/list',
      {}
    ).catch(() => []);

    for (const p of portfolios) {
      if (p.name.startsWith('[E2E]')) {
        await apiPost(ctx, '/api/portfolio/delete', { id: p.id }).catch(() => null);
      }
    }
  } finally {
    await ctx.dispose();
  }
});
