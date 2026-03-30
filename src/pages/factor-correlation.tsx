import { CONFIG } from 'src/config-global';

import { FactorCorrelationView } from 'src/sections/factor/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`因子相关性 - ${CONFIG.appName}`}</title>

      <FactorCorrelationView />
    </>
  );
}
