import { CONFIG } from 'src/config-global';

import { ScreenerSubscriptionDetailView } from 'src/sections/screener-subscription/view';

export default function Page() {
  return (
    <>
      <title>{`订阅详情 - ${CONFIG.appName}`}</title>
      <ScreenerSubscriptionDetailView />
    </>
  );
}
