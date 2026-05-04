import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { listRuns } from 'src/api/backtest';

import { useStrategyDetail } from '../contexts/strategy-detail-context';

// ----------------------------------------------------------------------

const POLL_INTERVAL_MS = 30_000;

/** 轮询运行中任务，展示"正在运行"Banner；检测到 dirty 卡时展示"未保存更改"Banner */
export function StrategyBannerArea() {
  const { strategy, isAnyCardDirty } = useStrategyDetail();
  const [runningCount, setRunningCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkRunning = () => {
    if (!strategy) return;
    listRuns({ strategyId: strategy.id, status: 'RUNNING', pageSize: 1, page: 1 })
      .then((res) => {
        setRunningCount(res.total);
      })
      .catch(() => {
        // 轮询失败静默处理，不影响页面
      });
  };

  useEffect(() => {
    if (!strategy) return undefined;

    checkRunning();
    timerRef.current = setInterval(checkRunning, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategy?.id]);

  const showRunning = runningCount > 0;

  if (!showRunning && !isAnyCardDirty) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
      {showRunning && (
        <Alert
          severity="info"
          icon={<CircularProgress size={16} color="inherit" />}
          sx={{ alignItems: 'center' }}
        >
          <Typography variant="body2">
            {runningCount === 1
              ? '正在运行 1 个回测任务，结果完成后自动更新…'
              : `正在运行 ${runningCount} 个回测任务，结果完成后自动更新…`}
          </Typography>
        </Alert>
      )}

      {isAnyCardDirty && (
        <Alert severity="warning">
          <Typography variant="body2">有未保存的更改，请记得点击保存。</Typography>
        </Alert>
      )}
    </Box>
  );
}
