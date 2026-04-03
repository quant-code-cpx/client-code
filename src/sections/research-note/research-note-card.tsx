import type { ResearchNote } from 'src/api/research-note';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';

import { RouterLink } from 'src/routes/components';

import { fToNow } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/[*_`~]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

type Props = {
  note: ResearchNote;
};

export function ResearchNoteCard({ note }: Props) {
  const preview = stripMarkdown(note.content).slice(0, 120);
  const visibleTags = note.tags.slice(0, 3);
  const extraTagCount = note.tags.length - visibleTags.length;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea
        component={RouterLink}
        href={`/research/notes/${note.id}`}
        sx={{ flexGrow: 1 }}
      >
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
          {/* Title row */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            {note.isPinned && (
              <Iconify
                icon="solar:pin-bold"
                width={16}
                sx={{ mt: 0.3, flexShrink: 0, color: 'warning.main' }}
              />
            )}
            <Typography
              variant="subtitle1"
              fontWeight={600}
              sx={{
                flexGrow: 1,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {note.title}
            </Typography>
          </Box>

          {/* Stock code badge */}
          {note.tsCode && (
            <Chip
              label={note.tsCode}
              size="small"
              variant="outlined"
              color="primary"
              sx={{ alignSelf: 'flex-start' }}
            />
          )}

          {/* Content preview */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              flexGrow: 1,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {preview || '暂无内容'}
          </Typography>

          {/* Tags */}
          {note.tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {visibleTags.map((tag) => (
                <Chip key={tag} label={tag} size="small" variant="outlined" />
              ))}
              {extraTagCount > 0 && (
                <Chip label={`+${extraTagCount}`} size="small" variant="outlined" color="default" />
              )}
            </Box>
          )}

          {/* Footer */}
          <Typography variant="caption" color="text.disabled">
            更新于 {fToNow(note.updatedAt)}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
