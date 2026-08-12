import type { LimitListItem } from 'src/api/alert';

import { useMemo, useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import { useTheme } from '@mui/material/styles';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';

import { useRouter } from 'src/routes/hooks';

import { fNumber, fPercent } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ColoredNumber } from 'src/components/colored-number';

import {
  getStreakDays,
  LIMIT_TYPE_COLOR,
  LIMIT_TYPE_LABEL,
  resolvePctChgLimit,
  SEAL_PATTERN_LABEL,
  SEAL_PATTERN_COLOR,
  formatFirstSealTime,
  STREAK_STATUS_LABEL,
  STREAK_STATUS_COLOR,
} from './utils/limit-glossary';

// ----------------------------------------------------------------------

type SortKey = 'streak' | 'pctChg' | 'sealAmount' | 'sealRatio';

type Props = {
  items: LimitListItem[];
  onSelect?: (item: LimitListItem) => void;
  onCreateAlert?: (item: LimitListItem) => void;
};

const ROW_HEIGHT = 52;
const VIRTUAL_THRESHOLD = 100;
const VIRTUAL_HEIGHT = 600;

function compareBy(a: LimitListItem, b: LimitListItem, key: SortKey): number {
  switch (key) {
    case 'streak':
      return getStreakDays(a) - getStreakDays(b);
    case 'pctChg':
      return (a.pctChg ?? 0) - (b.pctChg ?? 0);
    case 'sealAmount':
      return (a.sealAmount ?? 0) - (b.sealAmount ?? 0);
    case 'sealRatio':
      return (a.sealRatio ?? 0) - (b.sealRatio ?? 0);
    default:
      return 0;
  }
}

export function AlertLimitListTableV2({ items, onSelect, onCreateAlert }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortKey>('streak');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const list = [...items];
    list.sort((a, b) => {
      const diff = compareBy(a, b, sortBy);
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

  const useVirtual = sorted.length >= VIRTUAL_THRESHOLD;

  return (
    <Card>
      <TableContainer
        sx={{
          maxHeight: useVirtual ? VIRTUAL_HEIGHT : 'unset',
          overflow: useVirtual ? 'auto' : 'unset',
        }}
      >
        <Table size="small" stickyHeader={useVirtual}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 160 }}>股票</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>板高</TableCell>
              <TableCell sortDirection={sortBy === 'pctChg' ? order : false}>
                <TableSortLabel
                  active={sortBy === 'pctChg'}
                  direction={sortBy === 'pctChg' ? order : 'desc'}
                  onClick={() => handleSort('pctChg')}
                >
                  涨跌幅
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'streak' ? order : false}>
                <TableSortLabel
                  active={sortBy === 'streak'}
                  direction={sortBy === 'streak' ? order : 'desc'}
                  onClick={() => handleSort('streak')}
                >
                  连板/状态
                </TableSortLabel>
              </TableCell>
              <TableCell>封板形态</TableCell>
              <TableCell sortDirection={sortBy === 'sealAmount' ? order : false}>
                <TableSortLabel
                  active={sortBy === 'sealAmount'}
                  direction={sortBy === 'sealAmount' ? order : 'desc'}
                  onClick={() => handleSort('sealAmount')}
                >
                  封单额(万)
                </TableSortLabel>
              </TableCell>
              <TableCell>封板节奏</TableCell>
              <TableCell align="right" sx={{ minWidth: 96 }}>
                操作
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">该日无封板股票</Typography>
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((row) => {
                const streakDays = getStreakDays(row);
                const limit = resolvePctChgLimit(row);
                const status = row.streakStatus;
                const sealPattern = row.sealPattern;
                const sealPatternLabel = sealPattern ? SEAL_PATTERN_LABEL[sealPattern] : null;
                return (
                  <TableRow
                    key={`${row.tsCode}-${row.limitType}`}
                    hover
                    role={onSelect ? 'button' : undefined}
                    tabIndex={onSelect ? 0 : undefined}
                    aria-label={onSelect ? `查看 ${row.stockName} 封板详情` : undefined}
                    sx={{
                      cursor: onSelect ? 'pointer' : 'default',
                      height: ROW_HEIGHT,
                      '&:hover': {
                        bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.04),
                      },
                      '&:hover .row-actions': { opacity: 1 },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      },
                    }}
                    onClick={() => onSelect?.(row)}
                    onKeyDown={(event) => {
                      if (
                        !onSelect ||
                        event.target !== event.currentTarget ||
                        (event.key !== 'Enter' && event.key !== ' ')
                      )
                        return;
                      event.preventDefault();
                      onSelect(row);
                    }}
                  >
                    <TableCell>
                      <Typography variant="subtitle2">{row.stockName}</Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {row.tsCode}
                        </Typography>
                        {row.industry ? (
                          <Chip
                            label={row.industry}
                            size="small"
                            variant="outlined"
                            sx={{ height: 16, fontSize: 12 }}
                          />
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Label color={LIMIT_TYPE_COLOR[row.limitType]}>
                        {LIMIT_TYPE_LABEL[row.limitType]}
                      </Label>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={`涨跌停板上限 ${limit}%`} arrow>
                        <Chip
                          label={`${limit}cm`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 18, fontSize: 12 }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <ColoredNumber value={row.pctChg} format="percent" decimals={2} />
                    </TableCell>
                    <TableCell>
                      {row.limitType === 'BROKEN' ? (
                        <Label color="warning" variant="outlined">
                          {row.openTimes != null ? `开板 ${row.openTimes} 次` : '炸板'}
                        </Label>
                      ) : (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Label
                            color={
                              streakDays >= 5 ? 'error' : streakDays >= 3 ? 'warning' : 'default'
                            }
                            variant={streakDays >= 3 ? 'filled' : 'outlined'}
                          >
                            {streakDays}
                          </Label>
                          {status != null && STREAK_STATUS_LABEL[status] ? (
                            <Tooltip title={STREAK_STATUS_LABEL[status]} arrow>
                              <Label color={STREAK_STATUS_COLOR[status]} variant="outlined">
                                {STREAK_STATUS_LABEL[status]}
                              </Label>
                            </Tooltip>
                          ) : null}
                        </Stack>
                      )}
                    </TableCell>
                    <TableCell>
                      {sealPattern && sealPatternLabel ? (
                        <Label color={SEAL_PATTERN_COLOR[sealPattern]} variant="outlined">
                          {sealPatternLabel}
                        </Label>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontFeatureSettings: '"tnum"' }}>
                          {row.sealAmount != null ? fNumber(Math.round(row.sealAmount)) : '—'}
                        </Typography>
                        {row.sealRatio != null ? (
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', fontFeatureSettings: '"tnum"' }}
                          >
                            占流通 {fPercent(row.sealRatio * 100)}
                          </Typography>
                        ) : null}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {formatFirstSealTime(row.firstSealTime)}
                        {(row.sealCount ?? 0) > 1 ? ` · 封 ${row.sealCount} 次` : ''}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Stack
                        direction="row"
                        spacing={0.25}
                        justifyContent="flex-end"
                        className="row-actions"
                        sx={{
                          opacity: 0,
                          transition: 'opacity 200ms',
                        }}
                      >
                        <Tooltip title="创建预警" arrow>
                          <IconButton
                            size="small"
                            aria-label="创建预警"
                            onClick={() => onCreateAlert?.(row)}
                          >
                            <Iconify icon="solar:bell-bold" width={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="查看详情" arrow>
                          <IconButton
                            size="small"
                            aria-label="查看详情"
                            onClick={() => router.push(`/stock/detail?code=${row.tsCode}`)}
                          >
                            <Iconify icon="solar:graph-up-bold" width={16} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
