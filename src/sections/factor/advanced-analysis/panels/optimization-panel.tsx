import type {
  OptimizationMode,
  FactorOptimizationRequest,
  FactorOptimizationResponse,
} from 'src/api/factor';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';

import { optimizeFactorPortfolio } from 'src/api/factor';

import { f4, fPct } from '../utils';
import { METHODOLOGY } from '../methodology';
import { EmptyGuide } from '../shared/empty-guide';
import { ResultCard } from '../shared/result-card';
import { ResultActions } from '../shared/result-actions';
import { useAdvancedAnalysisRun } from '../use-advanced-analysis-run';
import { StockUniverseSelector } from './optimization/stock-universe-selector';
import { BE_PENDING_TOOLTIP, COV_METHOD_OPTIONS, OPTIMIZATION_MODES } from '../constants';

import type { AnalysisHistoryItem } from '../use-analysis-history';

// ----------------------------------------------------------------------

type Props = {
  onHistorySave: (entry: Omit<AnalysisHistoryItem, 'id' | 'createdAt'>) => void;
  prefillRequest: FactorOptimizationRequest | null;
};

export function OptimizationPanel({ onHistorySave, prefillRequest }: Props) {
  const [tsCodes, setTsCodes] = useState<string[]>([]);
  const [mode, setMode] = useState<OptimizationMode>('MVO');
  const [lookbackDays, setLookbackDays] = useState(250);
  const [maxWeight, setMaxWeight] = useState(0.1);
  const [minWeight, setMinWeight] = useState(0);
  const [riskAversion, setRiskAversion] = useState(1.0);
  const [covMethod, setCovMethod] = useState<'sample' | 'ledoit_wolf' | 'ewma'>('sample');
  const [benchmarkCode, setBenchmarkCode] = useState('000300.SH');

  const { data, loading, error, run, elapsedMs } = useAdvancedAnalysisRun<
    FactorOptimizationRequest,
    FactorOptimizationResponse
  >(optimizeFactorPortfolio, '组合优化失败');

  useEffect(() => {
    if (!prefillRequest) return;
    if (prefillRequest.tsCodes) setTsCodes(prefillRequest.tsCodes);
    if (prefillRequest.mode) setMode(prefillRequest.mode);
    if (prefillRequest.lookbackDays) setLookbackDays(prefillRequest.lookbackDays);
    if (prefillRequest.maxWeight != null) setMaxWeight(prefillRequest.maxWeight);
    if (prefillRequest.minWeight != null) setMinWeight(prefillRequest.minWeight);
    if (prefillRequest.riskAversionLambda != null)
      setRiskAversion(prefillRequest.riskAversionLambda);
    if (prefillRequest.benchmarkCode) setBenchmarkCode(prefillRequest.benchmarkCode);
  }, [prefillRequest]);

  const canRun = tsCodes.length >= 2;
  const reason = !canRun ? '请至少选择 2 只股票' : '';

  const handleRun = useCallback(async () => {
    const req: FactorOptimizationRequest = {
      tsCodes,
      mode,
      lookbackDays,
      maxWeight,
      minWeight,
      ...(mode === 'MVO' ? { riskAversionLambda: riskAversion } : {}),
      // BE-3 / BE-4 待上线时这两个字段会被后端忽略，目前发出去也是无害的
      benchmarkCode,
    };
    const res = await run(req);
    const top3 = res
      ? [...res.weights]
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 3)
          .map((w) => `${w.tsCode}(${(w.weight * 100).toFixed(1)}%)`)
          .join(', ')
      : '';
    onHistorySave({
      type: 'optimization',
      request: req,
      summary: res ? `${tsCodes.length} 只 · ${mode} · Top: ${top3}` : '运行失败',
      status: res ? 'success' : 'error',
      elapsedMs: null,
    });
  }, [
    tsCodes,
    mode,
    lookbackDays,
    maxWeight,
    minWeight,
    riskAversion,
    benchmarkCode,
    run,
    onHistorySave,
  ]);

  const handleCopy = useCallback(() => {
    if (!data) return;
    void navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
  }, [data]);

  // 等权基准对照
  const equalWeightSummary = useMemo(() => {
    if (!data || tsCodes.length === 0) return null;
    const eqW = 1 / tsCodes.length;
    return `等权对照：每只 ${(eqW * 100).toFixed(2)}%`;
  }, [data, tsCodes.length]);

  const subtitle = useMemo(() => {
    if (!data) return null;
    const elapsed = elapsedMs ? `${(elapsedMs / 1000).toFixed(1)}s` : '';
    return `${OPTIMIZATION_MODES.find((m) => m.value === data.mode)?.label ?? data.mode} · ${data.weights.length} 只${elapsed ? ` · 耗时 ${elapsed}` : ''}`;
  }, [data, elapsedMs]);

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2.5}>
            <StockUniverseSelector value={tsCodes} onChange={setTsCodes} />

            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>优化方法</InputLabel>
                <Select
                  value={mode}
                  label="优化方法"
                  onChange={(e) => setMode(e.target.value as OptimizationMode)}
                >
                  {OPTIMIZATION_MODES.map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="回望天数"
                type="number"
                value={lookbackDays}
                onChange={(e) => setLookbackDays(Number(e.target.value) || 0)}
                size="small"
                sx={{ width: 110 }}
              />
              <TextField
                label="单只上限"
                type="number"
                value={maxWeight}
                onChange={(e) => setMaxWeight(Number(e.target.value) || 0)}
                size="small"
                sx={{ width: 110 }}
                slotProps={{ htmlInput: { step: 0.01, min: 0, max: 1 } }}
              />
              <TextField
                label="单只下限"
                type="number"
                value={minWeight}
                onChange={(e) => setMinWeight(Number(e.target.value) || 0)}
                size="small"
                sx={{ width: 110 }}
                slotProps={{ htmlInput: { step: 0.01, min: 0, max: 1 } }}
              />
              {mode === 'MVO' && (
                <TextField
                  label="λ 风险厌恶"
                  type="number"
                  value={riskAversion}
                  onChange={(e) => setRiskAversion(Number(e.target.value) || 0)}
                  size="small"
                  sx={{ width: 110 }}
                  slotProps={{ htmlInput: { step: 0.1, min: 0 } }}
                />
              )}
              <Tooltip title={BE_PENDING_TOOLTIP + '（BE-4：协方差估计方式）'} placement="top">
                <FormControl size="small" sx={{ minWidth: 180 }} disabled>
                  <InputLabel>协方差估计</InputLabel>
                  <Select
                    value={covMethod}
                    label="协方差估计"
                    onChange={(e) => setCovMethod(e.target.value as typeof covMethod)}
                  >
                    {COV_METHOD_OPTIONS.map((m) => (
                      <MenuItem key={m.value} value={m.value}>
                        {m.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Tooltip>
              <TextField
                label="基准指数"
                value={benchmarkCode}
                onChange={(e) => setBenchmarkCode(e.target.value)}
                size="small"
                sx={{ width: 130 }}
                helperText="待 BE-3"
              />
              <Box sx={{ flexGrow: 1 }} />
              <Tooltip title={reason} placement="top">
                <span>
                  <Button variant="contained" onClick={handleRun} disabled={!canRun || loading}>
                    {loading ? '运行中…' : '执行优化'}
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {loading && <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />}

      {!loading && error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !data && !error && (
        <EmptyGuide
          title="开始组合优化"
          steps={[
            '选择股票池来源（自选股 / 手动粘贴）',
            '选择优化方法、回望天数、权重约束',
            '点击「执行优化」获取权重分配',
          ]}
        />
      )}

      {data && (
        <Stack spacing={3}>
          <ResultCard
            title="优化结果摘要"
            methodology={METHODOLOGY.optimization}
            subtitle={subtitle}
            actions={<ResultActions onCopy={handleCopy} />}
            pendingNotice={
              !data.sectorExposure && !data.riskContribution
                ? '行业暴露 / 边际风险贡献 / Benchmark 对照待后端 BE-3 上线'
                : undefined
            }
          >
            <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', mb: 2 }}>
              <Metric label="预期收益率" value={fPct(data.expectedReturn)} />
              <Metric label="预期波动率" value={fPct(data.expectedVolatility)} />
              <Metric label="夏普比率" value={f4(data.sharpeRatio)} />
              {data.benchmarkComparison && (
                <>
                  <Metric label="α" value={f4(data.benchmarkComparison.alpha)} />
                  <Metric label="β" value={f4(data.benchmarkComparison.beta)} />
                  <Metric label="跟踪误差" value={fPct(data.benchmarkComparison.trackingError)} />
                </>
              )}
            </Stack>
            {equalWeightSummary && (
              <Typography variant="caption" color="text.secondary">
                {equalWeightSummary}
              </Typography>
            )}
          </ResultCard>

          <ResultCard title="持仓权重">
            <TableContainer sx={{ maxHeight: 480 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>股票代码</TableCell>
                    <TableCell>名称</TableCell>
                    <TableCell align="right">权重</TableCell>
                    {data.riskContribution && <TableCell align="right">风险贡献占比</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...data.weights]
                    .sort((a, b) => b.weight - a.weight)
                    .map((w) => {
                      const rc = data.riskContribution?.find((x) => x.tsCode === w.tsCode);
                      return (
                        <TableRow key={w.tsCode} hover>
                          <TableCell sx={{ fontFeatureSettings: '"tnum"' }}>{w.tsCode}</TableCell>
                          <TableCell>{w.stockName ?? '--'}</TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontFeatureSettings: '"tnum"',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {fPct(w.weight)}
                          </TableCell>
                          {data.riskContribution && (
                            <TableCell
                              align="right"
                              sx={{
                                fontFeatureSettings: '"tnum"',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {rc ? fPct(rc.pct) : '--'}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          </ResultCard>

          {data.sectorExposure && data.sectorExposure.length > 0 && (
            <ResultCard title="行业暴露分布">
              <Stack spacing={1}>
                {data.sectorExposure.map((s) => (
                  <Stack key={s.industry} direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      {s.industry}
                    </Typography>
                    <Box
                      sx={{
                        flexGrow: 1,
                        height: 8,
                        borderRadius: 1,
                        bgcolor: 'background.neutral',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${Math.min(100, s.weight * 100).toFixed(1)}%`,
                          height: '100%',
                          bgcolor: 'primary.main',
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ minWidth: 60, textAlign: 'right' }}>
                      {fPct(s.weight)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </ResultCard>
          )}

          {data.excludedTsCodes && data.excludedTsCodes.length > 0 && (
            <Alert severity="info">
              已剔除 {data.excludedTsCodes.length} 只股票：
              {data.excludedTsCodes
                .slice(0, 8)
                .map((x) => `${x.tsCode}(${x.reason})`)
                .join('; ')}
            </Alert>
          )}
        </Stack>
      )}
    </Box>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 110 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography
        variant="h6"
        sx={{
          fontFeatureSettings: '"tnum"',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
