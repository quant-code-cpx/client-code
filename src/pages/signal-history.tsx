import { CONFIG } from 'src/config-global';

import { SignalHistoryView } from 'src/sections/signal/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`信号历史 - ${CONFIG.appName}`}</title>

      <SignalHistoryView />
    </>
  );
}
