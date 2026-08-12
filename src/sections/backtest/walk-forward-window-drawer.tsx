import type { WalkForwardWindow } from 'src/api/backtest';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { formatCompactDate, formatNumberValue, formatPercentValue } from './walk-forward-utils';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  windowItem: WalkForwardWindow | null;
  onClose: () => void;
};

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ fontFeatureSettings: '"tnum"' }}>
        {value}
      </Typography>
    </Stack>
  );
}

export function WalkForwardWindowDrawer({ open, windowItem, onClose }: Props) {
  const current = windowItem;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: 1, sm: 520 } } } }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2 }}>
          <Box>
            <Typography variant="h6">窗口 #{current ? current.windowIndex + 1 : '—'}</Typography>
            <Typography variant="caption" color="text.secondary">
              IS / OOS 窗口汇总
            </Typography>
          </Box>
          <Tooltip title="关闭">
            <IconButton onClick={onClose} aria-label="关闭">
              <Iconify icon="solar:close-circle-bold" width={20} />
            </IconButton>
          </Tooltip>
        </Stack>
        <Divider />

        <Scrollbar sx={{ flex: 1 }}>
          <Stack spacing={2} sx={{ p: 2 }}>
            {current && (
              <>
                <Alert severity="info">
                  窗口级净值、成交明细、持仓快照与调仓日志能力尚未开放；以下仅展示任务详情已返回的窗口汇总。
                </Alert>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    区间
                  </Typography>
                  <MetricLine
                    label="样本内"
                    value={`${formatCompactDate(current.isStartDate)} ~ ${formatCompactDate(current.isEndDate)}`}
                  />
                  <MetricLine
                    label="样本外"
                    value={`${formatCompactDate(current.oosStartDate)} ~ ${formatCompactDate(current.oosEndDate)}`}
                  />
                  <MetricLine label="OOS 成交数" value={String(current.oosTrades ?? '—')} />
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    窗口指标
                  </Typography>
                  <MetricLine label="IS 收益" value={formatPercentValue(current.isReturn)} />
                  <MetricLine label="IS 夏普" value={formatNumberValue(current.isSharpe, 3)} />
                  <MetricLine label="OOS 收益" value={formatPercentValue(current.oosReturn)} />
                  <MetricLine label="OOS 夏普" value={formatNumberValue(current.oosSharpe, 3)} />
                  <MetricLine
                    label="OOS 最大回撤"
                    value={formatPercentValue(current.oosMaxDrawdown)}
                  />
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    最优参数
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {Object.entries(current.optimizedParams ?? {}).map(([key, value]) => (
                      <Label key={key} color="info">
                        {key}: {String(value)}
                      </Label>
                    ))}
                    {Object.keys(current.optimizedParams ?? {}).length === 0 && (
                      <Typography variant="body2" color="text.disabled">
                        暂无参数
                      </Typography>
                    )}
                  </Stack>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    窗口级明细
                  </Typography>
                  <MetricLine label="成交明细" value="未开放" />
                  <MetricLine label="持仓快照" value="未开放" />
                  <MetricLine label="调仓日志" value="未开放" />
                </Box>

                {current.errorReason && <Alert severity="error">{current.errorReason}</Alert>}
              </>
            )}
          </Stack>
        </Scrollbar>
      </Box>
    </Drawer>
  );
}
