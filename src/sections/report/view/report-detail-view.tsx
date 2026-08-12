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

import { getReportDetail } from 'src/api/report';
import { DashboardContent } from 'src/layouts/dashboard';

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
  const [shareOpen, setShareOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(true);
  const [snackbar, setSnackbar] = useState<SnackbarState>(initialSnackbar);
  const activeReportIdRef = useRef(id);
  activeReportIdRef.current = id;

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
        if (activeReportIdRef.current !== reportId) return null;
        setReport(data);
        return data;
      } catch (err) {
        if (activeReportIdRef.current !== reportId) return null;
        showSnackbar(err instanceof Error ? err.message : '加载失败', 'error');
        return null;
      }
    },
    [showSnackbar]
  );

  // Initial load
  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    setLoading(true);
    fetchDetail(id).finally(() => {
      if (!cancelled && activeReportIdRef.current === id) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [id, fetchDetail]);

  // Polling for PENDING / GENERATING
  useEffect(() => {
    if (!report?.id || !id) return undefined;
    if (report.status !== 'PENDING' && report.status !== 'GENERATING') return undefined;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const pollAfterDelay = () => {
      timeoutId = setTimeout(async () => {
        timeoutId = undefined;
        if (cancelled) return;

        // Schedule only after the current request completes, so slow responses never overlap.
        const updated = await fetchDetail(id);
        if (
          !cancelled &&
          (!updated || updated.status === 'PENDING' || updated.status === 'GENERATING')
        ) {
          pollAfterDelay();
        }
      }, 3000);
    };

    pollAfterDelay();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
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
        <IconButton size="small" aria-label="复制链接" onClick={handleCopyLink}>
          <Iconify icon="solar:copy-bold" />
        </IconButton>
      </Tooltip>
      <Tooltip title="分享">
        <IconButton size="small" aria-label="分享" onClick={() => setShareOpen(true)}>
          <Iconify icon="solar:share-bold" />
        </IconButton>
      </Tooltip>
      <Tooltip title="打印">
        <span>
          <IconButton size="small" aria-label="打印" onClick={handlePrint} disabled={!isCompleted}>
            <Iconify icon="solar:file-text-bold" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="重新生成能力未开放">
        <span>
          <IconButton
            size="small"
            aria-label="重新生成（未开放）"
            disabled
          >
            <Iconify icon="solar:refresh-bold" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={notesOpen ? '隐藏笔记' : '显示笔记'}>
        <IconButton size="small" aria-label={notesOpen ? '隐藏笔记' : '显示笔记'} onClick={() => setNotesOpen((v) => !v)}>
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
              <ReportNotesPanel report={report} />
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
