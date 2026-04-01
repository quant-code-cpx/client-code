import type { BacktestRunDetailResponse } from 'src/api/backtest';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { STATUS_COLOR, STATUS_LABEL, STRATEGY_TYPE_LABEL } from './constants';

// ----------------------------------------------------------------------

interface BacktestDetailHeaderProps {
  detail: BacktestRunDetailResponse;
  onCancel: () => void;
  onCopy: () => void;
  cancelling: boolean;
}

export function BacktestDetailHeader({
  detail,
  onCancel,
  onCopy,
  cancelling,
}: BacktestDetailHeaderProps) {
  const canCancel = detail.status === 'QUEUED' || detail.status === 'RUNNING';

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {detail.name ?? '回测详情'}
          </Typography>
          <Label color={STATUS_COLOR[detail.status] ?? 'default'} variant="soft">
            {STATUS_LABEL[detail.status] ?? detail.status}
          </Label>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {STRATEGY_TYPE_LABEL[detail.strategyType] ?? detail.strategyType}
          {' · '}
          {detail.startDate} ~ {detail.endDate}
          {' · '}
          基准：{detail.benchmarkTsCode}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
        <Button
          component={RouterLink}
          href="/backtest/runs"
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:arrow-left-bold" width={14} />}
        >
          返回历史
        </Button>

        <Button
          variant="outlined"
          size="small"
          onClick={onCopy}
          startIcon={<Iconify icon="solar:copy-bold" width={14} />}
        >
          复制重跑
        </Button>

        {canCancel && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            disabled={cancelling}
            onClick={onCancel}
            startIcon={<Iconify icon="solar:close-circle-bold" width={14} />}
          >
            {cancelling ? '取消中...' : '取消任务'}
          </Button>
        )}
      </Box>
    </Box>
  );
}
