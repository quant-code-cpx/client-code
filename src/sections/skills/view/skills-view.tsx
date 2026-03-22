import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { _skills } from 'src/_mock';
import { DashboardContent } from 'src/layouts/dashboard';

import { SkillsTechCard } from '../skills-tech-card';

// ----------------------------------------------------------------------

export function SkillsView() {
  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 1 }}>
        Tech Skills
      </Typography>

      <Typography variant="body2" sx={{ mb: { xs: 3, md: 5 }, color: 'text.secondary' }}>
        Core technologies powering this project — from the React + MUI foundation to build tooling
        and data visualization.
      </Typography>

      <Grid container spacing={3}>
        {_skills.map((skill) => (
          <Grid key={skill.name} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <SkillsTechCard skill={skill} />
          </Grid>
        ))}
      </Grid>
    </DashboardContent>
  );
}
