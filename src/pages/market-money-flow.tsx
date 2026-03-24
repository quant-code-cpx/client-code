import { CONFIG } from 'src/config-global';

import { MarketMoneyFlowView } from 'src/sections/market-money-flow/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`资金动态 - ${CONFIG.appName}`}</title>

      <MarketMoneyFlowView />
    </>
  );
}
