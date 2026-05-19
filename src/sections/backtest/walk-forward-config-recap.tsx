import type { WalkForwardRunDetail } from 'src/api/backtest';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Label } from 'src/components/label';

import { STRATEGY_TYPE_LABEL } from './constants';
import { formatCompactDate } from './walk-forward-utils';

// ----------------------------------------------------------------------

type Props = {
  detail: WalkForwardRunDetail;
};

function JsonBlock({ value }: { value: unknown }) {
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 1.5,
        borderRadius: 1,
        bgcolor: 'background.neutral',
        color: 'text.secondary',
        fontSize: 12,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {JSON.stringify(value ?? {}, null, 2)}
    </Box>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} textAlign="right">
        {value}
      </Typography>
    </Stack>
  );
}

export function WalkForwardConfigRecap({ detail }: Props) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              基础信息
            </Typography>
            <Line label="任务名称" value={detail.name ?? '未命名'} />
            <Line
              label="基础策略"
              value={STRATEGY_TYPE_LABEL[detail.baseStrategyType] ?? detail.baseStrategyType}
            />
            <Line label="窗口模式" value={detail.windowMode ?? 'ROLLING'} />
            <Line
              label="全量区间"
              value={`${formatCompactDate(detail.fullStartDate)} ~ ${formatCompactDate(detail.fullEndDate)}`}
            />
            <Divider sx={{ my: 1 }} />
            <Line label="IS 天数" value={`${detail.inSampleDays}`} />
            <Line label="OOS 天数" value={`${detail.outOfSampleDays}`} />
            <Line label="步进天数" value={`${detail.stepDays}`} />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              防泄漏与约束
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              <Label color="info">净化: {detail.purgeDays ?? 0} 天</Label>
              <Label color="info">禁用: {detail.embargoDays ?? 0} 天</Label>
              <Label color="info">Min OOS Trades: {detail.minOosTrades ?? 0}</Label>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              若后端尚未返回这些字段，页面会按 0 降级展示；提交端已随请求 Body 发送。
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              基准与资金
            </Typography>
            <Line label="优化指标" value={detail.optimizeMetric} />
            <Line label="基准指数" value={detail.benchmarkTsCode ?? '—'} />
            <Line label="股票池" value={detail.universe ?? '—'} />
            <Line label="初始资金" value={detail.initialCapital?.toLocaleString() ?? '—'} />
            <Line label="调仓频率" value={detail.rebalanceFrequency ?? 'MONTHLY'} />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              基础策略配置
            </Typography>
            <JsonBlock value={detail.baseStrategyConfig} />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              参数搜索空间
            </Typography>
            <JsonBlock value={detail.paramSearchSpace} />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
