import { CONFIG } from 'src/config-global';

import { StockDetailView } from 'src/sections/stock-detail/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`股票详情 - ${CONFIG.appName}`}</title>

      <StockDetailView />
    </>
  );
}
