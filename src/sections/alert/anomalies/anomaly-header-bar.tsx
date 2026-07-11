import type { AlertColor } from '@mui/material/Alert';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { fDateTime } from 'src/utils/format-time';

import { alertApi } from 'src/api/alert';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/context';

import { fmtTradeDate, tradeDateToYYYYMMDD } from './anomaly-type-config';

// ----------------------------------------------------------------------

type Props = {
  /** 服务端最新交易日 YYYYMMDD（来自 list 响应任一条目，无则 -- ） */
  latestTradeDate: string | null;
  /** 当前筛选交易日 YYYY-MM-DD（前端） */
  filterTradeDate: string;
  scannedAt: string | null;
  loading: boolean;
  onRefresh: () => void;
  onScanned: () => void;
};

export function AnomalyHeaderBar({
  latestTradeDate,
  filterTradeDate,
  scannedAt,
  loading,
  onRefresh,
  onScanned,
}: Props) {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({ open: false, message: '', severity: 'success' });

  const handleScan = async () => {
    setScanning(true);
    try {
      const tradeDate = tradeDateToYYYYMMDD(filterTradeDate);
      const result = await alertApi.scanAnomalies(tradeDate ? { tradeDate } : {});
      setFeedback({
        open: true,
        severity: 'success',
        message: `扫描完成，新增 ${result.totalNew} 条异动（${fmtTradeDate(result.tradeDate) || '最新交易日'}）`,
      });
      onScanned();
    } catch (err) {
      setFeedback({
        open: true,
        severity: 'error',
        message: err instanceof Error ? err.message : '扫描失败，请稍后重试',
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      justifyContent="space-between"
      spacing={2}
      sx={{ mb: 3 }}
    >
      <Box>
        <Typography variant="h4">异动监控</Typography>
        <Stack direction="row" spacing={1.5} sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            最新数据：{fmtTradeDate(latestTradeDate)}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            ·
          </Typography>
          <Typography variant="caption" color="text.secondary">
            扫描时间：{scannedAt ? fDateTime(scannedAt) : '--'}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            ·
          </Typography>
          <Typography variant="caption" color="text.secondary">
            数据源：daily / moneyflow / stk_limit
          </Typography>
        </Stack>
      </Box>

      <Stack direction="row" spacing={1} alignItems="center">
        <Tooltip title="刷新">
          <span>
            <IconButton onClick={onRefresh} disabled={loading} size="small" aria-label="刷新">
              <Iconify icon="solar:refresh-bold" width={18} />
            </IconButton>
          </span>
        </Tooltip>
        {isAdmin && (
          <Button
            variant="outlined"
            color="warning"
            loading={scanning}
            startIcon={<Iconify icon="solar:target-bold" width={18} />}
            onClick={handleScan}
          >
            立即扫描
          </Button>
        )}
      </Stack>

      <Snackbar
        open={feedback.open}
        autoHideDuration={4000}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={feedback.severity}
          onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
