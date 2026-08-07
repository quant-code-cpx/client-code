import type { NewsArticleListItem } from 'src/api/news';

import { Link } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { formatNewsTime } from '../news-time';

export type NewsArticleCardProps = {
  article: NewsArticleListItem;
  onOpen: (article: NewsArticleListItem) => void;
};

const CONTENT_LABEL = { NOTICE: '公告', NEWS: '新闻', FLASH: '快讯' } as const;

export function NewsArticleCard({ article, onOpen }: NewsArticleCardProps) {
  const published = formatNewsTime(article);
  const externalUrl = safeExternalUrl(article.canonicalUrl);

  const openDetail = () => onOpen(article);

  return (
    <Card
      component="article"
      variant="outlined"
      role="button"
      tabIndex={0}
      aria-label={`打开新闻详情：${article.title}`}
      onClick={openDetail}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openDetail();
        }
      }}
      sx={{
        transition: (theme) => theme.transitions.create(['border-color', 'background-color']),
        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
        '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ width: { sm: 128 }, flexShrink: 0 }}>
            <Typography
              component={published.dateTime ? 'time' : 'span'}
              dateTime={published.dateTime ?? undefined}
              variant="caption"
              sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
            >
              {published.text}
            </Typography>
            {published.secondaryText ? (
              <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                {published.secondaryText}
              </Typography>
            ) : null}
            {published.precisionLabel ? (
              <Typography variant="caption" display="block" sx={{ color: 'text.disabled' }}>
                {published.precisionLabel}
              </Typography>
            ) : null}
          </Box>

          <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              <Chip label={CONTENT_LABEL[article.contentType]} size="small" variant="outlined" />
              {article.revision > 1 ? (
                <Chip
                  label={`已修订 v${article.revision}`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              ) : null}
              {article.qualityFlags.slice(0, 2).map((flag) => (
                <Chip key={flag} label={qualityLabel(flag)} size="small" variant="outlined" />
              ))}
            </Stack>

            <Tooltip title={article.title} enterDelay={500}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 'fontWeightSemiBold',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                  overflow: 'hidden',
                }}
              >
                {article.title}
              </Typography>
            </Tooltip>

            {article.excerpt ? (
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: { xs: 1, sm: 2 },
                  overflow: 'hidden',
                }}
              >
                {article.excerpt}
              </Typography>
            ) : null}

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {article.publisher ?? '来源未标注'}
              </Typography>
              {article.securityCodes.slice(0, 3).map((code) => (
                <Chip
                  key={code}
                  component={Link}
                  clickable
                  size="small"
                  label={code}
                  to={`/stock/detail?code=${encodeURIComponent(code)}`}
                  onClick={(event) => event.stopPropagation()}
                />
              ))}
              {article.securityCodes.length > 3 ? (
                <Chip size="small" label={`+${article.securityCodes.length - 3}`} />
              ) : null}
              <Box sx={{ flex: 1 }} />
              {externalUrl ? (
                <Button
                  component="a"
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  onClick={(event) => event.stopPropagation()}
                >
                  查看原文
                </Button>
              ) : (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button size="small" disabled aria-label="无原文链接">
                    无原文链接
                  </Button>
                  <Typography variant="caption" sx={{ color: 'warning.main' }}>
                    建议核验
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
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

function qualityLabel(flag: string): string {
  const labels: Record<string, string> = {
    TRUNCATED: '内容截断',
    GENERATED_TITLE: '标题补全',
    MISSING_CANONICAL_URL: '缺少原文',
    UNRESOLVED_SECURITY: '证券未解析',
    POSSIBLE_SECURITY_OMISSION: '证券可能遗漏',
    PUBLISHED_TIME_UNKNOWN: '发布时间未知',
    SOURCE_DISCOVERY_TIME_ONLY: '仅来源发现时间',
  };
  return labels[flag] ?? '其他质量提示';
}
