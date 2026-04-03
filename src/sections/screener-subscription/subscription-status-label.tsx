import type { SubscriptionStatus } from 'src/api/screener-subscription';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type SubscriptionStatusLabelProps = {
  status: SubscriptionStatus;
};

export function SubscriptionStatusLabel({ status }: SubscriptionStatusLabelProps) {
  if (status === 'ACTIVE') {
    return (
      <Label color="success" variant="soft">
        运行中
      </Label>
    );
  }
  if (status === 'PAUSED') {
    return (
      <Label color="warning" variant="soft">
        已暂停
      </Label>
    );
  }
  return (
    <Label color="error" variant="soft">
      执行出错
    </Label>
  );
}
