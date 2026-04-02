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

function flowColor(v: number): 'error.main' | 'success.main' | 'text.secondary' {
  if (v > 0) return 'error.main';
  if (v < 0) return 'success.main';
  return 'text.secondary';
}

// ----------------------------------------------------------------------

export function DashboardMainFlowRanking() {
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
        if (!cancelled) setData(res?.data ?? []);
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
  }, [order]);

  return (
    <Card sx={{ height: '100%' }}>
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
          <Typography variant="h6">主力资金 Top 10</Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={order}
            onChange={(_e, v) => v != null && setOrder(v)}
          >
            <ToggleButton value="desc" sx={{ px: 1.5, py: 0.25, fontSize: '0.75rem' }}>
              净流入
            </ToggleButton>
            <ToggleButton value="asc" sx={{ px: 1.5, py: 0.25, fontSize: '0.75rem' }}>
              净流出
            </ToggleButton>
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
                  <TableCell align="right">主力净流入</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row, idx) => (
                  <TableRow
                    key={row.tsCode}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() =>
                      router.push(`/stock/detail?code=${encodeURIComponent(row.tsCode)}`)
                    }
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
          <Box sx={{ mt: 1.5, textAlign: 'right' }}>
            <Button size="small" variant="text" onClick={() => router.push('/market/money-flow')}>
              查看更多 →
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
