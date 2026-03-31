import type { StockDetailOverviewData } from 'src/api/stock';

import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { stockDetailApi } from 'src/api/stock';
import { DashboardContent } from 'src/layouts/dashboard';

import { StockDetailHeader } from '../stock-detail-header';
import { StockDetailMarketTab } from '../stock-detail-market-tab';
import { StockDetailCompanyTab } from '../stock-detail-company-tab';
import { StockDetailDividendTab } from '../stock-detail-dividend-tab';
import { StockDetailAnalysisTab } from '../stock-detail-analysis-tab';
import { StockDetailFinancialsTab } from '../stock-detail-financials-tab';
import { StockDetailShareholdersTab } from '../stock-detail-shareholders-tab';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'market', label: '行情' },
  { value: 'company', label: '公司概况' },
  { value: 'analysis', label: '分析' },
  { value: 'financials', label: '财务' },
  { value: 'shareholders', label: '股本股东' },
  { value: 'dividend', label: '分红融资' },
];

// ----------------------------------------------------------------------

export function StockDetailView() {
  const [searchParams] = useSearchParams();
  const tsCode = searchParams.get('code') ?? '';

  const [activeTab, setActiveTab] = useState('market');
  const [overview, setOverview] = useState<StockDetailOverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');

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

      <Divider sx={{ mb: 0 }} />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
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
          <StockDetailCompanyTab overview={overview} loading={overviewLoading} />
        )}
        {activeTab === 'shareholders' && <StockDetailShareholdersTab tsCode={tsCode} />}
        {activeTab === 'dividend' && <StockDetailDividendTab tsCode={tsCode} />}
      </Box>

      {/* 底部说明 */}
      <Box sx={{ mt: 4, py: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          数据来源：Tushare · 仅供参考，不构成投资建议
        </Typography>
      </Box>
    </DashboardContent>
  );
}
