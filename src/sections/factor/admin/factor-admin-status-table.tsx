import type { PrecomputeStatusItem } from 'src/api/factor';

import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableSortLabel from '@mui/material/TableSortLabel';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { applyAdminFilters } from './factor-admin-filter-bar';
import {
  SOURCE_LABELS,
  CATEGORY_LABELS,
  ADMIN_COMPUTE_STATUS_META,
} from '../constants';

import type { AdminStatusFilters } from './factor-admin-filter-bar';

type SortField = 'factorName' | 'staleDays' | 'lastComputeDate' | 'coverageRate' | 'rowCount';
type SortOrder = 'asc' | 'desc';

type Props = {
  items: PrecomputeStatusItem[];
  loading: boolean;
  error: string;
  filters: AdminStatusFilters;
  selected: PrecomputeStatusItem[];
  onSelectedChange: (next: PrecomputeStatusItem[]) => void;
  onPrecomputeOne?: (factorName: string) => void;
  onRefetch: () => void;
};

type SortHeadProps = {
  field: SortField;
  label: string;
  activeField: SortField;
  order: SortOrder;
  onSort: (field: SortField) => void;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function SortHead({ field, label, activeField, order, onSort }: SortHeadProps) {
  return (
    <TableSortLabel
      active={activeField === field}
      direction={activeField === field ? order : 'asc'}
      onClick={() => onSort(field)}
    >
      {label}
    </TableSortLabel>
  );
}

function compareNullableNumber(
  first: number | null | undefined,
  second: number | null | undefined,
  order: SortOrder
) {
  if (first == null && second == null) return 0;
  if (first == null) return 1;
  if (second == null) return -1;
  return (first - second) * (order === 'asc' ? 1 : -1);
}

export function FactorAdminStatusTable({
  items,
  loading,
  error,
  filters,
  selected,
  onSelectedChange,
  onPrecomputeOne,
  onRefetch,
}: Props) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortField, setSortField] = useState<SortField>('staleDays');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortOrder((previous) => (previous === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortOrder('desc');
      }
    },
    [sortField]
  );

  const filtered = useMemo(() => applyAdminFilters(items, filters), [items, filters]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((first, second) => {
        if (sortField === 'staleDays') {
          return compareNullableNumber(first.staleDays, second.staleDays, sortOrder);
        }
        if (sortField === 'coverageRate') {
          return compareNullableNumber(first.coverageRate, second.coverageRate, sortOrder);
        }
        if (sortField === 'rowCount') {
          return compareNullableNumber(first.rowCount, second.rowCount, sortOrder);
        }
        const multiplier = sortOrder === 'asc' ? 1 : -1;
        if (sortField === 'lastComputeDate') {
          if (!first.lastComputeDate && !second.lastComputeDate) return 0;
          if (!first.lastComputeDate) return 1;
          if (!second.lastComputeDate) return -1;
          return first.lastComputeDate.localeCompare(second.lastComputeDate) * multiplier;
        }
        return first.factorName.localeCompare(second.factorName) * multiplier;
      }),
    [filtered, sortField, sortOrder]
  );

  const paginated = useMemo(
    () => sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sorted, page, rowsPerPage]
  );
  const selectedNames = useMemo(
    () => new Set(selected.map((item) => item.factorName)),
    [selected]
  );

  const handleSelectAll = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        onSelectedChange([
          ...selected,
          ...paginated.filter((item) => !selectedNames.has(item.factorName)),
        ]);
      } else {
        onSelectedChange(
          selected.filter(
            (item) => !paginated.some((pageItem) => pageItem.factorName === item.factorName)
          )
        );
      }
    },
    [paginated, selected, selectedNames, onSelectedChange]
  );

  const handleSelectRow = useCallback(
    (item: PrecomputeStatusItem, checked: boolean) => {
      onSelectedChange(
        checked
          ? [...selected, item]
          : selected.filter((selectedItem) => selectedItem.factorName !== item.factorName)
      );
    },
    [selected, onSelectedChange]
  );

  if (loading && items.length === 0) {
    return <Skeleton variant="rectangular" height={360} />;
  }

  if (error && items.length === 0) {
    return (
      <Alert
        severity="error"
        action={
          <Button size="small" color="inherit" onClick={onRefetch}>
            重试
          </Button>
        }
        sx={{ m: 2 }}
      >
        {error}
      </Alert>
    );
  }

  if (items.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          暂无因子数据，请前往{' '}
          <Link href="/factor/library" underline="hover">
            因子库
          </Link>{' '}
          添加。
        </Typography>
      </Box>
    );
  }

  const allPageSelected =
    paginated.length > 0 && paginated.every((item) => selectedNames.has(item.factorName));
  const somePageSelected =
    paginated.some((item) => selectedNames.has(item.factorName)) && !allPageSelected;
  const sortHeadProps = { activeField: sortField, order: sortOrder, onSort: handleSort };

  return (
    <Box>
      {error ? (
        <Alert severity="warning" sx={{ mx: 2, mb: 1 }}>
          {error}，当前显示上次成功加载的数据。
        </Alert>
      ) : null}
      <TableContainer sx={{ borderTop: 1, borderColor: 'divider' }}>
        <Table stickyHeader sx={{ minWidth: 1280, tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow sx={{ height: 44 }}>
              <TableCell padding="checkbox" sx={{ width: 48 }}>
                <Checkbox
                  size="small"
                  checked={allPageSelected}
                  indeterminate={somePageSelected}
                  onChange={handleSelectAll}
                  slotProps={{ input: { 'aria-label': '选择当前页因子' } }}
                />
              </TableCell>
              <TableCell sx={{ width: 160 }}>
                <SortHead field="factorName" label="因子标识" {...sortHeadProps} />
              </TableCell>
              <TableCell sx={{ width: 130 }}>中文名</TableCell>
              <TableCell sx={{ width: 88 }}>状态</TableCell>
              <TableCell align="right" sx={{ width: 96 }}>
                <SortHead field="staleDays" label="滞后天数" {...sortHeadProps} />
              </TableCell>
              <TableCell sx={{ width: 120 }}>
                <SortHead field="lastComputeDate" label="最新计算日" {...sortHeadProps} />
              </TableCell>
              <TableCell align="right" sx={{ width: 92 }}>
                <SortHead field="coverageRate" label="覆盖度" {...sortHeadProps} />
              </TableCell>
              <TableCell align="right" sx={{ width: 126 }}>
                <SortHead field="rowCount" label="覆盖交易日数" {...sortHeadProps} />
              </TableCell>
              <TableCell sx={{ width: 90 }}>分类</TableCell>
              <TableCell sx={{ width: 80 }}>来源</TableCell>
              <TableCell align="center" sx={{ width: 72 }}>
                启用
              </TableCell>
              <TableCell sx={{ width: 104 }}>操作</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    当前筛选条件下无结果
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {paginated.map((item) => {
              const isSelected = selectedNames.has(item.factorName);
              const statusMeta = ADMIN_COMPUTE_STATUS_META[item.status] ?? {
                label: item.status,
                color: 'default' as const,
              };

              return (
                <TableRow key={item.factorName} hover selected={isSelected} sx={{ height: 52 }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={isSelected}
                      onChange={(event) => handleSelectRow(item, event.target.checked)}
                      slotProps={{ input: { 'aria-label': `选择 ${item.factorName}` } }}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={item.factorName} placement="top-start">
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ fontFamily: 'monospace', fontSize: 13 }}
                      >
                        {item.factorName}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {item.factorLabel || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Label color={statusMeta.color} variant="soft">
                      {statusMeta.label}
                    </Label>
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {item.staleDays ?? '—'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {item.lastComputeDate
                      ? `${item.lastComputeDate.slice(0, 4)}-${item.lastComputeDate.slice(4, 6)}-${item.lastComputeDate.slice(6, 8)}`
                      : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {item.coverageRate == null ? '—' : `${(item.coverageRate * 100).toFixed(1)}%`}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {Number.isFinite(item.rowCount) ? item.rowCount.toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    {item.category ? (
                      <Chip label={CATEGORY_LABELS[item.category]} size="small" variant="outlined" />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {item.sourceType ? <Chip label={SOURCE_LABELS[item.sourceType]} size="small" /> : '—'}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="服务端未开放启用/禁用">
                      <span>
                        <Switch
                          size="small"
                          checked={item.isEnabled ?? false}
                          disabled
                          slotProps={{
                            input: { 'aria-label': `${item.factorName} 启用状态不可用` },
                          }}
                        />
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="预计算今日">
                      <IconButton
                        size="small"
                        onClick={() => onPrecomputeOne?.(item.factorName)}
                        aria-label={`预计算今日 ${item.factorName}`}
                      >
                        <Iconify icon="solar:play-circle-bold" width={18} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={PAGE_SIZE_OPTIONS}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        labelRowsPerPage="每页"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
      />
    </Box>
  );
}
