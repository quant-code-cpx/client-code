import type { BacktestRunDetailResponse } from 'src/api/backtest';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { BENCHMARK_OPTIONS, UNIVERSE_OPTIONS, REBALANCE_FREQUENCY_OPTIONS, PRICE_MODE_OPTIONS, STRATEGY_TYPE_LABEL } from './constants';

// ----------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: 600, textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  );
}

interface BacktestConfigDrawerProps {
  detail: BacktestRunDetailResponse;
}

export function BacktestConfigDrawer({ detail }: BacktestConfigDrawerProps) {
  const benchmarkLabel =
    BENCHMARK_OPTIONS.find((o) => o.value === detail.benchmarkTsCode)?.label ??
    detail.benchmarkTsCode;
  const universeLabel =
    UNIVERSE_OPTIONS.find((o) => o.value === detail.universe)?.label ?? detail.universe;
  const freqLabel =
    REBALANCE_FREQUENCY_OPTIONS.find((o) => o.value === detail.rebalanceFrequency)?.label ??
    detail.rebalanceFrequency;
  const priceLabel =
    PRICE_MODE_OPTIONS.find((o) => o.value === detail.priceMode)?.label ?? detail.priceMode;
  const strategyLabel = STRATEGY_TYPE_LABEL[detail.strategyType] ?? detail.strategyType;

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          基础配置
        </Typography>
        <InfoRow label="策略类型" value={strategyLabel} />
        <Divider />
        <InfoRow label="回测区间" value={`${detail.startDate} ~ ${detail.endDate}`} />
        <Divider />
        <InfoRow label="基准指数" value={benchmarkLabel} />
        <Divider />
        <InfoRow label="股票池" value={universeLabel} />
        <Divider />
        <InfoRow label="调仓频率" value={freqLabel} />
        <Divider />
        <InfoRow label="成交模式" value={priceLabel} />
        <Divider />
        <InfoRow
          label="初始资金"
          value={`¥ ${detail.initialCapital.toLocaleString()}`}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          策略参数
        </Typography>
        {Object.entries(detail.strategyConfig).map(([key, val]) => (
          <Box key={key}>
            <InfoRow label={key} value={String(val)} />
            <Divider />
          </Box>
        ))}
      </Grid>
    </Grid>
  );
}
