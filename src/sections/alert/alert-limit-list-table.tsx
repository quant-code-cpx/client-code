import type { LimitListItem } from 'src/api/alert';

import { useMemo, useState } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';

import { useRouter } from 'src/routes/hooks';

import { fNumber } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { ColoredNumber } from 'src/components/colored-number';

// ----------------------------------------------------------------------

type SortKey = 'consecutiveDays' | 'pctChg' | 'sealAmount';

type Props = {
  items: LimitListItem[];
};

export function AlertLimitListTable({ items }: Props) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortKey>('consecutiveDays');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const list = [...items];
    list.sort((a, b) => {
      const diff = (a[sortBy] ?? 0) - (b[sortBy] ?? 0);
      return order === 'desc' ? -diff : diff;
    });
    return list;
  }, [items, sortBy, order]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setOrder('desc');
    }
  };

  return (
    <Card>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>股票</TableCell>
              <TableCell>涨/跌停</TableCell>
              <TableCell sortDirection={sortBy === 'consecutiveDays' ? order : false}>
                <TableSortLabel
                  active={sortBy === 'consecutiveDays'}
                  direction={sortBy === 'consecutiveDays' ? order : 'desc'}
                  onClick={() => handleSort('consecutiveDays')}
                >
                  连板天数
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'pctChg' ? order : false}>
                <TableSortLabel
                  active={sortBy === 'pctChg'}
                  direction={sortBy === 'pctChg' ? order : 'desc'}
                  onClick={() => handleSort('pctChg')}
                >
                  涨跌幅
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'sealAmount' ? order : false}>
                <TableSortLabel
                  active={sortBy === 'sealAmount'}
                  direction={sortBy === 'sealAmount' ? order : 'desc'}
                  onClick={() => handleSort('sealAmount')}
                >
                  封单额(万)
                </TableSortLabel>
              </TableCell>
              <TableCell>封板次数</TableCell>
              <TableCell>首/末封板</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">暂无数据</Typography>
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((row) => (
                <TableRow
                  key={`${row.tsCode}-${row.limitType}`}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/stock/detail?code=${row.tsCode}`)}
                >
                  <TableCell>
                    <Typography variant="subtitle2">{row.stockName}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {row.tsCode}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Label color={row.limitType === 'UP' ? 'error' : 'success'}>
                      {row.limitType === 'UP' ? '涨停' : '跌停'}
                    </Label>
                  </TableCell>
                  <TableCell>
                    <Label
                      color={row.consecutiveDays >= 3 ? 'warning' : 'default'}
                      variant={row.consecutiveDays >= 3 ? 'filled' : 'outlined'}
                    >
                      {row.consecutiveDays}
                    </Label>
                  </TableCell>
                  <TableCell>
                    <ColoredNumber value={row.pctChg} format="percent" decimals={2} />
                  </TableCell>
                  <TableCell>{fNumber(Math.round(row.sealAmount))}</TableCell>
                  <TableCell>{row.sealCount}</TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {row.firstSealTime ?? '—'} / {row.lastSealTime ?? '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
