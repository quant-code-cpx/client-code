import type {
  ScreeningItem,
  FactorScreeningResult,
  FactorScreeningIndustryBucket,
} from 'src/api/factor';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';

// ----------------------------------------------------------------------

type Props = {
  result: FactorScreeningResult | null;
};

const tabularNum = { fontVariantNumeric: 'tabular-nums' as const };

function deriveIndustryDistribution(items: ScreeningItem[]): FactorScreeningIndustryBucket[] {
  if (items.length === 0) return [];
  const map = new Map<string | null, number>();
  items.forEach((it) => {
    const key = it.industry ?? null;
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([industry, count]) => ({
      industry,
      count,
      ratio: count / items.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function ScreeningDiagnosticsPanel({ result }: Props) {
  const isClientFallback = !result?.diagnostics?.industryDistribution;

  const industryBuckets = useMemo<FactorScreeningIndustryBucket[]>(() => {
    if (!result) return [];
    return result.diagnostics?.industryDistribution ?? deriveIndustryDistribution(result.items);
  }, [result]);

  if (!result) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            运行选股后此处展示行业、因子分位等诊断信息。
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">行业分布（Top 10）</Typography>
            {isClientFallback && (
              <Typography variant="caption" sx={{ color: 'warning.dark' }}>
                客户端聚合（后端 BE-9 上线后切换）
              </Typography>
            )}
          </Stack>
          {industryBuckets.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无行业数据
            </Typography>
          ) : (
            <Stack spacing={1}>
              {industryBuckets.map((b) => (
                <Box key={b.industry ?? '__null'}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 0.5 }}
                  >
                    <Typography variant="body2">{b.industry ?? '未知行业'}</Typography>
                    <Typography variant="caption" sx={{ ...tabularNum, color: 'text.secondary' }}>
                      {b.count} 只 · {(b.ratio * 100).toFixed(1)}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, b.ratio * 100)}
                    sx={{ height: 6, borderRadius: 1 }}
                  />
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {result.diagnostics?.factorPercentiles && result.diagnostics.factorPercentiles.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              因子分位概览
            </Typography>
            <Stack spacing={1}>
              {result.diagnostics.factorPercentiles.map((fp) => (
                <Stack key={fp.factorName} direction="row" spacing={2} sx={tabularNum}>
                  <Typography variant="body2" sx={{ minWidth: 140 }}>
                    {fp.factorName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    mean={fp.mean ?? '—'} · q25={fp.q25 ?? '—'} · q75={fp.q75 ?? '—'}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
