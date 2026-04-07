import type { MainFlowRankingItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
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

import { fPctChg, fWanYuan } from 'src/utils/format-number';

import { fetchMainFlowRanking } from 'src/api/market';

import { StockFlowDetailDialog } from './stock-flow-detail-dialog';

// ----------------------------------------------------------------------

function flowColor(value: number | null): 'error.main' | 'success.main' | 'text.secondary' {
  if (value == null) return 'text.secondary';
  if (value > 0) return 'error.main';
  if (value < 0) return 'success.main';
  return 'text.secondary';
}

// ----------------------------------------------------------------------

type FlowTableProps = {
  title: string;
  rows: MainFlowRankingItem[];
  onRowClick: (item: MainFlowRankingItem) => void;
  selectedCode: string | null;
};

function FlowTable({ title, rows, onRowClick, selectedCode }: FlowTableProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {title}
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>代码</TableCell>
                <TableCell>名称</TableCell>
                <TableCell>行业</TableCell>
                <TableCell align="right">主力净流入</TableCell>
                <TableCell align="right">超大单净</TableCell>
                <TableCell align="right">大单净</TableCell>
                <TableCell align="right">涨跌幅</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => {
                const isSelected = row.tsCode === selectedCode;
                return (
                  <TableRow
                    key={row.tsCode}
                    hover
                    selected={isSelected}
                    onClick={() => onRowClick(row)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {idx + 1}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {row.tsCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="fontWeightMedium">
                        {row.name}
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
                        sx={{ color: flowColor(row.mainNetInflow) }}
                      >
                        {fWanYuan(row.mainNetInflow)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: flowColor(row.elgNetInflow) }}>
                        {fWanYuan(row.elgNetInflow)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: flowColor(row.lgNetInflow) }}>
                        {fWanYuan(row.lgNetInflow)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: flowColor(row.pctChg) }}>
                        {fPctChg(row.pctChg)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
                      暂无数据
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function MainFlowRankingTable({ tradeDate }: Props) {
  const [inflowData, setInflowData] = useState<MainFlowRankingItem[]>([]);
  const [outflowData, setOutflowData] = useState<MainFlowRankingItem[]>([]);
  const [loadingInflow, setLoadingInflow] = useState(true);
  const [loadingOutflow, setLoadingOutflow] = useState(true);
  const [errorInflow, setErrorInflow] = useState('');
  const [errorOutflow, setErrorOutflow] = useState('');
  const [dialogStock, setDialogStock] = useState<MainFlowRankingItem | null>(null);

  // Fetch inflow top 20
  useEffect(() => {
    let cancelled = false;
    setLoadingInflow(true);
    setErrorInflow('');

    fetchMainFlowRanking({ trade_date: tradeDate, order: 'desc', limit: 20 })
      .then((res) => {
        if (!cancelled) setInflowData(res?.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setErrorInflow(err instanceof Error ? err.message : '加载主力净流入数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoadingInflow(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  // Fetch outflow top 20
  useEffect(() => {
    let cancelled = false;
    setLoadingOutflow(true);
    setErrorOutflow('');

    fetchMainFlowRanking({ trade_date: tradeDate, order: 'asc', limit: 20 })
      .then((res) => {
        if (!cancelled) setOutflowData(res?.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setErrorOutflow(err instanceof Error ? err.message : '加载主力净流出数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoadingOutflow(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  const handleRowClick = (item: MainFlowRankingItem) => {
    setDialogStock(item);
  };

  return (
    <>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          {errorInflow ? (
            <Alert severity="error">{errorInflow}</Alert>
          ) : loadingInflow ? (
            <Card>
              <CardContent>
                <Skeleton variant="text" width="40%" height={32} />
                <Skeleton variant="rectangular" height={400} sx={{ mt: 2 }} />
              </CardContent>
            </Card>
          ) : (
            <FlowTable
              title="主力净流入 Top 20"
              rows={inflowData}
              onRowClick={handleRowClick}
              selectedCode={dialogStock?.tsCode ?? null}
            />
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          {errorOutflow ? (
            <Alert severity="error">{errorOutflow}</Alert>
          ) : loadingOutflow ? (
            <Card>
              <CardContent>
                <Skeleton variant="text" width="40%" height={32} />
                <Skeleton variant="rectangular" height={400} sx={{ mt: 2 }} />
              </CardContent>
            </Card>
          ) : (
            <FlowTable
              title="主力净流出 Top 20"
              rows={outflowData}
              onRowClick={handleRowClick}
              selectedCode={dialogStock?.tsCode ?? null}
            />
          )}
        </Grid>
      </Grid>

      {dialogStock != null && (
        <StockFlowDetailDialog
          open
          tsCode={dialogStock.tsCode}
          stockName={dialogStock.name ?? dialogStock.tsCode}
          onClose={() => setDialogStock(null)}
        />
      )}
    </>
  );
}
