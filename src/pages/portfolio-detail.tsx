import { CONFIG } from 'src/config-global';

import { PortfolioDetailView } from 'src/sections/portfolio/view';

export default function Page() {
  return (
    <>
      <title>{`组合详情 - ${CONFIG.appName}`}</title>
      <PortfolioDetailView />
    </>
  );
}
