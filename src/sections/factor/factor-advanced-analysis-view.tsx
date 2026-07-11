import type {
  FactorDef,
  FamaMacBethRequest,
  OrthogonalizeRequest,
  FactorOptimizationRequest,
} from 'src/api/factor';

import { useSearchParams } from 'react-router';
import { varAlpha } from 'minimal-shared/utils';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { factorApi } from 'src/api/factor';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { HistoryDrawer } from './advanced-analysis/history-drawer';
import { AnalysisContextBar } from './advanced-analysis/analysis-context-bar';
import { FamaMacBethPanel } from './advanced-analysis/panels/fama-macbeth-panel';
import { OptimizationPanel } from './advanced-analysis/panels/optimization-panel';
import { OrthogonalizePanel } from './advanced-analysis/panels/orthogonalize-panel';
import {
  useAnalysisHistory,
  type AnalysisHistoryItem,
} from './advanced-analysis/use-analysis-history';

// ----------------------------------------------------------------------

type TabKey = 'orthogonalize' | 'fama-macbeth' | 'optimization';

const TAB_OPTIONS: { value: TabKey; label: string }[] = [
  { value: 'orthogonalize', label: '因子正交化' },
  { value: 'fama-macbeth', label: 'Fama-MacBeth 检验' },
  { value: 'optimization', label: '因子组合优化' },
];

// ----------------------------------------------------------------------

export function FactorAdvancedAnalysisView() {
  const [allFactors, setAllFactors] = useState<FactorDef[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = (searchParams.get('tab') as TabKey | null) ?? 'orthogonalize';
  const activeTab: TabKey = TAB_OPTIONS.some((o) => o.value === tabParam)
    ? tabParam
    : 'orthogonalize';

  const universeParam = searchParams.get('universe') ?? '';
  const factorsParam = useMemo(
    () => searchParams.get('factors')?.split(',').filter(Boolean) ?? [],
    [searchParams]
  );

  const [universe, setUniverse] = useState<string>(universeParam);
  const [factors, setFactors] = useState<string[]>(factorsParam);

  // URL ↔ state 同步（universe / factors）
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', activeTab);
    if (universe) next.set('universe', universe);
    else next.delete('universe');
    if (factors.length > 0) next.set('factors', factors.join(','));
    else next.delete('factors');
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, universe, factors]);

  const handleTabChange = useCallback(
    (_: unknown, value: TabKey) => {
      const next = new URLSearchParams(searchParams);
      next.set('tab', value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // 加载因子库
  useEffect(() => {
    factorApi
      .library()
      .then((lib) => setAllFactors(lib.categories.flatMap((c) => c.factors)))
      .catch(() => setAllFactors([]));
  }, []);

  // 历史
  const {
    items: historyItems,
    add: addHistory,
    clear: clearHistory,
    remove: removeHistory,
  } = useAnalysisHistory();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [orthoPrefill, setOrthoPrefill] = useState<OrthogonalizeRequest | null>(null);
  const [fmbPrefill, setFmbPrefill] = useState<FamaMacBethRequest | null>(null);
  const [optPrefill, setOptPrefill] = useState<FactorOptimizationRequest | null>(null);

  const handleRestoreHistory = useCallback(
    (item: AnalysisHistoryItem) => {
      const next = new URLSearchParams(searchParams);
      next.set('tab', item.type);
      setSearchParams(next, { replace: true });

      if (item.type === 'orthogonalize') {
        const req = item.request as OrthogonalizeRequest;
        setOrthoPrefill({ ...req });
        if (req.factorNames) setFactors(req.factorNames);
        if (req.universe != null) setUniverse(req.universe);
      } else if (item.type === 'fama-macbeth') {
        const req = item.request as FamaMacBethRequest;
        setFmbPrefill({ ...req });
        if (req.factorNames) setFactors(req.factorNames);
        if (req.universe != null) setUniverse(req.universe);
      } else if (item.type === 'optimization') {
        const req = item.request as FactorOptimizationRequest;
        setOptPrefill({ ...req });
      }
      setHistoryOpen(false);
    },
    [searchParams, setSearchParams]
  );

  return (
    <DashboardContent
      maxWidth="xl"
      sx={{
        gap: 2.5,
        pb: { xs: 4, md: 5 },
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'stretch', md: 'flex-start' }, justifyContent: 'space-between' }}
      >
        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
          <Typography variant="h4">因子高级分析</Typography>
          <Typography variant="body2" color="text.secondary">
            多因子共线性诊断 · 风险溢价显著性检验 · 组合权重优化
          </Typography>
        </Stack>
        <Button
          variant="outlined"
          startIcon={<Iconify icon="solar:history-bold" />}
          onClick={() => setHistoryOpen(true)}
          sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
        >
          运行历史
          {historyItems.length > 0 ? ` (${historyItems.length})` : ''}
        </Button>
      </Stack>

      <AnalysisContextBar
        universe={universe}
        onUniverseChange={setUniverse}
        factors={factors}
        onFactorsChange={setFactors}
        allFactors={allFactors}
      />

      <Box
        sx={{
          px: 0.75,
          borderRadius: 1,
          border: (theme) => `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
          bgcolor: 'background.paper',
        }}
      >
        <Tabs
          value={activeTab}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          onChange={handleTabChange}
          sx={{
            minHeight: 44,
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: 1,
            },
            '& .MuiTab-root': {
              minHeight: 44,
              px: 1.5,
              fontWeight: 700,
            },
          }}
        >
          {TAB_OPTIONS.map((o) => (
            <Tab key={o.value} value={o.value} label={o.label} />
          ))}
        </Tabs>
      </Box>

      {activeTab === 'orthogonalize' && (
        <OrthogonalizePanel
          allFactors={allFactors}
          universe={universe}
          factors={factors}
          onFactorsCommit={setFactors}
          onHistorySave={addHistory}
          prefillRequest={orthoPrefill}
        />
      )}
      {activeTab === 'fama-macbeth' && (
        <FamaMacBethPanel
          allFactors={allFactors}
          universe={universe}
          factors={factors}
          onHistorySave={addHistory}
          prefillRequest={fmbPrefill}
        />
      )}
      {activeTab === 'optimization' && (
        <OptimizationPanel onHistorySave={addHistory} prefillRequest={optPrefill} />
      )}

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        items={historyItems}
        onRestore={handleRestoreHistory}
        onClear={clearHistory}
        onRemove={removeHistory}
      />
    </DashboardContent>
  );
}
