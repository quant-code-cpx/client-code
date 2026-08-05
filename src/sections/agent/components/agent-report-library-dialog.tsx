import type { AgentResponse } from 'src/api/agent';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import ListItemButton from '@mui/material/ListItemButton';

import { fDate, fDateTime } from 'src/utils/format-time';

import { agentApi } from 'src/api/agent';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { AgentReportContent } from './agent-report-content';

type ResearchReportListItem = AgentResponse<'/agent/reports/list'>['items'][number];
type ResearchReportDetail = AgentResponse<'/agent/reports/detail'>;

type AgentReportLibraryDialogProps = {
  open: boolean;
  onClose: () => void;
};

function statusColor(status: ResearchReportListItem['status']): 'default' | 'info' | 'success' | 'error' | 'warning' {
  if (status === 'COMPLETED') return 'success';
  if (status === 'FAILED') return 'error';
  if (status === 'DELETED') return 'warning';
  if (status === 'GENERATING') return 'info';
  return 'default';
}

export function AgentReportLibraryDialog({ open, onClose }: AgentReportLibraryDialogProps) {
  const [reports, setReports] = useState<ResearchReportListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ResearchReportDetail | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResearchReportListItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async (cursor: string | null, append: boolean) => {
    setLoadingList(true);
    setError(null);
    try {
      const response = await agentApi.listReports({ cursor, limit: 30 });
      setReports((current) => (append ? [...current, ...response.items] : response.items));
      setNextCursor(response.nextCursor ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '加载研究报告失败');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    setDetail(null);
    void loadReports(null, false);
  }, [loadReports, open]);

  const selectReport = useCallback(async (reportId: string) => {
    setSelectedId(reportId);
    setDetail(null);
    setLoadingDetail(true);
    setError(null);
    try {
      setDetail(await agentApi.getReport({ reportId }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '加载报告详情失败');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await agentApi.deleteReport({ reportId: deleteTarget.reportId });
      setReports((current) => current.filter((report) => report.reportId !== deleteTarget.reportId));
      if (selectedId === deleteTarget.reportId) {
        setSelectedId(null);
        setDetail(null);
      }
      setDeleteTarget(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '删除研究报告失败');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, selectedId]);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="xl"
        aria-labelledby="agent-report-library-title"
        slotProps={{
          paper: {
            sx: {
              height: { md: 'min(820px, calc(100dvh - 64px))' },
              color: 'text.primary',
              bgcolor: 'background.default',
              backgroundImage: 'none',
              overflow: 'hidden',
              overscrollBehavior: 'contain',
            },
          },
        }}
      >
        <DialogTitle component="div" id="agent-report-library-title">
          <Typography variant="caption" sx={{ color: 'primary.light', letterSpacing: 1 }}>
            RESEARCH REPORTS
          </Typography>
          <Typography variant="h6">研究报告</Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {error ? <Alert severity="error" sx={{ borderRadius: 0 }}>{error}</Alert> : null}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '300px minmax(0, 1fr)' },
              minHeight: 1,
              height: 1,
            }}
          >
            <Box sx={{ borderRight: { md: 1 }, borderBottom: { xs: 1, md: 0 }, borderColor: 'divider', minWidth: 0 }}>
              {loadingList && reports.length === 0 ? (
                <Stack spacing={1} sx={{ p: 2 }}>
                  {[0, 1, 2, 3].map((item) => <Skeleton key={item} variant="rounded" height={64} />)}
                </Stack>
              ) : reports.length === 0 ? (
                <Box sx={{ p: 3 }}><Typography variant="body2" color="text.secondary">暂无已保存报告</Typography></Box>
              ) : (
                <List disablePadding aria-label="已保存研究报告">
                  {reports.map((report) => (
                    <ListItemButton
                      key={report.reportId}
                      selected={selectedId === report.reportId}
                      onClick={() => void selectReport(report.reportId)}
                      sx={{
                        alignItems: 'flex-start',
                        mx: 1.5,
                        my: 0.75,
                        px: 1.5,
                        py: 1.5,
                        border: 1,
                        borderColor: 'transparent',
                        borderRadius: 1.25,
                        '&.Mui-selected': { borderColor: 'primary.main' },
                      }}
                    >
                      <ListItemText
                        primary={report.title}
                        secondary={`${fDate(report.dataAsOf)} · ${fDateTime(report.createdAt)}`}
                        slotProps={{ primary: { noWrap: true, sx: { fontWeight: 700 } }, secondary: { noWrap: true } }}
                      />
                      <Label color={statusColor(report.status)} variant="soft" sx={{ ml: 1 }}>
                        {report.status}
                      </Label>
                    </ListItemButton>
                  ))}
                </List>
              )}
              {nextCursor ? (
                <Box sx={{ p: 1.5 }}>
                  <Button fullWidth size="small" onClick={() => void loadReports(nextCursor, true)} disabled={loadingList}>
                    加载更多
                  </Button>
                </Box>
              ) : null}
            </Box>

            <Box sx={{ minWidth: 0, overflow: 'auto', p: { xs: 2, md: 3 } }}>
              {loadingDetail ? <Stack spacing={1}><Skeleton variant="text" width="60%" /><Skeleton variant="rounded" height={220} /></Stack> : null}
              {!loadingDetail && !detail ? <Typography variant="body2" color="text.secondary">选择左侧报告查看详情</Typography> : null}
              {detail ? (
                <Box
                  sx={{
                    minHeight: 560,
                    p: { xs: 2, md: 4 },
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6">{detail.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        数据截止 {detail.dataAsOf ?? '未标注'} · 保存于 {fDateTime(detail.createdAt)}
                      </Typography>
                    </Box>
                    <Tooltip title="删除报告">
                      <IconButton aria-label={`删除 ${detail.title}`} color="error" onClick={() => setDeleteTarget(detail)}>
                        <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                    {detail.summary}
                  </Typography>
                  {detail.errorMessage ? <Alert severity="warning" sx={{ mb: 2 }}>{detail.errorMessage}</Alert> : null}
                  <AgentReportContent
                    messageId={detail.messageId}
                    runId={detail.runId}
                    contentText={detail.contentText}
                    contentBlocks={detail.contentBlocks}
                    citations={detail.citations}
                  />
                </Box>
              ) : null}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions><Button onClick={onClose}>关闭</Button></DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除研究报告"
        content={deleteTarget ? `删除「${deleteTarget.title}」后将进入受控清理队列，无法继续在报告库查看。` : ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        submitting={deleting}
        confirmLabel="删除"
        confirmColor="error"
      />
    </>
  );
}
