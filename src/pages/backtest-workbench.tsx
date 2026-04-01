import { CONFIG } from 'src/config-global';

import { BacktestWorkbenchView } from 'src/sections/backtest/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`回测工作台 - ${CONFIG.appName}`}</title>

      <BacktestWorkbenchView />
    </>
  );
}
