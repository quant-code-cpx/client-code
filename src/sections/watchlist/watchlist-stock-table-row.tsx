import type { WatchlistStock } from 'src/api/watchlist';

import { useState } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { fWanYi, fPctChg } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { computeTargetDistance } from './utils';

// ----------------------------------------------------------------------

const COLUMN_COUNT = 11;

type WatchlistStockTableRowProps = {
  row: WatchlistStock;
  selected: boolean;
  dragDisabled?: boolean;
  onSelect: (id: number) => void;
  onEdit: (row: WatchlistStock) => void;
  onRemove: (row: WatchlistStock) => void;
};

export function WatchlistStockTableRow({
  row,
  selected,
  dragDisabled = false,
  onSelect,
  onEdit,
  onRemove,
}: WatchlistStockTableRowProps) {
  const [open, setOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: dragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasDetail = !!(row.notes || (row.tags && row.tags.length > 0));

  const { quote } = row;
  const stockName = row.stockName?.trim();
  const close = quote?.close ?? null;
  const pctChg = quote?.pctChg ?? null;
  const vol = quote?.vol ?? null;
  const pe = quote?.pe ?? null;
  const pb = quote?.pb ?? null;

  const pctChgColor =
    pctChg === null
      ? 'text.secondary'
      : pctChg > 0
        ? 'error.main'
        : pctChg < 0
          ? 'success.main'
          : 'text.secondary';

  const distance = computeTargetDistance(row);
  const distanceColor = distance ? (distance.hit ? 'error.main' : 'text.primary') : 'text.disabled';
  const quoteStatus = !quote || close == null ? 'MISSING' : distance?.hit ? 'HIT' : 'OK';

  const dragSx = {
    width: 36,
    px: 1,
    cursor: dragDisabled ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
    color: 'text.disabled',
  };
  const dragTooltip = dragDisabled ? '清除筛选后可拖拽排序' : '拖拽排序';

  return (
    <>
      <TableRow ref={setNodeRef} style={style} hover selected={selected}>
        <TableCell
          sx={dragSx}
          {...(dragDisabled ? {} : attributes)}
          {...(dragDisabled ? {} : listeners)}
        >
          <Tooltip title={dragTooltip}>
            <Box component="span" sx={{ display: 'inline-flex' }}>
              <Iconify icon="solar:menu-dots-bold" sx={{ display: 'block' }} />
            </Box>
          </Tooltip>
        </TableCell>

        <TableCell padding="checkbox">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Checkbox checked={selected} onChange={() => onSelect(row.id)} size="small" />
            {hasDetail && (
              <IconButton size="small" onClick={() => setOpen((v) => !v)}>
                <Iconify
                  icon={open ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
                  width={14}
                />
              </IconButton>
            )}
          </Box>
        </TableCell>

        <TableCell>
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography
              component={RouterLink}
              href={`/stock/detail?code=${encodeURIComponent(row.tsCode)}`}
              variant="body2"
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline', color: 'primary.main' },
              }}
            >
              {stockName || row.tsCode}
            </Typography>
            {stockName && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {row.tsCode}
              </Typography>
            )}
          </Stack>
        </TableCell>

        <TableCell align="right">
          <NumericCell value={close} render={(v) => v.toFixed(2)} />
        </TableCell>

        <TableCell align="right">
          {pctChg !== null ? (
            <Typography variant="body2" sx={{ color: pctChgColor, fontWeight: 500 }}>
              {fPctChg(pctChg)}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              -
            </Typography>
          )}
        </TableCell>

        <TableCell align="right">
          <NumericCell value={vol} render={(v) => fWanYi(v, '手')} />
        </TableCell>

        <TableCell align="right">
          <NumericCell value={pe} render={(v) => v.toFixed(2)} />
        </TableCell>

        <TableCell align="right">
          <NumericCell value={pb} render={(v) => v.toFixed(2)} />
        </TableCell>

        <TableCell align="right">
          <NumericCell value={row.targetPrice} render={(v) => v.toFixed(2)} />
        </TableCell>

        <TableCell align="right">
          {distance ? (
            <Typography variant="body2" sx={{ color: distanceColor, fontWeight: 500 }}>
              {distance.hit
                ? '已触达'
                : `${distance.pct >= 0 ? '+' : ''}${distance.pct.toFixed(2)}%`}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              -
            </Typography>
          )}
        </TableCell>

        <TableCell align="right">
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5 }}>
            {quoteStatus === 'HIT' && (
              <Tooltip title="现价已达到或超过目标价">
                <Box component="span" sx={{ display: 'inline-flex' }}>
                  <Label color="error" variant="soft">
                    触达
                  </Label>
                </Box>
              </Tooltip>
            )}
            {quoteStatus === 'MISSING' && (
              <Tooltip title="暂无最新行情，可能停牌或数据未同步">
                <Box component="span" sx={{ display: 'inline-flex' }}>
                  <Label color="warning" variant="soft">
                    缺失
                  </Label>
                </Box>
              </Tooltip>
            )}
            <Tooltip title="编辑">
              <IconButton size="small" onClick={() => onEdit(row)}>
                <Iconify icon="solar:pen-bold" width={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="从自选组移除">
              <IconButton size="small" sx={{ color: 'error.main' }} onClick={() => onRemove(row)}>
                <Iconify icon="solar:trash-bin-trash-bold" width={16} />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>

      {hasDetail && (
        <TableRow>
          <TableCell colSpan={COLUMN_COUNT} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ py: 1.5, px: 1 }}>
                {row.notes && (
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}
                  >
                    备注：{row.notes}
                  </Typography>
                )}
                {row.tags && row.tags.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {row.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                )}
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ----------------------------------------------------------------------

function NumericCell({
  value,
  render,
}: {
  value: number | string | null | undefined;
  render: (value: number) => string;
}) {
  const num = typeof value === 'string' ? Number(value) : value;
  if (num === null || num === undefined || Number.isNaN(num)) {
    return (
      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
        -
      </Typography>
    );
  }
  return <Typography variant="body2">{render(num)}</Typography>;
}
