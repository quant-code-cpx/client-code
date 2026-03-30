import { CONFIG } from 'src/config-global';

import { FactorDetailView } from 'src/sections/factor/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`因子详情 - ${CONFIG.appName}`}</title>

      <FactorDetailView />
    </>
  );
}
