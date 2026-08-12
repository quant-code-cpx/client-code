import { useParams } from 'react-router-dom';

import { ComparisonDetailView } from 'src/sections/backtest/view';

// ----------------------------------------------------------------------

export default function Page() {
  const { groupId } = useParams<{ groupId: string }>();

  return <ComparisonDetailView key={groupId} />;
}
