import { useParams } from 'react-router-dom';

import { PortfolioDetailView } from 'src/sections/portfolio/view';

export default function Page() {
  const { id } = useParams<{ id: string }>();

  return <PortfolioDetailView key={id} />;
}
