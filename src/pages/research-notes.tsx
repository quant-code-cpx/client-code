import { CONFIG } from 'src/config-global';

import { ResearchNoteListView } from 'src/sections/research-note/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`研究笔记 - ${CONFIG.appName}`}</title>

      <ResearchNoteListView />
    </>
  );
}
