import type { FactorScreeningResult } from 'src/api/factor';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type Props = {
  result: FactorScreeningResult | null;
};

const tabularNum = { fontVariantNumeric: 'tabular-nums' as const };

export function ScreeningResultKpiStrip({ result }: Props) {
  if (!result) return null;

  const summary = result.summary;
  const universeCount = summary?.universeCount ?? null;
  const matchedCount = summary?.matchedCount ?? result.total;
  const matchedRate = summary?.matchedRate ?? null;
  const missingRate = summary?.missingRate ?? null;
  const asOfDate = summary?.asOfTradeDate ?? result.tradeDate;
  const freshness = summary?.dataFreshness ?? null;
  const execMs = summary?.executionMs ?? null;

  const stats: { label: string; value: string; color?: 'warning' | 'error' | 'success' }[] = [
    {
      label: '股票池',
      value: universeCount === null ? '—' : String(universeCount),
    },
    {
      label: '命中数',
      value: String(matchedCount),
      color: matchedCount === 0 ? 'warning' : undefined,
    },
    {
      label: '命中率',
      value: matchedRate === null ? '—' : `${(matchedRate * 100).toFixed(1)}%`,
    },
    {
      label: '缺失率',
      value: missingRate === null ? '—' : `${(missingRate * 100).toFixed(1)}%`,
      color: missingRate !== null && missingRate > 0.2 ? 'warning' : undefined,
    },
    {
      label: '快照日期',
      value: asOfDate,
    },
    {
      label: '耗时',
      value: execMs === null ? '—' : `${execMs} ms`,
    },
  ];

  return (
    <Card sx={{ mb: 2, p: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={3}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        flexWrap="wrap"
      >
        {stats.map((it) => (
          <Box key={it.label} sx={{ minWidth: 92 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {it.label}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                ...tabularNum,
                color: it.color ? `${it.color}.dark` : 'text.primary',
                lineHeight: 1.2,
              }}
            >
              {it.value}
            </Typography>
          </Box>
        ))}

        <Box sx={{ flexGrow: 1 }} />

        {freshness !== null && (
          <Tooltip
            title={
              freshness === 'FRESH'
                ? '数据新鲜：与最近交易日一致'
                : freshness === 'STALE'
                  ? '数据滞后：当前快照早于最近交易日'
                  : '尚未生成因子快照'
            }
          >
            <Label
              color={
                freshness === 'FRESH' ? 'success' : freshness === 'STALE' ? 'warning' : 'default'
              }
              variant="soft"
            >
              {freshness === 'FRESH' ? '数据新鲜' : freshness === 'STALE' ? '数据滞后' : '无快照'}
            </Label>
          </Tooltip>
        )}

        {summary === undefined && (
          <Tooltip title="后端 BE-2 未上线，部分指标暂无法展示">
            <Label color="default" variant="soft">
              指标降级
            </Label>
          </Tooltip>
        )}
      </Stack>
    </Card>
  );
}
