import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  /** 兼容旧版：'no-activation' / 'no-signal'；新版：noActivation / activatedNoData / filterNoMatch / error */
  variant?:
    | 'no-activation'
    | 'no-signal'
    | 'noActivation'
    | 'activatedNoData'
    | 'filterNoMatch'
    | 'error';
  /** 跳转信号历史时携带的策略 ID */
  strategyId?: string;
  message?: string;
  onReset?: () => void;
  onRetry?: () => void;
};

export function SignalEmptyState({
  variant = 'no-activation',
  strategyId,
  message,
  onReset,
  onRetry,
}: Props) {
  if (variant === 'no-signal' || variant === 'activatedNoData') {
    const historyHref = strategyId
      ? `/strategy/signal/history?strategyId=${strategyId}`
      : '/strategy/signal/history';
    return (
      <Box
        sx={{
          py: 8,
          display: 'flex',
          textAlign: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        }}
      >
        <Iconify icon="solar:moon-bold-duotone" width={64} sx={{ color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          策略今日空仓
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          策略已成功跑批但当日未给出任何 BUY/SELL/HOLD 信号，无需操作
        </Typography>
        <Button
          component={RouterLink}
          href={historyHref}
          variant="contained"
          startIcon={<Iconify icon="solar:history-bold" />}
        >
          查看信号历史
        </Button>
      </Box>
    );
  }

  if (variant === 'filterNoMatch') {
    return (
      <Box
        sx={{
          py: 8,
          display: 'flex',
          textAlign: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        }}
      >
        <Iconify icon="solar:filter-bold" width={64} sx={{ color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          当前筛选条件下无信号记录
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          建议放宽日期、操作类型或置信度区间
        </Typography>
        {onReset && (
          <Button
            variant="outlined"
            onClick={onReset}
            startIcon={<Iconify icon="solar:restart-bold" />}
          >
            重置筛选
          </Button>
        )}
      </Box>
    );
  }

  if (variant === 'error') {
    return (
      <Box
        sx={{
          py: 8,
          display: 'flex',
          textAlign: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        }}
      >
        <Iconify icon="solar:danger-triangle-bold" width={64} sx={{ color: 'error.main', mb: 2 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          加载失败
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {message ?? '请稍后重试'}
        </Typography>
        {onRetry && (
          <Button
            variant="contained"
            onClick={onRetry}
            startIcon={<Iconify icon="solar:restart-bold" />}
          >
            重试
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        py: 10,
        display: 'flex',
        textAlign: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      <Iconify
        icon="solar:pulse-2-bold-duotone"
        width={64}
        sx={{ color: 'text.disabled', mb: 2 }}
      />

      <Typography variant="h6" sx={{ mb: 1 }}>
        暂无已激活的策略信号
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        前往策略管理页面，在策略详情中激活信号生成
      </Typography>

      <Button
        component={RouterLink}
        href="/strategy"
        variant="contained"
        startIcon={<Iconify icon="solar:layers-bold" />}
      >
        前往策略管理
      </Button>
    </Box>
  );
}
