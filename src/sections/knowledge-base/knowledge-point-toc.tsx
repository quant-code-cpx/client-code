import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { KnowledgePoint } from './types';

type Props = {
  points: readonly KnowledgePoint[];
  activePointId: string;
  onPointSelect: (pointId: string) => void;
};

export function KnowledgePointToc({ points, activePointId, onPointSelect }: Props) {
  return (
    <Paper
      component="aside"
      aria-label="本页知识点"
      variant="outlined"
      sx={{ overflow: 'hidden', borderColor: 'divider', p: 2 }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        本页知识点
      </Typography>

      <Stack component="ol" spacing={1.25} sx={{ p: 0, mt: 1.5, mb: 0, listStyle: 'none' }}>
        {points.map((point) => {
          const active = activePointId === point.id;

          return (
            <Typography component="li" variant="caption" key={point.id}>
              <Link
                href={`#${point.id}`}
                underline="none"
                aria-current={active ? 'location' : undefined}
                onClick={() => onPointSelect(point.id)}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '8px minmax(0, 1fr)',
                  gap: 0.75,
                  alignItems: 'start',
                  color: active ? 'primary.main' : 'text.secondary',
                  fontWeight: active ? 700 : 500,
                  lineHeight: 1.5,
                  '&::before': {
                    width: 5,
                    height: 5,
                    mt: 0.75,
                    borderRadius: '50%',
                    bgcolor: 'currentColor',
                    content: '""',
                  },
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                }}
              >
                {point.title}
              </Link>
            </Typography>
          );
        })}
      </Stack>
    </Paper>
  );
}
