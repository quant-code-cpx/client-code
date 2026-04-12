import type { IndexConstituentItem, IndexConstituentResult } from 'src/api/index-detail';

import { useMemo, useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import Autocomplete from '@mui/material/Autocomplete';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';

import { fPctChg, fWanYuan } from 'src/utils/format-number';

import { fetchIndexConstituents } from 'src/api/index-detail';

import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type SortKey = 'weight' | 'pctChg' | 'totalMv';
type SortDir = 'asc' | 'desc';

type Props = {
  tsCode: string;
  onDataLoaded?: (items: IndexConstituentItem[]) => void;
};

export function IndexConstituentsTable({ tsCode, onDataLoaded }: Props) {
  const [result, setResult] = useState<IndexConstituentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('weight');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchIndexConstituents({ index_code: tsCode })
      .then((res) => {
        if (!cancelled) {
          setResult(res ?? null);
          onDataLoaded?.(res?.constituents ?? []);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载成分股失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tsCode]);

  const allIndustries = useMemo(() => {
    if (!result?.constituents) return [];
    return [...new Set(result.constituents.map((c) => c.industry).filter(Boolean))].sort();
  }, [result]);

  const filtered = useMemo(() => {
    if (!result?.constituents) return [];
    let list = result.constituents;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.tsCode.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
      );
    }

    if (industries.length > 0) {
      list = list.filter((c) => industries.includes(c.industry));
    }

    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });

    return list;
  }, [result, search, industries, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            成分股及权重
            {result && (
              <Typography
                component="span"
                variant="caption"
                sx={{ color: 'text.secondary', ml: 1 }}
              >
                共 {result.totalCount} 只 · {result.tradeDate}
              </Typography>
            )}
          </Typography>

          <Stack direction="row" spacing={1.5}>
            <TextField
              size="small"
              placeholder="搜索代码/名称"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 180 }}
            />
            <Autocomplete
              multiple
              size="small"
              options={allIndustries}
              value={industries}
              onChange={(_, v) => setIndustries(v)}
              renderInput={(params) => <TextField {...params} placeholder="行业筛选" />}
              sx={{ minWidth: 200 }}
              limitTags={2}
            />
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1 }} />
        ) : (
          <Scrollbar>
            <TableContainer>
              <Table size="small" sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ width: 50 }}>
                      排名
                    </TableCell>
                    <TableCell>代码</TableCell>
                    <TableCell>名称</TableCell>
                    <TableCell>行业</TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'weight'}
                        direction={sortKey === 'weight' ? sortDir : 'desc'}
                        onClick={() => handleSort('weight')}
                      >
                        权重（%）
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">收盘价</TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'pctChg'}
                        direction={sortKey === 'pctChg' ? sortDir : 'desc'}
                        onClick={() => handleSort('pctChg')}
                      >
                        涨跌幅
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'totalMv'}
                        direction={sortKey === 'totalMv' ? sortDir : 'desc'}
                        onClick={() => handleSort('totalMv')}
                      >
                        总市值
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">流通市值</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((c, idx) => {
                    const pctColor =
                      c.pctChg > 0
                        ? 'error.main'
                        : c.pctChg < 0
                          ? 'success.main'
                          : 'text.secondary';
                    return (
                      <TableRow key={c.tsCode} hover>
                        <TableCell align="center">
                          <Typography variant="caption">{idx + 1}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {c.tsCode}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{c.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Label color="default" variant="soft">
                            {c.industry}
                          </Label>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {c.weight.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">{c.close.toFixed(2)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" sx={{ color: pctColor, fontWeight: 600 }}>
                            {fPctChg(c.pctChg)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">{fWanYuan(c.totalMv)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">{fWanYuan(c.circMv)}</Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          暂无数据
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Scrollbar>
        )}
      </CardContent>
    </Card>
  );
}
