import { CONFIG } from 'src/config-global';

import { BacktestRunDetailView } from 'src/sections/backtest/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`回测详情 - ${CONFIG.appName}`}</title>

      <BacktestRunDetailView />
    </>
  );
}
