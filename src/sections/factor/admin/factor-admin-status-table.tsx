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
import LinearProgress from '@mui/material/LinearProgress';
import TablePagination from '@mui/material/TablePagination';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { applyAdminFilters } from './factor-admin-filter-bar';
import {
  SOURCE_LABELS,
  coverageColor,
  staleDaysColor,
  CATEGORY_LABELS,
  ADMIN_COMPUTE_STATUS_META,
} from '../constants';

import type { AdminStatusFilters } from './factor-admin-filter-bar';

// ─── Types ────────────────────────────────────────────────────

type SortField = 'factorName' | 'staleDays' | 'lastComputeDate' | 'coverageRate' | 'rowCount';
type SortOrder = 'asc' | 'desc';

type Props = {
  items: PrecomputeStatusItem[];
  loading: boolean;
  error: string;
  filters: AdminStatusFilters;
  selected: PrecomputeStatusItem[];
  onSelectedChange: (next: PrecomputeStatusItem[]) => void;
  onToggleEnable?: (factorName: string, isEnabled: boolean) => void;
  onPrecomputeOne?: (factorName: string) => void;
  onRefetch: () => void;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];

// ─── Column header tooltip ────────────────────────────────────

function ColTip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Tooltip title={title} placement="top" arrow>
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        {children}
        <Iconify icon="solar:info-circle-bold" width={14} sx={{ opacity: 0.5 }} />
      </Box>
    </Tooltip>
  );
}

// ─── Component ────────────────────────────────────────────────

export function FactorAdminStatusTable({
  items,
  loading,
  error,
  filters,
  selected,
  onSelectedChange,
  onToggleEnable,
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
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortOrder('desc');
      }
    },
    [sortField]
  );

  const filtered = useMemo(() => applyAdminFilters(items, filters), [items, filters]);

  const sorted = useMemo(() => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortField) {
        case 'staleDays': {
          const ad = a.staleDays ?? 999;
          const bd = b.staleDays ?? 999;
          return (ad - bd) * multiplier;
        }
        case 'lastComputeDate': {
          const av = a.lastComputeDate ?? '';
          const bv = b.lastComputeDate ?? '';
          return av.localeCompare(bv) * multiplier;
        }
        case 'coverageRate': {
          const ac = a.coverageRate ?? -1;
          const bc = b.coverageRate ?? -1;
          return (ac - bc) * multiplier;
        }
        case 'rowCount':
          return (a.rowCount - b.rowCount) * multiplier;
        case 'factorName':
          return a.factorName.localeCompare(b.factorName) * multiplier;
        default:
          return 0;
      }
    });
  }, [filtered, sortField, sortOrder]);

  const paginated = useMemo(
    () => sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sorted, page, rowsPerPage]
  );

  const selectedNames = useMemo(() => new Set(selected.map((s) => s.factorName)), [selected]);

  const handleSelectAll = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        onSelectedChange([
          ...selected,
          ...paginated.filter((r) => !selectedNames.has(r.factorName)),
        ]);
      } else {
        onSelectedChange(
          selected.filter((s) => !paginated.some((p) => p.factorName === s.factorName))
        );
      }
    },
    [paginated, selected, selectedNames, onSelectedChange]
  );

  const handleSelectRow = useCallback(
    (item: PrecomputeStatusItem, checked: boolean) => {
      if (checked) {
        onSelectedChange([...selected, item]);
      } else {
        onSelectedChange(selected.filter((s) => s.factorName !== item.factorName));
      }
    },
    [selected, onSelectedChange]
  );

  const SortHead = ({ field, label }: { field: SortField; label: string }) => (
    <TableSortLabel
      active={sortField === field}
      direction={sortField === field ? sortOrder : 'asc'}
      onClick={() => handleSort(field)}
    >
      {label}
    </TableSortLabel>
  );

  if (loading) {
    return <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />;
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button size="small" color="inherit" onClick={onRefetch}>
            重试
          </Button>
        }
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
    paginated.length > 0 && paginated.every((r) => selectedNames.has(r.factorName));
  const somePageSelected =
    paginated.some((r) => selectedNames.has(r.factorName)) && !allPageSelected;

  return (
    <Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={allPageSelected}
                  indeterminate={somePageSelected}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>
                <SortHead field="factorName" label="因子标识" />
              </TableCell>
              <TableCell>中文名</TableCell>
              <TableCell>状态</TableCell>
              <TableCell align="right">
                <SortHead field="staleDays" label="滞后天数" />
              </TableCell>
              <TableCell>
                <SortHead field="lastComputeDate" label="最新计算日" />
              </TableCell>
              <TableCell>
                <ColTip title="覆盖度 = 非空值数 / 全量股票池">
                  <SortHead field="coverageRate" label="覆盖度" />
                </ColTip>
              </TableCell>
              <TableCell align="right">
                <ColTip title="因子快照总行数（股票 × 时间颗粒度）">
                  <SortHead field="rowCount" label="快照行数" />
                </ColTip>
              </TableCell>
              <TableCell>分类</TableCell>
              <TableCell>来源</TableCell>
              <TableCell>启用</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginated.map((item) => {
              const isSelected = selectedNames.has(item.factorName);
              const statusMeta = ADMIN_COMPUTE_STATUS_META[item.status] ?? {
                label: item.status,
                color: 'default' as const,
              };

              return (
                <TableRow
                  key={item.factorName}
                  hover
                  selected={isSelected}
                  sx={{ '& .row-actions': { opacity: 0 }, '&:hover .row-actions': { opacity: 1 } }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={isSelected}
                      onChange={(e) => handleSelectRow(item, e.target.checked)}
                    />
                  </TableCell>

                  {/* 因子标识 */}
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {item.factorName}
                  </TableCell>

                  {/* 中文名 */}
                  <TableCell>{item.factorLabel}</TableCell>

                  {/* 状态 */}
                  <TableCell>
                    <Label color={statusMeta.color} variant="soft">
                      {statusMeta.label}
                    </Label>
                  </TableCell>

                  {/* 滞后天数 */}
                  <TableCell align="right">
                    {item.staleDays == null ? (
                      <Typography variant="body2" color="text.disabled">
                        —
                      </Typography>
                    ) : (
                      <Label color={staleDaysColor(item.staleDays)} variant="soft">
                        {item.staleDays}
                      </Label>
                    )}
                  </TableCell>

                  {/* 最新计算日 */}
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {item.lastComputeDate
                      ? `${item.lastComputeDate.slice(0, 4)}-${item.lastComputeDate.slice(4, 6)}-${item.lastComputeDate.slice(6, 8)}`
                      : '—'}
                  </TableCell>

                  {/* 覆盖度 */}
                  <TableCell sx={{ minWidth: 90 }}>
                    {item.coverageRate == null ? (
                      <Typography variant="body2" color="text.disabled">
                        —
                      </Typography>
                    ) : (
                      <Box>
                        <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {(item.coverageRate * 100).toFixed(1)}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={item.coverageRate * 100}
                          color={
                            coverageColor(item.coverageRate) as 'success' | 'warning' | 'error'
                          }
                          sx={{ height: 4, borderRadius: 2, mt: 0.25 }}
                        />
                      </Box>
                    )}
                  </TableCell>

                  {/* 快照行数 */}
                  <TableCell
                    align="right"
                    sx={{
                      fontVariantNumeric: 'tabular-nums',
                      fontFamily: 'monospace',
                      fontSize: 13,
                    }}
                  >
                    {item.rowCount.toLocaleString()}
                  </TableCell>

                  {/* 分类 */}
                  <TableCell>
                    {item.category ? (
                      <Chip
                        label={CATEGORY_LABELS[item.category]}
                        size="small"
                        variant="outlined"
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>

                  {/* 来源 */}
                  <TableCell>
                    {item.sourceType ? (
                      <Chip label={SOURCE_LABELS[item.sourceType]} size="small" />
                    ) : (
                      '—'
                    )}
                  </TableCell>

                  {/* 启用 */}
                  <TableCell>
                    {item.isEnabled != null ? (
                      <Switch
                        size="small"
                        checked={item.isEnabled}
                        onChange={(e) => onToggleEnable?.(item.factorName, e.target.checked)}
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>

                  {/* 操作（hover 显现） */}
                  <TableCell>
                    <Box
                      className="row-actions"
                      sx={{ display: 'flex', gap: 0.5, transition: 'opacity 150ms' }}
                    >
                      <Tooltip title="预计算今日">
                        <IconButton size="small" onClick={() => onPrecomputeOne?.(item.factorName)} aria-label="预计算今日">
                          <Iconify icon="solar:play-circle-bold" width={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>
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
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        labelRowsPerPage="每页"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
      />
    </Box>
  );
}
