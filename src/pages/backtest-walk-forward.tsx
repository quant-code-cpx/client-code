import { CONFIG } from 'src/config-global';

import { WalkForwardListView } from 'src/sections/backtest/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Walk-Forward 验证 - ${CONFIG.appName}`}</title>

      <WalkForwardListView />
    </>
  );
}
