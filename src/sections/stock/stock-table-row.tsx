import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

export type StockRowProps = {
  tsCode: string;
  symbol: string;
  name: string;
  exchange: string;
  market: string;
  industry: string;
  area: string;
  pctChg: number | null;
  peTtm: number | null;
  pb: number | null;
  dvTtm: number | null;
  totalMv: number | null;
  turnoverRate: number | null;
  close: number | null;
};

function formatMv(mv: number | null): string {
  if (mv === null) return '-';
  if (mv >= 100000000) return `${(mv / 100000000).toFixed(2)}亿`;
  return `${(mv / 10000).toFixed(0)}万`;
}

function formatNum(val: number | null, decimals = 2): string {
  if (val === null) return '-';
  return val.toFixed(decimals);
}

type StockTableRowProps = {
  row: StockRowProps;
};

export function StockTableRow({ row }: StockTableRowProps) {
  const isUp = (row.pctChg ?? 0) > 0;
  const isDown = (row.pctChg ?? 0) < 0;

  const pctChgColor = isUp ? 'error' : isDown ? 'success' : 'default';
  const pctChgLabel =
    row.pctChg === null
      ? '-'
      : `${row.pctChg > 0 ? '+' : ''}${row.pctChg.toFixed(2)}%`;

  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" fontWeight="fontWeightMedium">
          {row.name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {row.tsCode}
        </Typography>
      </TableCell>

      <TableCell>
        <Label variant="soft" color="default">
          {row.exchange}
        </Label>
      </TableCell>

      <TableCell>{row.market}</TableCell>

      <TableCell>{row.industry}</TableCell>

      <TableCell align="right">
        <Label variant="soft" color={pctChgColor}>
          {pctChgLabel}
        </Label>
      </TableCell>

      <TableCell align="right">{formatNum(row.peTtm)}</TableCell>

      <TableCell align="right">{formatNum(row.pb)}</TableCell>

      <TableCell align="right">
        {row.dvTtm !== null ? `${formatNum(row.dvTtm)}%` : '-'}
      </TableCell>

      <TableCell align="right">{formatMv(row.totalMv)}</TableCell>

      <TableCell align="right">
        {row.turnoverRate !== null ? `${formatNum(row.turnoverRate, 2)}%` : '-'}
      </TableCell>

      <TableCell align="right">
        <Typography variant="body2" fontWeight="fontWeightMedium">
          {formatNum(row.close)}
        </Typography>
      </TableCell>
    </TableRow>
  );
}
