import type { TushareSyncMode } from 'src/api/tushare-sync';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const READ_ONLY_TOOLTIP = '仅超级管理员可执行';

type Props = {
  mode: TushareSyncMode;
  selectedCount: number;
  totalCount: number;
  hasBasicTasks: boolean;
  hasFailedTasks: boolean;
  isReadOnly: boolean;
  isSyncing: boolean;
  isSubmitting: boolean;
  isSyncActionLocked: boolean;
  plansLoading: boolean;
  summaryLoading: boolean;
  onModeChange: (mode: TushareSyncMode) => void;
  onSyncBasic: () => void;
  onRetryFailed: () => void;
  onSyncSelected: () => void;
};

export function SyncPlanToolbar({
  mode,
  selectedCount,
  totalCount,
  hasBasicTasks,
  hasFailedTasks,
  isReadOnly,
  isSyncing,
  isSubmitting,
  isSyncActionLocked,
  plansLoading,
  summaryLoading,
  onModeChange,
  onSyncBasic,
  onRetryFailed,
  onSyncSelected,
}: Props) {
  const anySelected = selectedCount > 0;

  return (
    <Toolbar
      sx={{
        minHeight: { xs: 'auto', md: 56 },
        height: 'auto',
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
        flexWrap: 'wrap',
        gap: 1,
        position: 'sticky',
        top: 0,
        zIndex: 3,
        bgcolor: 'background.paper',
        borderBottom: (theme) => `1px solid ${theme.vars.palette.divider}`,
        p: (theme) => theme.spacing(1, 2),
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          同步模式
        </Typography>
        <ToggleButtonGroup
          value={mode}
          exclusive
          size="small"
          disabled={isSyncActionLocked}
          onChange={(_, value: TushareSyncMode | null) => {
            if (value) onModeChange(value);
          }}
        >
          <ToggleButton value="incremental">增量同步</ToggleButton>
          <ToggleButton value="full">全量同步</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
        <Tooltip title={isReadOnly ? READ_ONLY_TOOLTIP : '按基础数据分类触发增量同步'}>
          <span>
            <Button
              size="small"
              variant="outlined"
              disabled={isReadOnly || !hasBasicTasks || isSyncActionLocked || plansLoading}
              onClick={onSyncBasic}
            >
              同步基础数据
            </Button>
          </span>
        </Tooltip>
        <Tooltip title={isReadOnly ? READ_ONLY_TOOLTIP : '按最近失败任务触发增量补跑'}>
          <span>
            <Button
              size="small"
              color="warning"
              variant="outlined"
              disabled={isReadOnly || !hasFailedTasks || isSyncActionLocked || summaryLoading}
              onClick={onRetryFailed}
            >
              补最近失败
            </Button>
          </span>
        </Tooltip>
      </Stack>

      <Box sx={{ flex: 1 }} />

      {isSyncActionLocked && (
        <Box sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
          <CircularProgress size={14} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {isSubmitting && !isSyncing ? '正在提交同步请求…' : '同步中，请勿关闭页面…'}
          </Typography>
        </Box>
      )}

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}
      >
        已选 <strong>{selectedCount}</strong> / {totalCount} 个任务
      </Typography>

      <Tooltip title={isReadOnly ? READ_ONLY_TOOLTIP : ''}>
        <span>
          <Button
            size="small"
            variant="contained"
            disabled={!anySelected || isSyncActionLocked || plansLoading || isReadOnly}
            onClick={onSyncSelected}
            loading={isSyncActionLocked}
            startIcon={<Iconify icon="solar:restart-bold" />}
          >
            {isSubmitting && !isSyncing ? '提交中…' : isSyncing ? '同步中…' : '开始同步'}
          </Button>
        </span>
      </Tooltip>
    </Toolbar>
  );
}
