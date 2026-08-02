import type { StockDetailOverviewData } from 'src/api/stock';

import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { stockDetailApi } from 'src/api/stock';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { ReportGenerateDialog } from 'src/sections/report/report-generate-dialog';

import { StockDetailHeader } from '../stock-detail-header';
import { StockDetailMarketTab } from '../stock-detail-market-tab';
import { StockDetailNotesDrawer } from '../stock-detail-notes-drawer';
import { StockDetailAnalysisTab } from '../stock-detail-analysis-tab';
import { StockDetailFinancialsTab } from '../stock-detail-financials-tab';
import { StockDetailCompanySuiteTab } from '../stock-detail-company-suite-tab';

// ----------------------------------------------------------------------

type MainTab = 'market' | 'analysis' | 'financials' | 'company';

const TABS: { value: MainTab; label: string }[] = [
  { value: 'market', label: '行情' },
  { value: 'analysis', label: '分析' },
  { value: 'financials', label: '财务' },
  { value: 'company', label: '公司与股本' },
];

const normalizeStockDetailTab = (value: string | null): MainTab =>
  TABS.some((tab) => tab.value === value) ? (value as MainTab) : 'market';

// ----------------------------------------------------------------------

export function StockDetailView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tsCode = searchParams.get('code') ?? '';

  const [activeTab, setActiveTab] = useState<MainTab>(() => normalizeStockDetailTab(tabParam));
  const [overview, setOverview] = useState<StockDetailOverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);

  const stockName = overview?.basic?.name ?? undefined;
  const snapshotPrice = overview?.latestQuote?.close ?? null;
  const snapshotTradeDate = overview?.latestQuote?.tradeDate ?? null;
  const snapshotPctChg = overview?.latestQuote?.pctChg ?? null;

  const fetchOverview = useCallback(async () => {
    if (!tsCode) return;
    setOverviewLoading(true);
    setOverviewError('');
    try {
      const data = await stockDetailApi.overview(tsCode);
      setOverview(data);
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : '获取股票详情失败');
    } finally {
      setOverviewLoading(false);
    }
  }, [tsCode]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (tabParam === 'notes') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', 'market');
      setActiveTab('market');
      setNotesDrawerOpen(true);
      setSearchParams(nextParams, { replace: true });
      return;
    }

    const nextTab = normalizeStockDetailTab(tabParam);
    setActiveTab((prev) => (prev === nextTab ? prev : nextTab));
  }, [searchParams, setSearchParams, tabParam]);

  const handleTabChange = (_event: React.SyntheticEvent, value: MainTab) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', value);
    setActiveTab(value);
    setSearchParams(nextParams, { replace: true });
  };

  if (!tsCode) {
    return (
      <DashboardContent>
        <Alert severity="warning">未指定股票代码，请从股票列表进入详情页。</Alert>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      {overviewError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {overviewError}
        </Alert>
      )}

      {/* 头部基础数据 */}
      <StockDetailHeader tsCode={tsCode} overview={overview} loading={overviewLoading} />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: -1, mb: 1 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setNotesDrawerOpen(true)}
          startIcon={<Iconify icon="solar:document-text-bold" width={14} />}
        >
          我的研究
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setReportDialogOpen(true)}
          startIcon={<Iconify icon="solar:file-text-bold" width={14} />}
        >
          生成研报
        </Button>
      </Box>

      <Divider sx={{ mb: 0 }} />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {TABS.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ pt: 3 }}>
        {activeTab === 'market' && <StockDetailMarketTab tsCode={tsCode} />}
        {activeTab === 'analysis' && <StockDetailAnalysisTab tsCode={tsCode} />}
        {activeTab === 'financials' && <StockDetailFinancialsTab tsCode={tsCode} />}
        {activeTab === 'company' && (
          <StockDetailCompanySuiteTab
            tsCode={tsCode}
            overview={overview}
            loading={overviewLoading}
          />
        )}
      </Box>

      {/* 底部说明 */}
      <Box sx={{ mt: 4, py: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          数据来源：Tushare · 仅供参考，不构成投资建议
        </Typography>
      </Box>

      <ReportGenerateDialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        onGenerated={() => setReportDialogOpen(false)}
        defaultType="STOCK"
        defaultParams={{ tsCode }}
      />

      <StockDetailNotesDrawer
        open={notesDrawerOpen}
        tsCode={tsCode}
        stockName={stockName}
        snapshotPrice={snapshotPrice}
        snapshotTradeDate={snapshotTradeDate}
        snapshotPctChg={snapshotPctChg}
        onClose={() => setNotesDrawerOpen(false)}
      />
    </DashboardContent>
  );
}
