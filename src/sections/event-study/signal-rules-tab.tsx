import type { SignalRule, EventTypeItem, SignalRuleStats } from 'src/api/event-study';

import { useRef, useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
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
import DialogContentText from '@mui/material/DialogContentText';

import {
  getScanJob,
  listSignalRules,
  scanSignalsAsync,
  deleteSignalRule,
  updateSignalRule,
  getSignalRuleStats,
} from 'src/api/event-study';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/context';

import { DataState } from './_shared/data-state';
import { ProgressSnackbar } from './_shared/progress-snackbar';
import { EVENT_TYPE_LABELS, SIGNAL_TYPE_CONFIG } from './constants';
import { SignalRuleWizardDialog } from './signal-rule-wizard-dialog';
import { SignalRuleBacktestDialog } from './signal-rule-backtest-dialog';

// ----------------------------------------------------------------------

type Props = {
  eventTypes: EventTypeItem[];
};

export function SignalRulesTab({ eventTypes }: Props) {
  const { role } = useAuth();
  const isAdmin = role === 'SUPER_ADMIN';

  const [rules, setRules] = useState<SignalRule[]>([]);
  const [statsMap, setStatsMap] = useState<Record<number, SignalRuleStats>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SignalRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [backtestRule, setBacktestRule] = useState<SignalRule | null>(null);

  const [scanState, setScanState] = useState<{
    open: boolean;
    title: string;
    message: string;
    progress: number;
    indeterminate: boolean;
  }>({ open: false, title: '', message: '', progress: 0, indeterminate: false });

  const pollRef = useRef<number | null>(null);

  const fetchRules = useCallback(async (p: number, ps: number) => {
    setLoading(true);
    setError('');
    try {
      const data = await listSignalRules({ page: p + 1, pageSize: ps });
      const items = data.items ?? [];
      setRules(items);
      setTotal(data.total ?? 0);
      // 并行拉每条规则的统计
      const statsArr = await Promise.all(
        items.map((r) => getSignalRuleStats(r.id).catch(() => null))
      );
      const map: Record<number, SignalRuleStats> = {};
      items.forEach((r, i) => {
        const s = statsArr[i];
        if (s) map[r.id] = s;
      });
      setStatsMap(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载规则失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules(0, pageSize);
    return () => {
      if (pollRef.current != null) window.clearTimeout(pollRef.current);
    };
  }, [fetchRules, pageSize]);

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
    fetchRules(newPage, pageSize);
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ps = Number(e.target.value);
    setPageSize(ps);
    setPage(0);
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

  const pollScanJob = (jobId: string) => {
    const tick = async () => {
      try {
        const j = await getScanJob(jobId);
        const processed = j.progress?.processed ?? 0;
        const totalCount = j.progress?.total ?? 0;
        const ratio = totalCount > 0 ? processed / totalCount : 0;
        setScanState({
          open: true,
          title: '信号扫描中',
          message: `已扫描 ${processed}/${totalCount}`,
          progress: ratio,
          indeterminate: false,
        });
        if (j.status === 'COMPLETED') {
          setScanState({
            open: true,
            title: '扫描完成',
            message: `共生成信号 ${j.signalsGenerated ?? 0} 条`,
            progress: 1,
            indeterminate: false,
          });
          fetchRules(page, pageSize);
          return;
        }
        if (j.status === 'FAILED') {
          setScanState({
            open: true,
            title: '扫描失败',
            message: j.errorMessage ?? '未知错误',
            progress: 0,
            indeterminate: false,
          });
          return;
        }
        pollRef.current = window.setTimeout(tick, 1500);
      } catch (e) {
        setScanState({
          open: true,
          title: '扫描查询失败',
          message: e instanceof Error ? e.message : '',
          progress: 0,
          indeterminate: false,
        });
      }
    };
    tick();
  };

  const handleScan = async () => {
    setScanState({
      open: true,
      title: '正在提交扫描任务',
      message: '',
      progress: 0,
      indeterminate: true,
    });
    try {
      const job = await scanSignalsAsync();
      pollScanJob(job.jobId);
    } catch (err) {
      setScanState({
        open: true,
        title: '扫描启动失败',
        message: err instanceof Error ? err.message : '',
        progress: 0,
        indeterminate: false,
      });
    }
  };

  const eventTypeLabelFor = (type: string) =>
    EVENT_TYPE_LABELS[type as keyof typeof EVENT_TYPE_LABELS] ?? type;

  return (
    <Stack spacing={3}>
      {/* 操作栏 */}
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:add-circle-bold" />}
          onClick={() => {
            setEditingRule(null);
            setWizardOpen(true);
          }}
        >
          创建信号规则
        </Button>
        {isAdmin && (
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:restart-bold" />}
            onClick={handleScan}
          >
            手动扫描
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <DataState
          loading={loading}
          empty={!loading && rules.length === 0}
          emptyText="暂无信号规则"
          skeletonHeight={280}
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 60 }}>ID</TableCell>
                  <TableCell sx={{ minWidth: 180 }}>名称</TableCell>
                  <TableCell sx={{ minWidth: 110 }}>事件类型</TableCell>
                  <TableCell sx={{ minWidth: 90 }}>信号类型</TableCell>
                  <TableCell sx={{ minWidth: 90 }}>状态</TableCell>
                  <TableCell align="right" sx={{ minWidth: 110 }}>
                    30 日命中
                  </TableCell>
                  <TableCell align="right" sx={{ minWidth: 80 }}>
                    命中率
                  </TableCell>
                  <TableCell sx={{ minWidth: 140 }}>最近触发</TableCell>
                  <TableCell sx={{ minWidth: 180 }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rules.map((rule) => {
                  const signalCfg = SIGNAL_TYPE_CONFIG[rule.signalType];
                  const stat = statsMap[rule.id];
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
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {stat ? stat.hitCount30d : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {stat ? `${(stat.hitRate * 100).toFixed(1)}%` : '-'}
                      </TableCell>
                      <TableCell>
                        {stat?.lastTriggered
                          ? new Date(stat.lastTriggered).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="编辑">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingRule(rule);
                                setWizardOpen(true);
                              }}
                            >
                              <Iconify icon="solar:pen-bold" width={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="回测">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => setBacktestRule(rule)}
                            >
                              <Iconify icon="solar:check-square-bold" width={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={rule.status === 'ACTIVE' ? '暂停' : '启用'}>
                            <IconButton
                              size="small"
                              color={rule.status === 'ACTIVE' ? 'warning' : 'success'}
                              onClick={() => handleToggleStatus(rule)}
                            >
                              <Iconify
                                icon={
                                  rule.status === 'ACTIVE' ? 'solar:pause-bold' : 'solar:play-bold'
                                }
                                width={16}
                              />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="删除">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteTarget(rule.id)}
                            >
                              <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
        </DataState>
      </Card>

      {/* 创建/编辑向导 */}
      <SignalRuleWizardDialog
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSaved={() => fetchRules(page, pageSize)}
        editingRule={editingRule}
        eventTypes={eventTypes}
      />

      {/* 回测对话框 */}
      {backtestRule && (
        <SignalRuleBacktestDialog
          open
          onClose={() => setBacktestRule(null)}
          ruleId={backtestRule.id}
          ruleName={backtestRule.name}
        />
      )}

      {/* 删除确认 */}
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

      {/* 扫描进度 */}
      <ProgressSnackbar
        open={scanState.open}
        onClose={() => setScanState((s) => ({ ...s, open: false }))}
        title={scanState.title}
        message={scanState.message}
        progress={scanState.progress}
        indeterminate={scanState.indeterminate}
      />
    </Stack>
  );
}
