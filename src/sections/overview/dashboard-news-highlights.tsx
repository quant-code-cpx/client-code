import type { NewsHighlightItem, NewsHighlightsResponse } from 'src/api/news';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { RouterLink } from 'src/routes/components';

import { newsApi } from 'src/api/news';

import { Label } from 'src/components/label';

import { formatNewsTime, formatNewsDataThrough } from '../news/news-time';

type Props = { refreshKey?: number };

const REASON_LABELS = {
  AUTHORITATIVE_SOURCE: '权威来源',
  BREAKING_EVENT: '重大事件',
  CORROBORATED: '多源印证',
  FRESHNESS: '近期动态',
  MARKET_WIDE: '全市场影响',
  SECURITY_RELEVANCE: '关联标的',
} as const;

export function DashboardNewsHighlights({ refreshKey }: Props) {
  const [response, setResponse] = useState<NewsHighlightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const hasContent = response !== null;
    if (hasContent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    void newsApi
      .getHighlights({ scope: 'ALL', limit: 5 }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setResponse(result);
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted && !isAbortError(caught)) setError(caught);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => controller.abort();
    // response 只用于区分首次加载与保留旧内容刷新，不应触发重复请求。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, refreshKey]);

  const title = response?.displayMode === 'RECENT' ? '最新动态' : '重磅新闻';
  const dataThrough = formatNewsDataThrough(response?.dataThrough);

  return (
    <Card sx={{ minWidth: 0 }}>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h6">{title}</Typography>
              {refreshing ? (
                <Typography variant="caption" role="status" sx={{ color: 'text.secondary' }}>
                  更新中…
                </Typography>
              ) : null}
            </Stack>
            {response ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {dataThrough.dateTime ? dataThrough.text : '数据截止时间暂不可用'}
              </Typography>
            ) : null}
          </Box>
          <Button
            component={RouterLink}
            href="/market/news"
            size="small"
            variant="text"
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, color: 'text.secondary' }}
          >
            查看全部新闻
          </Button>
        </Stack>

        {loading ? <HighlightsSkeleton /> : null}

        {!loading && error && !response ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => setAttempt((value) => value + 1)}>
                重试
              </Button>
            }
          >
            首页新闻暂不可用
          </Alert>
        ) : null}

        {error && response ? (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            更新失败，已保留当前新闻。
          </Alert>
        ) : null}

        {response ? <ResponseNotice response={response} /> : null}

        {!loading && response?.items.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无可展示的新闻
            </Typography>
          </Box>
        ) : null}

        {response?.items.map((item, index) => (
          <Box key={item.articleId}>
            {index > 0 ? <Divider /> : null}
            <HighlightRow item={item} />
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}

function ResponseNotice({ response }: { response: NewsHighlightsResponse }) {
  if (response.rankingStatus === 'STALE') {
    return (
      <Alert severity="warning" role="status" sx={{ mb: 1.5 }}>
        实时排名暂不可用，当前展示缓存新闻。
      </Alert>
    );
  }
  if (response.displayMode === 'RECENT') {
    return (
      <Alert severity="info" role="status" sx={{ mb: 1.5 }}>
        当前没有达到重磅阈值的新闻，展示最新动态。
      </Alert>
    );
  }
  if (response.partial) {
    return (
      <Alert severity="warning" role="status" sx={{ mb: 1.5 }}>
        部分新闻源覆盖受限，结果可能不完整。
      </Alert>
    );
  }
  return null;
}

function HighlightRow({ item }: { item: NewsHighlightItem }) {
  const published = formatNewsTime(item);
  const reasonText = item.reasonCodes.map((reason) => REASON_LABELS[reason]).join(' · ');
  const source = item.publisher || item.providerKeys[0] || '来源未知';

  return (
    <Box
      component={RouterLink}
      href={'/market/news?article=' + encodeURIComponent(item.articleId)}
      aria-label={'查看新闻：' + item.title}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        minHeight: 64,
        py: 1.5,
        px: 1,
        mx: -1,
        borderRadius: 1,
        color: 'inherit',
        textDecoration: 'none',
        '&:hover': { bgcolor: 'action.hover' },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <Label color={impactColor(item)} sx={{ mt: 0.25, flexShrink: 0 }}>
        {impactLabel(item)}
      </Label>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 'fontWeightMedium',
            display: '-webkit-box',
            overflow: 'hidden',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
          }}
        >
          {item.title}
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.25 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {source}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            · {published.text}
          </Typography>
          {reasonText ? (
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              · {reasonText}
            </Typography>
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
}

function HighlightsSkeleton() {
  return (
    <Stack spacing={1} aria-label="首页新闻加载中">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={64} />
      ))}
    </Stack>
  );
}

function impactLabel(item: NewsHighlightItem): string {
  if (item.impactLevel === 'CRITICAL') return '重大';
  if (item.impactLevel === 'MAJOR') return '重要';
  return '最新';
}

function impactColor(item: NewsHighlightItem): 'error' | 'warning' | 'info' {
  if (item.impactLevel === 'CRITICAL') return 'error';
  if (item.impactLevel === 'MAJOR') return 'warning';
  return 'info';
}

function isAbortError(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && 'name' in error && error.name === 'AbortError'
  );
}
