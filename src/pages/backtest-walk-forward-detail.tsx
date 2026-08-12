import { useParams } from 'react-router-dom';

import { WalkForwardDetailView } from 'src/sections/backtest/view';

// ----------------------------------------------------------------------

export default function Page() {
  const { wfRunId } = useParams<{ wfRunId: string }>();

  return <WalkForwardDetailView key={wfRunId} />;
}
