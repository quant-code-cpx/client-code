import { CONFIG } from 'src/config-global';

import { SkillsView } from 'src/sections/skills/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Skills - ${CONFIG.appName}`}</title>

      <SkillsView />
    </>
  );
}
