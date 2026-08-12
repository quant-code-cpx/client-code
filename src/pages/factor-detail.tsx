import { useParams } from 'react-router-dom';

import { FactorDetailView } from 'src/sections/factor/view';

// ----------------------------------------------------------------------

export default function Page() {
  const { name } = useParams<{ name: string }>();

  return <FactorDetailView key={name} />;
}
