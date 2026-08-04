import { CONFIG } from 'src/config-global';

import { ScreenerSubscriptionBuilderView } from 'src/sections/screener-subscription/view/screener-subscription-builder-view';

export default function Page() {
  return (
    <>
      <title>{`编辑条件订阅 - ${CONFIG.appName}`}</title>
      <ScreenerSubscriptionBuilderView mode="edit" />
    </>
  );
}
