import { PortfolioPnlTodayCard } from './portfolio-pnl-today-card';
import { PortfolioPnlHistoryChart } from './portfolio-pnl-history-chart';

// ----------------------------------------------------------------------

interface PortfolioPnlTabProps {
  portfolioId: string;
}

export function PortfolioPnlTab({ portfolioId }: PortfolioPnlTabProps) {
  return (
    <div>
      <PortfolioPnlTodayCard portfolioId={portfolioId} />
      <PortfolioPnlHistoryChart portfolioId={portfolioId} />
    </div>
  );
}
