import Grid from '@mui/material/Grid';

import { RiskBetaTable } from './risk-beta-table';
import { RiskIndustryChart } from './risk-industry-chart';
import { RiskMarketCapChart } from './risk-market-cap-chart';
import { RiskConcentrationCard } from './risk-concentration-card';

// ----------------------------------------------------------------------

interface PortfolioRiskTabProps {
  portfolioId: string;
}

export function PortfolioRiskTab({ portfolioId }: PortfolioRiskTabProps) {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <RiskIndustryChart portfolioId={portfolioId} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <RiskMarketCapChart portfolioId={portfolioId} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <RiskConcentrationCard portfolioId={portfolioId} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <RiskBetaTable portfolioId={portfolioId} />
      </Grid>
    </Grid>
  );
}
