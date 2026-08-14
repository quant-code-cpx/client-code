import type { ReactNode } from 'react';
import type { WalkForwardRunDetail } from 'src/api/backtest';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';

import { getAShareReturnColor } from 'src/utils/market-color';

import { Label } from 'src/components/label';

import {
  robustnessColor,
  robustnessLabel,
  formatNumberValue,
  formatPercentValue,
  getEnabledParamKeys,
  computeRobustnessStats,
} from './walk-forward-utils';

// ----------------------------------------------------------------------

type Props = {
  detail: WalkForwardRunDetail;
};

function DiagnosticCard({
  title,
  helper,
  children,
}: {
  title: string;
  helper: string;
  children: ReactNode;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="caption" color="text.secondary">
          {helper}
        </Typography>
        <Box sx={{ mt: 2 }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

function RatioLine({ label, value }: { label: string; value: number | null }) {
  const normalized = Math.max(0, Math.min(100, (value ?? 0) * 100));
  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {formatPercentValue(value, 1)}
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={normalized} />
    </Box>
  );
}

export function WalkForwardRobustnessPanel({ detail }: Props) {
  const stats = computeRobustnessStats(detail);
  const paramKeys = getEnabledParamKeys(detail.windows);
  const completedWindows = detail.windows.filter((item) => item.oosReturn !== null);

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4 }}>
        <DiagnosticCard title="综合评级" helper="结合 WFE、负窗口占比与 OOS 夏普生成前端兜底评级">
          <Stack spacing={2}>
            <Box
              sx={(theme) => ({
                p: 2,
                borderRadius: 2,
                bgcolor: varAlpha(
                  theme.vars.palette[robustnessColor(stats.level)].mainChannel,
                  0.08
                ),
              })}
            >
              <Label color={robustnessColor(stats.level)}>{robustnessLabel(stats.level)}</Label>
              <Typography variant="h3" sx={{ mt: 1, fontFeatureSettings: '"tnum"' }}>
                {formatPercentValue(stats.wfe, 1)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats.wfeEstimated ? 'WFE 暂由窗口均值估算' : '后端返回 WFE'}
              </Typography>
            </Box>
            <RatioLine
              label="负 OOS 窗口占比"
              value={detail.oosNegativeWindowRate ?? stats.negativeWindowRate}
            />
            <RatioLine label="IS-OOS 衰减" value={stats.degradation} />
          </Stack>
        </DiagnosticCard>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <DiagnosticCard title="窗口表现分布" helper="逐窗口对比 IS 与 OOS，快速定位过拟合断点">
          <Stack spacing={1.25}>
            {completedWindows.slice(0, 8).map((item) => (
              <Box key={item.windowIndex}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="caption">#{item.windowIndex + 1}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    IS {formatPercentValue(item.isReturn, 1)} / OOS{' '}
                    {formatPercentValue(item.oosReturn, 1)}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.75}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.max(0, Math.min(100, (item.isReturn ?? 0) * 100))}
                    sx={{ flex: 1 }}
                  />
                  <LinearProgress
                    color={getAShareReturnColor(item.oosReturn, 'inherit')}
                    variant="determinate"
                    value={Math.max(0, Math.min(100, Math.abs(item.oosReturn ?? 0) * 100))}
                    sx={{ flex: 1 }}
                  />
                </Stack>
              </Box>
            ))}
            {completedWindows.length === 0 && (
              <Typography variant="body2" color="text.disabled">
                完成后展示窗口表现分布
              </Typography>
            )}
          </Stack>
        </DiagnosticCard>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <DiagnosticCard title="参数稳定性" helper="观察最优参数是否在窗口间剧烈漂移">
          <Stack spacing={1.25}>
            {paramKeys.slice(0, 6).map((key) => {
              const values = detail.windows
                .map((item) => item.optimizedParams?.[key])
                .filter((value) => value !== undefined && value !== null)
                .map(String);
              const uniqueCount = new Set(values).size;
              const stability = values.length > 0 ? 1 - (uniqueCount - 1) / values.length : null;

              return (
                <Box key={key}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2">{key}</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatNumberValue(stability, 2)}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    color={(stability ?? 0) >= 0.6 ? 'success' : 'warning'}
                    variant="determinate"
                    value={Math.max(0, Math.min(100, (stability ?? 0) * 100))}
                  />
                </Box>
              );
            })}
            {paramKeys.length === 0 && (
              <Typography variant="body2" color="text.disabled">
                暂无可分析的最优参数
              </Typography>
            )}
          </Stack>
        </DiagnosticCard>
      </Grid>
    </Grid>
  );
}
