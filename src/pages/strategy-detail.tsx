import { useParams } from 'react-router-dom';

import { StrategyDetailView } from 'src/sections/strategy/view';

// ----------------------------------------------------------------------

export default function Page() {
  const { id } = useParams<{ id: string }>();

  return <StrategyDetailView key={id} />;
}
