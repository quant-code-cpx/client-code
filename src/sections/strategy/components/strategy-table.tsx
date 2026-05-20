import type { Strategy } from 'src/api/strategy';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';

import { RouterLink } from 'src/routes/components';

import { fToNow } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { QuoteText } from './quote-text';
import { STRATEGY_TYPE_COLOR, STRATEGY_TYPE_LABEL } from '../constants';

// ----------------------------------------------------------------------

type SortField = 'name' | 'version' | 'totalReturn' | 'sharpeRatio' | 'maxDrawdown' | 'updatedAt';

interface StrategyTableProps {
  strategies: Strategy[];
  onView: (id: string) => void;
  onClone: (strategy: Strategy) => void;
  onDelete: (strategy: Strategy) => void;
}

export function StrategyTable({ strategies, onView, onClone, onDelete }: StrategyTableProps) {
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState<SortField>('updatedAt');

  const handleSort = useCallback(
    (field: SortField) => {
      if (orderBy === field) {
        setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
      } else {
        setOrderBy(field);
        setOrder('desc');
      }
    },
    [orderBy]
  );

  const sorted = [...strategies].sort((a, b) => {
    const dir = order === 'asc' ? 1 : -1;
    switch (orderBy) {
      case 'name':
        return dir * a.name.localeCompare(b.name);
      case 'version':
        return dir * (a.version - b.version);
      case 'totalReturn':
        return (
          dir *
          ((a.lastRunSummary?.totalReturn ?? -Infinity) -
            (b.lastRunSummary?.totalReturn ?? -Infinity))
        );
      case 'sharpeRatio':
        return (
          dir *
          ((a.lastRunSummary?.sharpeRatio ?? -Infinity) -
            (b.lastRunSummary?.sharpeRatio ?? -Infinity))
        );
      case 'maxDrawdown':
        return (
          dir *
          ((a.lastRunSummary?.maxDrawdown ?? -Infinity) -
            (b.lastRunSummary?.maxDrawdown ?? -Infinity))
        );
      case 'updatedAt':
      default:
        return dir * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    }
  });

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox disabled size="small" />
            </TableCell>
            <SortCell
              label="名称"
              field="name"
              orderBy={orderBy}
              order={order}
              onSort={handleSort}
              align="left"
            />
            <TableCell>类型</TableCell>
            <SortCell
              label="版本"
              field="version"
              orderBy={orderBy}
              order={order}
              onSort={handleSort}
              align="right"
            />
            <TableCell>信号</TableCell>
            <SortCell
              label="近一次收益"
              field="totalReturn"
              orderBy={orderBy}
              order={order}
              onSort={handleSort}
              align="right"
            />
            <SortCell
              label="夏普"
              field="sharpeRatio"
              orderBy={orderBy}
              order={order}
              onSort={handleSort}
              align="right"
            />
            <SortCell
              label="最大回撤"
              field="maxDrawdown"
              orderBy={orderBy}
              order={order}
              onSort={handleSort}
              align="right"
            />
            <SortCell
              label="更新时间"
              field="updatedAt"
              orderBy={orderBy}
              order={order}
              onSort={handleSort}
              align="right"
            />
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((strategy) => (
            <StrategyTableRow
              key={strategy.id}
              strategy={strategy}
              onView={onView}
              onClone={onClone}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ----------------------------------------------------------------------

interface SortCellProps {
  label: string;
  field: SortField;
  orderBy: SortField;
  order: 'asc' | 'desc';
  onSort: (f: SortField) => void;
  align?: 'left' | 'right';
}

function SortCell({ label, field, orderBy, order, onSort, align = 'left' }: SortCellProps) {
  return (
    <TableCell align={align}>
      <TableSortLabel
        active={orderBy === field}
        direction={orderBy === field ? order : 'desc'}
        onClick={() => onSort(field)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
}

// ----------------------------------------------------------------------

interface StrategyTableRowProps {
  strategy: Strategy;
  onView: (id: string) => void;
  onClone: (strategy: Strategy) => void;
  onDelete: (strategy: Strategy) => void;
}

function StrategyTableRow({ strategy, onView, onClone, onDelete }: StrategyTableRowProps) {
  const typeColor = STRATEGY_TYPE_COLOR[strategy.strategyType] ?? 'default';
  const typeLabel = STRATEGY_TYPE_LABEL[strategy.strategyType] ?? strategy.strategyType;
  const perf = strategy.lastRunSummary;

  return (
    <TableRow hover sx={{ '&:last-child td': { border: 0 }, height: 44 }}>
      <TableCell padding="checkbox">
        <Checkbox disabled size="small" />
      </TableCell>
      <TableCell>
        <Box
          component={RouterLink}
          href={`/strategy/${strategy.id}`}
          sx={{ textDecoration: 'none', color: 'inherit', '&:hover': { color: 'primary.main' } }}
          onClick={() => onView(strategy.id)}
        >
          <Typography variant="body2" fontWeight="fontWeightMedium" noWrap sx={{ maxWidth: 200 }}>
            {strategy.name}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Label color={typeColor} variant="soft">
          {typeLabel}
        </Label>
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" sx={{ fontFeatureSettings: '"tnum"' }}>
          v{strategy.version}
        </Typography>
      </TableCell>
      <TableCell>
        {strategy.hasActiveSignal === true ? (
          <Label color="success" variant="soft" sx={{ fontSize: 11 }}>
            ACTIVE
          </Label>
        ) : (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            —
          </Typography>
        )}
      </TableCell>
      <TableCell align="right">
        <QuoteText value={perf?.totalReturn} variant="body2" />
      </TableCell>
      <TableCell align="right">
        {perf?.sharpeRatio != null ? (
          <Typography
            variant="body2"
            sx={{
              fontFeatureSettings: '"tnum"',
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'right',
            }}
          >
            {perf.sharpeRatio.toFixed(2)}
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'right' }}>
            —
          </Typography>
        )}
      </TableCell>
      <TableCell align="right">
        <QuoteText value={perf?.maxDrawdown} variant="body2" />
      </TableCell>
      <TableCell align="right">
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {fToNow(strategy.updatedAt)}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <IconButton size="small" onClick={() => onView(strategy.id)} title="查看">
            <Iconify icon="solar:eye-bold" width={16} />
          </IconButton>
          <IconButton size="small" onClick={() => onClone(strategy)} title="克隆">
            <Iconify icon="solar:copy-bold" width={16} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onDelete(strategy)}
            title="删除"
            sx={{ color: 'error.main' }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" width={16} />
          </IconButton>
        </Box>
      </TableCell>
    </TableRow>
  );
}
