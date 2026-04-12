import { CONFIG } from 'src/config-global';

import { SignalLatestView } from 'src/sections/signal/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`策略信号 - ${CONFIG.appName}`}</title>

      <SignalLatestView />
    </>
  );
}
