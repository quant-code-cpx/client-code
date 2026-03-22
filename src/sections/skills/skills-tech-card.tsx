import type { CardProps } from '@mui/material/Card';

import { Icon } from '@iconify/react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';

// ----------------------------------------------------------------------

export type SkillItem = {
  name: string;
  proficiency: number;
  category: string;
  icon: string;
  color: string;
  description: string;
};

type Props = CardProps & {
  skill: SkillItem;
};

export function SkillsTechCard({ skill, sx, ...other }: Props) {
  const { name, proficiency, category, icon, color, description } = skill;

  return (
    <Tooltip title={description} placement="top" arrow>
      <Card
        sx={[
          {
            height: '100%',
            transition: 'box-shadow 0.2s, transform 0.2s',
            '&:hover': {
              boxShadow: (theme) => theme.shadows[8],
              transform: 'translateY(-2px)',
            },
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                display: 'flex',
                borderRadius: 1.5,
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${color}1A`,
                flexShrink: 0,
              }}
            >
              <Icon icon={icon} width={28} style={{ color }} />
            </Box>

            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap>
                {name}
              </Typography>
              <Chip
                label={category}
                size="small"
                variant="outlined"
                sx={{ mt: 0.5, height: 20, fontSize: '0.65rem' }}
              />
            </Box>

            <Typography variant="h5" sx={{ color, fontWeight: 'bold', flexShrink: 0 }}>
              {proficiency}%
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={proficiency}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: `${color}1A`,
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                bgcolor: color,
              },
            }}
          />
        </CardContent>
      </Card>
    </Tooltip>
  );
}
