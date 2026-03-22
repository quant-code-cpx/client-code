import type {
  UserRole,
  UserStatus,
  CreateUserDto,
  UserManageItem,
  AdminUpdateUserDto,
} from 'src/api/user-manage';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import DialogContentText from '@mui/material/DialogContentText';

import { userManageApi } from 'src/api/user-manage';
import { DashboardContent } from 'src/layouts/dashboard';
import { HasPermission, usePermission } from 'src/permission';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { UserManageTableRow } from '../user-manage-table-row';
import { UserManageFormDialog } from '../user-manage-form-dialog';
import { UserManageTableToolbar } from '../user-manage-table-toolbar';

// ----------------------------------------------------------------------

type ConfirmAction = {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
};

const TABLE_HEAD = [
  { id: 'id', label: 'ID', width: 60 },
  { id: 'account', label: '账号 / 昵称', minWidth: 160 },
  { id: 'role', label: '角色', width: 120 },
  { id: 'status', label: '状态', width: 100 },
  { id: 'email', label: '邮箱', minWidth: 140 },
  { id: 'backtestQuota', label: '回测配额', width: 100, align: 'center' as const },
  { id: 'watchlistLimit', label: '监控股票数', width: 110, align: 'center' as const },
  { id: 'createdAt', label: '注册时间', width: 110 },
  { id: '', label: '操作', width: 60, align: 'right' as const },
];

export function UserManageView() {
  const { hasMinRole } = usePermission();
  const isAdmin = hasMinRole('ADMIN');

  // ---------- 筛选 ----------
  const [filterAccount, setFilterAccount] = useState('');
  const [filterStatus, setFilterStatus] = useState<UserStatus | ''>('');
  const [filterRole, setFilterRole] = useState<UserRole | ''>('');

  // ---------- 表格 ----------
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<UserManageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');

  // ---------- 对话框 ----------
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editRow, setEditRow] = useState<UserManageItem | null>(null);

  // 二次确认弹窗（禁用 / 重置密码 / 删除）
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  // ---------- 数据拉取 ----------
  const fetchList = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setListError('');
    try {
      const result = await userManageApi.list({
        page: page + 1, // MUI page 从 0 开始，API 从 1 开始
        pageSize,
        account: filterAccount.trim() || undefined,
        status: filterStatus || undefined,
        role: filterRole || undefined,
      });
      setRows(result.items ?? []);
      setTotal(result.total ?? 0);
    } catch (err) {
      setListError(err instanceof Error ? err.message : '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, pageSize, filterAccount, filterStatus, filterRole]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // 筛选变更时重置到第一页
  const handleFilterChange = useCallback(
    <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
      (value: T) => {
        setter(value);
        setPage(0);
      },
    []
  );

  // ---------- 操作处理 ----------
  const handleCreate = useCallback(
    async (data: CreateUserDto) => {
      await userManageApi.create(data);
      setPage(0);
      await fetchList();
    },
    [fetchList]
  );

  const handleUpdate = useCallback(
    async (data: AdminUpdateUserDto) => {
      await userManageApi.update(data);
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
        description: `确定要${action}账号「${row.account}」吗？`,
        onConfirm: async () => {
          await userManageApi.updateStatus({ id: row.id, status: nextStatus });
          await fetchList();
        },
      });
    },
    [fetchList]
  );

  const handleResetPassword = useCallback((row: UserManageItem) => {
    setConfirmError('');
    setConfirm({
      title: '重置密码',
      description: `确定要重置账号「${row.account}」的密码吗？密码将被还原为系统默认密码。`,
      onConfirm: async () => {
        await userManageApi.resetPassword(row.id);
      },
    });
  }, []);

  const handleDelete = useCallback(
    (row: UserManageItem) => {
      setConfirmError('');
      setConfirm({
        title: '删除用户',
        description: `确定要删除账号「${row.account}」吗？此操作不可恢复。`,
        onConfirm: async () => {
          await userManageApi.delete(row.id);
          await fetchList();
        },
      });
    },
    [fetchList]
  );

  const handleConfirm = useCallback(async () => {
    if (!confirm) return;
    setConfirmSubmitting(true);
    setConfirmError('');
    try {
      await confirm.onConfirm();
      setConfirm(null);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setConfirmSubmitting(false);
    }
  }, [confirm]);

  // ---------- 权限不足兜底 ----------
  if (!isAdmin) {
    return (
      <DashboardContent>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 320,
            gap: 2,
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

  // ---------- 渲染 ----------
  return (
    <DashboardContent>
      <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          用户管理
        </Typography>

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
      </Box>

      <Card>
        <UserManageTableToolbar
          filterAccount={filterAccount}
          filterStatus={filterStatus}
          filterRole={filterRole}
          onFilterAccount={handleFilterChange(setFilterAccount)}
          onFilterStatus={handleFilterChange(setFilterStatus)}
          onFilterRole={handleFilterChange(setFilterRole)}
        />

        {listError && (
          <Alert severity="error" sx={{ mx: 3, mb: 2 }} onClose={() => setListError('')}>
            {listError}
          </Alert>
        )}

        <Scrollbar>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  {TABLE_HEAD.map((col) => (
                    <TableCell
                      key={col.id}
                      align={col.align ?? 'left'}
                      sx={{ width: col.width, minWidth: col.minWidth }}
                    >
                      {col.id ? (
                        <TableSortLabel hideSortIcon>{col.label}</TableSortLabel>
                      ) : (
                        col.label
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={TABLE_HEAD.length} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
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
                      onEdit={(r) => {
                        setFormMode('edit');
                        setEditRow(r);
                        setFormOpen(true);
                      }}
                      onToggleStatus={handleToggleStatus}
                      onResetPassword={handleResetPassword}
                      onDelete={handleDelete}
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
          rowsPerPageOptions={[10, 20, 50]}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="每页行数："
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} 共 ${count !== -1 ? count : `超过 ${to}`} 条`
          }
        />
      </Card>

      {/* 创建 / 编辑对话框 */}
      <UserManageFormDialog
        open={formOpen}
        mode={formMode}
        row={editRow}
        onClose={() => setFormOpen(false)}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      {/* 二次确认弹窗 */}
      <Dialog
        open={!!confirm}
        onClose={() => !confirmSubmitting && setConfirm(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{confirm?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirm?.description}</DialogContentText>
          {confirmError && (
            <Box sx={{ mt: 1, color: 'error.main', fontSize: 13 }}>{confirmError}</Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirm(null)} disabled={confirmSubmitting}>
            取消
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirm}
            disabled={confirmSubmitting}
            startIcon={confirmSubmitting ? <CircularProgress size={14} /> : null}
          >
            确定
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
