import type { WatchlistStock } from 'src/api/watchlist';

import { useState } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { fWanYi, fPctChg } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type WatchlistStockTableRowProps = {
  row: WatchlistStock;
  selected: boolean;
  onSelect: (id: number) => void;
  onEdit: (row: WatchlistStock) => void;
  onRemove: (id: number) => void;
};

export function WatchlistStockTableRow({
  row,
  selected,
  onSelect,
  onEdit,
  onRemove,
}: WatchlistStockTableRowProps) {
  const [open, setOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasDetail = !!(row.notes || (row.tags && row.tags.length > 0));

  const { quote } = row;
  const pctChg = quote?.pctChg ?? null;
  const pctChgColor =
    pctChg === null ? 'text.secondary' : pctChg > 0 ? 'error.main' : pctChg < 0 ? 'success.main' : 'text.secondary';

  return (
    <>
      <TableRow ref={setNodeRef} style={style} hover selected={selected}>
        {/* 拖拽手柄 */}
        <TableCell sx={{ width: 36, px: 1, cursor: isDragging ? 'grabbing' : 'grab' }} {...attributes} {...listeners}>
          <Iconify icon="solar:menu-dots-bold" sx={{ color: 'text.disabled', display: 'block' }} />
        </TableCell>

        <TableCell padding="checkbox">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Checkbox
              checked={selected}
              onChange={() => onSelect(row.id)}
              size="small"
            />
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
            {row.tsCode}
          </Typography>
        </TableCell>

        <TableCell align="right">
          {quote ? (
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {quote.close.toFixed(2)}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              -
            </Typography>
          )}
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
          {quote ? (
            <Typography variant="body2">{fWanYi(quote.vol, '手')}</Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              -
            </Typography>
          )}
        </TableCell>

        <TableCell align="right">
          {quote?.pe != null ? (
            <Typography variant="body2">{quote.pe.toFixed(2)}</Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              -
            </Typography>
          )}
        </TableCell>

        <TableCell align="right">
          {quote?.pb != null ? (
            <Typography variant="body2">{quote.pb.toFixed(2)}</Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              -
            </Typography>
          )}
        </TableCell>

        <TableCell align="right">
          {row.targetPrice != null ? (
            <Typography variant="body2">{row.targetPrice.toFixed(2)}</Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              -
            </Typography>
          )}
        </TableCell>

        <TableCell align="right">
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
            <IconButton size="small" onClick={() => onEdit(row)}>
              <Iconify icon="solar:pen-bold" width={16} />
            </IconButton>
            <IconButton size="small" sx={{ color: 'error.main' }} onClick={() => onRemove(row.id)}>
              <Iconify icon="solar:trash-bin-trash-bold" width={16} />
            </IconButton>
          </Box>
        </TableCell>
      </TableRow>

      {hasDetail && (
        <TableRow>
          <TableCell colSpan={10} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ py: 1.5, px: 1 }}>
                {row.notes && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
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

