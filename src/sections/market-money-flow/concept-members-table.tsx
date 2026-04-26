import type { ConceptMemberItem, ConceptMembersResult } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { RouterLink } from 'src/routes/components';

import { fetchConceptMembers } from 'src/api/market';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';

// ----------------------------------------------------------------------

const PAGE_SIZE = 20;
const CACHE_LIMIT = 5;

const cache = new Map<string, ConceptMembersResult>();

function getCacheKey(tsCode: string, page: number): string {
  return `${tsCode}::${page}`;
}

function setCache(key: string, value: ConceptMembersResult) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  while (cache.size > CACHE_LIMIT) {
    const firstKey = cache.keys().next().value;
    if (firstKey === undefined) break;
    cache.delete(firstKey);
  }
}

// ----------------------------------------------------------------------

type Props = {
  conceptCode: string;
  conceptName: string;
};

export function ConceptMembersTable({ conceptCode, conceptName }: Props) {
  const [members, setMembers] = useState<ConceptMemberItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [conceptCode]);

  useEffect(() => {
    if (!conceptCode) return undefined;

    const cacheKey = getCacheKey(conceptCode, page);
    const cached = reloadKey === 0 ? cache.get(cacheKey) : undefined;
    if (cached) {
      setMembers(cached.members);
      setTotal(cached.total);
      setError('');
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    fetchConceptMembers({ tsCode: conceptCode, page: page + 1, pageSize: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setMembers(res.members);
        setTotal(res.total);
        setCache(cacheKey, res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载概念成分股失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conceptCode, page, reloadKey]);

  const handleRetry = () => {
    cache.delete(getCacheKey(conceptCode, page));
    setReloadKey((k) => k + 1);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
          成分股明细
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {conceptName ? `${conceptName} · ` : ''}共 {total} 只
        </Typography>
      </Stack>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              重试
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Stack spacing={1}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={36} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      ) : members.length === 0 && !error ? (
        <EmptyContent
          title="暂无成分股数据"
          description="该概念板块当前没有可用的成分股记录"
          sx={{ py: 6 }}
        />
      ) : (
        <>
          <Scrollbar sx={{ maxHeight: 480 }}>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 140 }}>代码</TableCell>
                    <TableCell>名称</TableCell>
                    <TableCell align="right" sx={{ width: 100 }}>
                      详情
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((m) => {
                    const href = `/stock/detail?code=${encodeURIComponent(m.tsCode)}`;
                    return (
                      <TableRow key={m.tsCode} hover>
                        <TableCell>
                          <Typography
                            component={RouterLink}
                            href={href}
                            variant="body2"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: 13,
                              color: 'text.primary',
                              textDecoration: 'none',
                              '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                            }}
                          >
                            {m.tsCode}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            component={RouterLink}
                            href={href}
                            variant="body2"
                            sx={{
                              color: 'text.primary',
                              textDecoration: 'none',
                              '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                            }}
                          >
                            {m.name || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            component={RouterLink}
                            href={href}
                            endIcon={<Iconify icon="solar:arrow-right-bold" width={14} />}
                            sx={{ minWidth: 0 }}
                          >
                            查看
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Scrollbar>

          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            onPageChange={(_, newPage) => setPage(newPage)}
            labelRowsPerPage="每页行数"
          />
        </>
      )}
    </Box>
  );
}
