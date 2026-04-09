import { CONFIG } from 'src/config-global';

import { WalkForwardCreateView } from 'src/sections/backtest/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`新建 WF 任务 - ${CONFIG.appName}`}</title>

      <WalkForwardCreateView />
    </>
  );
}
