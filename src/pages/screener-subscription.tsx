import { CONFIG } from 'src/config-global';

import { ScreenerSubscriptionListView } from 'src/sections/screener-subscription/view';

export default function Page() {
  return (
    <>
      <title>{`条件订阅 - ${CONFIG.appName}`}</title>
      <ScreenerSubscriptionListView />
    </>
  );
}
