import { useParams } from 'react-router-dom';

import { ReportDetailView } from 'src/sections/report/view';

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();

  return <ReportDetailView key={id} />;
}
