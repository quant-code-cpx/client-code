import { useParams } from 'react-router-dom';

import { BacktestRunDetailView } from 'src/sections/backtest/view';

// ----------------------------------------------------------------------

export default function Page() {
  const { runId } = useParams<{ runId: string }>();

  return <BacktestRunDetailView key={runId} />;
}
