import { CONFIG } from 'src/config-global';

import { ComparisonDetailView } from 'src/sections/backtest/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`策略对比详情 - ${CONFIG.appName}`}</title>

      <ComparisonDetailView />
    </>
  );
}
