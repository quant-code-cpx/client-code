import { CONFIG } from 'src/config-global';

import { FactorLibraryView } from 'src/sections/factor/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`因子库 - ${CONFIG.appName}`}</title>

      <FactorLibraryView />
    </>
  );
}
