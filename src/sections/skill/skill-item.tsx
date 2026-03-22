import type { CardProps } from '@mui/material/Card';

import { Icon } from '@iconify/react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

export type SkillProps = {
  id: string;
  name: string;
  icon: string;
  category: string;
  proficiency: number;
  description: string;
};

type SkillItemProps = CardProps & {
  skill: SkillProps;
};

export function SkillItem({ skill, sx, ...other }: SkillItemProps) {
  return (
    <Card
      sx={[
        {
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'background.neutral',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon icon={skill.icon} width={40} height={40} />
        </Box>

        <Label color="default" variant="soft">
          {skill.category}
        </Label>
      </Box>

      <Stack spacing={0.5}>
        <Typography variant="subtitle1">{skill.name}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {skill.description}
        </Typography>
      </Stack>

      <Stack spacing={0.75}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Proficiency
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 'fontWeightSemiBold' }}>
            {skill.proficiency}%
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={skill.proficiency}
          sx={{
            height: 8,
            borderRadius: 1,
            [`& .${linearProgressClasses.bar}`]: { borderRadius: 1 },
          }}
        />
      </Stack>
    </Card>
  );
}
