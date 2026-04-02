import type { BacktestRunListItem } from 'src/api/backtest';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fToNow } from 'src/utils/format-time';
import { fPctChg } from 'src/utils/format-number';

import { listRuns } from 'src/api/backtest';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

const STRATEGY_TYPE_LABEL: Record<string, string> = {
  MA_CROSS_SINGLE: 'MA 交叉',
  SCREENING_ROTATION: '选股轮动',
  FACTOR_RANKING: '因子排名',
  CUSTOM_POOL_REBALANCE: '自定义池',
};

type StatusColor = 'success' | 'info' | 'error' | 'warning' | 'default';

function statusColor(s: string): StatusColor {
  if (s === 'COMPLETED') return 'success';
  if (s === 'RUNNING') return 'info';
  if (s === 'FAILED') return 'error';
  if (s === 'QUEUED') return 'warning';
  return 'default';
}

function statusLabel(s: string): string {
  if (s === 'COMPLETED') return '已完成';
  if (s === 'RUNNING') return '运行中';
  if (s === 'FAILED') return '失败';
  if (s === 'QUEUED') return '排队中';
  if (s === 'CANCELLED') return '已取消';
  return s;
}

// ----------------------------------------------------------------------

type RunCardProps = { run: BacktestRunListItem; onClick: () => void };

function RunCard({ run, onClick }: RunCardProps) {
  const strategyLabel = STRATEGY_TYPE_LABEL[run.strategyType] ?? run.strategyType;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        px: 1.5,
        py: 1.25,
        borderRadius: 1,
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" fontWeight="fontWeightMedium" noWrap sx={{ flex: 1 }}>
          {run.name ?? strategyLabel}
        </Typography>
        <Label color={statusColor(run.status)} variant="soft" sx={{ ml: 1, flexShrink: 0 }}>
          {statusLabel(run.status)}
        </Label>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {run.annualizedReturn != null && (
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              年化收益
            </Typography>
            <Typography
              variant="body2"
              fontWeight="fontWeightMedium"
              sx={{
                color:
                  run.annualizedReturn > 0
                    ? 'error.main'
                    : run.annualizedReturn < 0
                      ? 'success.main'
                      : 'text.secondary',
              }}
            >
              {fPctChg(run.annualizedReturn * 100)}
            </Typography>
          </Box>
        )}

        {run.maxDrawdown != null && (
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              最大回撤
            </Typography>
            <Typography variant="body2" sx={{ color: 'success.main' }}>
              {fPctChg(run.maxDrawdown * 100)}
            </Typography>
          </Box>
        )}

        {run.sharpeRatio != null && (
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              夏普
            </Typography>
            <Typography variant="body2">{run.sharpeRatio.toFixed(2)}</Typography>
          </Box>
        )}
      </Box>

      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
        {fToNow(run.createdAt)}前
      </Typography>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function DashboardRecentBacktests() {
  const router = useRouter();
  const [runs, setRuns] = useState<BacktestRunListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    listRuns({ page: 1, pageSize: 5 })
      .then((res) => {
        if (!cancelled) setRuns(res?.items ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载回测任务失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">最近回测</Typography>
          <Button
            component={RouterLink}
            href="/backtest/runs"
            size="small"
            variant="text"
            sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
          >
            查看全部
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rectangular" height={70} sx={{ mb: 1, borderRadius: 1 }} />
            ))}
          </>
        ) : runs.length === 0 ? (
          <Box
            sx={{
              py: 4,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无回测任务
            </Typography>
            <Button component={RouterLink} href="/backtest" size="small" variant="contained">
              前往创建
            </Button>
          </Box>
        ) : (
          runs.map((run, idx) => (
            <Box key={run.runId}>
              {idx > 0 && <Divider sx={{ my: 0.5 }} />}
              <RunCard run={run} onClick={() => router.push(`/backtest/runs/${run.runId}`)} />
            </Box>
          ))
        )}
      </CardContent>

      {!loading && runs.length > 0 && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Button component={RouterLink} href="/backtest" size="small" fullWidth variant="outlined">
            新建回测
          </Button>
        </Box>
      )}
    </Card>
  );
}
