import type { components } from 'src/api/generated/news-api';

import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

type Schemas = components['schemas'];
type GeneratedListRequest = Schemas['NewsArticleListRequestDto'];
type NewsArticleListRequest = Omit<GeneratedListRequest, 'includeUnknownPublishedTime'> & {
  includeUnknownPublishedTime?: boolean;
};
type NewsScope = NewsArticleListRequest['scope'];
type NewsContentType = NonNullable<NewsArticleListRequest['contentTypes']>[number];
type NewsSourceType = NonNullable<NewsArticleListRequest['sourceTypes']>[number];

type NewsUrlState = {
  scope: NewsScope;
  securityCodes: string[];
  keyword: string;
  contentTypes: NewsContentType[];
  sourceTypes: NewsSourceType[];
  from: string | null;
  to: string | null;
  includeUnknownPublishedTime: boolean;
  articleId: string | null;
};

type BuildNewsListRequestResult =
  | { ok: true; body: NewsArticleListRequest }
  | {
      ok: false;
      errors: Partial<Record<'keyword' | 'securityCodes' | 'dateRange', string>>;
    };

type NewsUrlStateModule = {
  parseNewsUrlState?: (params: URLSearchParams) => NewsUrlState;
  serializeNewsUrlState?: (state: NewsUrlState) => URLSearchParams;
  buildNewsListRequest?: (state: NewsUrlState, cursor?: string) => BuildNewsListRequestResult;
};

const targetFile = resolve(process.cwd(), 'src/sections/news/news-url-state.ts');
const targetExists = existsSync(targetFile);

let loadedModule: NewsUrlStateModule | undefined;

function getUrlModule(): Required<NewsUrlStateModule> {
  const requiredExports = [
    'parseNewsUrlState',
    'serializeNewsUrlState',
    'buildNewsListRequest',
  ] as const;

  for (const exportName of requiredExports) {
    if (typeof loadedModule?.[exportName] !== 'function') {
      throw new Error(`news-url-state.ts 必须导出 ${exportName}`);
    }
  }

  return loadedModule as Required<NewsUrlStateModule>;
}

function defaultState(overrides: Partial<NewsUrlState> = {}): NewsUrlState {
  return {
    scope: 'ALL',
    securityCodes: [],
    keyword: '',
    contentTypes: [],
    sourceTypes: [],
    from: null,
    to: null,
    includeUnknownPublishedTime: false,
    articleId: null,
    ...overrides,
  };
}

function expectSuccessfulBody(result: BuildNewsListRequestResult): NewsArticleListRequest {
  expect(result.ok, '合法筛选必须产生请求 Body').toBe(true);
  if (!result.ok) throw new Error(`意外校验失败：${JSON.stringify(result.errors)}`);
  return result.body;
}

beforeAll(async () => {
  if (!targetExists) return;
  loadedModule = await vi.importActual<NewsUrlStateModule>('../news-url-state');
});

describe('新闻 URL 状态纯函数 RED 门禁', () => {
  it('NEWS-FE-FILTER-RED-001：提供独立 URL 白名单与 Body 映射模块', () => {
    expect(
      targetExists,
      '缺少计划中的 src/sections/news/news-url-state.ts，RED-3 URL seam 尚未实现'
    ).toBe(true);
  });
});

describe.runIf(targetExists)('新闻筛选、URL 与请求 Body 契约', () => {
  it('导出 parse、serialize、build 三个纯函数', () => {
    expect(loadedModule).toMatchObject({
      parseNewsUrlState: expect.any(Function),
      serializeNewsUrlState: expect.any(Function),
      buildNewsListRequest: expect.any(Function),
    });
  });

  it('NEWS-FE-FILTER-001：空 URL 恢复合同默认且不发送默认日期和 false unknown', () => {
    const { parseNewsUrlState, buildNewsListRequest, serializeNewsUrlState } = getUrlModule();
    const state = parseNewsUrlState(new URLSearchParams());

    expect(state).toEqual(defaultState());
    expect(expectSuccessfulBody(buildNewsListRequest(state))).toEqual({
      scope: 'ALL',
      limit: 30,
    });
    expect(serializeNewsUrlState(state).toString()).toBe('');
  });

  it('NEWS-FE-FILTER-002：合法深链完整恢复并规范化所有白名单字段', () => {
    const { parseNewsUrlState, serializeNewsUrlState } = getUrlModule();
    const params = new URLSearchParams({
      scope: 'SECURITIES',
      codes: '600000.SH,000001.SZ',
      q: ' 半导体 ',
      types: 'NEWS,NOTICE',
      sources: 'MEDIA,EXCHANGE',
      from: '2026-08-01',
      to: '2026-08-06',
      unknown: '1',
      article: 'abcdefghijklmnopqrst',
      injected: 'must-be-dropped',
    });

    const state = parseNewsUrlState(params);

    expect(state).toEqual({
      scope: 'SECURITIES',
      securityCodes: ['600000.SH', '000001.SZ'],
      keyword: '半导体',
      contentTypes: ['NEWS', 'NOTICE'],
      sourceTypes: ['MEDIA', 'EXCHANGE'],
      from: '2026-08-01',
      to: '2026-08-06',
      includeUnknownPublishedTime: true,
      articleId: 'abcdefghijklmnopqrst',
    });
    expect(serializeNewsUrlState(state).toString()).not.toContain('injected');
  });

  it('NEWS-FE-FILTER-003：非法 scope、枚举和 articleId 被丢弃，不进入 DTO', () => {
    const { parseNewsUrlState, buildNewsListRequest } = getUrlModule();
    const state = parseNewsUrlState(
      new URLSearchParams({
        scope: 'ROOT',
        types: 'NEWS,EVIL',
        sources: 'MEDIA,EVIL',
        article: '../unsafe',
      })
    );

    expect(state).toMatchObject({
      scope: 'ALL',
      contentTypes: ['NEWS'],
      sourceTypes: ['MEDIA'],
      articleId: null,
    });
    expect(expectSuccessfulBody(buildNewsListRequest(state))).toEqual({
      scope: 'ALL',
      limit: 30,
      contentTypes: ['NEWS'],
      sourceTypes: ['MEDIA'],
    });
  });

  it('NEWS-FE-FILTER-004：关键字按 Unicode 字符 trim 后校验 2～64', () => {
    const { buildNewsListRequest } = getUrlModule();
    const empty = buildNewsListRequest(defaultState({ keyword: '   ' }));
    const one = buildNewsListRequest(defaultState({ keyword: '芯' }));
    const twoEmoji = buildNewsListRequest(defaultState({ keyword: '📈芯' }));
    const sixtyFour = buildNewsListRequest(defaultState({ keyword: '芯'.repeat(64) }));
    const sixtyFive = buildNewsListRequest(defaultState({ keyword: '芯'.repeat(65) }));

    expect(expectSuccessfulBody(empty)).toEqual({ scope: 'ALL', limit: 30 });
    expect(one).toMatchObject({ ok: false, errors: { keyword: expect.any(String) } });
    expect(expectSuccessfulBody(twoEmoji)).toMatchObject({ keyword: '📈芯' });
    expect(expectSuccessfulBody(sixtyFour)).toMatchObject({ keyword: '芯'.repeat(64) });
    expect(sixtyFive).toMatchObject({ ok: false, errors: { keyword: expect.any(String) } });
  });

  it('NEWS-FE-FILTER-005/006/007：证券代码合法、稳定去重、最多20且 SECURITIES 非空', () => {
    const { parseNewsUrlState, buildNewsListRequest } = getUrlModule();
    const twentyCodes = Array.from(
      { length: 20 },
      (_, index) => `${String(index + 1).padStart(6, '0')}.SZ`
    );
    const parsed = parseNewsUrlState(
      new URLSearchParams({
        scope: 'SECURITIES',
        codes: '600000.SH,000001.SZ,600000.SH,lower.sz',
      })
    );

    expect(parsed.securityCodes).toEqual(['600000.SH', '000001.SZ']);
    expect(expectSuccessfulBody(buildNewsListRequest(parsed))).toMatchObject({
      securityCodes: ['600000.SH', '000001.SZ'],
    });
    expect(
      expectSuccessfulBody(
        buildNewsListRequest(defaultState({ scope: 'SECURITIES', securityCodes: twentyCodes }))
      ).securityCodes
    ).toHaveLength(20);
    expect(
      buildNewsListRequest(
        defaultState({ scope: 'SECURITIES', securityCodes: [...twentyCodes, '600000.SH'] })
      )
    ).toMatchObject({ ok: false, errors: { securityCodes: expect.any(String) } });
    expect(buildNewsListRequest(defaultState({ scope: 'SECURITIES' }))).toMatchObject({
      ok: false,
      errors: { securityCodes: expect.any(String) },
    });
  });

  it.each(['WATCHLIST', 'PORTFOLIO'] as const)(
    'NEWS-FE-FILTER-008/009：%s Body 不接受浏览器 owner ID',
    (scope) => {
      const { buildNewsListRequest } = getUrlModule();
      const state = {
        ...defaultState({ scope }),
        userId: 'attacker-controlled-user',
        watchlistId: 'attacker-controlled-watchlist',
        portfolioId: 'attacker-controlled-portfolio',
      };

      expect(expectSuccessfulBody(buildNewsListRequest(state))).toEqual({ scope, limit: 30 });
    }
  );

  it('NEWS-FE-TIME-010 / FILTER-010：90日窗口精确转上海半开区间；异常窗口拒绝请求', () => {
    const { buildNewsListRequest } = getUrlModule();
    const ninetyDays = buildNewsListRequest(defaultState({ from: '2026-01-01', to: '2026-03-31' }));

    expect(expectSuccessfulBody(ninetyDays)).toMatchObject({
      publishedAfter: '2026-01-01T00:00:00.000+08:00',
      publishedBefore: '2026-04-01T00:00:00.000+08:00',
    });
    for (const range of [
      { from: '2026-01-01', to: null },
      { from: null, to: '2026-01-01' },
      { from: '2026-04-01', to: '2026-03-31' },
      { from: '2026-01-01', to: '2026-04-01' },
      { from: '2026-02-30', to: '2026-03-01' },
    ]) {
      expect(buildNewsListRequest(defaultState(range))).toMatchObject({
        ok: false,
        errors: { dateRange: expect.any(String) },
      });
    }
  });

  it('NEWS-FE-FILTER-011：unknown 仅 true 显式发送，false 省略', () => {
    const { buildNewsListRequest } = getUrlModule();

    expect(
      expectSuccessfulBody(
        buildNewsListRequest(defaultState({ includeUnknownPublishedTime: true }))
      )
    ).toMatchObject({ includeUnknownPublishedTime: true });
    expect(
      expectSuccessfulBody(
        buildNewsListRequest(defaultState({ includeUnknownPublishedTime: false }))
      )
    ).not.toHaveProperty('includeUnknownPublishedTime');
  });
});
