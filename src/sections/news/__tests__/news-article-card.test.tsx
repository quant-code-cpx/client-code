import type { ComponentType } from 'react';
import type { components } from 'src/api/generated/news-api';

import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

type NewsArticle = components['schemas']['NewsArticleListItemDto'];

type NewsArticleCardProps = {
  article: NewsArticle;
  onOpen: (article: NewsArticle) => void;
};

type NewsArticleCardModule = {
  NewsArticleCard?: ComponentType<NewsArticleCardProps>;
};

const targetFile = resolve(process.cwd(), 'src/sections/news/components/news-article-card.tsx');
const targetExists = existsSync(targetFile);

let loadedModule: NewsArticleCardModule | undefined;

function article(overrides: Partial<NewsArticle> = {}): NewsArticle {
  return {
    articleId: 'aaaaaaaaaaaaaaaaaaaa',
    revision: 1,
    contentType: 'NEWS',
    sourceType: 'MEDIA',
    title: '虚构半导体新闻标题',
    excerpt: '仅用于组件契约测试的虚构摘要',
    publisher: '测试媒体',
    canonicalUrl: 'https://example.test/news/1',
    publishedAt: '2026-08-05T16:30:45.000Z',
    publishedDate: null,
    publishedPrecision: 'SECOND',
    firstSeenAt: '2026-08-05T16:31:00.000Z',
    securityCodes: ['600000.SH'],
    providerKeys: ['fixture-provider'],
    qualityFlags: [],
    ...overrides,
  };
}

function getNewsArticleCard() {
  if (!loadedModule?.NewsArticleCard) {
    throw new Error('news-article-card.tsx 必须导出 NewsArticleCard');
  }
  return loadedModule.NewsArticleCard;
}

beforeAll(async () => {
  if (!targetExists) return;
  loadedModule = await vi.importActual<NewsArticleCardModule>('../components/news-article-card');
});

describe('新闻卡片 RED 门禁', () => {
  it('NEWS-FE-UI-RED-001：提供主题化、可交互的 NewsArticleCard seam', () => {
    expect(
      targetExists,
      '缺少计划中的 src/sections/news/components/news-article-card.tsx，RED-5 卡片尚未实现'
    ).toBe(true);
  });
});

describe.runIf(targetExists)('NewsArticleCard 用户可观察契约', () => {
  it('SECOND、DATE、UNKNOWN 分别表达真实精度，不伪造午夜或发布时间', () => {
    const NewsArticleCard = getNewsArticleCard();

    renderWithProviders(
      <>
        <NewsArticleCard article={article()} onOpen={vi.fn()} />
        <NewsArticleCard
          article={article({
            articleId: 'bbbbbbbbbbbbbbbbbbbb',
            title: '虚构日期精度公告',
            contentType: 'NOTICE',
            publishedAt: null,
            publishedDate: '2026-08-05',
            publishedPrecision: 'DATE',
          })}
          onOpen={vi.fn()}
        />
        <NewsArticleCard
          article={article({
            articleId: 'cccccccccccccccccccc',
            title: '虚构未知发布时间快讯',
            contentType: 'FLASH',
            publishedAt: null,
            publishedDate: null,
            publishedPrecision: 'UNKNOWN',
          })}
          onOpen={vi.fn()}
        />
      </>
    );

    expect(screen.getByText('08-06 00:30:45')).toBeInTheDocument();
    expect(screen.getByText('2026-08-05')).toBeInTheDocument();
    expect(screen.getByText('仅日期')).toBeInTheDocument();
    expect(screen.getByText('发布时间未知')).toBeInTheDocument();
    expect(screen.getByText('首次发现 08-06 00:31')).toBeInTheDocument();
    expect(screen.queryByText('2026-08-05 00:00')).not.toBeInTheDocument();
  });

  it('publisher 和 canonicalUrl 均缺失时明确来源、禁用原文并提示核验', () => {
    const NewsArticleCard = getNewsArticleCard();

    renderWithProviders(
      <NewsArticleCard
        article={article({ publisher: null, canonicalUrl: null })}
        onOpen={vi.fn()}
      />
    );

    expect(screen.getByText('来源未标注')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '无原文链接' })).toBeDisabled();
    expect(screen.getByText(/建议核验/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '查看原文' })).not.toBeInTheDocument();
  });

  it('合法原文使用隔离新标签外链；revision>1 同时展示修订版本', () => {
    const NewsArticleCard = getNewsArticleCard();

    renderWithProviders(<NewsArticleCard article={article({ revision: 2 })} onOpen={vi.fn()} />);

    const originalLink = screen.getByRole('link', { name: '查看原文' });
    expect(originalLink).toHaveAttribute('href', 'https://example.test/news/1');
    expect(originalLink).toHaveAttribute('target', '_blank');
    expect(originalLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('已修订 v2')).toBeInTheDocument();
  });

  it('证券代码进入个股页且阻止整卡打开详情', async () => {
    const NewsArticleCard = getNewsArticleCard();
    const onOpen = vi.fn();
    const { user } = renderWithProviders(<NewsArticleCard article={article()} onOpen={onOpen} />);

    const securityLink = screen.getByRole('link', { name: '600000.SH' });
    expect(securityLink).toHaveAttribute('href', '/stock/detail?code=600000.SH');

    await user.click(securityLink);

    expect(onOpen).not.toHaveBeenCalled();
  });
});
