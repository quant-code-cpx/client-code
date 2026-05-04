import { CONFIG } from 'src/config-global';

import { ComparisonListView } from 'src/sections/backtest/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`多策略对比历史 - ${CONFIG.appName}`}</title>

      <ComparisonListView />
    </>
  );
}
