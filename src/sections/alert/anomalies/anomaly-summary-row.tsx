import type { AnomalyStats, AnomalyListResponse } from 'src/api/alert';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

import { fNumber } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type CardColor = 'warning' | 'error' | 'info' | 'success';

type Props = {
  data: AnomalyListResponse | null;
  loading: boolean;
  /** 当前页项目数（仅在缺 stats 时作"本页"统计兜底） */
  currentPageItems: number;
  onClickNewOnly: () => void;
  onClickMultiType: () => void;
  onClickWatchlistScope: () => void;
};

export function AnomalySummaryRow({
  data,
  loading,
  currentPageItems,
  onClickNewOnly,
  onClickMultiType,
  onClickWatchlistScope,
}: Props) {
  const theme = useTheme();
  const stats: AnomalyStats | null = data?.stats ?? null;

  if (loading && !data) {
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[0, 1, 2, 3].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <Skeleton variant="rounded" height={104} />
          </Grid>
        ))}
      </Grid>
    );
  }

  // 数据来源：优先后端聚合 stats；否则回退到当前页/total
  const total = stats?.total ?? data?.total ?? 0;
  const newCount = stats?.newCount;
  const multiTypeCount = stats?.multiTypeStockCount;
  const watchlistCount = stats?.watchlistCount;
  const fallback = !stats;
  const fallbackHint = fallback ? '后端聚合未上线，仅显示本页/总数' : null;

  const cards: Array<{
    label: string;
    color: CardColor;
    value: string;
    sub: string;
    onClick?: () => void;
    disabled?: boolean;
    hint?: string;
  }> = [
    {
      label: '今日总异动',
      color: 'warning',
      value: fNumber(total),
      sub:
        stats?.totalDeltaVsPrev != null
          ? `较昨日 ${stats.totalDeltaVsPrev >= 0 ? '+' : ''}${fNumber(stats.totalDeltaVsPrev)}`
          : `本页 ${fNumber(currentPageItems)} 条`,
    },
    {
      label: '新发异动',
      color: 'error',
      value: newCount != null ? fNumber(newCount) : '--',
      sub: newCount != null ? '今日首次出现' : '待后端 isNew',
      onClick: onClickNewOnly,
      disabled: newCount == null,
    },
    {
      label: '共振股票',
      color: 'info',
      value: multiTypeCount != null ? fNumber(multiTypeCount) : '--',
      sub: multiTypeCount != null ? '≥ 2 类异动命中' : '待后端共振统计',
      onClick: onClickMultiType,
      disabled: multiTypeCount == null,
    },
    {
      label: '自选股相关',
      color: 'success',
      value: watchlistCount != null ? fNumber(watchlistCount) : '--',
      sub: watchlistCount != null ? '点击仅看自选范围' : '需登录并配置自选股',
      onClick: onClickWatchlistScope,
      disabled: watchlistCount == null,
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((c) => (
        <Grid key={c.label} size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              border: `1px solid ${varAlpha(theme.vars.palette[c.color].mainChannel, 0.16)}`,
              bgcolor: varAlpha(theme.vars.palette[c.color].mainChannel, 0.04),
              opacity: c.disabled ? 0.7 : 1,
              transition: 'transform 200ms ease',
              '&:hover': c.disabled ? undefined : { transform: 'translateY(-1px)' },
            }}
          >
            <CardActionArea disabled={c.disabled || !c.onClick} onClick={c.onClick} sx={{ p: 2 }}>
              <Stack direction="row" alignItems="stretch" spacing={1.5}>
                <Box
                  sx={{
                    width: 4,
                    borderRadius: 2,
                    bgcolor: `${c.color}.main`,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {c.label}
                    {fallbackHint != null && c.label === '今日总异动' ? (
                      <Tooltip title={fallbackHint} placement="top">
                        <Box component="span" sx={{ ml: 0.5, color: 'text.disabled' }}>
                          ⓘ
                        </Box>
                      </Tooltip>
                    ) : null}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      mt: 0.5,
                      color: `${c.color}.main`,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {c.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.sub}
                  </Typography>
                </Box>
              </Stack>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
