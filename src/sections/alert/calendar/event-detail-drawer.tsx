import type { CalendarEvent, CalendarHistoryTrend } from 'src/api/alert';

import dayjs from 'dayjs';
import { Fragment, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { getAShareReturnTextColor } from 'src/utils/market-color';

import { alertApi } from 'src/api/alert';

import { Iconify } from 'src/components/iconify';

import { getEventImpactLevel } from './types';
import { getEventTypeConfig } from './event-type-config';

// ----------------------------------------------------------------------

const IMPACT_COLOR: Record<'HIGH' | 'MEDIUM' | 'LOW', 'error' | 'warning' | 'info'> = {
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'info',
};

const IMPACT_LABEL: Record<'HIGH' | 'MEDIUM' | 'LOW', string> = {
  HIGH: '高影响',
  MEDIUM: '中影响',
  LOW: '低影响',
};

export function formatCalendarReturn(value: number | null): string {
  if (value == null) return '—';
  const percent = value * 100;
  return `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`;
}

type Props = {
  open: boolean;
  event: CalendarEvent | null;
  onClose: () => void;
  onSubscribe: (event: CalendarEvent) => void;
};

export function EventDetailDrawer({ open, event, onClose, onSubscribe }: Props) {
  const [trend, setTrend] = useState<CalendarHistoryTrend | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !event) return undefined;
    const controller = new AbortController();
    setTrendLoading(true);
    setTrendError(null);
    setTrend(null);
    alertApi
      .getCalendarHistoryTrend(
        { tsCode: event.tsCode, type: event.type, subType: event.subType },
        controller.signal
      )
      .then((data) => {
        if (controller.signal.aborted) return;
        setTrend(data);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setTrendError(err instanceof Error ? err.message : '历史数据加载失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setTrendLoading(false);
      });
    return () => controller.abort();
  }, [open, event]);

  if (!event) return null;

  const cfg = getEventTypeConfig(event.type);
  const impact = getEventImpactLevel(event);
  const dateStr = dayjs(event.date, 'YYYYMMDD').format('YYYY-MM-DD');

  const metrics = event.metrics ?? {};
  const metricEntries = Object.entries(metrics);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: { width: { xs: '100%', sm: 480 }, overscrollBehavior: 'contain' } },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Iconify icon={cfg.icon} width={22} sx={{ color: `${cfg.paletteKey}.main` }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          事件详情
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="关闭">
          <IconButton size="small" onClick={onClose} aria-label="关闭">
            <Iconify icon="solar:close-circle-bold" width={18} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Box sx={{ p: 2.5, overflow: 'auto', flexGrow: 1 }}>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="h6">{event.stockName || event.tsCode}</Typography>
              <Typography variant="body2" color="text.secondary">
                {event.tsCode}
              </Typography>
              <Link
                component="a"
                href={`/stock/detail?code=${event.tsCode}`}
                target="_blank"
                rel="noopener"
                variant="caption"
                sx={{ ml: 'auto' }}
              >
                查看个股 →
              </Link>
            </Stack>
            <Stack direction="row" spacing={0.75} flexWrap="wrap">
              <Chip size="small" variant="outlined" color={cfg.color} label={cfg.label} />
              <Chip size="small" color={IMPACT_COLOR[impact]} label={IMPACT_LABEL[impact]} />
              {event.impactScore != null && (
                <Chip size="small" variant="outlined" label={`影响力 ${event.impactScore}`} />
              )}
              {event.status === 'POSTPONED' && (
                <Chip size="small" color="warning" variant="outlined" label="已延期" />
              )}
            </Stack>
          </Stack>

          <Divider />

          <Stack spacing={0.75}>
            <Typography variant="caption" color="text.secondary">
              发生日期
            </Typography>
            <Typography variant="body2">
              {dateStr}
              {event.daysToEvent != null && (
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  （距今 {event.daysToEvent} 天）
                </Typography>
              )}
            </Typography>
          </Stack>

          <Stack spacing={0.75}>
            <Typography variant="caption" color="text.secondary">
              标题
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {event.title}
            </Typography>
          </Stack>

          {event.detail && (
            <Stack spacing={0.75}>
              <Typography variant="caption" color="text.secondary">
                详细信息
              </Typography>
              {typeof event.detail === 'string' ? (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {event.detail}
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '2px 12px',
                    alignItems: 'baseline',
                  }}
                >
                  {Object.entries(event.detail).map(([k, v]) => (
                    <Fragment key={k}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        {k}
                      </Typography>
                      <Typography variant="body2">{String(v ?? '—')}</Typography>
                    </Fragment>
                  ))}
                </Box>
              )}
            </Stack>
          )}

          {metricEntries.length > 0 && (
            <>
              <Divider />
              <Stack spacing={1}>
                <Typography variant="subtitle2">关键指标</Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 1.5,
                  }}
                >
                  {metricEntries.map(([key, value]) => (
                    <Stack key={key} spacing={0.25}>
                      <Typography variant="caption" color="text.secondary">
                        {key}
                      </Typography>
                      <Typography variant="body2">{String(value)}</Typography>
                    </Stack>
                  ))}
                </Box>
              </Stack>
            </>
          )}

          <Divider />

          <Stack spacing={1}>
            <Typography variant="subtitle2">历史同类事件参考</Typography>
            {trendLoading && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  加载中…
                </Typography>
              </Stack>
            )}
            {trendError && (
              <Alert severity="info" variant="outlined">
                暂无历史数据
              </Alert>
            )}
            {trend && trend.samples.length === 0 && (
              <Typography variant="caption" color="text.secondary">
                暂无历史数据
              </Typography>
            )}
            {trend && trend.samples.length > 0 && (
              <Stack spacing={0.75}>
                <Typography variant="caption" color="text.secondary">
                  近 {trend.samples.length} 次同类事件平均收益
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 1,
                  }}
                >
                  {Object.entries(trend.average).map(([period, value]) => (
                    <Stack
                      key={period}
                      spacing={0.25}
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'background.neutral',
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {period}
                      </Typography>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          color:
                            value == null
                              ? 'text.disabled'
                              : getAShareReturnTextColor(value),
                        }}
                      >
                        {formatCalendarReturn(value)}
                      </Typography>
                    </Stack>
                  ))}
                </Box>
              </Stack>
            )}
          </Stack>

          {event.announcementUrl && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Iconify icon="solar:document-text-bold" width={18} />}
              component="a"
              href={event.announcementUrl}
              target="_blank"
              rel="noopener"
            >
              查看公告原文
            </Button>
          )}
        </Stack>
      </Box>

      <Stack
        direction="row"
        spacing={1}
        sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}
      >
        <Button
          fullWidth
          variant="contained"
          startIcon={<Iconify icon="solar:bell-bold" width={18} />}
          onClick={() => onSubscribe(event)}
        >
          订阅此类事件
        </Button>
      </Stack>
    </Drawer>
  );
}
