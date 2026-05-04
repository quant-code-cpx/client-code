import type { PatternTemplate, PatternTemplateType } from 'src/api/pattern';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { PatternTemplateCard } from './pattern-template-card';
import { PATTERN_TYPE_FILTERS } from './pattern-template-meta';

type TypeFilter = 'all' | PatternTemplateType;

type Props = {
  templates: PatternTemplate[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (value: TypeFilter) => void;
};

export function PatternTemplateGallery({
  templates,
  loading,
  selectedId,
  onSelect,
  typeFilter,
  onTypeFilterChange,
}: Props) {
  const filtered =
    typeFilter === 'all' ? templates : templates.filter((t) => t.type === typeFilter);

  return (
    <Box>
      <ToggleButtonGroup
        value={typeFilter}
        exclusive
        onChange={(_, v: TypeFilter | null) => {
          if (v) onTypeFilterChange(v);
        }}
        size="small"
        sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}
      >
        {PATTERN_TYPE_FILTERS.map((f) => (
          <ToggleButton key={f.value} value={f.value}>
            {f.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {loading ? (
        <Grid container spacing={1.5}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid key={i} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <Skeleton variant="rectangular" height={130} sx={{ borderRadius: 1.5 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={1.5}>
          {filtered.map((tpl) => (
            <Grid key={tpl.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <PatternTemplateCard
                template={tpl}
                selected={selectedId === tpl.id}
                onSelect={() => onSelect(selectedId === tpl.id ? null : tpl.id)}
              />
            </Grid>
          ))}
          {filtered.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" color="text.secondary">
                该类型暂无形态模板
              </Typography>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
