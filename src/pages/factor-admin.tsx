import { CONFIG } from 'src/config-global';

import { FactorAdminView } from 'src/sections/factor/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`因子管理 - ${CONFIG.appName}`}</title>

      <FactorAdminView />
    </>
  );
}
