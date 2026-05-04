import type { WalkForwardRunSummary, WalkForwardRunListResponse } from 'src/api/backtest';

import { varAlpha } from 'minimal-shared/utils';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { formatNumberValue, formatCompactDate } from './walk-forward-utils';

// ----------------------------------------------------------------------

type Props = {
  rows: WalkForwardRunSummary[];
  total: number;
  aggregates?: WalkForwardRunListResponse['aggregates'];
  loading: boolean;
};

type SummaryItemProps = {
  label: string;
  value: string;
  helper: string;
  tone: 'primary' | 'info' | 'success' | 'warning';
  loading: boolean;
};

function SummaryItem({ label, value, helper, tone, loading }: SummaryItemProps) {
  return (
    <Card
      sx={(theme) => ({
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: varAlpha(theme.vars.palette[tone].mainChannel, 0.04),
      })}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width={96} height={36} />
        ) : (
          <Typography variant="h4" sx={{ mt: 0.5, fontFeatureSettings: '"tnum"' }}>
            {value}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          {helper}
        </Typography>
      </CardContent>
    </Card>
  );
}

function average(values: Array<number | null | undefined>) {
  const nums = values.filter((value): value is number => typeof value === 'number');
  if (nums.length === 0) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

export function WalkForwardListSummary({ rows, total, aggregates, loading }: Props) {
  const running = aggregates?.running ?? rows.filter((row) => row.status === 'RUNNING').length;
  const avgOosSharpe = aggregates?.avgOosSharpe ?? average(rows.map((row) => row.oosSharpeRatio));
  const lastCompletedAt =
    aggregates?.lastCompletedAt ??
    rows
      .map((row) => row.completedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ??
    null;

  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid size={{ xs: 6, md: 3 }}>
        <SummaryItem
          tone="primary"
          label="任务总数"
          value={`${aggregates?.total ?? total}`}
          helper="匹配当前筛选条件"
          loading={loading}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <SummaryItem
          tone="info"
          label="运行中"
          value={`${running}`}
          helper="列表存在运行任务时自动轮询"
          loading={loading}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <SummaryItem
          tone="success"
          label="平均 OOS 夏普"
          value={formatNumberValue(avgOosSharpe, 2)}
          helper="后端聚合优先，当前页兜底"
          loading={loading}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <SummaryItem
          tone="warning"
          label="最近完成"
          value={formatCompactDate(lastCompletedAt?.slice(0, 10))}
          helper="用于快速判断结果新鲜度"
          loading={loading}
        />
      </Grid>
    </Grid>
  );
}
