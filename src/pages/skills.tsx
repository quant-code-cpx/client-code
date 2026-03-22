import { CONFIG } from 'src/config-global';

import { SkillsView } from 'src/sections/skill/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Skills - ${CONFIG.appName}`}</title>

      <SkillsView />
    </>
  );
}
