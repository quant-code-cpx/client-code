import { CONFIG } from 'src/config-global';

import { FactorAdvancedAnalysisView } from 'src/sections/factor/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`因子高级分析 - ${CONFIG.appName}`}</title>

      <FactorAdvancedAnalysisView />
    </>
  );
}
