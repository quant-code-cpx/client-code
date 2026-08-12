import { useSearchParams } from 'react-router-dom';

import { StockDetailView } from 'src/sections/stock-detail/view';

// ----------------------------------------------------------------------

export default function Page() {
  const [searchParams] = useSearchParams();
  const stockCode = searchParams.get('code') ?? '';

  return <StockDetailView key={stockCode} />;
}
