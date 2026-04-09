import type { Strategy } from 'src/api/strategy';
import type { BacktestRunListItem } from 'src/api/backtest';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';
import { fPercent } from 'src/utils/format-number';

import { listRuns } from 'src/api/backtest';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { STATUS_COLOR, STATUS_LABEL } from '../backtest/constants';

// ----------------------------------------------------------------------

interface StrategyRunHistoryCardProps {
  strategy: Strategy;
}

export function StrategyRunHistoryCard({ strategy }: StrategyRunHistoryCardProps) {
  const [items, setItems] = useState<BacktestRunListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listRuns({ strategyType: strategy.strategyType, pageSize: 5, page: 0 })
      .then((res) => setItems(res.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [strategy.strategyType]);

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
        ) : items.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Iconify icon="solar:chart-bold" width={40} sx={{ color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              该类型暂无回测记录
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
  const returnColor =
    run.totalReturn == null
      ? 'text.disabled'
      : run.totalReturn >= 0
        ? 'error.main'
        : 'success.main';

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

      {/* Status */}
      <Label color={STATUS_COLOR[run.status] ?? 'default'} variant="soft" sx={{ flexShrink: 0 }}>
        {STATUS_LABEL[run.status] ?? run.status}
      </Label>

      {/* Total return */}
      <Box sx={{ textAlign: 'right', flexShrink: 0, minWidth: 60 }}>
        {run.totalReturn != null ? (
          <Typography variant="body2" sx={{ color: returnColor, fontWeight: 600 }}>
            {run.totalReturn >= 0 ? '+' : ''}
            {fPercent(run.totalReturn)}
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            -
          </Typography>
        )}
        {run.sharpeRatio != null && (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            夏普 {run.sharpeRatio.toFixed(2)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
