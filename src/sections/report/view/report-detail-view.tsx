import type { SyntheticEvent } from 'react';
import type { AlertColor } from '@mui/material/Alert';
import type {
  Report,
  StockReportData,
  BacktestReportData,
  PortfolioReportData,
  StrategyResearchReportData,
} from 'src/api/report';

import { useParams } from 'react-router-dom';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { getReportDetail, regenerateReport as regenerateReportApi } from 'src/api/report';

import { Iconify } from 'src/components/iconify';

import { StockReportViewer } from '../report-stock-viewer';
import { BacktestReportViewer } from '../report-backtest-viewer';
import { StrategyReportViewer } from '../report-strategy-viewer';
import { ReportErrorCard } from '../components/report-error-card';
import { ReportProgressBar } from '../components/report-progress';
import { PortfolioReportViewer } from '../report-portfolio-viewer';
import { ReportNotesPanel } from '../components/report-notes-panel';
import { ReportShareDialog } from '../components/report-share-dialog';
import { ReportDetailHeader } from '../components/report-detail-header';

type SnackbarState = { open: boolean; message: string; severity: AlertColor };

const initialSnackbar: SnackbarState = { open: false, message: '', severity: 'success' };

export function ReportDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(true);
  const [snackbar, setSnackbar] = useState<SnackbarState>(initialSnackbar);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showSnackbar = useCallback((message: string, severity: AlertColor = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleSnackbarClose = (_e?: SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbar((s) => ({ ...s, open: false }));
  };

  const fetchDetail = useCallback(
    async (reportId: string) => {
      try {
        const data = await getReportDetail({ reportId });
        setReport(data);
        return data;
      } catch (err) {
        showSnackbar(err instanceof Error ? err.message : '加载失败', 'error');
        return null;
      }
    },
    [showSnackbar]
  );

  // Initial load
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchDetail(id).finally(() => setLoading(false));
  }, [id, fetchDetail]);

  // Polling for PENDING / GENERATING
  useEffect(() => {
    if (!report?.id || !id) return undefined;
    if (report.status !== 'PENDING' && report.status !== 'GENERATING') return undefined;

    pollingRef.current = setInterval(async () => {
      const updated = await fetchDetail(id);
      if (updated && updated.status !== 'PENDING' && updated.status !== 'GENERATING') {
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [report?.id, report?.status, id, fetchDetail]);

  const handleCopyLink = async () => {
    if (!report) return;
    const url = `${window.location.origin}${paths.research.report.detail(report.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      showSnackbar('链接已复制');
    } catch {
      showSnackbar('复制失败，请手动复制', 'warning');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRegenerate = async () => {
    if (!report) return;
    setRetrying(true);
    try {
      await regenerateReportApi({ reportId: report.id });
      showSnackbar('已提交重新生成');
      // Refresh after a short delay so the new status reflects
      if (id) await fetchDetail(id);
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : '重新生成失败', 'error');
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (!report) {
    return (
      <DashboardContent>
        <Alert severity="error">报告不存在或加载失败</Alert>
      </DashboardContent>
    );
  }

  const isInProgress = report.status === 'PENDING' || report.status === 'GENERATING';
  const isFailed = report.status === 'FAILED';
  const isCompleted = report.status === 'COMPLETED';

  const headerActions = (
    <Stack direction="row" spacing={0.5} className="report-detail-toolbar">
      <Tooltip title="复制链接">
        <IconButton size="small" onClick={handleCopyLink}>
          <Iconify icon="solar:copy-bold" />
        </IconButton>
      </Tooltip>
      <Tooltip title="分享">
        <IconButton size="small" onClick={() => setShareOpen(true)}>
          <Iconify icon="solar:share-bold" />
        </IconButton>
      </Tooltip>
      <Tooltip title="打印">
        <IconButton size="small" onClick={handlePrint} disabled={!isCompleted}>
          <Iconify icon="solar:file-text-bold" />
        </IconButton>
      </Tooltip>
      <Tooltip title="重新生成">
        <IconButton size="small" onClick={handleRegenerate} disabled={retrying || isInProgress}>
          <Iconify icon="solar:refresh-bold" />
        </IconButton>
      </Tooltip>
      <Tooltip title={notesOpen ? '隐藏笔记' : '显示笔记'}>
        <IconButton size="small" onClick={() => setNotesOpen((v) => !v)}>
          <Iconify icon="solar:notebook-bold-duotone" />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  return (
    <DashboardContent
      sx={{
        '@media print': {
          '& .report-detail-toolbar, & .report-back-button, & .report-notes-panel': {
            display: 'none',
          },
        },
      }}
    >
      <Button
        className="report-back-button"
        startIcon={<Iconify icon="solar:arrow-left-bold" />}
        onClick={() => router.push(paths.research.report.list)}
        sx={{ mb: 2 }}
      >
        返回列表
      </Button>

      <ReportDetailHeader report={report} actions={headerActions} />

      {isInProgress && (
        <Box sx={{ mb: 3 }}>
          <ReportProgressBar progress={report.progress} />
        </Box>
      )}

      {isFailed && (
        <Box sx={{ mb: 3 }}>
          <ReportErrorCard
            report={report}
            retrying={retrying}
            onRetry={handleRegenerate}
            onJump={(path) => router.push(path)}
          />
        </Box>
      )}

      {isCompleted && (
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', lg: notesOpen ? '1fr 320px' : '1fr' },
            alignItems: 'flex-start',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {report.data ? (
              <ReportContent report={report} />
            ) : (
              <Alert severity="info">此报告为文件格式，当前前端不提供文件下载入口。</Alert>
            )}
          </Box>

          {notesOpen && (
            <Box className="report-notes-panel">
              <ReportNotesPanel
                report={report}
                onSaved={(notes, updatedAt) =>
                  setReport((prev) => (prev ? { ...prev, notes, notesUpdatedAt: updatedAt } : prev))
                }
              />
            </Box>
          )}
        </Box>
      )}

      <ReportShareDialog
        open={shareOpen}
        reportId={report.id}
        onClose={() => setShareOpen(false)}
        onMessage={(msg, sev) => showSnackbar(msg, sev)}
      />

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

// ── Type-narrowed viewer router ─────────────────────────────────────────────

function ReportContent({ report }: { report: Report }) {
  switch (report.type) {
    case 'BACKTEST':
      return <BacktestReportViewer data={report.data as unknown as BacktestReportData} />;
    case 'STOCK':
      return <StockReportViewer data={report.data as unknown as StockReportData} />;
    case 'PORTFOLIO':
      return <PortfolioReportViewer data={report.data as unknown as PortfolioReportData} />;
    case 'STRATEGY_RESEARCH':
      return <StrategyReportViewer data={report.data as unknown as StrategyResearchReportData} />;
    default:
      return null;
  }
}
