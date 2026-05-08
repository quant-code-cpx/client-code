import type { FactorDef, FactorLibraryResult, FactorCorrelationResult } from 'src/api/factor';

import dayjs from 'dayjs';
import { useNavigate } from 'react-router';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Snackbar from '@mui/material/Snackbar';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { factorApi } from 'src/api/factor';
import { DashboardContent } from 'src/layouts/dashboard';

import { FactorCorrelationParams } from '../factor-correlation-params';
import { FactorCorrelationSummary } from '../factor-correlation-summary';
import { FactorCorrelationHeatmap } from '../factor-correlation-heatmap';
import { FactorCorrelationPairTable } from '../factor-correlation-pair-table';
import { FactorCorrelationPairDrawer } from '../factor-correlation-pair-drawer';
import { FactorCorrelationMethodPopover } from '../factor-correlation-method-popover';
import { buildCorrelationPairs, validateCorrelationResult } from '../factor-correlation-helpers';

import type { CorrelationPair } from '../factor-correlation-helpers';

// ----------------------------------------------------------------------

const DEFAULT_FACTORS = ['pe_ttm', 'pb', 'roe', 'ret_20d', 'ln_market_cap'];
const DEFAULT_THRESHOLD = 0.7;

type RequestSnapshot = {
  factorNames: string[];
  tradeDate: string;
  universe: string;
  method: 'spearman' | 'pearson';
};

const snapshotEqual = (a: RequestSnapshot | null, b: RequestSnapshot): boolean => {
  if (!a) return false;
  if (a.tradeDate !== b.tradeDate || a.universe !== b.universe || a.method !== b.method)
    return false;
  if (a.factorNames.length !== b.factorNames.length) return false;
  return a.factorNames.every((f, i) => f === b.factorNames[i]);
};

// ----------------------------------------------------------------------

export function FactorCorrelationView() {
  const navigate = useNavigate();

  const [library, setLibrary] = useState<FactorLibraryResult | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState('');

  const [selectedFactors, setSelectedFactors] = useState<string[]>(DEFAULT_FACTORS);
  const [tradeDate, setTradeDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [universe, setUniverse] = useState('');
  const [method, setMethod] = useState<'spearman' | 'pearson'>('spearman');
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);

  const [result, setResult] = useState<FactorCorrelationResult | null>(null);
  const [requestSnapshot, setRequestSnapshot] = useState<RequestSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [highOnly, setHighOnly] = useState(false);
  const [selectedPair, setSelectedPair] = useState<CorrelationPair | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [methodAnchor, setMethodAnchor] = useState<HTMLElement | null>(null);
  const [snackbar, setSnackbar] = useState('');

  // 加载因子库
  useEffect(() => {
    setLibraryLoading(true);
    setLibraryError('');
    factorApi
      .library()
      .then((data) => setLibrary(data))
      .catch((err: unknown) => {
        setLibraryError(err instanceof Error ? err.message : '因子库加载失败');
      })
      .finally(() => setLibraryLoading(false));
  }, []);

  const allFactors = useMemo<FactorDef[]>(
    () => library?.categories.flatMap((c) => c.factors) ?? [],
    [library]
  );

  const factorLabelMap = useMemo<Record<string, string>>(
    () => Object.fromEntries(allFactors.map((f) => [f.name, f.label])),
    [allFactors]
  );

  // 校验返回结果
  const validationIssues = useMemo(() => validateCorrelationResult(result), [result]);
  const hasFatalError = validationIssues.some((i) => i.level === 'error');

  // 派生因子对与统计
  const derived = useMemo(() => {
    if (!result || hasFatalError) return null;
    return buildCorrelationPairs(result, threshold);
  }, [result, threshold, hasFatalError]);

  // 当前参数快照（用于判断 dirty）
  const currentSnapshot = useMemo<RequestSnapshot>(
    () => ({
      factorNames: [...selectedFactors].sort(),
      tradeDate: dayjs(tradeDate).format('YYYYMMDD'),
      universe,
      method,
    }),
    [selectedFactors, tradeDate, universe, method]
  );

  const paramsDirty = result !== null && !snapshotEqual(requestSnapshot, currentSnapshot);

  const handleCalculate = useCallback(async () => {
    if (selectedFactors.length < 2) {
      setError('请至少选择 2 个因子');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await factorApi.correlation({
        factorNames: selectedFactors,
        tradeDate: currentSnapshot.tradeDate,
        universe: universe || undefined,
        method,
      });
      setResult(data);
      setRequestSnapshot(currentSnapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : '计算相关性失败');
    } finally {
      setLoading(false);
    }
  }, [selectedFactors, currentSnapshot, universe, method]);

  const handleSelectPair = useCallback((pair: CorrelationPair) => {
    setSelectedPair(pair);
    setDrawerOpen(true);
  }, []);

  const handleHeatmapCellClick = useCallback(
    (row: number, col: number) => {
      if (!derived || row === col) return;
      const i = Math.min(row, col);
      const j = Math.max(row, col);
      const pair = derived.pairs.find((p) => p.i === i && p.j === j);
      if (pair) {
        setSelectedPair(pair);
        setDrawerOpen(true);
      }
    },
    [derived]
  );

  const handleOrthogonalize = useCallback(
    (pair: CorrelationPair) => {
      const params = new URLSearchParams({
        mode: 'orthogonalize',
        factors: `${pair.factorA},${pair.factorB}`,
      });
      navigate(`/factor/advanced-analysis?${params.toString()}`);
    },
    [navigate]
  );

  const handleAdvancedAnalysis = useCallback(
    (pair: CorrelationPair) => {
      const params = new URLSearchParams({
        factors: `${pair.factorA},${pair.factorB}`,
      });
      navigate(`/factor/advanced-analysis?${params.toString()}`);
    },
    [navigate]
  );

  const handleRemoveFactor = useCallback(
    (factorName: string) => {
      setSelectedFactors((prev) => prev.filter((f) => f !== factorName));
      setSnackbar(`已从已选因子中移除 ${factorLabelMap[factorName] ?? factorName}，请重新计算`);
    },
    [factorLabelMap]
  );

  return (
    <DashboardContent>
      <Typography variant="h4" sx={{ mb: 1 }}>
        因子相关性
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        共线性风险控制台：检查所选因子之间的冗余关系，发现高相关因子对并发起下一步动作。
      </Typography>

      {libraryError ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          因子标签加载失败（{libraryError}），相关性仍可按因子英文名计算。
        </Alert>
      ) : null}

      <Card sx={{ mb: 3 }}>
        <FactorCorrelationParams
          libraryLoading={libraryLoading}
          allFactors={allFactors}
          selectedFactors={selectedFactors}
          onChangeFactors={setSelectedFactors}
          factorLabelMap={factorLabelMap}
          tradeDate={tradeDate}
          onChangeTradeDate={setTradeDate}
          universe={universe}
          onChangeUniverse={setUniverse}
          method={method}
          onChangeMethod={setMethod}
          threshold={threshold}
          onChangeThreshold={setThreshold}
          loading={loading}
          paramsDirty={paramsDirty}
          onCalculate={handleCalculate}
          hasResult={result !== null}
        />
        {loading ? <LinearProgress /> : null}
      </Card>

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : null}

      {validationIssues.map((issue, idx) => (
        <Alert key={idx} severity={issue.level === 'error' ? 'error' : 'warning'} sx={{ mb: 2 }}>
          {issue.message}
        </Alert>
      ))}

      {loading && !result ? (
        <Card sx={{ p: 2 }}>
          <Skeleton height={48} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={320} />
        </Card>
      ) : null}

      {result && derived && !hasFatalError ? (
        <>
          <FactorCorrelationSummary
            result={result}
            stats={derived.stats}
            threshold={threshold}
            onShowMethod={(el) => setMethodAnchor(el)}
            onFocusHighPairs={() => setHighOnly(true)}
          />

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Card>
                <Box sx={{ p: 2 }}>
                  <FactorCorrelationHeatmap result={result} onCellClick={handleHeatmapCellClick} />
                </Box>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <FactorCorrelationPairTable
                pairs={derived.pairs}
                threshold={threshold}
                highOnly={highOnly}
                onToggleHighOnly={setHighOnly}
                onSelect={handleSelectPair}
                onOrthogonalize={handleOrthogonalize}
                onRemoveFactor={handleRemoveFactor}
              />
            </Grid>
          </Grid>
        </>
      ) : !loading && !hasFatalError ? (
        <Card>
          <Stack spacing={1} alignItems="center" sx={{ py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              请选择 {2}~20 个因子后点击&quot;计算相关性&quot;
            </Typography>
            <Typography variant="caption" color="text.secondary">
              建议从估值、质量、动量、规模各选 1 个代表因子
            </Typography>
          </Stack>
        </Card>
      ) : null}

      <FactorCorrelationPairDrawer
        open={drawerOpen}
        pair={selectedPair}
        result={result}
        onClose={() => setDrawerOpen(false)}
        onOrthogonalize={(pair) => {
          setDrawerOpen(false);
          handleOrthogonalize(pair);
        }}
        onAdvancedAnalysis={(pair) => {
          setDrawerOpen(false);
          handleAdvancedAnalysis(pair);
        }}
      />

      <FactorCorrelationMethodPopover
        anchorEl={methodAnchor}
        result={result}
        onClose={() => setMethodAnchor(null)}
      />

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={2500}
        onClose={() => setSnackbar('')}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </DashboardContent>
  );
}
