import type { SectorRankingItem, SectorFlowRankingItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';

import { fPctChg } from 'src/utils/format-number';

import { fetchSectorRanking, fetchSectorFlowRanking } from 'src/api/market';

// ----------------------------------------------------------------------

function pctColor(v: number | null): 'error.main' | 'success.main' | 'text.secondary' {
  if (v == null) return 'text.secondary';
  if (v > 0) return 'error.main';
  if (v < 0) return 'success.main';
  return 'text.secondary';
}

// ----------------------------------------------------------------------

export function DashboardHotSectors() {
  const [tab, setTab] = useState(0);

  // Tab 0: by change%
  const [rankData, setRankData] = useState<SectorRankingItem[]>([]);
  const [rankLoading, setRankLoading] = useState(true);
  const [rankError, setRankError] = useState('');

  // Tab 1: by net flow
  const [flowData, setFlowData] = useState<SectorFlowRankingItem[]>([]);
  const [flowLoading, setFlowLoading] = useState(true);
  const [flowError, setFlowError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setRankLoading(true);
    setRankError('');

    fetchSectorRanking({ sort_by: 'pct_change', limit: 10 })
      .then((res) => {
        if (!cancelled) {
          const sorted = [...(res?.sectors ?? [])].sort((a, b) => b.pctChange - a.pctChange);
          setRankData(sorted);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setRankError(err instanceof Error ? err.message : '加载板块排名失败');
      })
      .finally(() => {
        if (!cancelled) setRankLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFlowLoading(true);
    setFlowError('');

    fetchSectorFlowRanking({
      content_type: 'INDUSTRY',
      sort_by: 'net_amount',
      order: 'desc',
      limit: 10,
    })
      .then((res) => {
        if (!cancelled) setFlowData(res?.sectors ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setFlowError(err instanceof Error ? err.message : '加载板块资金失败');
      })
      .finally(() => {
        if (!cancelled) setFlowLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = tab === 0 ? rankLoading : flowLoading;
  const isError = tab === 0 ? rankError : flowError;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>
          热门板块 Top 10
        </Typography>

        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          sx={{ mb: 1.5, minHeight: 36 }}
          TabIndicatorProps={{ style: { height: 2 } }}
        >
          <Tab label="按涨幅" sx={{ minHeight: 36, py: 0.5, fontSize: '0.8rem' }} />
          <Tab label="按资金" sx={{ minHeight: 36, py: 0.5, fontSize: '0.8rem' }} />
        </Tabs>

        {isError && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {isError}
          </Alert>
        )}

        {isLoading ? (
          <>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <Skeleton key={i} variant="text" height={30} />
            ))}
          </>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>板块</TableCell>
                  <TableCell align="right">涨跌幅</TableCell>
                  {tab === 1 && <TableCell align="right">净流入</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {tab === 0
                  ? rankData.map((row, idx) => (
                      <TableRow key={row.tsCode} hover>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {idx + 1}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.name}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight="fontWeightMedium"
                            sx={{ color: pctColor(row.pctChange) }}
                          >
                            {fPctChg(row.pctChange)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  : flowData.map((row, idx) => (
                      <TableRow key={row.tsCode} hover>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {idx + 1}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.name}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight="fontWeightMedium"
                            sx={{ color: pctColor(row.pctChange) }}
                          >
                            {fPctChg(row.pctChange)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" sx={{ color: pctColor(row.netAmount) }}>
                            {row.netAmount > 0 ? '+' : ''}
                            {(row.netAmount / 100000000).toFixed(2)}亿
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {!isLoading && tab === 0 && rankData.length === 0 && !isError && (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无数据
            </Typography>
          </Box>
        )}

        {!isLoading && tab === 1 && flowData.length === 0 && !isError && (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无数据
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
