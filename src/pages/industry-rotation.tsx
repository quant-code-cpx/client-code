import { CONFIG } from 'src/config-global';

import { IndustryRotationView } from 'src/sections/industry-rotation/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`行业轮动分析 - ${CONFIG.appName}`}</title>
      <IndustryRotationView />
    </>
  );
}
