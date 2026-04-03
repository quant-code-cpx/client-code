import { CONFIG } from 'src/config-global';

import { WatchlistView } from 'src/sections/watchlist/view';

export default function Page() {
  return (
    <>
      <title>{`自选股 - ${CONFIG.appName}`}</title>
      <WatchlistView />
    </>
  );
}
