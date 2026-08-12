import type { ReactNode } from 'react';
import type { ButtonProps } from '@mui/material/Button';
import type {
  UserRole,
  UserStatus,
  CreateUserDto,
  UserManageItem,
  UserStatusFilter,
  UserSortableField,
  UpdateUserRoleDto,
  AdminUpdateUserDto,
} from 'src/api/user-manage';

import { useSearchParams } from 'react-router-dom';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
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
import { userManageApi } from 'src/api/user-manage';
import { DashboardContent } from 'src/layouts/dashboard';
import { HasPermission, usePermission } from 'src/permission';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { KpiSummary } from '../kpi-summary';
import { AuditLogTab } from '../audit-log-tab';
import { BulkActionBar } from '../bulk-action-bar';
import { UserRoleDialog } from '../user-role-dialog';
import { UserManageTableRow } from '../user-manage-table-row';
import { UserManageFormDialog } from '../user-manage-form-dialog';
import { UserManageTableToolbar } from '../user-manage-table-toolbar';
import { UserManageResetPasswordDialog } from '../user-manage-reset-password-dialog';

// ----------------------------------------------------------------------

type ConfirmAction = {
  title: string;
  content: ReactNode;
  confirmLabel?: string;
  confirmColor?: ButtonProps['color'];
  onConfirm: () => Promise<void>;
};

type BulkResult = {
  success: number[];
  failed: { id: number; reason: string }[];
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const USER_STATUS_FILTERS: UserStatusFilter[] = ['ACTIVE', 'DEACTIVATED', 'DELETED', 'LOCKED'];
const USER_SORT_FIELDS: UserSortableField[] = [
  'createdAt',
  'updatedAt',
  'lastLoginAt',
  'account',
  'role',
  'status',
];

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

const parsePositiveInt = (value: string | null, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseStatusFilter = (value: string | null): UserStatusFilter | '' => {
  if (value && USER_STATUS_FILTERS.includes(value as UserStatusFilter)) {
    return value as UserStatusFilter;
  }
  return '';
};

const parseRole = (value: string | null): UserRole | '' => {
  if (value === 'SUPER_ADMIN' || value === 'ADMIN' || value === 'USER') return value;
  return '';
};

const parseSortBy = (value: string | null): UserSortableField | '' => {
  if (value && USER_SORT_FIELDS.includes(value as UserSortableField)) {
    return value as UserSortableField;
  }
  return '';
};

const parseSortOrder = (value: string | null): 'asc' | 'desc' | '' => {
  if (value === 'asc' || value === 'desc') return value;
  return '';
};

// ----------------------------------------------------------------------

export function UserManageView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasMinRole, canManage } = usePermission();
  const isAdmin = hasMinRole('ADMIN');

  const currentTab = searchParams.get('tab') === 'audit' ? 1 : 0;
  const page = parsePositiveInt(searchParams.get('page'), 1) - 1;
  const pageSize = parsePositiveInt(searchParams.get('pageSize'), 20);
  const filterAccount = searchParams.get('account') ?? '';
  const filterStatus = parseStatusFilter(searchParams.get('status'));
  const filterRole = parseRole(searchParams.get('role'));
  const createdFrom = searchParams.get('createdFrom') ?? '';
  const createdTo = searchParams.get('createdTo') ?? '';
  const includeDeleted = searchParams.get('includeDeleted') === '1';
  const sortBy = parseSortBy(searchParams.get('sortBy'));
  const sortOrder = parseSortOrder(searchParams.get('sortOrder'));

  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<UserManageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [kpiRefreshKey, setKpiRefreshKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editRow, setEditRow] = useState<UserManageItem | null>(null);

  const [roleOpen, setRoleOpen] = useState(false);
  const [roleRow, setRoleRow] = useState<UserManageItem | null>(null);

  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [resetPwdRow, setResetPwdRow] = useState<UserManageItem | null>(null);

  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const abortRef = useRef<AbortController | null>(null);

  const setQueryPatch = useCallback(
    (patch: Record<string, string | number | boolean | null | undefined>, resetPage = true) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          Object.entries(patch).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '' || value === false) {
              next.delete(key);
            } else if (value === true) {
              next.set(key, '1');
            } else {
              next.set(key, String(value));
            }
          });

          if (resetPage) next.delete('page');

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const listQuery = useMemo(
    () => ({
      page: page + 1,
      pageSize,
      account: filterAccount.trim() || undefined,
      status: filterStatus && filterStatus !== 'LOCKED' ? (filterStatus as UserStatus) : undefined,
      role: filterRole || undefined,
      lockedOnly: filterStatus === 'LOCKED' || undefined,
      includeDeleted: includeDeleted || undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
    }),
    [
      page,
      sortBy,
      pageSize,
      sortOrder,
      filterRole,
      createdTo,
      createdFrom,
      filterStatus,
      filterAccount,
      includeDeleted,
    ]
  );

  const fetchList = useCallback(async () => {
    if (!isAdmin) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setListError('');
    try {
      const result = await userManageApi.list(listQuery, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setRows(result.items ?? []);
      setTotal(result.total ?? 0);
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setListError(err instanceof Error ? err.message : '获取用户列表失败');
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [isAdmin, listQuery]);

  useEffect(() => {
    fetchList();
    return () => abortRef.current?.abort();
  }, [fetchList]);

  useEffect(() => {
    setSelectedIds((current) => {
      const visibleIds = new Set(rows.map((row) => row.id));
      return new Set([...current].filter((id) => visibleIds.has(id)));
    });
  }, [rows]);

  const selectableRows = rows.filter((row) => canManage(row.role) && row.status !== 'DELETED');
  const selectedRows = rows.filter((row) => selectedIds.has(row.id));
  const allSelected =
    selectableRows.length > 0 && selectableRows.every((row) => selectedIds.has(row.id));
  const someSelected = selectableRows.some((row) => selectedIds.has(row.id));

  const handleSort = useCallback(
    (field: UserSortableField) => {
      if (sortBy !== field) {
        setQueryPatch({ sortBy: field, sortOrder: 'desc' });
        return;
      }
      if (sortOrder === 'desc') {
        setQueryPatch({ sortBy: field, sortOrder: 'asc' });
        return;
      }
      setQueryPatch({ sortBy: null, sortOrder: null });
    },
    [sortBy, sortOrder, setQueryPatch]
  );

  const handleSelect = useCallback((row: UserManageItem, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(row.id);
      else next.delete(row.id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds((current) => {
        const next = new Set(current);
        selectableRows.forEach((row) => {
          if (checked) next.add(row.id);
          else next.delete(row.id);
        });
        return next;
      });
    },
    [selectableRows]
  );

  const handleCreate = useCallback(
    async (data: CreateUserDto): Promise<string> => {
      const result = await userManageApi.create(data);
      setQueryPatch({ page: null });
      await fetchList();
      setKpiRefreshKey((k) => k + 1);
      return result.initialPassword || data.password;
    },
    [fetchList, setQueryPatch]
  );

  const handleUpdate = useCallback(
    async (data: AdminUpdateUserDto) => {
      await userManageApi.update(data);
      await fetchList();
    },
    [fetchList]
  );

  const handleUpdateRole = useCallback(
    async (data: UpdateUserRoleDto) => {
      await userManageApi.updateRole(data);
      await fetchList();
    },
    [fetchList]
  );

  const handleToggleStatus = useCallback(
    (row: UserManageItem) => {
      const nextStatus = row.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
      const action = nextStatus === 'DEACTIVATED' ? '禁用' : '启用';
      setConfirmError('');
      setConfirm({
        title: `${action}账号`,
        content: `确定要${action}账号「${row.account}」吗？该动作会写入审计日志。`,
        confirmLabel: action,
        confirmColor: nextStatus === 'DEACTIVATED' ? 'warning' : 'success',
        onConfirm: async () => {
          await userManageApi.updateStatus({ id: row.id, status: nextStatus });
          await fetchList();
        },
      });
    },
    [fetchList]
  );

  const handleResetPassword = useCallback((row: UserManageItem) => {
    setResetPwdRow(row);
    setResetPwdOpen(true);
  }, []);

  const handleDoResetPassword = useCallback(
    async (id: number, newPassword: string): Promise<string> => {
      const result = await userManageApi.resetPassword({ id, newPassword });
      return result.newPassword || newPassword;
    },
    []
  );

  const handleDelete = useCallback(
    (row: UserManageItem) => {
      setConfirmError('');
      setConfirm({
        title: `删除用户「${row.account}」`,
        content: (
          <Stack spacing={1.5}>
            <Typography variant="body2">
              本期删除策略为「软删除用户，名下自选股、策略、回测、订阅不级联删除」。
            </Typography>
            <Alert severity="warning" variant="outlined">
              删除后该账号不可登录；业务资产保留归档关系，恢复用户后重新可见。
            </Alert>
          </Stack>
        ),
        confirmLabel: '删除',
        confirmColor: 'error',
        onConfirm: async () => {
          await userManageApi.delete(row.id);
          await fetchList();
        },
      });
    },
    [fetchList]
  );

  const handleRestore = useCallback(
    (row: UserManageItem) => {
      setConfirmError('');
      setConfirm({
        title: '恢复用户',
        content: `确定要恢复账号「${row.account}」吗？恢复后该用户的历史业务资产将重新可见。`,
        confirmLabel: '恢复',
        confirmColor: 'success',
        onConfirm: async () => {
          await userManageApi.restore(row.id);
          await fetchList();
        },
      });
    },
    [fetchList]
  );

  const executeBulkStatus = useCallback(
    async (status: 'ACTIVE' | 'DEACTIVATED') => {
      const ids = selectedRows.map((row) => row.id);
      const success: number[] = [];
      const failed: { id: number; reason: string }[] = [];

      setBulkSubmitting(true);
      setBulkResult(null);
      try {
        await ids.reduce<Promise<void>>(async (previous, id) => {
          await previous;
          try {
            await userManageApi.updateStatus({ id, status });
            success.push(id);
          } catch (err) {
            failed.push({ id, reason: err instanceof Error ? err.message : '操作失败' });
          }
        }, Promise.resolve());

        setBulkResult({ success, failed });
        setSelectedIds(new Set(failed.map((item) => item.id)));
        await fetchList();
        setKpiRefreshKey((k) => k + 1);
      } finally {
        setBulkSubmitting(false);
      }
    },
    [fetchList, selectedRows]
  );

  const handleBulkStatus = useCallback(
    (status: 'ACTIVE' | 'DEACTIVATED') => {
      const action = status === 'ACTIVE' ? '启用' : '禁用';
      setConfirmError('');
      setConfirm({
        title: `批量${action}`,
        content: `将对 ${selectedRows.length} 个账号执行批量${action}。允许部分成功，结束后会展示失败明细。`,
        confirmLabel: `批量${action}`,
        confirmColor: status === 'ACTIVE' ? 'success' : 'warning',
        onConfirm: async () => executeBulkStatus(status),
      });
    },
    [selectedRows.length, executeBulkStatus]
  );

  const handleConfirm = useCallback(async () => {
    if (!confirm) return;
    setConfirmSubmitting(true);
    setConfirmError('');
    try {
      await confirm.onConfirm();
      setConfirm(null);
      setKpiRefreshKey((k) => k + 1);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setConfirmSubmitting(false);
    }
  }, [confirm]);

  if (!isAdmin) {
    return (
      <DashboardContent>
        <Box
          sx={{
            gap: 2,
            minHeight: 320,
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Iconify
            icon="solar:shield-keyhole-bold-duotone"
            sx={{ fontSize: 64, color: 'text.disabled' }}
          />
          <Typography variant="h6" color="text.secondary">
            权限不足
          </Typography>
          <Typography variant="body2" color="text.disabled">
            需要管理员及以上权限才能访问用户管理
          </Typography>
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3 }}
        alignItems={{ sm: 'center' }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4">用户管理</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            管理账号生命周期、配额与角色，并追溯所有关键变更
          </Typography>
        </Box>

        {currentTab === 0 && (
          <HasPermission minRole="ADMIN">
            <Button
              variant="contained"
              color="primary"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => {
                setFormMode('create');
                setEditRow(null);
                setFormOpen(true);
              }}
            >
              新增用户
            </Button>
          </HasPermission>
        )}
      </Stack>

      {CONFIG.userManageFeatures.stats && (
        <KpiSummary
          onApplyStatus={(status) => setQueryPatch({ status })}
          refreshKey={kpiRefreshKey}
        />
      )}

      <Tabs
        value={currentTab}
        onChange={(_, value) => setQueryPatch({ tab: value === 1 ? 'audit' : null }, false)}
        sx={{ mb: 3 }}
      >
        <Tab
          icon={<Iconify icon="solar:users-group-rounded-bold" />}
          label="用户列表"
          iconPosition="start"
        />
        <Tab
          icon={<Iconify icon="solar:document-text-bold" />}
          label="审计日志"
          iconPosition="start"
        />
      </Tabs>

      {currentTab === 0 && (
        <Card>
          <UserManageTableToolbar
            filterAccount={filterAccount}
            filterStatus={filterStatus}
            filterRole={filterRole}
            createdFrom={createdFrom}
            createdTo={createdTo}
            includeDeleted={includeDeleted}
            onFilterAccount={(value) => setQueryPatch({ account: value })}
            onFilterStatus={(value) => setQueryPatch({ status: value })}
            onFilterRole={(value) => setQueryPatch({ role: value })}
            onCreatedFrom={(value) => setQueryPatch({ createdFrom: value })}
            onCreatedTo={(value) => setQueryPatch({ createdTo: value })}
            onIncludeDeleted={(value) => {
              setQueryPatch({
                includeDeleted: value,
                status: value ? filterStatus : filterStatus === 'DELETED' ? null : filterStatus,
              });
            }}
          />

          {CONFIG.userManageFeatures.bulk && (
            <BulkActionBar
              selectedCount={selectedIds.size}
              submitting={bulkSubmitting}
              onClear={() => setSelectedIds(new Set())}
              onEnable={() => handleBulkStatus('ACTIVE')}
              onDisable={() => handleBulkStatus('DEACTIVATED')}
            />
          )}

          {bulkResult && (
            <Alert
              severity={bulkResult.failed.length > 0 ? 'warning' : 'success'}
              sx={{ mx: 3, mb: 2 }}
            >
              批量操作完成：成功 {bulkResult.success.length} 个，失败 {bulkResult.failed.length} 个
            </Alert>
          )}

          {listError && (
            <Alert severity="error" sx={{ mx: 3, mb: 2 }} onClose={() => setListError('')}>
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
                            onChange={(event) => handleSelectAll(event.target.checked)}
                            slotProps={{ input: { 'aria-label': '选择当前页全部用户' } }}
                          />
                        ) : col.sortable ? (
                          <TableSortLabel
                            active={sortBy === col.id}
                            direction={sortOrder || 'desc'}
                            onClick={() => handleSort(col.id as UserSortableField)}
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
                        onSelect={handleSelect}
                        onEdit={(item) => {
                          setFormMode('edit');
                          setEditRow(item);
                          setFormOpen(true);
                        }}
                        onUpdateRole={(item) => {
                          setRoleRow(item);
                          setRoleOpen(true);
                        }}
                        onToggleStatus={handleToggleStatus}
                        onResetPassword={handleResetPassword}
                        onDelete={handleDelete}
                        onRestore={handleRestore}
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
            onPageChange={(_, newPage) => setQueryPatch({ page: newPage + 1 }, false)}
            onRowsPerPageChange={(event) => {
              setQueryPatch({ pageSize: parseInt(event.target.value, 10), page: null }, false);
            }}
            labelRowsPerPage="每页行数："
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} / 共 ${count} 条`}
          />
        </Card>
      )}

      {currentTab === 1 && <AuditLogTab />}

      <UserManageFormDialog
        open={formOpen}
        mode={formMode}
        row={editRow}
        onClose={() => setFormOpen(false)}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <UserRoleDialog
        open={roleOpen}
        row={roleRow}
        onClose={() => setRoleOpen(false)}
        onSubmit={handleUpdateRole}
      />

      <UserManageResetPasswordDialog
        open={resetPwdOpen}
        account={resetPwdRow?.account ?? ''}
        userId={resetPwdRow?.id ?? 0}
        onClose={() => setResetPwdOpen(false)}
        onReset={handleDoResetPassword}
      />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ''}
        content={
          <Stack spacing={1.5}>
            <Box>{confirm?.content}</Box>
            {confirmError && <Alert severity="error">{confirmError}</Alert>}
          </Stack>
        }
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        submitting={confirmSubmitting || bulkSubmitting}
        confirmLabel={confirm?.confirmLabel ?? '确定'}
        confirmColor={confirm?.confirmColor ?? 'error'}
      />
    </DashboardContent>
  );
}
