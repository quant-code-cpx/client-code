import type { FactorValuesResult } from 'src/api/factor';

import dayjs from 'dayjs';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import ButtonGroup from '@mui/material/ButtonGroup';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TablePagination from '@mui/material/TablePagination';

import { RouterLink } from 'src/routes/components';

import { factorApi } from 'src/api/factor';

// ----------------------------------------------------------------------

type FactorDetailCrossSectionTableProps = {
  factorName: string;
};

const PAGE_SIZE = 50;

export function FactorDetailCrossSectionTable({ factorName }: FactorDetailCrossSectionTableProps) {
  const [tradeDate, setTradeDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<FactorValuesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!factorName) return;
    setLoading(true);
    setError('');
    try {
      const tradeDateFmt = dayjs(tradeDate).format('YYYYMMDD');
      const data = await factorApi.values({
        factorName,
        tradeDate: tradeDateFmt,
        sortOrder,
        page: page + 1,
        pageSize: PAGE_SIZE,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取截面数据失败');
    } finally {
      setLoading(false);
    }
  }, [factorName, tradeDate, sortOrder, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Card>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <DatePicker
            label="交易日期"
            value={tradeDate ? dayjs(tradeDate) : null}
            onChange={(v) => {
              setTradeDate(v?.format('YYYY-MM-DD') ?? '');
              setPage(0);
            }}
            format="YYYY-MM-DD"
            slotProps={{
              textField: { size: 'small', sx: { minWidth: 190 } },
              field: { clearable: true },
            }}
          />

          <ButtonGroup size="small" variant="outlined">
            <Button
              variant={sortOrder === 'desc' ? 'contained' : 'outlined'}
              onClick={() => {
                setSortOrder('desc');
                setPage(0);
              }}
            >
              降序
            </Button>
            <Button
              variant={sortOrder === 'asc' ? 'contained' : 'outlined'}
              onClick={() => {
                setSortOrder('asc');
                setPage(0);
              }}
            >
              升序
            </Button>
          </ButtonGroup>

          {result && (
            <Typography variant="body2" color="text.secondary">
              共 {result.total} 条
            </Typography>
          )}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mx: 2, mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ px: 2, pb: 2 }}>
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />
          ))}
        </Box>
      ) : (
        <Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>排名</TableCell>
                  <TableCell>股票代码</TableCell>
                  <TableCell>股票名称</TableCell>
                  <TableCell>所属行业</TableCell>
                  <TableCell align="right">因子值</TableCell>
                  <TableCell sx={{ minWidth: 160 }}>百分位排名</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result?.items.map((row, idx) => (
                  <TableRow key={row.tsCode} hover>
                    <TableCell>{page * PAGE_SIZE + idx + 1}</TableCell>
                    <TableCell>
                      <Link
                        component={RouterLink}
                        href={`/stock/detail?code=${row.tsCode}`}
                        underline="hover"
                        variant="body2"
                      >
                        {row.tsCode}
                      </Link>
                    </TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.industry}</TableCell>
                    <TableCell align="right">
                      {row.value !== null ? row.value.toFixed(4) : '-'}
                    </TableCell>
                    <TableCell>
                      {row.percentile !== null ? (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <LinearProgress
                            variant="determinate"
                            value={row.percentile * 100}
                            sx={{ flex: 1, height: 6, borderRadius: 1 }}
                          />
                          <Typography variant="caption" sx={{ minWidth: 40 }}>
                            {(row.percentile * 100).toFixed(1)}%
                          </Typography>
                        </Stack>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(!result || result.items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        暂无数据
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={result?.total ?? 0}
            page={page}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            onPageChange={(_, newPage) => setPage(newPage)}
          />
        </Box>
      )}
    </Card>
  );
}
