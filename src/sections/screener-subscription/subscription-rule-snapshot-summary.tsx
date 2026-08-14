import type { ScreenerSubscription } from 'src/api/screener-subscription';

import Stack from '@mui/material/Stack';

import { Label } from 'src/components/label';

import { SubscriptionFiltersSummary } from './subscription-filters-summary';

const RULE_TYPE_LABELS = {
  STOCK_SCREENING: '基础选股',
  FACTOR_SCREENING: '因子选股',
  SIGNAL_EVENT: '技术信号',
  COMPOSITE: '组合规则',
} as const;

export function SubscriptionRuleSnapshotSummary({
  subscription,
}: {
  subscription: ScreenerSubscription;
}) {
  const ruleSpec = subscription.ruleSpec;
  if (!ruleSpec) {
    return (
      <SubscriptionFiltersSummary
        filters={subscription.filters}
        sortBy={subscription.sortBy}
        sortOrder={subscription.sortOrder}
      />
    );
  }

  const conditionCount =
    ruleSpec.type === 'STOCK_SCREENING'
      ? Object.keys(ruleSpec.filters).length
      : ruleSpec.conditions.length;

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Label color="info" variant="soft">
        {RULE_TYPE_LABELS[ruleSpec.type]}
      </Label>
      <Label color="default" variant="soft">
        规则版本 {subscription.ruleVersion ?? ruleSpec.version}
      </Label>
      <Label color="default" variant="soft">
        {conditionCount} 条条件
      </Label>
      {subscription.triggerSpec?.mode ? (
        <Label color="default" variant="soft">
          {subscription.triggerSpec.mode === 'ENTER'
            ? '新进入'
            : subscription.triggerSpec.mode === 'EXIT'
              ? '退出'
              : subscription.triggerSpec.mode === 'BOTH'
                ? '进入和退出'
                : '事件出现'}
        </Label>
      ) : null}
    </Stack>
  );
}
