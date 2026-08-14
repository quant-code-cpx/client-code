import type { ResearchNote } from 'src/api/research-note';

import { useSearchParams } from 'react-router';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { listNotes, getUserTags } from 'src/api/research-note';

import { Iconify } from 'src/components/iconify';
import { PageHeader } from 'src/components/page-header';

import { NOTE_TEMPLATES } from '../templates';
import { ResearchNoteCard } from '../research-note-card';
import { ResearchNoteTable } from '../research-note-table';
import { ResearchNoteListToolbar } from '../research-note-list-toolbar';

import type { ViewMode, NoteListFilters } from '../research-note-list-toolbar';

// ----------------------------------------------------------------------

const PAGE_SIZE = 12;
const VIEW_MODE_KEY = 'research-note-view-mode';

const DEFAULT_FILTERS: NoteListFilters = {
  tags: [],
  tsCode: '',
  keyword: '',
  sortBy: 'updatedAt',
  dateRange: '',
  pinnedOnly: false,
  hasStock: false,
};

function readViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'card';
  const v = window.localStorage.getItem(VIEW_MODE_KEY);
  return v === 'table' ? 'table' : 'card';
}

function parseFiltersFromUrl(params: URLSearchParams): NoteListFilters {
  return {
    keyword: params.get('keyword') ?? '',
    tsCode: params.get('tsCode') ?? '',
    tags: params.get('tags') ? params.get('tags')!.split(',').filter(Boolean) : [],
    sortBy: (params.get('sortBy') as 'updatedAt' | 'createdAt') || 'updatedAt',
    dateRange: (params.get('dateRange') as NoteListFilters['dateRange']) || '',
    pinnedOnly: params.get('pinned') === '1',
    hasStock: params.get('hasStock') === '1',
  };
}

function filtersToUrl(filters: NoteListFilters, page: number): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.tsCode) params.set('tsCode', filters.tsCode);
  if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
  if (filters.sortBy !== 'updatedAt') params.set('sortBy', filters.sortBy);
  if (filters.dateRange) params.set('dateRange', filters.dateRange);
  if (filters.pinnedOnly) params.set('pinned', '1');
  if (filters.hasStock) params.set('hasStock', '1');
  if (page > 1) params.set('page', String(page));
  return params;
}

export function ResearchNoteListView() {
  const router = useRouter();
  const [searchParams, setSearchParams] = useSearchParams();

  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [createMenuEl, setCreateMenuEl] = useState<HTMLElement | null>(null);

  const filters = useMemo(() => parseFiltersFromUrl(searchParams), [searchParams]);
  const page = Number(searchParams.get('page') ?? '1');
  const [viewMode, setViewMode] = useState<ViewMode>(readViewMode);

  const updateUrl = useCallback(
    (next: NoteListFilters, nextPage = 1) => {
      setSearchParams(filtersToUrl(next, nextPage), { replace: true });
    },
    [setSearchParams]
  );

  const handleFilterChange = (next: NoteListFilters) => updateUrl(next, 1);

  const handleResetFilters = () => updateUrl(DEFAULT_FILTERS, 1);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const handlePageChange = (nextPage: number) => updateUrl(filters, nextPage);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listNotes({
        page,
        pageSize: PAGE_SIZE,
        tags: filters.tags.length > 0 ? filters.tags : undefined,
        tsCode: filters.tsCode || undefined,
        keyword: filters.keyword || undefined,
        sortBy: filters.sortBy,
        sortOrder: 'desc',
        dateRange: filters.dateRange || undefined,
        pinnedOnly: filters.pinnedOnly || undefined,
        hasStock: filters.hasStock || undefined,
      });
      setNotes(data.notes);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取笔记列表失败');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    let cancelled = false;
    getUserTags()
      .then((data) => {
        if (cancelled) return;
        // 兼容 v2：后端返回 { tags: Array<{tag,count}> } 时降级为字符串数组
        const list = data.tags as unknown;
        if (Array.isArray(list) && list.length > 0 && typeof list[0] === 'object') {
          setAvailableTags((list as Array<{ tag: string }>).map((t) => t.tag));
        } else {
          setAvailableTags(list as string[]);
        }
      })
      .catch(() => {
        /* non-critical */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleCreate = (templateId: string) => {
    setCreateMenuEl(null);
    router.push(`/research/notes/new${templateId !== 'blank' ? `?template=${templateId}` : ''}`);
  };

  return (
    <DashboardContent>
      <PageHeader
        title="研究笔记"
        action={
          <Box>
            <Button
              variant="contained"
              onClick={(e) => setCreateMenuEl(e.currentTarget)}
              startIcon={<Iconify icon="solar:add-circle-bold" />}
              endIcon={<Iconify icon="solar:alt-arrow-down-bold" width={14} />}
            >
              新建笔记
            </Button>
            <Menu
              anchorEl={createMenuEl}
              open={Boolean(createMenuEl)}
              onClose={() => setCreateMenuEl(null)}
            >
              {NOTE_TEMPLATES.map((tpl) => (
                <MenuItem key={tpl.id} onClick={() => handleCreate(tpl.id)}>
                  <ListItemIcon>
                    <Iconify icon={tpl.icon} width={18} />
                  </ListItemIcon>
                  <ListItemText primary={tpl.name} secondary={tpl.description} />
                </MenuItem>
              ))}
            </Menu>
          </Box>
        }
        sx={{ mb: 4 }}
      />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={() => setError('')}
          action={
            <Button color="inherit" size="small" onClick={fetchNotes}>
              重试
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Card variant="outlined">
        <ResearchNoteListToolbar
          availableTags={availableTags}
          filters={filters}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onFilterChange={handleFilterChange}
          onSearch={fetchNotes}
          onResetFilters={handleResetFilters}
          trashDisabled
        />
      </Card>

      {loading ? (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : notes.length === 0 ? (
        <Box sx={{ py: 10, textAlign: 'center' }}>
          <Iconify
            icon="solar:document-text-bold"
            width={48}
            sx={{ color: 'text.disabled', mb: 1 }}
          />
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            还没有研究笔记
          </Typography>
          <Typography variant="caption" color="text.disabled">
            从一份模板开始，记录今天的市场观察
          </Typography>
        </Box>
      ) : viewMode === 'table' ? (
        <ResearchNoteTable notes={notes} />
      ) : (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {notes.map((note) => (
            <Grid key={note.id} size={{ xs: 12, md: 6, lg: 4 }}>
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
            onChange={(_, p) => handlePageChange(p)}
            color="primary"
          />
        </Box>
      )}
    </DashboardContent>
  );
}
