import type { ScreenerSubscription, SubscriptionFrequency } from 'src/api/screener-subscription';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fDate, fToNow } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { SubscriptionStatusLabel } from './subscription-status-label';

// ----------------------------------------------------------------------

const FREQUENCY_LABELS: Record<SubscriptionFrequency, string> = {
  DAILY: '每日',
  WEEKLY: '每周',
  MONTHLY: '每月',
};

type SubscriptionListCardProps = {
  subscription: ScreenerSubscription;
  onView: () => void;
  onPauseResume: () => void;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function SubscriptionListCard({
  subscription,
  onView,
  onPauseResume,
  onRun,
  onEdit,
  onDelete,
}: SubscriptionListCardProps) {
  const { lastRunResult, consecutiveFails, status } = subscription;

  return (
    <Card>
      <CardContent>
        {/* Header row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }} noWrap>
            {subscription.name}
          </Typography>
          <SubscriptionStatusLabel status={subscription.status} />
          <Label color="default" variant="soft">
            {FREQUENCY_LABELS[subscription.frequency]}
          </Label>
        </Box>

        {/* Last run info */}
        {lastRunResult ? (
          <Box sx={{ display: 'flex', gap: 3, mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              上次执行：{fDate(lastRunResult.tradeDate, 'YYYY-MM-DD')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              匹配 {lastRunResult.matchCount} 只
            </Typography>
            <Typography variant="caption" sx={{ color: 'success.main' }}>
              新增 {lastRunResult.newEntryCount} 只
            </Typography>
            <Typography variant="caption" sx={{ color: 'error.main' }}>
              退出 {lastRunResult.exitCount} 只
            </Typography>
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 1 }}>
            尚未执行
          </Typography>
        )}

        {subscription.lastRunAt && (
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 1 }}>
            {fToNow(subscription.lastRunAt)} 执行
          </Typography>
        )}

        {/* Error warning */}
        {status === 'ERROR' && consecutiveFails > 0 && (
          <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mb: 1 }}>
            连续失败 {consecutiveFails} 次，已自动暂停
          </Typography>
        )}

        <Divider sx={{ my: 1 }} />

        {/* Action buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button size="small" variant="outlined" onClick={onView}>
            查看详情
          </Button>
          <Button size="small" variant="outlined" onClick={onPauseResume}>
            {subscription.status === 'ACTIVE' ? '暂停' : '恢复'}
          </Button>
          <Button size="small" variant="outlined" onClick={onRun}>
            手动执行
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="编辑">
            <IconButton size="small" onClick={onEdit}>
              <Iconify icon="solar:pen-bold" width={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="删除">
            <IconButton size="small" onClick={onDelete} sx={{ color: 'error.main' }}>
              <Iconify icon="solar:trash-bin-trash-bold" width={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
}
