import type { TushareSyncPlan, TushareSyncMode, SyncLogSummaryItem } from 'src/api/tushare-sync';

import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';

import { SYNC_PLAN_CATEGORY_COLORS, SYNC_PLAN_CATEGORY_LABELS } from './sync-plan-config';

// ----------------------------------------------------------------------

const SYNC_STATUS_COLOR: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  SUCCESS: 'success',
  FAILED: 'error',
  SKIPPED: 'warning',
};

const SYNC_STATUS_LABEL: Record<string, string> = {
  SUCCESS: '成功',
  FAILED: '失败',
  SKIPPED: '跳过',
};

const READ_ONLY_TOOLTIP = '仅超级管理员可执行';

type Props = {
  plan: TushareSyncPlan;
  summary?: SyncLogSummaryItem;
  mode: TushareSyncMode;
  isSelected: boolean;
  isReadOnly: boolean;
  isSyncActionLocked: boolean;
  plansLoading: boolean;
  onToggle: (task: string) => void;
  onRequestSync: (mode: TushareSyncMode, tasks: string[]) => void;
};

export function SyncPlanTaskRow({
  plan,
  summary,
  mode,
  isSelected,
  isReadOnly,
  isSyncActionLocked,
  plansLoading,
  onToggle,
  onRequestSync,
}: Props) {
  const dimmed = mode === 'full' && !plan.supportsFullSync && isSelected;

  return (
    <TableRow
      hover
      selected={isSelected}
      onClick={() => onToggle(plan.task)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle(plan.task);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`选择任务 ${plan.label}`}
      sx={{
        cursor: 'pointer',
        opacity: dimmed ? 0.45 : 1,
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: -2,
        },
      }}
    >
      <TableCell padding="checkbox">
        <Checkbox
          size="small"
          checked={isSelected}
          onChange={() => onToggle(plan.task)}
          onClick={(event) => event.stopPropagation()}
          slotProps={{ input: { 'aria-label': `选择任务 ${plan.label}` } }}
        />
      </TableCell>

      <TableCell>
        <Typography variant="body2">{plan.label}</Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {plan.task}
        </Typography>
      </TableCell>

      <TableCell>
        <Label color={SYNC_PLAN_CATEGORY_COLORS[plan.category] ?? 'default'} variant="soft">
          {SYNC_PLAN_CATEGORY_LABELS[plan.category] ?? plan.category}
        </Label>
      </TableCell>

      <TableCell>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {plan.schedule?.description ?? '仅手动触发'}
        </Typography>
      </TableCell>

      <TableCell align="center">
        {plan.supportsFullSync ? (
          <Label color="success" variant="soft">
            支持
          </Label>
        ) : (
          <Tooltip title="该任务不支持全量同步，全量模式下将被跳过">
            <Label color="default" variant="soft">
              不支持
            </Label>
          </Tooltip>
        )}
      </TableCell>

      <TableCell align="center">
        {plan.requiresTradeDate ? (
          <Label color="info" variant="soft">
            是
          </Label>
        ) : (
          <Label color="default" variant="soft">
            否
          </Label>
        )}
      </TableCell>

      <TableCell align="center">
        {summary?.lastStatus ? (
          <Label color={SYNC_STATUS_COLOR[summary.lastStatus] ?? 'default'} variant="soft">
            {SYNC_STATUS_LABEL[summary.lastStatus] ?? summary.lastStatus}
          </Label>
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        )}
      </TableCell>

      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {summary?.lastSyncAt ? fDateTime(summary.lastSyncAt) : '—'}
        </Typography>
      </TableCell>

      <TableCell align="center">
        {summary && summary.consecutiveFailures > 0 ? (
          <Label color={summary.consecutiveFailures >= 3 ? 'error' : 'warning'} variant="soft">
            {summary.consecutiveFailures}
          </Label>
        ) : (
          <Typography variant="body2" color="text.secondary">
            0
          </Typography>
        )}
      </TableCell>

      <TableCell align="center">
        <Tooltip title={isReadOnly ? READ_ONLY_TOOLTIP : '立即同步该任务'}>
          <span>
            <Button
              size="small"
              variant="text"
              disabled={isReadOnly || isSyncActionLocked || plansLoading}
              onClick={(event) => {
                event.stopPropagation();
                onRequestSync(mode, [plan.task]);
              }}
            >
              立即同步
            </Button>
          </span>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
