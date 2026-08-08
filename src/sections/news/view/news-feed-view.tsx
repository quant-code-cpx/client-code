import type { NewsArticleListItem, NewsArticleListRequest } from 'src/api/news';

import { useSearchParams } from 'react-router';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import RefreshIcon from '@mui/icons-material/Refresh';

import { NEWS_ERROR_CODE } from 'src/api/news';
import { DashboardContent } from 'src/layouts/dashboard';

import { useNewsFeed } from '../hooks/use-news-feed';
import { useNewsCoverage } from '../hooks/use-news-coverage';
import { NewsFilterBar } from '../components/news-filter-bar';
import { NewsVirtualizedFeed } from '../components/news-feed-list';
import { NewsCoverageAlert } from '../components/news-coverage-alert';
import { NewsCoveragePanel } from '../components/news-coverage-panel';
import { NewsArticleDrawer } from '../components/news-article-drawer';
import { parseNewsUrlState, buildNewsListRequest, serializeNewsUrlState } from '../news-url-state';

import type { NewsUrlState, NewsFilterErrors } from '../news-url-state';

const EMPTY_FILTERS: NewsUrlState = {
  scope: 'ALL',
  securityCodes: [],
  keyword: '',
  contentTypes: [],
  sourceTypes: [],
  from: null,
  to: null,
  includeUnknownPublishedTime: false,
  articleId: null,
};

export function NewsFeedView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [selectedRevision, setSelectedRevision] = useState(0);
  const urlState = useMemo(() => parseNewsUrlState(searchParams), [searchParams]);
  const requestResult = useMemo(() => buildNewsListRequest(urlState), [urlState]);
  const coverageState = useNewsCoverage();

  const replaceUrlState = useCallback(
    (next: NewsUrlState, replace = false) => {
      setSearchParams(serializeNewsUrlState(next), { replace });
    },
    [setSearchParams]
  );

  const handleOpenArticle = useCallback(
    (article: NewsArticleListItem) => {
      setSelectedRevision(article.revision);
      replaceUrlState({ ...urlState, articleId: article.articleId });
    },
    [replaceUrlState, urlState]
  );

  const handleCloseArticle = useCallback(() => {
    replaceUrlState({ ...urlState, articleId: null }, true);
  }, [replaceUrlState, urlState]);

  const handleRefresh = useCallback(() => {
    setFeedRefreshKey((current) => current + 1);
    coverageState.refresh();
  }, [coverageState]);

  return (
    <DashboardContent maxWidth="xl">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography component="h1" variant="h4">
            新闻时事
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.25, color: 'text.secondary' }}>
            聚合公告、市场新闻与快讯；覆盖状态与新闻流独立呈现
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
          刷新
        </Button>
      </Stack>

      <NewsFilterBar
        value={urlState}
        errors={requestResult.ok ? {} : requestResult.errors}
        onApply={(next) => replaceUrlState({ ...next, articleId: null })}
        onClear={() => replaceUrlState(EMPTY_FILTERS, true)}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(280px, 1fr)' },
          gap: 3,
          mt: 3,
          alignItems: 'start',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {requestResult.ok ? (
            <NewsFeedList
              request={requestResult.body}
              refreshKey={feedRefreshKey}
              onOpenArticle={handleOpenArticle}
            />
          ) : (
            <InvalidFilters errors={requestResult.errors} />
          )}
        </Box>

        <Box sx={{ position: { lg: 'sticky' }, top: { lg: 88 } }}>
          <NewsCoveragePanel
            coverage={coverageState.coverage}
            error={coverageState.status === 'error' ? coverageState.error : null}
          />
        </Box>
      </Box>

      <NewsArticleDrawer
        open={Boolean(urlState.articleId)}
        articleId={urlState.articleId}
        revision={selectedRevision}
        onClose={handleCloseArticle}
      />
    </DashboardContent>
  );
}

function NewsFeedList({
  request,
  refreshKey,
  onOpenArticle,
}: {
  request: NewsArticleListRequest;
  refreshKey: number;
  onOpenArticle: (article: NewsArticleListItem) => void;
}) {
  const feed = useNewsFeed(request);
  const { refresh } = feed;
  const previousRefreshKey = useRef(refreshKey);

  useEffect(() => {
    if (previousRefreshKey.current === refreshKey) return;
    previousRefreshKey.current = refreshKey;
    void refresh();
  }, [refresh, refreshKey]);

  if (feed.status === 'loading' || feed.status === 'idle') {
    return <NewsFeedSkeleton />;
  }

  if (feed.status === 'error') {
    const moduleDisabled = hasErrorCode(feed.error, NEWS_ERROR_CODE.MODULE_DISABLED);
    return (
      <Alert severity="error" role="alert">
        <Typography variant="subtitle2">
          {moduleDisabled ? '新闻模块尚未启用' : '新闻加载失败'}
        </Typography>
        <Typography variant="body2">
          {moduleDisabled ? '请联系管理员完成新闻源配置后再试。' : '请稍后刷新重试。'}
        </Typography>
        {requestIdOf(feed.error) ? (
          <Typography variant="caption">请求编号：{requestIdOf(feed.error)}</Typography>
        ) : null}
      </Alert>
    );
  }

  if (feed.status === 'empty') {
    return (
      <Stack spacing={2}>
        <NewsCoverageAlert
          partial={feed.partial}
          warnings={feed.warnings}
          dataThrough={feed.dataThrough}
        />
        <Card variant="outlined">
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="h6">当前筛选没有新闻</Typography>
            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
              可放宽日期、来源或证券范围后再试。
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} aria-label="新闻时事列表">
      <NewsCoverageAlert
        partial={feed.partial}
        warnings={feed.warnings}
        dataThrough={feed.dataThrough}
      />

      {feed.hasNewItems ? (
        <Alert
          severity="info"
          role="status"
          action={
            <Button
              color="inherit"
              size="small"
              disabled={feed.refreshing}
              onClick={() => void feed.refresh()}
            >
              查看新内容
            </Button>
          }
        >
          有新内容，不会自动改变当前位置
        </Alert>
      ) : null}

      {feed.refreshError ? (
        <Alert severity="warning">刷新失败，已保留当前新闻，可稍后重试。</Alert>
      ) : null}

      <NewsVirtualizedFeed items={feed.items} onOpenArticle={onOpenArticle} />

      {feed.loadMoreError ? (
        <Alert severity="warning">加载更多失败，已保留当前新闻，可重试。</Alert>
      ) : null}

      {feed.hasMore ? (
        <Button
          variant="outlined"
          disabled={feed.loadingMore}
          onClick={() => void feed.loadMore()}
          sx={{ alignSelf: 'center' }}
        >
          {feed.loadingMore ? '加载中…' : '加载更多'}
        </Button>
      ) : (
        <Typography variant="caption" align="center" sx={{ color: 'text.secondary' }}>
          已加载至当前筛选范围末尾
        </Typography>
      )}
    </Stack>
  );
}

function NewsFeedSkeleton() {
  return (
    <Stack spacing={2} aria-label="新闻列表加载中">
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index} variant="outlined">
          <CardContent>
            <Skeleton width="32%" />
            <Skeleton width="85%" height={32} />
            <Skeleton width="68%" />
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

function InvalidFilters({ errors }: { errors: NewsFilterErrors }) {
  return (
    <Alert severity="warning" role="alert">
      <Typography variant="subtitle2">请修正筛选条件</Typography>
      {Object.values(errors).map((message) => (
        <Typography key={message} variant="body2">
          {message}
        </Typography>
      ))}
    </Alert>
  );
}

function requestIdOf(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('requestId' in error)) return null;
  return typeof error.requestId === 'string' ? error.requestId : null;
}

function hasErrorCode(error: unknown, code: number): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === code);
}
