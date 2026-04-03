import { CONFIG } from 'src/config-global';

import { ResearchNoteDetailView } from 'src/sections/research-note/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`笔记详情 - ${CONFIG.appName}`}</title>

      <ResearchNoteDetailView />
    </>
  );
}
