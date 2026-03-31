import { CONFIG } from 'src/config-global';

import { StockScreenerView } from 'src/sections/stock-screener/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`选股器 - ${CONFIG.appName}`}</title>

      <StockScreenerView />
    </>
  );
}
