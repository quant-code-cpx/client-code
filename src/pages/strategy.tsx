import { CONFIG } from 'src/config-global';

import { StrategyListView } from 'src/sections/strategy/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`策略管理 - ${CONFIG.appName}`}</title>

      <StrategyListView />
    </>
  );
}
