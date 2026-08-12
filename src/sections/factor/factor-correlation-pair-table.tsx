import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import type { CorrelationPair } from './factor-correlation-helpers';

// ----------------------------------------------------------------------

type Props = {
  pairs: CorrelationPair[];
  threshold: number;
  highOnly: boolean;
  onToggleHighOnly: (value: boolean) => void;
  onSelect: (pair: CorrelationPair) => void;
  onOrthogonalize: (pair: CorrelationPair) => void;
  onRemoveFactor: (factorName: string) => void;
};

const colorOfRho = (rho: number) => {
  if (rho > 0) return 'error.main';
  if (rho < 0) return 'info.main';
  return 'text.disabled';
};

export function FactorCorrelationPairTable({
  pairs,
  threshold,
  highOnly,
  onToggleHighOnly,
  onSelect,
  onOrthogonalize,
  onRemoveFactor,
}: Props) {
  const filtered = highOnly ? pairs.filter((p) => p.abs >= threshold) : pairs;

  return (
    <Card>
      <CardHeader
        title="因子对（按 |ρ| 倒序）"
        subheader={`共 ${pairs.length} 对${highOnly ? `，仅显示 |ρ| ≥ ${threshold.toFixed(2)}` : ''}`}
        action={
          <Chip
            size="small"
            label={highOnly ? '只看高相关' : '查看全部'}
            color={highOnly ? 'warning' : 'default'}
            onClick={() => onToggleHighOnly(!highOnly)}
            sx={{ cursor: 'pointer' }}
          />
        }
      />

      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body2" color="text.secondary">
            {highOnly
              ? `当前阈值 |ρ| ≥ ${threshold.toFixed(2)} 下未发现冗余因子。`
              : '暂无可计算的因子对。'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ maxHeight: 480, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>因子对</TableCell>
                <TableCell align="right">ρ</TableCell>
                <TableCell align="right">n</TableCell>
                <TableCell align="right" sx={{ width: 120 }}>
                  操作
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((pair) => (
                <TableRow
                  key={`${pair.i}-${pair.j}`}
                  hover
                  role="button"
                  tabIndex={0}
                  aria-label={`查看因子对 ${pair.labelA} 与 ${pair.labelB}`}
                  sx={{
                    cursor: 'pointer',
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: -2,
                    },
                  }}
                  onClick={() => onSelect(pair)}
                  onKeyDown={(event) => {
                    if (
                      event.target !== event.currentTarget ||
                      (event.key !== 'Enter' && event.key !== ' ')
                    )
                      return;
                    event.preventDefault();
                    onSelect(pair);
                  }}
                >
                  <TableCell>
                    <Stack direction="column" spacing={0.25}>
                      <Typography variant="body2">
                        {pair.labelA} × {pair.labelB}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pair.factorA} × {pair.factorB}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: pair.abs >= threshold ? 600 : 400,
                        color: colorOfRho(pair.rho),
                      }}
                    >
                      {pair.rho > 0 ? '+' : ''}
                      {pair.rho.toFixed(3)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {pair.n !== null ? pair.n.toLocaleString() : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="正交化（残差化）">
                      <IconButton
                        size="small"
                        onClick={() => onOrthogonalize(pair)}
                        disabled={pair.abs < threshold}
                        aria-label="正交化（残差化）"
                      >
                        <Iconify icon="solar:refresh-bold" width={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={`移除因子 ${pair.labelA}`}>
                      <IconButton
                        size="small"
                        onClick={() => onRemoveFactor(pair.factorA)}
                        aria-label="移除因子"
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Card>
  );
}
