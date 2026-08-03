import type { TechnicalSignalStatisticsMeta } from 'src/api/technical-signal';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import AlertTitle from '@mui/material/AlertTitle';
import Typography from '@mui/material/Typography';

import { ApiError } from 'src/api/client';

import { formatTradeDate } from './technical-signal-formatters';

// ----------------------------------------------------------------------

type Props = {
  error: unknown;
  meta: TechnicalSignalStatisticsMeta | null;
  onDisableBenchmark: () => void;
  onRetry: () => void;
};

const WARNING_MESSAGES: Record<string, string> = {
  OVERLAPPING_OUTCOMES: '部分信号样本的持有区间重叠，不能视为独立观测。',
  BENCHMARK_PRE_INCEPTION_SAMPLES: '部分早期样本没有基准超额收益，个股收益仍保留。',
  PARTIAL_EXCURSION_PATHS: '部分有效样本的路径覆盖不完整，MFE/MAE 样本量较少。',
};

function errorTitle(error: ApiError): string {
  if (error.code === 'TECHNICAL_SIGNAL_BENCHMARK_NOT_READY') return '沪深 300 基准数据未就绪';
  if (error.code === 'TECHNICAL_SIGNAL_INSUFFICIENT_HISTORY') return '可用历史不足';
  if (error.code === 'TOO_MANY_REQUESTS') return '请求过于频繁';
  if (error.code === 'TECHNICAL_SIGNAL_TIMEOUT') return '统计计算超时';
  if (error.status === 404) return '技术信号统计接口暂不可用';
  return '历史信号统计加载失败';
}

export function TechnicalSignalMetaAlert({ error, meta, onDisableBenchmark, onRetry }: Props) {
  if (error) {
    const apiError = error instanceof ApiError ? error : null;
    const canDisableBenchmark = apiError?.code === 'TECHNICAL_SIGNAL_BENCHMARK_NOT_READY';
    const message = error instanceof Error ? error.message : '加载历史信号统计时发生未知错误';

    return (
      <Alert
        action={
          <Stack direction="row" spacing={1}>
            {canDisableBenchmark && (
              <Button color="inherit" onClick={onDisableBenchmark} size="small">
                关闭对标后重试
              </Button>
            )}
            <Button color="inherit" onClick={onRetry} size="small">
              重试
            </Button>
          </Stack>
        }
        severity="error"
      >
        <AlertTitle>{apiError ? errorTitle(apiError) : '历史信号统计加载失败'}</AlertTitle>
        {message}
        {apiError?.requestId && `（请求 ID：${apiError.requestId}）`}
      </Alert>
    );
  }

  if (!meta) return null;

  return (
    <Stack spacing={1.5}>
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Chip label={`数据截至 ${formatTradeDate(meta.dataAsOf)}`} size="small" variant="outlined" />
        <Chip label={meta.entryMode === 'SIGNAL_CLOSE' ? '信号日收盘入场' : '次日开盘入场'} size="small" />
        <Chip label={meta.adjustment} size="small" variant="outlined" />
        {meta.benchmarkTsCode && <Chip label={`基准 ${meta.benchmarkTsCode}`} size="small" />}
        <Chip label={meta.cacheHit ? '缓存命中' : '实时计算'} size="small" variant="outlined" />
      </Box>

      {meta.warnings.map((warning) => (
        <Alert key={warning} severity="warning">
          {WARNING_MESSAGES[warning] ?? warning}
        </Alert>
      ))}

      <Typography variant="caption" color="text.secondary">
        指标版本：{meta.indicatorAlgorithmVersion} · 统计版本：{meta.statisticsAlgorithmVersion} ·
        数据源：{meta.signalSource}
      </Typography>
    </Stack>
  );
}
