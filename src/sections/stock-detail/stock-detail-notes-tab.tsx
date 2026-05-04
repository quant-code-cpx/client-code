import type { ResearchNote } from 'src/api/research-note';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fToNow } from 'src/utils/format-time';

import { getStockNotes } from 'src/api/research-note';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  tsCode: string;
  stockName?: string;
  snapshotPrice?: number | null;
  snapshotTradeDate?: string | null;
  snapshotPctChg?: number | null;
};

export function StockDetailNotesTab({
  tsCode,
  stockName,
  snapshotPrice,
  snapshotTradeDate,
  snapshotPctChg,
}: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotes = useCallback(async () => {
    if (!tsCode) return;
    setLoading(true);
    setError('');
    try {
      const list = await getStockNotes(tsCode);
      setNotes(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载研究笔记失败');
    } finally {
      setLoading(false);
    }
  }, [tsCode]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleNew = () => {
    const params = new URLSearchParams({ tsCode });
    if (stockName) params.set('snapshotName', stockName);
    if (snapshotPrice != null) params.set('snapshotPrice', String(snapshotPrice));
    if (snapshotTradeDate) params.set('snapshotTradeDate', snapshotTradeDate);
    if (snapshotPctChg != null) params.set('snapshotPctChg', String(snapshotPctChg));
    router.push(`/research/notes/new?${params.toString()}`);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
          我的研究 {stockName ? `· ${stockName}` : ''}
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<Iconify icon="solar:add-circle-bold" />}
          onClick={handleNew}
        >
          新建笔记（关联当前股票）
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Stack spacing={1}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={64} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      ) : notes.length === 0 ? (
        <Card variant="outlined" sx={{ py: 6, textAlign: 'center' }}>
          <Iconify
            icon="solar:document-text-bold"
            width={36}
            sx={{ color: 'text.disabled', mb: 1 }}
          />
          <Typography color="text.secondary" sx={{ mb: 0.5 }}>
            还没有 {stockName || tsCode} 的研究记录
          </Typography>
          <Typography variant="caption" color="text.disabled">
            开始记录第一条观察，沉淀你的判断
          </Typography>
        </Card>
      ) : (
        <Stack spacing={1}>
          {notes.map((note) => (
            <Card
              key={note.id}
              variant="outlined"
              component={RouterLink}
              href={`/research/notes/${note.id}`}
              sx={{
                textDecoration: 'none',
                color: 'inherit',
                transition: (t) => t.transitions.create(['border-color']),
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  {note.isPinned && (
                    <Iconify icon="solar:pin-bold" width={14} sx={{ color: 'warning.main' }} />
                  )}
                  <Typography variant="subtitle2" sx={{ flexGrow: 1 }} noWrap>
                    {note.title || '（无标题）'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {fToNow(note.updatedAt)}
                  </Typography>
                </Stack>
                {note.tags.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
                    {note.tags.slice(0, 4).map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
