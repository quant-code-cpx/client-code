import type { FactorCorrelationResult } from 'src/api/factor';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import type { CorrelationPair } from './factor-correlation-helpers';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  pair: CorrelationPair | null;
  result: FactorCorrelationResult | null;
  onClose: () => void;
  onOrthogonalize: (pair: CorrelationPair) => void;
  onAdvancedAnalysis: (pair: CorrelationPair) => void;
};

type DefRowProps = { label: string; value: React.ReactNode };

function DefRow({ label, value }: DefRowProps) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 1, borderBottom: 1, borderColor: 'divider' }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 96 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ flex: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
    </Stack>
  );
}

export function FactorCorrelationPairDrawer({
  open,
  pair,
  result,
  onClose,
  onOrthogonalize,
  onAdvancedAnalysis,
}: Props) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}
    >
      {pair && result ? (
        <Stack sx={{ height: '100%' }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
          >
            <Typography variant="subtitle1" sx={{ flex: 1 }}>
              因子对详情
            </Typography>
            <Tooltip title="关闭">
              <IconButton size="small" onClick={onClose} aria-label="关闭">
                <Iconify icon="solar:close-circle-bold" width={18} />
              </IconButton>
            </Tooltip>
          </Stack>

          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            <Typography variant="h6">
              {pair.labelA} × {pair.labelB}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {pair.factorA} · {pair.factorB}
            </Typography>

            <Box sx={{ mt: 2 }}>
              <DefRow
                label="相关系数 ρ"
                value={
                  <Box
                    component="span"
                    sx={{ color: pair.rho > 0 ? 'error.main' : 'info.main', fontWeight: 600 }}
                  >
                    {pair.rho > 0 ? '+' : ''}
                    {pair.rho.toFixed(4)}
                  </Box>
                }
              />
              <DefRow
                label="有效样本"
                value={pair.n !== null ? `${pair.n.toLocaleString()} 只股票` : '后端未返回样本量'}
              />
              <DefRow
                label="方法"
                value={result.method === 'spearman' ? 'Spearman 秩相关' : 'Pearson 线性相关'}
              />
              <DefRow
                label="计算口径"
                value={
                  result.meta?.matrixMode === 'pairwise'
                    ? '两两交集'
                    : (result.meta?.matrixMode ?? '未知')
                }
              />
              <DefRow label="最小样本阈值" value={result.meta?.minSampleForCorr ?? 3} />
              <DefRow label="并列秩处理" value={result.meta?.rankTiesMethod ?? '未知'} />
              <DefRow
                label="显著性"
                value={
                  <Typography variant="caption" color="warning.main">
                    后端暂未返回 p-value，无法判断统计显著性
                  </Typography>
                }
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="caption" color="text.secondary">
              建议动作
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {pair.abs >= 0.7
                ? '该因子对相关性强，建议保留其中一个或对两者做正交化（残差化）。'
                : pair.abs >= 0.4
                  ? '该因子对中等相关，建议在多因子模型里检查是否重复表达同一风险敞口。'
                  : '该因子对相关性较弱，可同时使用。'}
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}
          >
            <Button
              fullWidth
              variant="contained"
              onClick={() => onOrthogonalize(pair)}
              startIcon={<Iconify icon="solar:refresh-bold" />}
            >
              正交化
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => onAdvancedAnalysis(pair)}
              startIcon={<Iconify icon="solar:chart-2-bold" />}
            >
              高级分析
            </Button>
          </Stack>
        </Stack>
      ) : null}
    </Drawer>
  );
}
