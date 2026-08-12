import { useParams } from 'react-router-dom';

import { ScreenerSubscriptionDetailView } from 'src/sections/screener-subscription/view';

export default function Page() {
  const { id } = useParams<{ id: string }>();

  return <ScreenerSubscriptionDetailView key={id} />;
}
