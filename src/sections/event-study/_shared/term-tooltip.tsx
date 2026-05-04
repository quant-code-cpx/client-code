import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { TERMS } from '../constants';

// ----------------------------------------------------------------------

type Props = {
  termKey: keyof typeof TERMS;
  /** 显示的文字，可不传则使用 TERMS[key].title */
  label?: string;
};

export function TermTooltip({ termKey, label }: Props) {
  const term = TERMS[termKey];
  if (!term) return null;

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {term.title}
          </Typography>
          <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.85 }}>
            {term.desc}
          </Typography>
        </Box>
      }
      arrow
      placement="top"
    >
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'help',
          color: 'text.secondary',
        }}
      >
        {label ?? term.title}
        <Iconify icon="solar:question-circle-bold" width={14} sx={{ opacity: 0.6 }} />
      </Box>
    </Tooltip>
  );
}
