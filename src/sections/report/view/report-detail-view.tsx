import { useParams } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { type Report, getReportDetail } from 'src/api/report';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { StockReportViewer } from '../report-stock-viewer';
import { BacktestReportViewer } from '../report-backtest-viewer';
import { StrategyReportViewer } from '../report-strategy-viewer';
import { PortfolioReportViewer } from '../report-portfolio-viewer';
import { REPORT_TYPE_LABELS, REPORT_TYPE_COLORS, REPORT_STATUS_CONFIG } from '../constants';

// ── Component ─────────────────────────────────────────────────

export function ReportDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDetail = async (reportId: string) => {
    try {
      const data = await getReportDetail({ reportId });
      setReport(data);
      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // Initial load
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchDetail(id).finally(() => setLoading(false));
  }, [id]);

  // Polling for PENDING / GENERATING
  useEffect(() => {
    if (!report?.id || !id) return undefined;
    if (report?.status !== 'PENDING' && report?.status !== 'GENERATING') return undefined;

    pollingRef.current = setInterval(async () => {
      const updated = await fetchDetail(id);
      if (updated && updated.status !== 'PENDING' && updated.status !== 'GENERATING') {
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [report?.id, report?.status, id]);

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

  const statusCfg = REPORT_STATUS_CONFIG[report.status];

  return (
    <DashboardContent>
      {/* 顶部导航 */}
      <Button
        startIcon={<Iconify icon="solar:arrow-left-bold" />}
        onClick={() => router.push('/research/report')}
        sx={{ mb: 2 }}
      >
        返回列表
      </Button>

      {/* 报告元信息 */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          {report.title}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
          <Label color={REPORT_TYPE_COLORS[report.type] as any}>
            {REPORT_TYPE_LABELS[report.type]}
          </Label>
          <Label color="default">{report.format}</Label>
          <Label color={statusCfg.color as any}>{statusCfg.label}</Label>
        </Stack>
        <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            创建时间：{fDateTime(report.createdAt)}
          </Typography>
          {report.completedAt && (
            <Typography variant="body2" color="text.secondary">
              完成时间：{fDateTime(report.completedAt)}
            </Typography>
          )}
        </Stack>
      </Card>

      {/* 内容区 */}
      {(report.status === 'PENDING' || report.status === 'GENERATING') && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
          <CircularProgress />
          <Typography color="text.secondary">报告正在生成中，请稍候…</Typography>
        </Box>
      )}

      {report.status === 'FAILED' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          报告生成失败：{report.errorMessage ?? '未知错误'}
        </Alert>
      )}

      {report.status === 'COMPLETED' && report.data && (
        <>
          {report.type === 'BACKTEST' && <BacktestReportViewer data={report.data as any} />}
          {report.type === 'STOCK' && <StockReportViewer data={report.data as any} />}
          {report.type === 'PORTFOLIO' && <PortfolioReportViewer data={report.data as any} />}
          {report.type === 'STRATEGY_RESEARCH' && (
            <StrategyReportViewer data={report.data as any} />
          )}
        </>
      )}

      {report.status === 'COMPLETED' && !report.data && (
        <Alert severity="info">此报告为文件格式，请使用下方链接下载查看。</Alert>
      )}

      {/* 下载按钮 */}
      {report.filePath && (
        <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:download-bold" />}
            href={report.filePath}
            target="_blank"
            rel="noopener noreferrer"
          >
            下载 {report.format}
          </Button>
        </Box>
      )}
    </DashboardContent>
  );
}
