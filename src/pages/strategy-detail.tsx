import { CONFIG } from 'src/config-global';

import { StrategyDetailView } from 'src/sections/strategy/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`策略详情 - ${CONFIG.appName}`}</title>

      <StrategyDetailView />
    </>
  );
}
