import { useParams } from 'react-router-dom';

import { ResearchNoteDetailView } from 'src/sections/research-note/view';

// ----------------------------------------------------------------------

export default function Page() {
  const { noteId } = useParams<{ noteId: string }>();

  // React Router may reuse this page instance when only :noteId changes. Remount the
  // editor so autosave state, pending requests and the note identity cannot leak across notes.
  return <ResearchNoteDetailView key={noteId} />;
}
