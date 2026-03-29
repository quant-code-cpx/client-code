import type { StockShareholdersData } from 'src/api/stock';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';

import { fDate } from 'src/utils/format-time';
import { fNumber, fRatePercent } from 'src/utils/format-number';

import { stockDetailApi } from 'src/api/stock';

// ----------------------------------------------------------------------

type Props = { tsCode: string };

function str(v: unknown): string {
  return v != null ? String(v) : '-';
}

function num(v: unknown): string {
  const n = Number(v);
  return Number.isNaN(n) ? '-' : fNumber(n);
}

function pct(v: unknown): string {
  const n = Number(v);
  return Number.isNaN(n) ? '-' : fRatePercent(n);
}

// 前十大股东表
function HoldersTable({
  title,
  data,
}: {
  title: string;
  data: Record<string, unknown> | undefined;
}) {
  const holders = (data?.holders ?? data?.items ?? (Array.isArray(data) ? data : [])) as Record<
    string,
    unknown
  >[];

  if (!holders.length) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {title}
          </Typography>
          <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">暂无数据</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          {title}
        </Typography>
        {data?.announceDate != null && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            公告日期：{fDate(data.announceDate as string, 'YYYY-MM-DD')}
          </Typography>
        )}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>排名</TableCell>
                <TableCell>股东名称</TableCell>
                <TableCell>股东性质</TableCell>
                <TableCell align="right">持股数量(股)</TableCell>
                <TableCell align="right">持股比例(%)</TableCell>
                <TableCell align="right">较上期变动(股)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {holders.map((row, i) => (
                <TableRow key={i} hover>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{str(row.holderName ?? row.name)}</TableCell>
                  <TableCell>{str(row.holderType ?? row.holderCat)}</TableCell>
                  <TableCell align="right">{num(row.holdAmount ?? row.holdVol)}</TableCell>
                  <TableCell align="right">
                    {pct(row.holdRatio ?? row.holdRat ?? row.pct)}
                  </TableCell>
                  <TableCell align="right">
                    {str(row.changeType ?? row.change)}
                    {row.holdChange != null ? ` (${num(row.holdChange)})` : ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

export function StockDetailShareholdersTab({ tsCode }: Props) {
  const [data, setData] = useState<StockShareholdersData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!tsCode) return;
    setLoading(true);
    setError('');
    try {
      const result = await stockDetailApi.shareholders(tsCode);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取股东数据失败');
    } finally {
      setLoading(false);
    }
  }, [tsCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Stack spacing={2}>
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={240} sx={{ borderRadius: 1.5 }} />
        ))}
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      <HoldersTable
        title="前十大股东"
        data={data?.top10Holders as Record<string, unknown> | undefined}
      />
      <HoldersTable
        title="前十大流通股东"
        data={data?.top10FloatHolders as Record<string, unknown> | undefined}
      />
    </Stack>
  );
}
