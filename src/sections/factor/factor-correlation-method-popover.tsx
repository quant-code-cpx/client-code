import type { FactorCorrelationResult } from 'src/api/factor';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Popover from '@mui/material/Popover';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type Props = {
  anchorEl: HTMLElement | null;
  result: FactorCorrelationResult | null;
  onClose: () => void;
};

type LineProps = { label: string; value: React.ReactNode };

function Line({ label, value }: LineProps) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 96 }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ flex: 1 }}>
        {value}
      </Typography>
    </Stack>
  );
}

export function FactorCorrelationMethodPopover({ anchorEl, result, onClose }: Props) {
  const meta = result?.meta;

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: { p: 2, maxWidth: 420 } } }}
    >
      <Typography variant="subtitle2">计算口径</Typography>
      <Divider sx={{ my: 1 }} />
      <Box>
        <Line label="股票池" value={meta?.universe ? meta.universe : '全市场'} />
        <Line
          label="计算时间"
          value={meta?.computedAt ? dayjs(meta.computedAt).format('YYYY-MM-DD HH:mm:ss') : '未知'}
        />
        <Line
          label="矩阵模式"
          value={
            meta?.matrixMode === 'pairwise'
              ? '两两交集（pairwise）：每对因子独立取交集，nMatrix[i][j] 为该对真实样本数'
              : (meta?.matrixMode ?? '未知')
          }
        />
        <Line
          label="最小样本阈值"
          value={`样本 < ${meta?.minSampleForCorr ?? 3} 时返回 null（不渲染为"无相关"）`}
        />
        <Line label="并列秩处理" value={meta?.rankTiesMethod ?? '未知'} />
        <Line label="股票过滤" value="后端默认排除 ST、退市、停牌、上市不满 60 天" />
        <Line label="显著性" value="本轮未返回 p-value；高低相关解读建议结合 n（有效样本数）" />
      </Box>
    </Popover>
  );
}
