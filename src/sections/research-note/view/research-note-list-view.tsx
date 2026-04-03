import type { ResearchNote } from 'src/api/research-note';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { listNotes, getUserTags } from 'src/api/research-note';

import { Iconify } from 'src/components/iconify';

import { ResearchNoteCard } from '../research-note-card';
import { ResearchNoteListToolbar } from '../research-note-list-toolbar';

import type { NoteListFilters } from '../research-note-list-toolbar';

// ----------------------------------------------------------------------

const PAGE_SIZE = 12;

export function ResearchNoteListView() {
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const [filters, setFilters] = useState<NoteListFilters>({
    tags: [],
    tsCode: '',
    keyword: '',
    sortBy: 'updatedAt',
  });

  const fetchNotes = useCallback(
    async (overridePage?: number) => {
      setLoading(true);
      setError('');
      try {
        const currentPage = overridePage ?? page;
        const data = await listNotes({
          page: currentPage,
          pageSize: PAGE_SIZE,
          tags: filters.tags.length > 0 ? filters.tags : undefined,
          tsCode: filters.tsCode || undefined,
          keyword: filters.keyword || undefined,
          sortBy: filters.sortBy,
          sortOrder: 'desc',
        });
        setNotes(data.notes);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取笔记列表失败');
      } finally {
        setLoading(false);
      }
    },
    [filters, page]
  );

  const fetchTags = async () => {
    try {
      const data = await getUserTags();
      setAvailableTags(data.tags);
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    fetchNotes(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <DashboardContent>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          研究笔记
        </Typography>
        <Button
          variant="contained"
          component={RouterLink}
          href="/research/notes/new"
          startIcon={<Iconify icon="solar:add-circle-bold" />}
        >
          新建笔记
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <ResearchNoteListToolbar
        availableTags={availableTags}
        filters={filters}
        onFilterChange={setFilters}
        onSearch={() => fetchNotes(1)}
      />

      {loading ? (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, md: 6 }}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : notes.length === 0 ? (
        <Box sx={{ py: 10, textAlign: 'center' }}>
          <Iconify icon="solar:document-text-bold" width={48} sx={{ color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">暂无研究笔记</Typography>
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {notes.map((note) => (
            <Grid key={note.id} size={{ xs: 12, md: 6 }}>
              <ResearchNoteCard note={note} />
            </Grid>
          ))}
        </Grid>
      )}

      {totalPages > 1 && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
          />
        </Box>
      )}
    </DashboardContent>
  );
}
