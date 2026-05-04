import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export type EmptyVariant = 'no-data' | 'filter' | 'error';

type Props = {
  variant: EmptyVariant;
  message?: string;
  onClearFilter?: () => void;
  onSwitchLatest?: () => void;
  onScan?: () => void;
  onRetry?: () => void;
  showScan?: boolean;
};

const TITLE_MAP: Record<EmptyVariant, string> = {
  'no-data': '所选交易日暂无异动',
  filter: '当前筛选下没有匹配的异动',
  error: '加载异动数据失败',
};

const SUB_MAP: Record<EmptyVariant, string> = {
  'no-data': '可能是非交易日，或扫描尚未完成',
  filter: '尝试缩小或清空筛选条件',
  error: '请稍后重试，或联系管理员排查后端扫描任务',
};

export function AnomalyEmptyState({
  variant,
  message,
  onClearFilter,
  onSwitchLatest,
  onScan,
  onRetry,
  showScan = false,
}: Props) {
  return (
    <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          bgcolor: 'background.neutral',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Iconify
          icon={variant === 'error' ? 'solar:close-circle-bold' : 'solar:filter-bold'}
          width={28}
          sx={{ color: 'text.secondary' }}
        />
      </Box>
      <Typography variant="subtitle2">{TITLE_MAP[variant]}</Typography>
      <Typography variant="caption" color="text.secondary">
        {message ?? SUB_MAP[variant]}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        {variant === 'error' && onRetry && (
          <Button size="small" variant="contained" onClick={onRetry}>
            重试
          </Button>
        )}
        {variant !== 'error' && onSwitchLatest && (
          <Button size="small" variant="outlined" onClick={onSwitchLatest}>
            切到最新交易日
          </Button>
        )}
        {variant === 'filter' && onClearFilter && (
          <Button size="small" variant="outlined" onClick={onClearFilter}>
            清空筛选
          </Button>
        )}
        {showScan && onScan && variant === 'no-data' && (
          <Button size="small" variant="outlined" color="warning" onClick={onScan}>
            立即扫描
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
