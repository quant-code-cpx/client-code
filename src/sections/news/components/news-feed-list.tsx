import type { NewsArticleListItem } from 'src/api/news';

import { useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { getNewsGroupDateKey } from '../news-time';
import { NewsArticleCard } from './news-article-card';

export type NewsFeedRow =
  | { kind: 'date'; key: string; date: string }
  | { kind: 'article'; key: string; article: NewsArticleListItem };

export function buildNewsFeedRows(items: readonly NewsArticleListItem[]): NewsFeedRow[] {
  const rows: NewsFeedRow[] = [];
  let previousDate: string | null = null;
  for (const article of items) {
    const date = getNewsGroupDateKey(article) ?? '日期未知';
    if (date !== previousDate) {
      rows.push({ kind: 'date', key: `date:${date}:${article.articleId}`, date });
      previousDate = date;
    }
    rows.push({ kind: 'article', key: `article:${article.articleId}`, article });
  }
  return rows;
}

export function NewsVirtualizedFeed({
  items,
  onOpenArticle,
}: {
  items: readonly NewsArticleListItem[];
  onOpenArticle: (article: NewsArticleListItem) => void;
}) {
  const rows = useMemo(() => buildNewsFeedRows(items), [items]);
  return (
    <Virtuoso
      useWindowScroll
      data={rows}
      increaseViewportBy={{ top: 300, bottom: 600 }}
      computeItemKey={(_, row) => row.key}
      itemContent={(_, row) =>
        row.kind === 'date' ? (
          <Box
            role="separator"
            aria-label={`新闻日期 ${row.date}`}
            sx={{ pt: 1.5, pb: 0.5, bgcolor: 'background.default' }}
          >
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              {row.date}
            </Typography>
          </Box>
        ) : (
          <Box
            data-testid="news-feed-article-row"
            sx={{
              py: 1,
              contentVisibility: 'auto',
              containIntrinsicSize: '0 180px',
            }}
          >
            <NewsArticleCard article={row.article} onOpen={onOpenArticle} />
          </Box>
        )
      }
    />
  );
}
