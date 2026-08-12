import type { MainFlowRankingItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import TableContainer from '@mui/material/TableContainer';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { useRouter } from 'src/routes/hooks';

import { fPctChg, fWanYuan } from 'src/utils/format-number';

import { fetchMainFlowRanking } from 'src/api/market';

// ----------------------------------------------------------------------

function flowColor(v: number | null): 'error.main' | 'success.main' | 'text.secondary' {
  if (v == null) return 'text.secondary';
  if (v > 0) return 'error.main';
  if (v < 0) return 'success.main';
  return 'text.secondary';
}

// ----------------------------------------------------------------------

export function DashboardMainFlowRanking({ refreshKey }: { refreshKey?: number }) {
  const router = useRouter();
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const [data, setData] = useState<MainFlowRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchMainFlowRanking({ order, limit: 10 })
      .then((res) => {
        if (!cancelled) setData(res != null && 'data' in res ? (res.data ?? []) : []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载主力排名失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [order, refreshKey]);

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography variant="h6">个股资金 Top 10</Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={order}
            onChange={(_e, v) => v != null && setOrder(v)}
          >
            <ToggleButton value="desc">净流入</ToggleButton>
            <ToggleButton value="asc">净流出</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <Skeleton key={i} variant="text" height={36} />
            ))}
          </>
        ) : data.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无数据
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>名称</TableCell>
                  <TableCell>行业</TableCell>
                  <TableCell align="right">涨跌幅</TableCell>
                  <TableCell align="right">净流入</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row, idx) => (
                  <TableRow
                    key={row.tsCode}
                    hover
                    role="link"
                    tabIndex={0}
                    aria-label={`打开 ${row.name} 个股详情`}
                    sx={{
                      cursor: 'pointer',
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      },
                    }}
                    onClick={() =>
                      router.push(`/stock/detail?code=${encodeURIComponent(row.tsCode)}`)
                    }
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      router.push(`/stock/detail?code=${encodeURIComponent(row.tsCode)}`);
                    }}
                  >
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {idx + 1}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="fontWeightMedium">
                        {row.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {row.tsCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {row.industry}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight="fontWeightMedium"
                        sx={{ color: flowColor(row.pctChg) }}
                      >
                        {fPctChg(row.pctChg)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight="fontWeightMedium"
                        sx={{ color: flowColor(row.mainNetInflow) }}
                      >
                        {fWanYuan(row.mainNetInflow)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {!loading && data.length > 0 && (
          <Box sx={{ mt: 1.5, textAlign: 'center' }}>
            <Button size="small" variant="text" onClick={() => router.push('/market/money-flow')}>
              查看更多 →
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
