import { CONFIG } from 'src/config-global';

import { StockView } from 'src/sections/stock/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`股票 - ${CONFIG.appName}`}</title>

      <StockView />
    </>
  );
}
