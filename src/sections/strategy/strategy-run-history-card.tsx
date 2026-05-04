import type { Strategy } from 'src/api/strategy';
import type { BacktestRunListItem } from 'src/api/backtest';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';

import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { listRuns } from 'src/api/backtest';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { QuoteText } from './components/quote-text';
import { STATUS_COLOR, STATUS_LABEL } from '../backtest/constants';

// ----------------------------------------------------------------------

interface StrategyRunHistoryCardProps {
  strategy: Strategy;
}

export function StrategyRunHistoryCard({ strategy }: StrategyRunHistoryCardProps) {
  const [items, setItems] = useState<BacktestRunListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    // P1 修复：按 strategyId 精确查询，fallback 到 strategyType 客户端过滤
    listRuns({ strategyId: strategy.id, pageSize: 5, page: 1 })
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch(() => {
        if (cancelled) return undefined;
        return listRuns({ strategyType: strategy.strategyType, pageSize: 20, page: 1 })
          .then((res) => {
            if (!cancelled) setItems(res.items.slice(0, 5));
          })
          .catch(() => {
            if (!cancelled) setError('加载回测历史失败');
          });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [strategy.id, strategy.strategyType]);

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="fontWeightBold">
            近期回测
          </Typography>
          <Button component={RouterLink} href="/backtest/runs" size="small">
            查看全部
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={56} />
            ))}
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : items.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Iconify icon="solar:chart-bold" width={40} sx={{ color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" sx={{ color: 'text.disabled', mb: 1.5 }}>
              暂无回测记录
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {items.map((run) => (
              <RunRow key={run.runId} run={run} />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

function RunRow({ run }: { run: BacktestRunListItem }) {
  const isRunning = run.status === 'RUNNING';

  return (
    <Box
      component={RouterLink}
      href={`/backtest/runs/${run.runId}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 1,
        borderRadius: 1,
        textDecoration: 'none',
        color: 'inherit',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {/* Name */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap fontWeight="fontWeightMedium">
          {run.name ?? '未命名'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {fDateTime(run.createdAt, 'YYYY-MM-DD HH:mm')}
        </Typography>
      </Box>

      {/* Running: inline progress */}
      {isRunning && (
        <Box sx={{ width: 60, flexShrink: 0 }}>
          <LinearProgress
            variant="determinate"
            value={run.progress ?? 0}
            sx={{ height: 4, borderRadius: 2, mb: 0.5 }}
          />
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {run.progress ?? 0}%
          </Typography>
        </Box>
      )}

      {/* Status */}
      {!isRunning && (
        <Label color={STATUS_COLOR[run.status] ?? 'default'} variant="soft" sx={{ flexShrink: 0 }}>
          {STATUS_LABEL[run.status] ?? run.status}
        </Label>
      )}

      {/* Total return — P2 修复：红涨绿跌 */}
      <Box sx={{ textAlign: 'right', flexShrink: 0, minWidth: 64 }}>
        <QuoteText value={run.totalReturn} variant="body2" />
        {run.sharpeRatio != null && (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            夏普 {run.sharpeRatio.toFixed(2)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
