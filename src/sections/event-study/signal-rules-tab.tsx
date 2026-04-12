import type { SignalRule, EventTypeItem } from 'src/api/event-study';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import DialogContentText from '@mui/material/DialogContentText';

import {
  scanSignals,
  listSignalRules,
  deleteSignalRule,
  updateSignalRule,
} from 'src/api/event-study';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/context';

import { SignalRuleDialog } from './signal-rule-dialog';
import { EVENT_TYPE_LABELS, SIGNAL_TYPE_CONFIG } from './constants';

// ----------------------------------------------------------------------

type Props = {
  eventTypes: EventTypeItem[];
};

export function SignalRulesTab({ eventTypes }: Props) {
  const { role } = useAuth();
  const isAdmin = role === 'SUPER_ADMIN';

  const [rules, setRules] = useState<SignalRule[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SignalRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);

  const fetchRules = useCallback(async (p = page, ps = pageSize) => {
    setLoading(true);
    setError('');
    try {
      const data = await listSignalRules({ page: p + 1, pageSize: ps });
      setRules(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载规则失败');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRules(0, pageSize);
  }, [fetchRules, pageSize]);

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
    fetchRules(newPage, pageSize);
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ps = Number(e.target.value);
    setPageSize(ps);
    setPage(0);
    fetchRules(0, ps);
  };

  const handleToggleStatus = async (rule: SignalRule) => {
    const newStatus = rule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await updateSignalRule(rule.id, { status: newStatus });
      await fetchRules(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新状态失败');
    }
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    try {
      await deleteSignalRule(deleteTarget);
      setDeleteTarget(null);
      await fetchRules(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await scanSignals();
      setError('');
      alert(`扫描完成，新生成信号 ${res.signalsGenerated} 条`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '扫描失败');
    } finally {
      setScanning(false);
    }
  };

  const eventTypeLabelFor = (type: string) =>
    EVENT_TYPE_LABELS[type as keyof typeof EVENT_TYPE_LABELS] ?? type;

  return (
    <Stack spacing={3}>
      {/* 操作栏 */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:add-circle-bold" />}
            onClick={() => {
              setEditingRule(null);
              setDialogOpen(true);
            }}
          >
            创建信号规则
          </Button>
          {isAdmin && (
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:restart-bold" />}
              disabled={scanning}
              onClick={handleScan}
            >
              {scanning ? '扫描中...' : '手动扫描'}
            </Button>
          )}
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 60 }}>ID</TableCell>
                    <TableCell sx={{ minWidth: 200 }}>名称</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>事件类型</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>信号类型</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>状态</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>创建时间</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          暂无信号规则
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rules.map((rule) => {
                      const signalCfg = SIGNAL_TYPE_CONFIG[rule.signalType];
                      return (
                        <TableRow key={rule.id} hover>
                          <TableCell>{rule.id}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {rule.name}
                            </Typography>
                            {rule.description && (
                              <Typography variant="caption" color="text.secondary">
                                {rule.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Label color="default">{eventTypeLabelFor(rule.eventType)}</Label>
                          </TableCell>
                          <TableCell>
                            <Label color={signalCfg.color as 'success' | 'error' | 'info'}>
                              {signalCfg.label}
                            </Label>
                          </TableCell>
                          <TableCell>
                            <Label color={rule.status === 'ACTIVE' ? 'success' : 'default'}>
                              {rule.status === 'ACTIVE' ? '活跃' : '已暂停'}
                            </Label>
                          </TableCell>
                          <TableCell>
                            {rule.createdAt
                              ? new Date(rule.createdAt).toLocaleString('zh-CN', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingRule(rule);
                                  setDialogOpen(true);
                                }}
                              >
                                <Iconify icon="solar:pen-bold" width={16} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleStatus(rule)}
                                color={rule.status === 'ACTIVE' ? 'warning' : 'success'}
                              >
                                <Iconify
                                  icon={
                                    rule.status === 'ACTIVE'
                                      ? 'solar:pause-bold'
                                      : 'solar:play-bold'
                                  }
                                  width={16}
                                />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setDeleteTarget(rule.id)}
                              >
                                <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={total}
              page={page}
              rowsPerPage={pageSize}
              rowsPerPageOptions={[10, 20, 50]}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              labelRowsPerPage="每页行数"
            />
          </>
        )}
      </Card>

      {/* 创建/编辑弹窗 */}
      <SignalRuleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => fetchRules(page, pageSize)}
        editingRule={editingRule}
        eventTypes={eventTypes}
      />

      {/* 删除确认弹窗 */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>确定删除该信号规则吗？此操作不可撤销。</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
