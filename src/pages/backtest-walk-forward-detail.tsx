import { CONFIG } from 'src/config-global';

import { WalkForwardDetailView } from 'src/sections/backtest/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`WF 任务详情 - ${CONFIG.appName}`}</title>

      <WalkForwardDetailView />
    </>
  );
}
