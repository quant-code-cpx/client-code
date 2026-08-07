import type { NewsArticleDetailResponse } from 'src/api/news';

import { NewsDetailCache } from '../news-detail-cache';

function detail(articleId: string, revision: number): NewsArticleDetailResponse {
  return {
    articleId,
    revision,
    contentType: 'NEWS',
    sourceType: 'MEDIA',
    title: `${articleId}-v${revision}`,
    excerpt: null,
    publisher: '测试媒体',
    canonicalUrl: null,
    publishedAt: '2026-08-06T02:00:00.000Z',
    publishedDate: null,
    publishedPrecision: 'SECOND',
    firstSeenAt: '2026-08-06T02:00:01.000Z',
    securityCodes: [],
    providerKeys: ['fixture-provider'],
    qualityFlags: [],
    alternateUrls: [],
    sources: { items: [], total: 0, truncated: false },
    revisions: { items: [], total: 0, truncated: false },
    coverage: {
      generatedAt: '2026-08-06T02:00:00.000Z',
      overallStatus: 'READY',
      dataThrough: '2026-08-06T02:00:00.000Z',
      partial: false,
      warnings: [],
      feeds: [],
    },
  };
}

describe('新闻详情 LRU 缓存', () => {
  it('NEWS-FE-UI-009：读取会提升热度，超过容量淘汰最久未使用项', () => {
    const cache = new NewsDetailCache(2);
    cache.set(detail('aaaaaaaaaaaaaaaaaaaa', 1));
    cache.set(detail('bbbbbbbbbbbbbbbbbbbb', 1));
    expect(cache.get('aaaaaaaaaaaaaaaaaaaa', 1)?.revision).toBe(1);

    cache.set(detail('cccccccccccccccccccc', 1));

    expect(cache.size).toBe(2);
    expect(cache.get('aaaaaaaaaaaaaaaaaaaa', 1)).not.toBeNull();
    expect(cache.get('bbbbbbbbbbbbbbbbbbbb', 1)).toBeNull();
    expect(cache.get('cccccccccccccccccccc', 1)).not.toBeNull();
  });

  it('NEWS-FE-UI-009：列表 revision 高于缓存时立即失效，深链 revision=0 可复用最新缓存', () => {
    const cache = new NewsDetailCache(20);
    cache.set(detail('aaaaaaaaaaaaaaaaaaaa', 1));

    expect(cache.get('aaaaaaaaaaaaaaaaaaaa', 0)?.revision).toBe(1);
    expect(cache.get('aaaaaaaaaaaaaaaaaaaa', 2)).toBeNull();
    expect(cache.size).toBe(0);
  });
});
