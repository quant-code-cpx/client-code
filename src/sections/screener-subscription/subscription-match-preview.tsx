import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

type SubscriptionMatchPreviewProps = {
  newEntryCodes: string[];
  exitCodes: string[];
};

export function SubscriptionMatchPreview({
  newEntryCodes,
  exitCodes,
}: SubscriptionMatchPreviewProps) {
  if (newEntryCodes.length === 0 && exitCodes.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
        暂无变化记录
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {newEntryCodes.length > 0 && (
        <Box>
          <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600, mr: 1 }}>
            新进入（{newEntryCodes.length}只）:
          </Typography>
          <Box sx={{ display: 'inline-flex', flexWrap: 'wrap', gap: 0.5 }}>
            {newEntryCodes.map((code) => (
              <Chip
                key={code}
                label={code}
                size="small"
                color="success"
                variant="filled"
                component={RouterLink}
                href={`/stock/detail?code=${code}`}
                clickable
              />
            ))}
          </Box>
        </Box>
      )}

      {exitCodes.length > 0 && (
        <Box>
          <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600, mr: 1 }}>
            已退出（{exitCodes.length}只）:
          </Typography>
          <Box sx={{ display: 'inline-flex', flexWrap: 'wrap', gap: 0.5 }}>
            {exitCodes.map((code) => (
              <Chip
                key={code}
                label={code}
                size="small"
                color="error"
                variant="outlined"
                component={RouterLink}
                href={`/stock/detail?code=${code}`}
                clickable
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
