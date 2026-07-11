import type { StockListItem } from 'src/api/stock';

import { varAlpha } from 'minimal-shared/utils';

import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import { useTheme } from '@mui/material/styles';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fNumber, fPctChg, fWanYuan, fQianYuan, fRatePercent } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { EXCHANGE_LABEL } from './constants';

import type { ColumnId } from './types';

// ----------------------------------------------------------------------

type StockTableRowProps = {
  row: StockListItem;
  selected: boolean;
  onToggleSelect: (tsCode: string) => void;
  onAddToWatchlist: (tsCode: string) => void;
  visibleColumns: ColumnId[];
};

export function StockTableRow({
  row,
  selected,
  onToggleSelect,
  onAddToWatchlist,
  visibleColumns,
}: StockTableRowProps) {
  const theme = useTheme();
  const router = useRouter();

  const isUp = (row.pctChg ?? 0) > 0;
  const isDown = (row.pctChg ?? 0) < 0;
  const pctChgColor = isUp ? 'error' : isDown ? 'success' : 'default';
  const exchangeLabel = row.exchange ? (EXCHANGE_LABEL[row.exchange] ?? row.exchange) : '-';

  const stickyShadow = `2px 0 6px -2px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(row.tsCode);
    } catch {
      /* 忽略复制失败 */
    }
  };

  const cellMap: Record<ColumnId, React.ReactNode> = {
    close: (
      <Typography variant="body2" fontWeight="fontWeightMedium">
        {fNumber(row.close)}
      </Typography>
    ),
    pctChg: (
      <Label variant="soft" color={pctChgColor}>
        {fPctChg(row.pctChg)}
      </Label>
    ),
    exchange: (
      <Label variant="soft" color="default">
        {exchangeLabel}
      </Label>
    ),
    market: row.market ?? '-',
    industry: row.industry ?? '-',
    totalMv: fWanYuan(row.totalMv),
    circMv: fWanYuan(row.circMv),
    turnoverRate: fRatePercent(row.turnoverRate),
    amount: fQianYuan(row.amount),
    peTtm: fNumber(row.peTtm),
    pb: fNumber(row.pb),
    dvTtm: fRatePercent(row.dvTtm),
  };

  const cellAlign: Record<ColumnId, 'left' | 'right'> = {
    close: 'right',
    pctChg: 'right',
    exchange: 'left',
    market: 'left',
    industry: 'left',
    totalMv: 'right',
    circMv: 'right',
    turnoverRate: 'right',
    amount: 'right',
    peTtm: 'right',
    pb: 'right',
    dvTtm: 'right',
  };

  return (
    <TableRow hover selected={selected} sx={{ '&:hover .row-actions': { opacity: 1 } }}>
      <TableCell
        padding="checkbox"
        sx={{
          position: 'sticky',
          left: 0,
          zIndex: 1,
          bgcolor: 'background.paper',
        }}
      >
        <Checkbox
          size="small"
          checked={selected}
          onChange={() => onToggleSelect(row.tsCode)}
          inputProps={{ 'aria-label': `选择 ${row.name ?? row.tsCode}` }}
        />
      </TableCell>

      {/* 1. 股票名称 / 代码（固定列） */}
      <TableCell
        sx={{
          position: 'sticky',
          left: 48,
          zIndex: 1,
          bgcolor: 'background.paper',
          boxShadow: stickyShadow,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Stack sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography
              component={RouterLink}
              href={`/stock/detail?code=${encodeURIComponent(row.tsCode)}`}
              variant="body2"
              fontWeight="fontWeightMedium"
              sx={{
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {row.name ?? '-'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {row.tsCode}
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={0.25}
            className="row-actions"
            sx={{ opacity: 0, transition: 'opacity 150ms' }}
          >
            <Tooltip title="复制代码">
              <IconButton size="small" aria-label="复制代码" onClick={handleCopy}>
                <Iconify icon="solar:copy-bold" width={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="加入自选股">
              <IconButton size="small" aria-label="加入自选股" onClick={() => onAddToWatchlist(row.tsCode)}>
                <Iconify icon="solar:star-bold" width={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="查看详情">
              <IconButton
                size="small"
                aria-label="查看详情"
                onClick={() => router.push(`/stock/detail?code=${encodeURIComponent(row.tsCode)}`)}
              >
                <Iconify icon="solar:eye-bold" width={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </TableCell>

      {visibleColumns.map((colId) => (
        <TableCell key={colId} align={cellAlign[colId]}>
          {cellMap[colId]}
        </TableCell>
      ))}
    </TableRow>
  );
}
