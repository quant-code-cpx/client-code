import { CONFIG } from 'src/config-global';

import { MarketOverviewView } from 'src/sections/market-overview/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`市场概览 - ${CONFIG.appName}`}</title>

      <MarketOverviewView />
    </>
  );
}
