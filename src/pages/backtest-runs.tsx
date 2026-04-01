import { CONFIG } from 'src/config-global';

import { BacktestRunListView } from 'src/sections/backtest/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`回测历史 - ${CONFIG.appName}`}</title>

      <BacktestRunListView />
    </>
  );
}
