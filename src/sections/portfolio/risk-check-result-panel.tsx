import type { RiskCheckResult } from 'src/api/portfolio';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

// ----------------------------------------------------------------------

interface RiskCheckResultPanelProps {
  result: RiskCheckResult | null;
  loading: boolean;
}

export function RiskCheckResultPanel({ result, loading }: RiskCheckResultPanelProps) {
  if (loading) {
    return <Skeleton variant="rectangular" height={80} />;
  }
  if (!result) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        检查时间：{fDateTime(result.checkedAt)}
      </Typography>
      {result.violations.length === 0 ? (
        <Alert severity="success">所有风控规则均通过，无违规项。</Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {result.violations.map((v, idx) => (
            <Alert key={idx} severity="error">
              {v.message}
              {v.tsCode && (
                <Typography component="span" variant="caption" sx={{ ml: 1 }}>
                  （{v.tsCode} {v.stockName}）
                </Typography>
              )}
              <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                当前值：{(v.currentValue * 100).toFixed(2)}% | 阈值：{(v.threshold * 100).toFixed(2)}%
              </Typography>
            </Alert>
          ))}
        </Box>
      )}
    </Box>
  );
}
