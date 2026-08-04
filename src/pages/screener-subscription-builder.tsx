import { CONFIG } from 'src/config-global';

import { ScreenerSubscriptionBuilderView } from 'src/sections/screener-subscription/view/screener-subscription-builder-view';

export default function Page() {
  return (
    <>
      <title>{`新建条件订阅 - ${CONFIG.appName}`}</title>
      <ScreenerSubscriptionBuilderView mode="create" />
    </>
  );
}
