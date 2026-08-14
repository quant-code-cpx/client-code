import type { ReactNode } from 'react';
import type { ButtonProps } from '@mui/material/Button';
import type {
  UserStatus,
  CreateUserDto,
  UserManageItem,
  UserSortableField,
  UpdateUserRoleDto,
  AdminUpdateUserDto,
} from 'src/api/user-manage';

import { useSearchParams } from 'react-router';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { usePermission } from 'src/permission';
import { userManageApi } from 'src/api/user-manage';
import { DashboardContent } from 'src/layouts/dashboard';

import { ConfirmDialog } from 'src/components/confirm-dialog';

import { AuditLogTab } from '../audit-log-tab';
import { UserRoleDialog } from '../user-role-dialog';
import { UserManageFormDialog } from '../user-manage-form-dialog';
import { type BulkResult, UserManageTableCard } from '../user-manage-table-card';
import { UserManageResetPasswordDialog } from '../user-manage-reset-password-dialog';
import { UserManagePageHeader, UserManageAccessDenied } from '../user-manage-page-header';
import {
  parseRole,
  parseSortBy,
  parseSortOrder,
  parsePositiveInt,
  parseStatusFilter,
} from '../user-manage-url-state';

// ----------------------------------------------------------------------

type ConfirmAction = {
  title: string;
  content: ReactNode;
  confirmLabel?: string;
  confirmColor?: ButtonProps['color'];
  onConfirm: () => Promise<void>;
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
    return <UserManageAccessDenied />;
  }

  return (
    <DashboardContent>
      <UserManagePageHeader
        currentTab={currentTab}
        kpiRefreshKey={kpiRefreshKey}
        onCreate={() => {
          setFormMode('create');
          setEditRow(null);
          setFormOpen(true);
        }}
        onApplyStatus={(status) => setQueryPatch({ status })}
        onTabChange={(value) =>
          setQueryPatch({ tab: value === 1 ? 'audit' : null }, false)
        }
      />

      {currentTab === 0 && (
        <UserManageTableCard
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          loading={loading}
          listError={listError}
          filterAccount={filterAccount}
          filterStatus={filterStatus}
          filterRole={filterRole}
          createdFrom={createdFrom}
          createdTo={createdTo}
          includeDeleted={includeDeleted}
          sortBy={sortBy}
          sortOrder={sortOrder}
          selectedIds={selectedIds}
          selectableRows={selectableRows}
          allSelected={allSelected}
          someSelected={someSelected}
          bulkSubmitting={bulkSubmitting}
          bulkResult={bulkResult}
          onQueryPatch={setQueryPatch}
          onRetry={() => void fetchList()}
          onDismissError={() => setListError('')}
          onClearSelection={() => setSelectedIds(new Set())}
          onBulkStatus={handleBulkStatus}
          onSelectAll={handleSelectAll}
          onSelect={handleSelect}
          onSort={handleSort}
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
