import { CONFIG } from 'src/config-global';

import { PortfolioListView } from 'src/sections/portfolio/view';

export default function Page() {
  return (
    <>
      <title>{`我的组合 - ${CONFIG.appName}`}</title>
      <PortfolioListView />
    </>
  );
}
