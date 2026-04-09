import { CONFIG } from 'src/config-global';

import { ComparisonCreateView } from 'src/sections/backtest/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`多策略对比 - ${CONFIG.appName}`}</title>

      <ComparisonCreateView />
    </>
  );
}
