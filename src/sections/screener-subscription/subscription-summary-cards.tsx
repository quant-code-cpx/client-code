import type { ScreenerSubscription } from 'src/api/screener-subscription';

import { useMemo } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';

// ----------------------------------------------------------------------

const QUOTA_LIMIT = 10;

type SummaryItem = {
  key: string;
  label: string;
  value: string;
  hint?: string;
  /** 主题色 channel 名称 */
  tone: 'primary' | 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
  active?: boolean;
};

type Props = {
  subscriptions: ScreenerSubscription[];
  loading: boolean;
  /** 当前选中的状态过滤；用于点击 KPI 时切换到对应过滤 */
  statusFilter: 'ALL' | 'ACTIVE' | 'PAUSED' | 'ERROR';
  onStatusFilterChange: (status: 'ALL' | 'ACTIVE' | 'PAUSED' | 'ERROR') => void;
};

export function SubscriptionSummaryCards({
  subscriptions,
  loading,
  statusFilter,
  onStatusFilterChange,
}: Props) {
  const theme = useTheme();

  const stats = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === 'ACTIVE').length;
    const paused = subscriptions.filter((s) => s.status === 'PAUSED').length;
    const errored = subscriptions.filter((s) => s.status === 'ERROR').length;
    const todayStr = fDate(new Date(), 'YYYY-MM-DD');
    const ranToday = subscriptions.filter((s) => {
      if (!s.lastRunAt) return false;
      return fDate(s.lastRunAt, 'YYYY-MM-DD') === todayStr;
    }).length;
    const latestTradeDate = subscriptions
      .map((s) => s.lastRunResult?.tradeDate)
      .filter((d): d is string => Boolean(d))
      .sort((a, b) => b.localeCompare(a))[0];

    return { active, paused, errored, ranToday, latestTradeDate };
  }, [subscriptions]);

  const items: SummaryItem[] = [
    {
      key: 'active',
      label: '活跃订阅',
      value: loading ? '--' : String(stats.active),
      tone: 'success',
      hint: '正在按调度运行',
      onClick: () => onStatusFilterChange(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE'),
      active: statusFilter === 'ACTIVE',
    },
    {
      key: 'paused',
      label: '已暂停',
      value: loading ? '--' : String(stats.paused),
      tone: 'warning',
      hint: '手动暂停，不参与调度',
      onClick: () => onStatusFilterChange(statusFilter === 'PAUSED' ? 'ALL' : 'PAUSED'),
      active: statusFilter === 'PAUSED',
    },
    {
      key: 'error',
      label: 'ERROR',
      value: loading ? '--' : String(stats.errored),
      tone: 'error',
      hint: '连续失败已自动暂停，需要恢复',
      onClick: () => onStatusFilterChange(statusFilter === 'ERROR' ? 'ALL' : 'ERROR'),
      active: statusFilter === 'ERROR',
    },
    {
      key: 'ran-today',
      label: '今日已执行',
      value: loading ? '--' : String(stats.ranToday),
      tone: 'info',
      hint: stats.latestTradeDate
        ? `最新交易日：${fDate(stats.latestTradeDate, 'YYYY-MM-DD')}`
        : '尚无执行记录',
    },
    {
      key: 'quota',
      label: '配额使用',
      value: loading ? '--' : `${subscriptions.length} / ${QUOTA_LIMIT}`,
      tone: 'primary',
      hint: '上限 10 条；删除可释放名额',
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        mb: 3,
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(5, 1fr)',
        },
      }}
    >
      {items.map((item) => {
        const channel = theme.vars.palette[item.tone].mainChannel;
        return (
          <Card
            key={item.key}
            onClick={item.onClick}
            sx={{
              p: 2,
              cursor: item.onClick ? 'pointer' : 'default',
              borderLeft: `3px solid ${theme.vars.palette[item.tone].main}`,
              transition: theme.transitions.create(['background-color', 'box-shadow'], {
                duration: 200,
              }),
              ...(item.active && {
                bgcolor: varAlpha(channel, 0.08),
                boxShadow: theme.shadows[4],
              }),
              '&:hover': item.onClick ? { bgcolor: varAlpha(channel, 0.05) } : undefined,
            }}
          >
            <Stack spacing={0.5}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {item.label}
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  color: `${item.tone}.main`,
                }}
              >
                {item.value}
              </Typography>
              {item.hint && (
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  {item.hint}
                </Typography>
              )}
            </Stack>
          </Card>
        );
      })}
    </Box>
  );
}
