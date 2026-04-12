import type { FactorDef } from 'src/api/factor';

import dayjs from 'dayjs';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { factorApi } from 'src/api/factor';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { CATEGORY_LABELS } from '../factor-library-card';
import { FactorBacktestPanel } from '../factor-backtest-panel';
import { FactorDetailIcChart } from '../factor-detail-ic-chart';
import { FactorDetailDecayChart } from '../factor-detail-decay-chart';
import { FactorDetailParamsPanel } from '../factor-detail-params-panel';
import { FactorDetailQuantileChart } from '../factor-detail-quantile-chart';
import { FactorDetailDistributionChart } from '../factor-detail-distribution-chart';
import { FactorDetailCrossSectionTable } from '../factor-detail-cross-section-table';

// ----------------------------------------------------------------------

type AnalysisParams = {
  startDate: string;
  endDate: string;
  universe?: string;
};

const TABS = [
  { label: 'IC 分析', value: 0 },
  { label: '分层回测', value: 1 },
  { label: '因子分布', value: 2 },
  { label: '因子衰减', value: 3 },
  { label: '截面排名', value: 4 },
  { label: '因子回测', value: 5 },
];

// ----------------------------------------------------------------------

export function FactorDetailView() {
  const { name: factorName = '' } = useParams<{ name: string }>();
  const navigate = useNavigate();

  const [factor, setFactor] = useState<FactorDef | null>(null);
  const [factorLoading, setFactorLoading] = useState(true);
  const [factorError, setFactorError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [params, setParams] = useState<AnalysisParams>({
    startDate: dayjs().subtract(250, 'day').format('YYYYMMDD'),
    endDate: dayjs().format('YYYYMMDD'),
    universe: undefined,
  });

  // Committed params (only update when user clicks "开始分析")
  const [committedParams, setCommittedParams] = useState<AnalysisParams>(params);

  useEffect(() => {
    if (!factorName) return;
    setFactorLoading(true);
    setFactorError('');
    factorApi
      .detail(factorName)
      .then((data) => setFactor(data))
      .catch((err) => setFactorError(err instanceof Error ? err.message : '获取因子详情失败'))
      .finally(() => setFactorLoading(false));
  }, [factorName]);

  const handleAnalyze = useCallback(() => {
    setAnalysisLoading(true);
    setCommittedParams({ ...params });
  }, [params]);

  // Reset analysisLoading after a tick to signal children to re-fetch.
  // Using useEffect + cleanup avoids a stale timer if the component unmounts.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (analysisLoading) {
      timer = setTimeout(() => setAnalysisLoading(false), 100);
    }
    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [analysisLoading]);

  if (!factorName) {
    return (
      <DashboardContent>
        <Alert severity="warning">未指定因子名称</Alert>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      {/* 返回按钮 + 因子标题 */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
        <Button
          size="small"
          startIcon={<Iconify icon="eva:arrow-back-fill" />}
          onClick={() => navigate(-1)}
        >
          返回
        </Button>

        {factorLoading ? (
          <Skeleton width={200} height={40} />
        ) : (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h4">{factor?.label ?? factorName}</Typography>
            {factor && (
              <Chip
                size="small"
                label={CATEGORY_LABELS[factor.category]}
                color="primary"
                variant="outlined"
              />
            )}
          </Stack>
        )}
      </Stack>

      {factorError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {factorError}
        </Alert>
      )}

      {factor?.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {factor.description}
        </Typography>
      )}

      {/* 参数面板 */}
      <FactorDetailParamsPanel
        value={params}
        onChange={setParams}
        onAnalyze={handleAnalyze}
        loading={analysisLoading}
      />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
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

      {activeTab === 0 && <FactorDetailIcChart factorName={factorName} params={committedParams} />}
      {activeTab === 1 && (
        <FactorDetailQuantileChart factorName={factorName} params={committedParams} />
      )}
      {activeTab === 2 && (
        <FactorDetailDistributionChart factorName={factorName} params={committedParams} />
      )}
      {activeTab === 3 && (
        <FactorDetailDecayChart factorName={factorName} params={committedParams} />
      )}
      {activeTab === 4 && <FactorDetailCrossSectionTable factorName={factorName} />}
      {activeTab === 5 && <FactorBacktestPanel factorName={factorName} params={committedParams} />}

      <Box sx={{ mt: 4, py: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          数据来源：Tushare · 仅供参考，不构成投资建议
        </Typography>
      </Box>
    </DashboardContent>
  );
}
