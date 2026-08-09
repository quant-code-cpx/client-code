import type { SyntheticEvent } from 'react';
import type { AlertColor } from '@mui/material/Alert';
import type { ReportType, ReportStatus, ReportListItem, ReportSchedule } from 'src/api/report';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { listReports, deleteReport, regenerateReport as regenerateReportApi } from 'src/api/report';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { formatFileSize } from '../utils/format-file-size';
import { ReportScheduleList } from '../report-schedule-list';
import { ReportGenerateDialog } from '../report-generate-dialog';
import { ReportScheduleDialog } from '../report-schedule-dialog';
import { paramsHash as computeHash } from '../utils/params-hash';
import { ReportShareDialog } from '../components/report-share-dialog';
import { ReportTypeChip, ReportStatusChip } from '../components/report-chips';

const STATUS_FILTERS: { value: ReportStatus; label: string }[] = [
  { value: 'PENDING', label: '待生成' },
  { value: 'GENERATING', label: '生成中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'FAILED', label: '失败' },
];

type SnackbarState = { open: boolean; message: string; severity: AlertColor };

const initialSnackbar: SnackbarState = { open: false, message: '', severity: 'success' };

export function ReportListView() {
  const router = useRouter();

  const [currentTab, setCurrentTab] = useState('manual');
  const [filterType, setFilterType] = useState<ReportType | ''>('');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus[]>([]);
  const [groupBySeries, setGroupBySeries] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [items, setItems] = useState<ReportListItem[]>([]);
  const [total, setTotal] = useState(0);

  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ReportSchedule | null>(null);
  const [scheduleListKey, setScheduleListKey] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<ReportListItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [shareTarget, setShareTarget] = useState<ReportListItem | null>(null);

  const [snackbar, setSnackbar] = useState<SnackbarState>(initialSnackbar);

  const showSnackbar = useCallback((message: string, severity: AlertColor = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleSnackbarClose = (_e?: SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbar((s) => ({ ...s, open: false }));
  };

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listReports({
        type: filterType || undefined,
        page: page + 1,
        pageSize,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败，请稍后重试');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filterType, page, pageSize]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Client-side filter (keyword + status) + optional series grouping
  const visibleItems = useMemo(() => {
    let list = items;
    const kw = keyword.trim().toLowerCase();
    if (kw) {
      list = list.filter(
        (it) =>
          it.title.toLowerCase().includes(kw) ||
          it.id.toLowerCase().includes(kw) ||
          (it.paramsHash ?? '').toLowerCase().includes(kw)
      );
    }
    if (statusFilter.length > 0) {
      list = list.filter((it) => statusFilter.includes(it.status));
    }
    if (groupBySeries) {
      // Keep the most recent item per series key (paramsHash || type+title)
      const seenKey = new Set<string>();
      const result: ReportListItem[] = [];
      const sorted = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      for (const it of sorted) {
        const key = it.paramsHash ?? computeHash({ type: it.type, title: it.title });
        if (seenKey.has(key)) continue;
        seenKey.add(key);
        result.push(it);
      }
      return result;
    }
    return list;
  }, [items, keyword, statusFilter, groupBySeries]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await deleteReport({ reportId: deleteTarget.id });
      setDeleteTarget(null);
      showSnackbar('已删除');
      fetchList();
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : '删除失败', 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleCopyLink = async (row: ReportListItem) => {
    const url = `${window.location.origin}${paths.research.report.detail(row.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      showSnackbar('链接已复制');
    } catch {
      showSnackbar('复制失败，请手动复制', 'warning');
    }
  };

  const handleRegenerate = async (row: ReportListItem) => {
    try {
      await regenerateReportApi({ reportId: row.id });
      showSnackbar('已提交重新生成');
      fetchList();
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : '重新生成失败', 'error');
    }
  };

  const toggleStatus = (s: ReportStatus) => {
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  return (
    <DashboardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">量化报告</Typography>
        {currentTab === 'manual' && (
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:add-circle-bold" />}
            onClick={() => setGenerateDialogOpen(true)}
          >
            生成报告
          </Button>
        )}
      </Box>

      <Tabs value={currentTab} onChange={(_, val) => setCurrentTab(val)} sx={{ mb: 3 }}>
        <Tab label="手动报告" value="manual" />
        <Tab label="定时报告" value="schedule" />
      </Tabs>

      {currentTab === 'manual' && (
        <>
          {/* Toolbar */}
          <Card sx={{ p: 2, mb: 2 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              alignItems={{ md: 'center' }}
            >
              <TextField
                size="small"
                placeholder="搜索标题 / ID / 参数指纹"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                sx={{ minWidth: 240 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Iconify
                        icon="solar:magnifier-bold"
                        width={18}
                        sx={{ mr: 1, color: 'text.disabled' }}
                      />
                    ),
                  },
                }}
              />
              <TextField
                select
                size="small"
                label="类型"
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as ReportType | '');
                  setPage(0);
                }}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="BACKTEST">回测报告</MenuItem>
                <MenuItem value="STOCK">个股研报</MenuItem>
                <MenuItem value="PORTFOLIO">组合报告</MenuItem>
                <MenuItem value="STRATEGY_RESEARCH">策略研究</MenuItem>
              </TextField>

              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
                {STATUS_FILTERS.map((s) => (
                  <Chip
                    key={s.value}
                    size="small"
                    label={s.label}
                    color={statusFilter.includes(s.value) ? 'primary' : 'default'}
                    variant={statusFilter.includes(s.value) ? 'filled' : 'outlined'}
                    onClick={() => toggleStatus(s.value)}
                  />
                ))}
              </Stack>

              <Box sx={{ flex: 1 }} />

              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={groupBySeries}
                    onChange={(e) => setGroupBySeries(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    按系列折叠
                  </Typography>
                }
              />
              <Tooltip title="刷新">
                <span>
                  <IconButton size="small" onClick={fetchList} disabled={loading} aria-label="刷新">
                    <Iconify icon="solar:refresh-bold" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Card>

          <Collapse in={!!error}>
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button size="small" onClick={fetchList}>
                  重试
                </Button>
              }
            >
              {error}
            </Alert>
          </Collapse>

          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>标题</TableCell>
                    <TableCell>类型</TableCell>
                    <TableCell>格式</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>版本</TableCell>
                    <TableCell>文件大小</TableCell>
                    <TableCell>创建时间</TableCell>
                    <TableCell>完成时间</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        加载中…
                      </TableCell>
                    </TableRow>
                  ) : visibleItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        {items.length === 0 ? '暂无报告，点击"生成报告"开始' : '没有匹配的报告'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleItems.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                            onClick={() => router.push(paths.research.report.detail(row.id))}
                          >
                            {row.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <ReportTypeChip type={row.type} />
                        </TableCell>
                        <TableCell>{row.format}</TableCell>
                        <TableCell>
                          <ReportStatusChip status={row.status} />
                        </TableCell>
                        <TableCell>
                          {row.version != null ? (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              v{row.version}
                            </Typography>
                          ) : (
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{formatFileSize(row.fileSize)}</TableCell>
                        <TableCell>{fDateTime(row.createdAt)}</TableCell>
                        <TableCell>{row.completedAt ? fDateTime(row.completedAt) : '—'}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                            <Tooltip title="查看">
                              <IconButton
                                size="small"
                                aria-label="查看"
                                onClick={() => router.push(paths.research.report.detail(row.id))}
                              >
                                <Iconify icon="solar:eye-bold" width={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="复制链接">
                              <IconButton size="small" aria-label="复制链接" onClick={() => handleCopyLink(row)}>
                                <Iconify icon="solar:copy-bold" width={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="分享">
                              <IconButton size="small" aria-label="分享" onClick={() => setShareTarget(row)}>
                                <Iconify icon="solar:share-bold" width={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="重新生成">
                              <span>
                                <IconButton
                                  size="small"
                                  aria-label="重新生成"
                                  disabled={row.status === 'GENERATING' || row.status === 'PENDING'}
                                  onClick={() => handleRegenerate(row)}
                                >
                                  <Iconify icon="solar:refresh-bold" width={18} />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="删除">
                              <IconButton
                                size="small"
                                aria-label="删除"
                                color="error"
                                onClick={() => setDeleteTarget(row)}
                              >
                                <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              rowsPerPage={pageSize}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50]}
              labelRowsPerPage="每页"
            />
          </Card>
        </>
      )}

      {currentTab === 'schedule' && (
        <ReportScheduleList
          key={scheduleListKey}
          onEdit={(schedule) => {
            setEditingSchedule(schedule);
            setScheduleDialogOpen(true);
          }}
          onAdd={() => {
            setEditingSchedule(null);
            setScheduleDialogOpen(true);
          }}
        />
      )}

      <ReportGenerateDialog
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
        onGenerated={() => {
          setGenerateDialogOpen(false);
          showSnackbar('已提交生成任务');
          fetchList();
        }}
      />

      <ReportScheduleDialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        onSaved={() => setScheduleListKey((k) => k + 1)}
        editingSchedule={editingSchedule}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="确认删除"
        content={
          <Typography variant="body2" color="text.secondary">
            删除后无法恢复，确定要删除报告
            <Box component="span" sx={{ color: 'text.primary', mx: 0.5 }}>
              {deleteTarget?.title}
            </Box>
            吗？
          </Typography>
        }
        onClose={() => !deleteSubmitting && setDeleteTarget(null)}
        onConfirm={handleDelete}
        submitting={deleteSubmitting}
        confirmLabel="删除"
        confirmColor="error"
      />

      {shareTarget && (
        <ReportShareDialog
          open={!!shareTarget}
          reportId={shareTarget.id}
          onClose={() => setShareTarget(null)}
          onMessage={(msg, sev) => showSnackbar(msg, sev)}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={handleSnackbarClose}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
