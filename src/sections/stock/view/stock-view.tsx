import type { AreaItem, IndustryItem } from 'src/api/screener';
import type { StockListItem, StockListQuery } from 'src/api/stock';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { stockApi } from 'src/api/stock';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchAreas, fetchIndustries } from 'src/api/screener';

import { Scrollbar } from 'src/components/scrollbar';

import { StockTableRow } from '../stock-table-row';
import { ScreenerDialog } from '../screener-dialog';
import { StockTableHead } from '../stock-table-head';
import { StockEmptyState } from '../stock-empty-state';
import { StockSkeletonRows } from '../stock-skeleton-rows';
import { StockTableToolbar } from '../stock-table-toolbar';
import { StockBulkActionBar } from '../stock-bulk-action-bar';
import { StockWatchlistBatchDialog } from '../stock-watchlist-batch-dialog';
import {
  SORT_BY,
  HEAD_LABELS,
  ALL_COLUMN_IDS,
  DEFAULT_VISIBLE_COLUMNS,
  COLUMN_PREFS_STORAGE_KEY,
  QUICK_HIGH_DIVIDEND_MIN_DV,
  QUICK_LARGE_CAP_MIN_TOTAL_MV,
  QUICK_HIGH_LIQUIDITY_MIN_AMOUNT,
} from '../constants';

import type { ColumnId, StockFilters } from '../types';

// ----------------------------------------------------------------------

const DEFAULT_FILTERS: StockFilters = {
  keyword: '',
  exchange: '',
  market: '',
  industries: [],
  areas: [],
  isHs: '',
  highLiquidity: false,
  highDividend: false,
  largeCap: false,
};

function readVisibleColumnsFromStorage(): ColumnId[] {
  if (typeof window === 'undefined') return [...DEFAULT_VISIBLE_COLUMNS];
  try {
    const raw = window.localStorage.getItem(COLUMN_PREFS_STORAGE_KEY);
    if (raw === null) return [...DEFAULT_VISIBLE_COLUMNS];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_VISIBLE_COLUMNS];
    const filtered = parsed.filter((id): id is ColumnId =>
      (ALL_COLUMN_IDS as readonly string[]).includes(id as string)
    );
    return filtered.length > 0 ? filtered : [...DEFAULT_VISIBLE_COLUMNS];
  } catch {
    return [...DEFAULT_VISIBLE_COLUMNS];
  }
}

// ----------------------------------------------------------------------

export function StockView() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState<(typeof SORT_BY)[keyof typeof SORT_BY]>(SORT_BY.TOTAL_MV);
  const [filters, setFilters] = useState<StockFilters>(DEFAULT_FILTERS);

  const [rows, setRows] = useState<StockListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [screenerOpen, setScreenerOpen] = useState(false);
  const listRequestRef = useRef(0);

  // 元数据
  const [industries, setIndustries] = useState<IndustryItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);

  // 列配置
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(() =>
    readVisibleColumnsFromStorage()
  );

  // 跨页选中（按 tsCode）
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(() => new Set());

  // 批量加入自选股 Dialog
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchTargets, setBatchTargets] = useState<string[]>([]);

  // Snackbar 反馈
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // 加载行业/地域元数据
  useEffect(() => {
    let cancelled = false;
    fetchIndustries()
      .then((res) => {
        if (!cancelled) setIndustries(res.industries ?? []);
      })
      .catch(() => {
        /* 元数据失败不阻断主流程 */
      });
    fetchAreas()
      .then((res) => {
        if (!cancelled) setAreas(res.areas ?? []);
      })
      .catch(() => {
        /* 元数据失败不阻断主流程 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 持久化列配置
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(COLUMN_PREFS_STORAGE_KEY, JSON.stringify(visibleColumns));
    } catch {
      /* ignore */
    }
  }, [visibleColumns]);

  const buildQuery = useCallback((): StockListQuery => {
    const query: StockListQuery = {
      page: page + 1,
      pageSize: rowsPerPage,
      sortBy: orderBy,
      sortOrder: order,
      listStatus: 'L',
      keyword: filters.keyword.trim() === '' ? undefined : filters.keyword.trim(),
      exchange: filters.exchange === '' ? undefined : filters.exchange,
      market: filters.market === '' ? undefined : filters.market,
      isHs: filters.isHs === '' ? undefined : filters.isHs,
    };

    if (filters.industries.length > 0) {
      query.industries = filters.industries;
      // 后端尚未支持多值前的兼容：单选时也写入旧字段
      if (filters.industries.length === 1) {
        query.industry = filters.industries[0];
      }
    }
    if (filters.areas.length > 0) {
      query.areas = filters.areas;
      if (filters.areas.length === 1) {
        query.area = filters.areas[0];
      }
    }
    if (filters.highLiquidity === true) {
      query.minAmount = QUICK_HIGH_LIQUIDITY_MIN_AMOUNT;
    }
    if (filters.largeCap === true) {
      query.minTotalMv = QUICK_LARGE_CAP_MIN_TOTAL_MV;
    }
    if (filters.highDividend === true) {
      query.minDvTtm = QUICK_HIGH_DIVIDEND_MIN_DV;
    }
    return query;
  }, [page, rowsPerPage, order, orderBy, filters]);

  const fetchList = useCallback(async () => {
    const requestId = listRequestRef.current + 1;
    listRequestRef.current = requestId;
    const query = buildQuery();
    setLoading(true);
    setError('');
    try {
      const result = await stockApi.list(query);
      if (listRequestRef.current !== requestId) return;
      setRows(result.items ?? []);
      setTotal(result.total ?? 0);
    } catch (err) {
      if (listRequestRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : '获取股票列表失败');
    } finally {
      if (listRequestRef.current === requestId) setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    void fetchList();
    return () => {
      listRequestRef.current += 1;
    };
  }, [fetchList]);

  const handleSort = useCallback(
    (id: string) => {
      const isAsc = orderBy === id && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id as (typeof SORT_BY)[keyof typeof SORT_BY]);
      setPage(0);
    },
    [order, orderBy]
  );

  const handleFilterChange = useCallback((changed: Partial<StockFilters>) => {
    setFilters((prev) => ({ ...prev, ...changed }));
    setPage(0);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(0);
  }, []);

  const handleToggleSelect = useCallback((tsCode: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(tsCode)) {
        next.delete(tsCode);
      } else {
        next.add(tsCode);
      }
      return next;
    });
  }, []);

  const pageCodes = useMemo(() => rows.map((r) => r.tsCode), [rows]);
  const pageSelectedCount = useMemo(
    () => pageCodes.filter((code) => selectedCodes.has(code)).length,
    [pageCodes, selectedCodes]
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedCodes((prev) => {
        const next = new Set(prev);
        if (checked) {
          pageCodes.forEach((code) => next.add(code));
        } else {
          pageCodes.forEach((code) => next.delete(code));
        }
        return next;
      });
    },
    [pageCodes]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedCodes(new Set());
  }, []);

  const handleOpenBatchDialog = useCallback(() => {
    setBatchTargets(Array.from(selectedCodes));
    setBatchOpen(true);
  }, [selectedCodes]);

  const handleAddSingleToWatchlist = useCallback((tsCode: string) => {
    setBatchTargets([tsCode]);
    setBatchOpen(true);
  }, []);

  const handleBatchSuccess = useCallback(
    (added: number, skipped: number) => {
      setSnackbar({
        open: true,
        severity: 'success',
        message: `成功加入 ${added} 只，跳过 ${skipped} 只重复标的`,
      });
      if (batchTargets.length > 1) {
        setSelectedCodes(new Set());
      }
    },
    [batchTargets.length]
  );

  const isFiltering =
    filters.keyword.trim() !== '' ||
    filters.exchange !== '' ||
    filters.market !== '' ||
    filters.isHs !== '' ||
    filters.industries.length > 0 ||
    filters.areas.length > 0 ||
    filters.highLiquidity === true ||
    filters.largeCap === true ||
    filters.highDividend === true;

  const totalCols = 1 + 1 + visibleColumns.length;

  return (
    <DashboardContent>
      <Typography variant="h4" sx={{ mb: 3 }}>
        股票
      </Typography>

      <Card>
        <StockTableToolbar
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          onOpenScreener={() => setScreenerOpen(true)}
          industries={industries}
          areas={areas}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
        />

        {error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => void fetchList()}>
                重试
              </Button>
            }
            sx={{ mx: 2.5, mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <Scrollbar>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 1200 }}>
              <StockTableHead
                order={order}
                orderBy={orderBy}
                onSort={handleSort}
                headLabel={HEAD_LABELS}
                visibleColumns={visibleColumns}
                numSelected={pageSelectedCount}
                rowCount={rows.length}
                onSelectAll={handleSelectAll}
              />
              <TableBody>
                {loading === true ? (
                  <StockSkeletonRows rowCount={Math.min(rowsPerPage, 10)} colCount={totalCols} />
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={totalCols}>
                      <StockEmptyState
                        onClearFilters={handleResetFilters}
                        onOpenScreener={() => setScreenerOpen(true)}
                      />
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <StockTableRow
                      key={row.tsCode}
                      row={row}
                      selected={selectedCodes.has(row.tsCode)}
                      onToggleSelect={handleToggleSelect}
                      onAddToWatchlist={handleAddSingleToWatchlist}
                      visibleColumns={visibleColumns}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>

        <StockBulkActionBar
          selectedCount={selectedCodes.size}
          onAddToWatchlist={handleOpenBatchDialog}
          onClear={handleClearSelection}
        />

        <Stack direction="row" alignItems="center" justifyContent="flex-end">
          <TablePagination
            component="div"
            page={page}
            count={total}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPageOptions={[10, 20, 50, 100]}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="每页行数"
            labelDisplayedRows={({ from, to, count }) =>
              isFiltering === true
                ? `${from}-${to} 共 ${count} 条（已筛选）`
                : `${from}-${to} 共 ${count} 条`
            }
          />
        </Stack>
      </Card>

      <ScreenerDialog open={screenerOpen} onClose={() => setScreenerOpen(false)} />

      <StockWatchlistBatchDialog
        open={batchOpen}
        tsCodes={batchTargets}
        onClose={() => setBatchOpen(false)}
        onSuccess={handleBatchSuccess}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
