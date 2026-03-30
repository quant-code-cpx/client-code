import { CONFIG } from 'src/config-global';

import { FactorScreeningView } from 'src/sections/factor/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`因子选股 - ${CONFIG.appName}`}</title>

      <FactorScreeningView />
    </>
  );
}
