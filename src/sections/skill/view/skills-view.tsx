import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { _skills } from 'src/_mock';
import { DashboardContent } from 'src/layouts/dashboard';

import { SkillItem } from '../skill-item';

// ----------------------------------------------------------------------

export function SkillsView() {
  return (
    <DashboardContent>
      <Typography variant="h4" sx={{ mb: 5 }}>
        Skills
      </Typography>

      <Grid container spacing={3}>
        {_skills.map((skill) => (
          <Grid key={skill.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <SkillItem skill={skill} />
          </Grid>
        ))}
      </Grid>
    </DashboardContent>
  );
}
