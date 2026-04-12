import type { ParamSensitivityResult, ParamSensitivityCreateResponse } from 'src/api/backtest';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import { useTheme } from '@mui/material/styles';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';

import { createParamSensitivity, getParamSensitivityResult } from 'src/api/backtest';

import { Chart, useChart } from 'src/components/chart';

import { STRATEGY_TYPE_OPTIONS, OPTIMIZE_METRIC_OPTIONS } from './constants';
import { WalkForwardParamSpaceEditor } from './walk-forward-param-space-editor';

import type { ParamSearchSpaceItemLocal } from './types';
import type { ParamDefinition } from './walk-forward-param-space-editor';

// ----------------------------------------------------------------------

// Default param definitions for common strategy types
const STRATEGY_PARAMS: Record<string, ParamDefinition[]> = {
  MA_CROSS_SINGLE: [
    { key: 'shortWindow', label: '短期均线周期', defaultMin: 3, defaultMax: 20, defaultStep: 1 },
    { key: 'longWindow', label: '长期均线周期', defaultMin: 10, defaultMax: 60, defaultStep: 5 },
  ],
  SCREENING_ROTATION: [
    { key: 'topN', label: '持仓数量 (topN)', defaultMin: 5, defaultMax: 50, defaultStep: 5 },
  ],
  FACTOR_RANKING: [
    { key: 'topN', label: '持仓数量 (topN)', defaultMin: 5, defaultMax: 50, defaultStep: 5 },
  ],
  CUSTOM_POOL_REBALANCE: [],
};

interface BacktestParamSensitivityPanelProps {
  runId: string;
}

function fPct(v: number | null) {
  if (v == null) return '--';
  return `${(v * 100).toFixed(2)}%`;
}

function fNum(v: number | null, d = 2) {
  if (v == null) return '--';
  return v.toFixed(d);
}

// Build heatmap series from 2D heatmap array
function buildHeatmapFromMatrix(
  heatmap: number[][],
  paramXValues: (string | number | boolean)[],
  paramYValues: (string | number | boolean)[],
  paramYKey: string
) {
  return paramYValues.map((yVal, yIdx) => ({
    name: `${paramYKey}=${yVal}`,
    data: paramXValues.map((xVal, xIdx) => ({
      x: String(xVal),
      y: heatmap[yIdx]?.[xIdx] != null ? Number(heatmap[yIdx][xIdx].toFixed(4)) : null,
    })),
  }));
}

export function BacktestParamSensitivityPanel({ runId }: BacktestParamSensitivityPanelProps) {
  const theme = useTheme();
  const [strategyType, setStrategyType] = useState('MA_CROSS_SINGLE');
  const [paramSpace, setParamSpace] = useState<Record<string, ParamSearchSpaceItemLocal>>({});
  const [metric, setMetric] = useState('sharpeRatio');

  const [submitRes, setSubmitRes] = useState<ParamSensitivityCreateResponse | null>(null);
  const [result, setResult] = useState<ParamSensitivityResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');

  const availableParams = STRATEGY_PARAMS[strategyType] ?? [];

  // Convert local param space to API format
  function buildApiParams() {
    const keys = Object.keys(paramSpace);
    if (keys.length === 0) return null;

    const paramA = { key: keys[0], values: expandValues(paramSpace[keys[0]]) };
    const paramB = keys[1]
      ? { key: keys[1], values: expandValues(paramSpace[keys[1]]) }
      : undefined;
    return { paramA, paramB };
  }

  function expandValues(item: ParamSearchSpaceItemLocal): (string | number | boolean)[] {
    if (item.type === 'enum') return item.values ?? [];
    const { min = 0, max = 10, step = 1 } = item;
    const vals: number[] = [];
    for (let v = min; v <= max + 1e-9; v += step) vals.push(Number(v.toFixed(6)));
    return vals;
  }

  const handleSubmit = async () => {
    const params = buildApiParams();
    if (!params) {
      setError('请至少添加一个参数');
      return;
    }
    setSubmitting(true);
    setError('');
    setResult(null);
    setSubmitRes(null);
    try {
      const res = await createParamSensitivity({
        runId,
        paramX: { paramKey: params.paramA.key, values: params.paramA.values },
        paramY: params.paramB
          ? { paramKey: params.paramB.key, values: params.paramB.values }
          : undefined,
        metric,
      });
      setSubmitRes(res);
      // Start polling for result
      pollResult(res.sweepId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交参数扫描失败');
    } finally {
      setSubmitting(false);
    }
  };

  const pollResult = async (sweepId: string) => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 60;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    while (attempts < maxAttempts) {
      await delay(3000);
      attempts++;
      try {
        const res = await getParamSensitivityResult(sweepId);
        if (res.status === 'COMPLETED') {
          setResult(res);
          setPolling(false);
          return;
        }
        if (res.status === 'FAILED') {
          setError('参数扫描任务失败');
          setPolling(false);
          return;
        }
      } catch {
        // continue polling
      }
    }
    setError('查询超时，请稍后手动刷新');
    setPolling(false);
  };

  // Extract result props
  const paramXKey = result?.paramX?.paramKey ?? '';
  const paramYKey = result?.paramY?.paramKey ?? '';
  const paramXValues = result?.paramX?.values ?? [];
  const paramYValues = result?.paramY?.values ?? [];
  const heatmap = result?.heatmap ?? [];
  const isTwoParam = !!result?.paramY;

  const heatmapSeries = useMemo(
    () =>
      isTwoParam && heatmap.length > 0
        ? buildHeatmapFromMatrix(heatmap, paramXValues, paramYValues, paramYKey)
        : [],
    [heatmap, paramXValues, paramYValues, paramYKey, isTwoParam]
  );

  const heatmapOptions = useChart({
    chart: { type: 'heatmap', toolbar: { show: false }, animations: { enabled: false } },
    dataLabels: { enabled: false },
    colors: [theme.palette.success.main],
    plotOptions: {
      heatmap: {
        colorScale: {
          ranges: [
            { from: -Infinity, to: 0, color: theme.palette.error.main, name: '差' },
            { from: 0, to: 0.5, color: theme.palette.warning.main, name: '中' },
            { from: 0.5, to: Infinity, color: theme.palette.success.main, name: '优' },
          ],
        },
      },
    },
    xaxis: { title: { text: paramXKey } },
    yaxis: { title: { text: paramYKey } },
    tooltip: { y: { formatter: (v: number) => v.toFixed(4) } },
  });

  // Flatten heatmap to table rows
  const flatRows = useMemo(() => {
    const rows: Array<{
      xVal: string | number | boolean;
      yVal?: string | number | boolean;
      value: number | null;
    }> = [];
    if (isTwoParam) {
      paramYValues.forEach((yVal, yIdx) => {
        paramXValues.forEach((xVal, xIdx) => {
          rows.push({ xVal, yVal, value: heatmap[yIdx]?.[xIdx] ?? null });
        });
      });
    } else {
      paramXValues.forEach((xVal, xIdx) => {
        rows.push({ xVal, value: heatmap[0]?.[xIdx] ?? null });
      });
    }
    return rows;
  }, [heatmap, paramXValues, paramYValues, isTwoParam]);

  // Best row
  const bestRow = useMemo(() => {
    if (flatRows.length === 0) return null;
    return flatRows.reduce((best, r) =>
      (r.value ?? -Infinity) > (best.value ?? -Infinity) ? r : best
    );
  }, [flatRows]);

  const allStrategyOptions = STRATEGY_TYPE_OPTIONS.filter((o) => o.value !== '');

  return (
    <Box sx={{ p: 3 }}>
      {/* Step 1: Strategy type + param space */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            步骤 1：配置参数扫描范围
          </Typography>

          <FormControl size="small" sx={{ width: 200, mb: 2 }}>
            <InputLabel>策略类型</InputLabel>
            <Select
              label="策略类型"
              value={strategyType}
              onChange={(e) => {
                setStrategyType(e.target.value);
                setParamSpace({});
              }}
              disabled={submitting || polling}
            >
              {allStrategyOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <WalkForwardParamSpaceEditor
            availableParams={availableParams}
            value={paramSpace}
            onChange={setParamSpace}
          />

          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ width: 180 }}>
              <InputLabel>优化指标</InputLabel>
              <Select
                label="优化指标"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                disabled={submitting || polling}
              >
                {OPTIMIZE_METRIC_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting || polling || Object.keys(paramSpace).length === 0}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {submitting ? '提交中…' : '提交扫描'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Polling indicator */}
      {(polling || submitting) && submitRes && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="body2" sx={{ mb: 1 }}>
              扫描进行中…（共 {submitRes.totalCombinations} 次回测）
            </Typography>
            <LinearProgress />
          </CardContent>
        </Card>
      )}

      {/* Step 2: Results */}
      {result && flatRows.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            步骤 2：扫描结果
          </Typography>

          {/* Heatmap (2 params only) */}
          {isTwoParam && heatmapSeries.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  参数热力图（Y轴 = {paramYKey}，X轴 = {paramXKey}）
                </Typography>
                <Chart
                  type="heatmap"
                  series={heatmapSeries}
                  options={heatmapOptions}
                  sx={{ height: 360 }}
                />
              </CardContent>
            </Card>
          )}

          {/* Result table */}
          <Card>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  全部结果（{flatRows.length} 组）
                </Typography>
                {bestRow && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    · 最优：{paramXKey}={String(bestRow.xVal)}
                    {paramYKey ? `, ${paramYKey}=${String(bestRow.yVal)}` : ''}
                  </Typography>
                )}
              </Box>
              <Divider />
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>{paramXKey}</TableCell>
                      {paramYKey && <TableCell>{paramYKey}</TableCell>}
                      <TableCell align="right">{result.metric}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {flatRows.map((row, idx) => {
                      const isBest = row === bestRow;
                      return (
                        <TableRow
                          key={idx}
                          hover
                          sx={{ bgcolor: isBest ? 'success.lighter' : undefined }}
                        >
                          <TableCell sx={{ fontWeight: isBest ? 700 : undefined }}>
                            {String(row.xVal)} {isBest ? '★' : ''}
                          </TableCell>
                          {paramYKey && (
                            <TableCell sx={{ fontWeight: isBest ? 700 : undefined }}>
                              {String(row.yVal ?? '--')}
                            </TableCell>
                          )}
                          <TableCell
                            align="right"
                            sx={{
                              color: (row.value ?? 0) >= 0 ? 'success.main' : 'error.main',
                            }}
                          >
                            {fNum(row.value)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}

      {!result && !submitting && !polling && (
        <Box
          sx={{
            height: 180,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            配置参数搜索范围后，点击「提交扫描」
          </Typography>
        </Box>
      )}
    </Box>
  );
}
