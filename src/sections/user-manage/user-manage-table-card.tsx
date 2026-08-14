import type {
  UserRole,
  UserManageItem,
  UserStatusFilter,
  UserSortableField,
} from 'src/api/user-manage';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import Skeleton from '@mui/material/Skeleton';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';
import TablePagination from '@mui/material/TablePagination';

import { CONFIG } from 'src/config-global';

import { Scrollbar } from 'src/components/scrollbar';

import { BulkActionBar } from './bulk-action-bar';
import { UserManageTableRow } from './user-manage-table-row';
import { UserManageTableToolbar } from './user-manage-table-toolbar';

// ----------------------------------------------------------------------

export type BulkResult = {
  success: number[];
  failed: { id: number; reason: string }[];
};

type QueryPatch = Record<string, string | number | boolean | null | undefined>;

type Props = {
  rows: UserManageItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  listError: string;
  filterAccount: string;
  filterStatus: UserStatusFilter | '';
  filterRole: UserRole | '';
  createdFrom: string;
  createdTo: string;
  includeDeleted: boolean;
  sortBy: UserSortableField | '';
  sortOrder: 'asc' | 'desc' | '';
  selectedIds: Set<number>;
  selectableRows: UserManageItem[];
  allSelected: boolean;
  someSelected: boolean;
  bulkSubmitting: boolean;
  bulkResult: BulkResult | null;
  onQueryPatch: (patch: QueryPatch, resetPage?: boolean) => void;
  onRetry: () => void;
  onDismissError: () => void;
  onClearSelection: () => void;
  onBulkStatus: (status: 'ACTIVE' | 'DEACTIVATED') => void;
  onSelectAll: (checked: boolean) => void;
  onSelect: (row: UserManageItem, checked: boolean) => void;
  onSort: (field: UserSortableField) => void;
  onEdit: (row: UserManageItem) => void;
  onUpdateRole: (row: UserManageItem) => void;
  onToggleStatus: (row: UserManageItem) => void;
  onResetPassword: (row: UserManageItem) => void;
  onDelete: (row: UserManageItem) => void;
  onRestore: (row: UserManageItem) => void;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const TABLE_HEAD: Array<{
  id: UserSortableField | 'id' | 'select' | 'email' | 'backtestQuota' | 'watchlistLimit' | '';
  label: string;
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}> = [
  { id: 'select', label: '', width: 48 },
  { id: 'id', label: 'ID', width: 60 },
  { id: 'account', label: '账号 / 昵称', minWidth: 170, sortable: true },
  { id: 'role', label: '角色', width: 120, sortable: true },
  { id: 'status', label: '状态', width: 120, sortable: true },
  { id: 'email', label: '邮箱', minWidth: 140 },
  { id: 'backtestQuota', label: '回测配额', width: 100, align: 'center' },
  { id: 'watchlistLimit', label: '监控股票数', width: 110, align: 'center' },
  { id: 'lastLoginAt', label: '最近登录', width: 120, sortable: true },
  { id: 'createdAt', label: '注册时间', width: 110, sortable: true },
  { id: '', label: '操作', width: 60, align: 'right' },
];

export function UserManageTableCard({
  rows,
  total,
  page,
  pageSize,
  loading,
  listError,
  filterAccount,
  filterStatus,
  filterRole,
  createdFrom,
  createdTo,
  includeDeleted,
  sortBy,
  sortOrder,
  selectedIds,
  selectableRows,
  allSelected,
  someSelected,
  bulkSubmitting,
  bulkResult,
  onQueryPatch,
  onRetry,
  onDismissError,
  onClearSelection,
  onBulkStatus,
  onSelectAll,
  onSelect,
  onSort,
  onEdit,
  onUpdateRole,
  onToggleStatus,
  onResetPassword,
  onDelete,
  onRestore,
}: Props) {
  return (
    <Card>
      <UserManageTableToolbar
        filterAccount={filterAccount}
        filterStatus={filterStatus}
        filterRole={filterRole}
        createdFrom={createdFrom}
        createdTo={createdTo}
        includeDeleted={includeDeleted}
        onFilterAccount={(value) => onQueryPatch({ account: value })}
        onFilterStatus={(value) => onQueryPatch({ status: value })}
        onFilterRole={(value) => onQueryPatch({ role: value })}
        onCreatedFrom={(value) => onQueryPatch({ createdFrom: value })}
        onCreatedTo={(value) => onQueryPatch({ createdTo: value })}
        onIncludeDeleted={(value) =>
          onQueryPatch({
            includeDeleted: value,
            status: value ? filterStatus : filterStatus === 'DELETED' ? null : filterStatus,
          })
        }
      />

      {CONFIG.userManageFeatures.bulk && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          submitting={bulkSubmitting}
          onClear={onClearSelection}
          onEnable={() => onBulkStatus('ACTIVE')}
          onDisable={() => onBulkStatus('DEACTIVATED')}
        />
      )}

      {bulkResult && (
        <Alert severity={bulkResult.failed.length > 0 ? 'warning' : 'success'} sx={{ mx: 3, mb: 2 }}>
          批量操作完成：成功 {bulkResult.success.length} 个，失败 {bulkResult.failed.length} 个
        </Alert>
      )}

      {listError && (
        <Alert
          severity="error"
          sx={{ mx: 3, mb: 2 }}
          onClose={onDismissError}
          action={
            <Button color="inherit" size="small" onClick={onRetry}>
              重试
            </Button>
          }
        >
          {listError}
        </Alert>
      )}

      <Scrollbar>
        <TableContainer sx={{ overflow: 'unset' }}>
          <Table sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                {TABLE_HEAD.map((col) => (
                  <TableCell
                    key={col.id}
                    align={col.align ?? 'left'}
                    padding={col.id === 'select' ? 'checkbox' : 'normal'}
                    sx={{ width: col.width, minWidth: col.minWidth }}
                  >
                    {col.id === 'select' ? (
                      <Checkbox
                        indeterminate={!allSelected && someSelected}
                        checked={allSelected}
                        disabled={selectableRows.length === 0}
                        onChange={(event) => onSelectAll(event.target.checked)}
                        slotProps={{ input: { 'aria-label': '选择当前页全部用户' } }}
                      />
                    ) : col.sortable ? (
                      <TableSortLabel
                        active={sortBy === col.id}
                        direction={sortOrder || 'desc'}
                        onClick={() => onSort(col.id as UserSortableField)}
                      >
                        {col.label}
                      </TableSortLabel>
                    ) : (
                      col.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={TABLE_HEAD.length}>
                      <Skeleton variant="text" height={36} />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={TABLE_HEAD.length} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.disabled">
                      暂无数据
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <UserManageTableRow
                    key={row.id}
                    row={row}
                    selected={selectedIds.has(row.id)}
                    onSelect={onSelect}
                    onEdit={onEdit}
                    onUpdateRole={onUpdateRole}
                    onToggleStatus={onToggleStatus}
                    onResetPassword={onResetPassword}
                    onDelete={onDelete}
                    onRestore={onRestore}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Scrollbar>

      <TablePagination
        component="div"
        page={page}
        count={total}
        rowsPerPage={pageSize}
        rowsPerPageOptions={PAGE_SIZE_OPTIONS}
        onPageChange={(_, newPage) => onQueryPatch({ page: newPage + 1 }, false)}
        onRowsPerPageChange={(event) =>
          onQueryPatch({ pageSize: parseInt(event.target.value, 10), page: null }, false)
        }
        labelRowsPerPage="每页行数："
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} / 共 ${count} 条`}
      />
    </Card>
  );
}
