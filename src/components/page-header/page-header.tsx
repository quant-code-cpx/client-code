import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import type { PageHeaderProps } from './types';

// ----------------------------------------------------------------------

/**
 * Standard page title bar.
 *
 * Usage:
 *   <PageHeader title="我的组合" action={<Button>新建</Button>} sx={{ mb: 3 }} />
 */
export function PageHeader({
  title,
  action,
  description,
  variant = 'h4',
  sx,
}: PageHeaderProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...sx }}>
      <Box>
        <Typography variant={variant}>{title}</Typography>
        {description && (
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}
