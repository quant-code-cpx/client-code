import type { NewsArticleListItem } from 'src/api/news';

import { Fragment } from 'react';
import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { buildNewsFeedRows, NewsVirtualizedFeed } from '../components/news-feed-list';

vi.mock('react-virtuoso', () => ({
  Virtuoso: ({
    data,
    itemContent,
  }: {
    data: unknown[];
    itemContent: (index: number, item: unknown) => React.ReactNode;
  }) => (
    <div data-testid="virtuoso-seam">
      {data.slice(0, 60).map((item, index) => (
        <Fragment key={index}>{itemContent(index, item)}</Fragment>
      ))}
    </div>
  ),
}));

function article(index: number, publishedAt: string): NewsArticleListItem {
  const articleId = index.toString(36).padStart(20, '0');
  return {
    articleId,
    revision: 1,
    contentType: 'NEWS',
    sourceType: 'MEDIA',
    title: `虚构长列表新闻 ${index}`,
    excerpt: null,
    publisher: '测试媒体',
    canonicalUrl: null,
    publishedAt,
    publishedDate: null,
    publishedPrecision: 'SECOND',
    firstSeenAt: publishedAt,
    securityCodes: [],
    providerKeys: ['fixture-provider'],
    qualityFlags: [],
  };
}

describe('新闻虚拟列表与日期视觉分隔', () => {
  it('NEWS-FE-TIME-009：只插入视觉日期行，不改变文章顺序', () => {
    const items = [
      article(1, '2026-08-06T02:00:00.000Z'),
      article(2, '2026-08-06T01:00:00.000Z'),
      article(3, '2026-08-05T02:00:00.000Z'),
    ];

    const rows = buildNewsFeedRows(items);

    expect(rows.filter((row) => row.kind === 'date').map((row) => row.date)).toEqual([
      '2026-08-06',
      '2026-08-05',
    ]);
    expect(
      rows.filter((row) => row.kind === 'article').map((row) => row.article.articleId)
    ).toEqual(items.map((item) => item.articleId));
  });

  it('NEWS-FE-PERF-001：1,000 条合成记录时 DOM 新闻项少于 100', () => {
    const items = Array.from({ length: 1_000 }, (_, index) =>
      article(index + 1, `2026-08-${String(6 - (index % 5)).padStart(2, '0')}T02:00:00.000Z`)
    );

    renderWithProviders(<NewsVirtualizedFeed items={items} onOpenArticle={vi.fn()} />);

    expect(screen.getAllByTestId('news-feed-article-row').length).toBeLessThan(100);
    expect(screen.getByTestId('virtuoso-seam')).toBeInTheDocument();
  });
});
