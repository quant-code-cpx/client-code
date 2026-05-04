import type { WalkForwardWindow } from 'src/api/backtest';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import {
  getWalkForwardWindowDetail,
  getWalkForwardWindowTrades,
  getWalkForwardWindowPositions,
  getWalkForwardWindowRebalanceLogs,
} from 'src/api/backtest';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { formatCompactDate, formatNumberValue, formatPercentValue } from './walk-forward-utils';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  wfRunId: string;
  windowItem: WalkForwardWindow | null;
  onClose: () => void;
};

type EndpointCounts = {
  trades: number | null;
  positions: number | null;
  rebalanceLogs: number | null;
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

export function WalkForwardWindowDrawer({ open, wfRunId, windowItem, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [remoteWindow, setRemoteWindow] = useState<WalkForwardWindow | null>(null);
  const [counts, setCounts] = useState<EndpointCounts>({
    trades: null,
    positions: null,
    rebalanceLogs: null,
  });
  const [supportMessage, setSupportMessage] = useState('');

  const loadWindow = useCallback(async () => {
    if (!windowItem) return;
    setLoading(true);
    setSupportMessage('');

    const [detailRes, tradesRes, positionsRes, rebalanceRes] = await Promise.allSettled([
      getWalkForwardWindowDetail(wfRunId, windowItem.windowIndex),
      getWalkForwardWindowTrades(wfRunId, windowItem.windowIndex),
      getWalkForwardWindowPositions(wfRunId, windowItem.windowIndex),
      getWalkForwardWindowRebalanceLogs(wfRunId, windowItem.windowIndex),
    ]);

    if (detailRes.status === 'fulfilled') setRemoteWindow(detailRes.value.window);
    if (tradesRes.status === 'fulfilled') {
      setCounts((prev) => ({ ...prev, trades: tradesRes.value.items.length }));
    }
    if (positionsRes.status === 'fulfilled') {
      setCounts((prev) => ({ ...prev, positions: positionsRes.value.items.length }));
    }
    if (rebalanceRes.status === 'fulfilled') {
      setCounts((prev) => ({ ...prev, rebalanceLogs: rebalanceRes.value.items.length }));
    }

    if (
      detailRes.status === 'rejected' ||
      tradesRes.status === 'rejected' ||
      positionsRes.status === 'rejected' ||
      rebalanceRes.status === 'rejected'
    ) {
      setSupportMessage(
        '窗口净值、成交明细、持仓快照或调仓日志端点尚未全部就绪，当前使用列表窗口数据降级展示。'
      );
    }

    setLoading(false);
  }, [wfRunId, windowItem]);

  useEffect(() => {
    if (!open || !windowItem) return;
    setRemoteWindow(null);
    setCounts({ trades: null, positions: null, rebalanceLogs: null });
    void loadWindow();
  }, [loadWindow, open, windowItem]);

  const current = remoteWindow ?? windowItem;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: 1, sm: 520 } } }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2 }}>
          <Box>
            <Typography variant="h6">窗口 #{current ? current.windowIndex + 1 : '—'}</Typography>
            <Typography variant="caption" color="text.secondary">
              IS / OOS 诊断详情
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <Iconify icon="mingcute:close-line" width={20} />
          </IconButton>
        </Stack>
        <Divider />

        <Scrollbar sx={{ flex: 1 }}>
          <Stack spacing={2} sx={{ p: 2 }}>
            {loading && (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">
                  正在探测窗口钻取端点…
                </Typography>
              </Stack>
            )}

            {supportMessage && <Alert severity="info">{supportMessage}</Alert>}

            {current && (
              <>
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
                    后端钻取端点
                  </Typography>
                  <MetricLine
                    label="成交明细"
                    value={counts.trades === null ? '待支持' : `${counts.trades} 条`}
                  />
                  <MetricLine
                    label="持仓快照"
                    value={counts.positions === null ? '待支持' : `${counts.positions} 条`}
                  />
                  <MetricLine
                    label="调仓日志"
                    value={counts.rebalanceLogs === null ? '待支持' : `${counts.rebalanceLogs} 条`}
                  />
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
