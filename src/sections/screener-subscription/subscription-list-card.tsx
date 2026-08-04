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

import { SubscriptionRunButton } from './subscription-run-button';
import { SubscriptionStatusLabel } from './subscription-status-label';

// ----------------------------------------------------------------------

const FREQUENCY_LABELS: Record<SubscriptionFrequency, string> = {
  DAILY: '每日',
  WEEKLY: '每周',
  MONTHLY: '每月',
};

const RULE_TYPE_LABELS = {
  STOCK_SCREENING: '基础选股',
  FACTOR_SCREENING: '因子选股',
  SIGNAL_EVENT: '技术信号',
  COMPOSITE: '组合规则',
} as const;

type SubscriptionListCardProps = {
  subscription: ScreenerSubscription;
  onView: () => void;
  onPauseResume: () => void;
  onRunSuccess: (message: string) => void;
  onRunError: (message: string) => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function SubscriptionListCard({
  subscription,
  onView,
  onPauseResume,
  onRunSuccess,
  onRunError,
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
          <Label color="info" variant="soft">
            {RULE_TYPE_LABELS[subscription.ruleType ?? 'STOCK_SCREENING']}
          </Label>
        </Box>

        {/* Last run info */}
        {lastRunResult ? (
          <Box sx={{ display: 'flex', gap: 3, mb: 1, flexWrap: 'wrap' }}>
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
            连续失败 {consecutiveFails} 次，已自动暂停；点击「恢复」会清零失败计数并重新加入调度
          </Typography>
        )}

        <Divider sx={{ my: 1 }} />

        {/* Action buttons */}
        <Box
          sx={{
            gap: 1,
            display: 'grid',
            alignItems: 'start',
            gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" onClick={onView}>
              查看详情
            </Button>
            <Button size="small" variant="outlined" onClick={onPauseResume}>
              {subscription.status === 'ACTIVE' ? '暂停' : '恢复'}
            </Button>
            <SubscriptionRunButton
              subscriptionId={subscription.id}
              lastRunAt={subscription.lastRunAt}
              onSuccess={(msg) => onRunSuccess(msg)}
              onError={(msg) => onRunError(msg)}
            />
          </Box>

          <Box
            sx={{
              gap: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: { xs: 'flex-start', sm: 'flex-end' },
            }}
          >
            <Tooltip title="编辑">
              <IconButton size="small" aria-label="编辑订阅" onClick={onEdit}>
                <Iconify icon="solar:pen-bold" width={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="删除">
              <IconButton size="small" color="error" aria-label="删除订阅" onClick={onDelete}>
                <Iconify icon="solar:trash-bin-trash-bold" width={16} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
