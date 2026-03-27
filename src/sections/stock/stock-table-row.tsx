import type { StockListItem } from 'src/api/stock';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { fNumber, fPctChg, fWanYuan, fQianYuan, fRatePercent } from 'src/utils/format-number';

import { Label } from 'src/components/label';

import { EXCHANGE_LABEL } from './constants';

// ----------------------------------------------------------------------

type StockTableRowProps = {
  row: StockListItem;
};

export function StockTableRow({ row }: StockTableRowProps) {
  const isUp = (row.pctChg ?? 0) > 0;
  const isDown = (row.pctChg ?? 0) < 0;

  const pctChgColor = isUp ? 'error' : isDown ? 'success' : 'default';
  const exchangeLabel = row.exchange ? (EXCHANGE_LABEL[row.exchange] ?? row.exchange) : '-';

  return (
    <TableRow hover>
      {/* 1. 股票名称 / 代码（固定列） */}
      <TableCell
        sx={{
          position: 'sticky',
          left: 0,
          zIndex: 1,
          bgcolor: 'background.paper',
          boxShadow: '2px 0 6px -2px rgba(0,0,0,0.12)',
        }}
      >
        <Typography
          component={RouterLink}
          href={`/stock/detail?code=${encodeURIComponent(row.tsCode)}`}
          variant="body2"
          fontWeight="fontWeightMedium"
          sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          {row.name ?? '-'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {row.tsCode}
        </Typography>
      </TableCell>

      {/* 2. 最新价 */}
      <TableCell align="right">
        <Typography variant="body2" fontWeight="fontWeightMedium">
          {fNumber(row.close)}
        </Typography>
      </TableCell>

      {/* 3. 涨跌幅 */}
      <TableCell align="right">
        <Label variant="soft" color={pctChgColor}>
          {fPctChg(row.pctChg)}
        </Label>
      </TableCell>

      {/* 4. 交易所 */}
      <TableCell>
        <Label variant="soft" color="default">
          {exchangeLabel}
        </Label>
      </TableCell>

      {/* 5. 板块 */}
      <TableCell>{row.market ?? '-'}</TableCell>

      {/* 6. 行业 */}
      <TableCell>{row.industry ?? '-'}</TableCell>

      {/* 7. 总市值 */}
      <TableCell align="right">{fWanYuan(row.totalMv)}</TableCell>

      {/* 8. 流通市值 */}
      <TableCell align="right">{fWanYuan(row.circMv)}</TableCell>

      {/* 9. 换手率 */}
      <TableCell align="right">{fRatePercent(row.turnoverRate)}</TableCell>

      {/* 10. 成交额 */}
      <TableCell align="right">{fQianYuan(row.amount)}</TableCell>

      {/* 11. 市盈率(TTM) */}
      <TableCell align="right">{fNumber(row.peTtm)}</TableCell>

      {/* 12. 市净率 */}
      <TableCell align="right">{fNumber(row.pb)}</TableCell>

      {/* 13. 股息率(TTM) */}
      <TableCell align="right">{fRatePercent(row.dvTtm)}</TableCell>
    </TableRow>
  );
}
