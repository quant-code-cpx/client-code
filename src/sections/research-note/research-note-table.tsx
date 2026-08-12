import type { ResearchNote } from 'src/api/research-note';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { useRouter } from 'src/routes/hooks';

import { fToNow } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
  notes: ResearchNote[];
};

export function ResearchNoteTable({ notes }: Props) {
  const router = useRouter();

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <Scrollbar>
        <TableContainer sx={{ minWidth: 720 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={32} />
                <TableCell>标题</TableCell>
                <TableCell width={140}>关联个股</TableCell>
                <TableCell>标签</TableCell>
                <TableCell width={160}>更新时间</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notes.map((note) => (
                <TableRow
                  key={note.id}
                  hover
                  role="link"
                  tabIndex={0}
                  aria-label={`打开研究笔记 ${note.title || '无标题'}`}
                  sx={{
                    cursor: 'pointer',
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: -2,
                    },
                  }}
                  onClick={() => router.push(`/research/notes/${note.id}`)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    router.push(`/research/notes/${note.id}`);
                  }}
                >
                  <TableCell>
                    {note.isPinned && (
                      <Iconify icon="solar:pin-bold" width={14} sx={{ color: 'warning.main' }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 360 }}>
                      {note.title || '（无标题）'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {note.tsCode ? (
                      <Chip label={note.tsCode} size="small" variant="outlined" color="primary" />
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {note.tags.slice(0, 3).map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                      {note.tags.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{note.tags.length - 3}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {fToNow(note.updatedAt)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Scrollbar>
    </Card>
  );
}
