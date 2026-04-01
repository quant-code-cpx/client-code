import type { BacktestRunDetailResponse } from 'src/api/backtest';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

interface BacktestProgressBannerProps {
  detail: BacktestRunDetailResponse;
}

export function BacktestProgressBanner({ detail }: BacktestProgressBannerProps) {
  if (detail.status !== 'QUEUED' && detail.status !== 'RUNNING') {
    return null;
  }

  return (
    <Alert
      severity="info"
      icon={false}
      sx={{ py: 1.5 }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {detail.status === 'QUEUED' ? '排队等待中...' : '回测运行中...'}
        </Typography>
        <Typography variant="body2">{detail.progress}%</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={detail.progress}
        sx={{ borderRadius: 1, height: 6 }}
      />
      {detail.status === 'RUNNING' && (
        <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'text.secondary' }}>
          回测运行中，完成后将自动更新结果
        </Typography>
      )}
    </Alert>
  );
}
