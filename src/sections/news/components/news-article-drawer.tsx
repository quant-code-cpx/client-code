import type { NewsArticleDetailResponse } from 'src/api/news';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';

import { newsApi } from 'src/api/news';

import { newsDetailCache } from '../news-detail-cache';
import { formatNewsTime, formatNewsSourceDiscoveredAt } from '../news-time';

export type NewsArticleDrawerProps = {
  open: boolean;
  articleId: string | null;
  revision: number;
  onClose: () => void;
};

export function NewsArticleDrawer({ open, articleId, revision, onClose }: NewsArticleDrawerProps) {
  const [detail, setDetail] = useState<NewsArticleDetailResponse | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open || !articleId) return undefined;
    const cached = newsDetailCache.get(articleId, revision);
    if (cached) {
      setDetail(cached);
      setError(null);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setDetail(null);
    void newsApi
      .getArticleDetail({ articleId }, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          newsDetailCache.set(response);
          setDetail(response);
        }
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted && !isAbortError(caught)) setError(caught);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [articleId, attempt, open, revision]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          role: 'dialog',
          'aria-labelledby': 'news-detail-title',
          sx: { width: { xs: '100%', sm: 640 }, maxWidth: '100%' },
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography id="news-detail-title" variant="h6" sx={{ flex: 1 }}>
          新闻详情
        </Typography>
        <IconButton aria-label="关闭新闻详情" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />

      <Box sx={{ p: { xs: 2, sm: 3 }, overflowY: 'auto' }}>
        {loading ? <DetailSkeleton /> : null}
        {error ? (
          <Alert
            severity="error"
            action={
              isArticleNotFound(error) ? null : (
                <Button
                  color="inherit"
                  size="small"
                  aria-label="重试加载详情"
                  onClick={() => setAttempt((current) => current + 1)}
                >
                  重试
                </Button>
              )
            }
          >
            {isArticleNotFound(error) ? '文章不存在或已不可用' : '新闻详情加载失败'}
          </Alert>
        ) : null}
        {detail ? <DetailContent detail={detail} /> : null}
      </Box>
    </Drawer>
  );
}

function DetailContent({ detail }: { detail: NewsArticleDetailResponse }) {
  const published = formatNewsTime(detail);
  const externalUrl = safeExternalUrl(detail.canonicalUrl);

  return (
    <Box>
      <Typography variant="h5">{detail.title}</Typography>
      <Typography variant="caption" component={published.dateTime ? 'time' : 'span'}>
        {published.text}
      </Typography>
      {published.secondaryText ? (
        <Typography variant="caption" display="block">
          {published.secondaryText}
        </Typography>
      ) : null}
      {detail.excerpt ? (
        <Typography variant="body1" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
          {detail.excerpt}
        </Typography>
      ) : null}
      {externalUrl ? (
        <Button
          component="a"
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ mt: 2 }}
        >
          查看原文
        </Button>
      ) : (
        <Typography variant="body2" sx={{ mt: 2, color: 'warning.main' }}>
          无原文链接 · 建议核验
        </Typography>
      )}

      <Divider sx={{ my: 3 }} />
      <Typography variant="h6">来源</Typography>
      {detail.sources.items.map((source) => (
        <Box key={`${source.providerKey}:${source.feedKey}`} sx={{ mt: 1.5 }}>
          <Typography variant="subtitle2">
            {source.providerDisplayName} · {source.feedDisplayName}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {formatNewsSourceDiscoveredAt(source.sourceDiscoveredAt).text}
          </Typography>
        </Box>
      ))}
      {detail.sources.truncated ? (
        <Typography variant="caption" display="block" sx={{ mt: 1, color: 'warning.main' }}>
          来源结果已截断，仅显示 {detail.sources.items.length}/{detail.sources.total} 条
        </Typography>
      ) : null}

      <Divider sx={{ my: 3 }} />
      <Typography variant="h6">修订记录</Typography>
      {detail.revisions.items.map((item) => (
        <Box key={item.revision} sx={{ mt: 1.5 }}>
          <Typography variant="subtitle2">v{item.revision}</Typography>
          <Typography variant="body2">当时标题：{item.title}</Typography>
        </Box>
      ))}
      {detail.revisions.truncated ? (
        <Typography variant="caption" display="block" sx={{ mt: 1, color: 'warning.main' }}>
          修订记录已截断，仅显示 {detail.revisions.items.length}/{detail.revisions.total} 条
        </Typography>
      ) : null}
    </Box>
  );
}

function DetailSkeleton() {
  return (
    <Box aria-label="新闻详情加载中">
      <Skeleton width="75%" height={40} />
      <Skeleton width="45%" />
      <Skeleton variant="rounded" height={120} sx={{ mt: 2 }} />
    </Box>
  );
}

function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function isArticleNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 7001);
}

function isAbortError(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && 'name' in error && error.name === 'AbortError'
  );
}
