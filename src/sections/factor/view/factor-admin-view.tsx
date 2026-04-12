import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';

import { FactorAdminPanel } from '../factor-admin-panel';

// ----------------------------------------------------------------------

export function FactorAdminView() {
  return (
    <DashboardContent>
      <Typography variant="h4" sx={{ mb: 3 }}>
        因子管理
      </Typography>
      <FactorAdminPanel />
    </DashboardContent>
  );
}
