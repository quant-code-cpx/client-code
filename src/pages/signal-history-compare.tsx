import { CONFIG } from 'src/config-global';

import { SignalHistoryCompareView } from 'src/sections/signal/view';

// ----------------------------------------------------------------------

export default function SignalHistoryComparePage() {
  return (
    <>
      <title>{`信号历史对比 - ${CONFIG.appName}`}</title>

      <SignalHistoryCompareView />
    </>
  );
}
