import type { PortfolioDetail, PortfolioListItem, UpdatePortfolioRequest } from 'src/api/portfolio';

import { useParams } from 'react-router-dom';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import TabList from '@mui/lab/TabList';
import Alert from '@mui/material/Alert';
import TabPanel from '@mui/lab/TabPanel';
import TabContext from '@mui/lab/TabContext';
import Skeleton from '@mui/material/Skeleton';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { deletePortfolio, updatePortfolio, getPortfolioDetail } from 'src/api/portfolio';

import { ReportGenerateDialog } from 'src/sections/report/report-generate-dialog';

import { DETAIL_TABS } from '../constants';
import { PortfolioPnlTab } from '../portfolio-pnl-tab';
import { PortfolioRiskTab } from '../portfolio-risk-tab';
import { PortfolioDriftTab } from '../portfolio-drift-tab';
import { PortfolioEditDialog } from '../portfolio-edit-dialog';
import { PortfolioHoldingTab } from '../portfolio-holding-tab';
import { PortfolioRiskRuleTab } from '../portfolio-risk-rule-tab';
import { PortfolioTradeLogTab } from '../portfolio-trade-log-tab';
import { PortfolioDeleteDialog } from '../portfolio-delete-dialog';
import { PortfolioDetailHeader } from '../portfolio-detail-header';
import { PortfolioSummaryCards } from '../portfolio-summary-cards';
import { PortfolioPerformanceTab } from '../portfolio-performance-tab';

// ----------------------------------------------------------------------

export function PortfolioDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<PortfolioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('holdings');
  const visitedTabs = useRef<Set<string>>(new Set(['holdings']));

  const [editOpen, setEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getPortfolioDetail({ portfolioId: id });
      setDetail(data);
    } catch {
      setError('加载组合详情失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
    visitedTabs.current.add(newValue);
  };

  const handleEdit = async (data: UpdatePortfolioRequest) => {
    setEditSubmitting(true);
    try {
      await updatePortfolio(data);
      setEditOpen(false);
      await fetchDetail();
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleteSubmitting(true);
    try {
      await deletePortfolio({ portfolioId: id });
      router.push('/portfolio');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardContent>
        <Skeleton variant="rectangular" height={120} sx={{ mb: 2, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 2 }} />
      </DashboardContent>
    );
  }

  if (error || !detail) {
    return (
      <DashboardContent>
        <Alert severity="error">{error || '组合不存在'}</Alert>
      </DashboardContent>
    );
  }

  const portfolioAsListItem: PortfolioListItem = {
    ...detail.portfolio,
    holdingCount: detail.holdings.length,
    updatedAt: detail.portfolio.createdAt,
  };

  return (
    <DashboardContent>
      <PortfolioDetailHeader
        detail={detail}
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        onGenerateReport={() => setReportDialogOpen(true)}
      />

      <PortfolioSummaryCards summary={detail.summary} />

      <TabContext value={activeTab}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <TabList onChange={handleTabChange}>
            {DETAIL_TABS.map((tab) => (
              <Tab key={tab.value} value={tab.value} label={tab.label} />
            ))}
          </TabList>
        </Box>
        <TabPanel value="holdings" sx={{ p: 0 }}>
          {visitedTabs.current.has('holdings') && (
            <PortfolioHoldingTab
              portfolioId={id!}
              holdings={detail.holdings}
              onRefresh={fetchDetail}
            />
          )}
        </TabPanel>
        <TabPanel value="pnl" sx={{ p: 0 }}>
          {visitedTabs.current.has('pnl') && <PortfolioPnlTab portfolioId={id!} />}
        </TabPanel>
        <TabPanel value="risk" sx={{ p: 0 }}>
          {visitedTabs.current.has('risk') && <PortfolioRiskTab portfolioId={id!} />}
        </TabPanel>
        <TabPanel value="rules" sx={{ p: 0 }}>
          {visitedTabs.current.has('rules') && <PortfolioRiskRuleTab portfolioId={id!} />}
        </TabPanel>
        <TabPanel value="performance" sx={{ p: 0 }}>
          {visitedTabs.current.has('performance') && (
            <PortfolioPerformanceTab portfolioId={id!} />
          )}
        </TabPanel>
        <TabPanel value="trade-log" sx={{ p: 0 }}>
          {visitedTabs.current.has('trade-log') && <PortfolioTradeLogTab portfolioId={id!} />}
        </TabPanel>
        <TabPanel value="drift" sx={{ p: 0 }}>
          {visitedTabs.current.has('drift') && <PortfolioDriftTab portfolioId={id!} />}
        </TabPanel>
      </TabContext>

      <PortfolioEditDialog
        open={editOpen}
        portfolio={portfolioAsListItem}
        onClose={() => setEditOpen(false)}
        onConfirm={handleEdit}
        submitting={editSubmitting}
      />

      <PortfolioDeleteDialog
        open={deleteOpen}
        portfolio={portfolioAsListItem}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        submitting={deleteSubmitting}
      />

      <ReportGenerateDialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        onGenerated={() => setReportDialogOpen(false)}
        defaultType="PORTFOLIO"
        defaultParams={{ portfolioId: id ?? '' }}
      />
    </DashboardContent>
  );
}
