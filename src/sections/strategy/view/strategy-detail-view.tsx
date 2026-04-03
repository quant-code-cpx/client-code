import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------
// Placeholder — full implementation coming in the next development phase
// ----------------------------------------------------------------------

export function StrategyDetailView() {
  return (
    <DashboardContent>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 12, gap: 2 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          策略详情页开发中…
        </Typography>
      </Box>
    </DashboardContent>
  );
}
