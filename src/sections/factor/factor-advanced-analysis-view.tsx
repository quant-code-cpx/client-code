import type {
  FactorDef,
  FamaMacBethResponse,
  OrthogonalizeResult,
  FactorOptimizationResponse,
} from 'src/api/factor';

import dayjs from 'dayjs';
import { memo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import {
  factorApi,
  famaMacBeth,
  orthogonalizeFactors,
  optimizeFactorPortfolio,
} from 'src/api/factor';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

function fPct(v: number | null) {
  if (v == null) return '--';
  return `${(v * 100).toFixed(2)}%`;
}

function f4(v: number | null) {
  if (v == null) return '--';
  return v.toFixed(4);
}

// ----------------------------------------------------------------------

export function FactorAdvancedAnalysisView() {
  const [allFactors, setAllFactors] = useState<FactorDef[]>([]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    factorApi.library().then((lib) => {
      setAllFactors(lib.categories.flatMap((c) => c.factors));
    });
  }, []);

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="因子正交化" />
          <Tab label="Fama-MacBeth 检验" />
          <Tab label="因子组合优化" />
        </Tabs>
      </Box>

      {activeTab === 0 && <OrthogonalizePanel allFactors={allFactors} />}
      {activeTab === 1 && <FamaMacBethPanel allFactors={allFactors} />}
      {activeTab === 2 && <OptimizationPanel />}
    </Box>
  );
}

// ─── Orthogonalize ────────────────────────────────────────────

function OrthogonalizePanel({ allFactors }: { allFactors: FactorDef[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [tradeDate, setTradeDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [method, setMethod] = useState<'gram_schmidt' | 'symmetric'>('gram_schmidt');
  const [result, setResult] = useState<OrthogonalizeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRun = useCallback(async () => {
    if (selected.length < 2) {
      setError('请选择至少 2 个因子');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await orthogonalizeFactors({
        factorNames: selected,
        tradeDate: dayjs(tradeDate).format('YYYYMMDD'),
        method,
      });
      setResult(res);
    } catch {
      setError('正交化失败');
    } finally {
      setLoading(false);
    }
  }, [selected, tradeDate, method]);

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Autocomplete
            multiple
            value={selected}
            onChange={(_, v) => setSelected(v)}
            options={allFactors.map((f) => f.name)}
            getOptionLabel={(name) => {
              const f = allFactors.find((x) => x.name === name);
              return f ? `${name} · ${f.label}` : name;
            }}
            renderInput={(p) => <TextField {...p} label="选择因子（≥2 个）" size="small" />}
            renderTags={(value, getTagProps) =>
              value.map((name, index) => (
                <Chip label={name} {...getTagProps({ index })} key={name} size="small" />
              ))
            }
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <DatePicker
              label="分析日期"
              value={tradeDate ? dayjs(tradeDate) : null}
              onChange={(v) => setTradeDate(v?.format('YYYY-MM-DD') ?? '')}
              format="YYYY-MM-DD"
              slotProps={{
                textField: { size: 'small', sx: { minWidth: 190 } },
                field: { clearable: true },
              }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>正交方法</InputLabel>
              <Select
                value={method}
                label="正交方法"
                onChange={(e) => setMethod(e.target.value as 'gram_schmidt' | 'symmetric')}
              >
                <MenuItem value="gram_schmidt">Gram-Schmidt</MenuItem>
                <MenuItem value="symmetric">对称正交</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" onClick={handleRun} disabled={loading}>
              执行正交化
            </Button>
          </Box>
        </CardContent>
      </Card>

      {loading && <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />}
      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Card sx={{ flex: '1 1 400px' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                正交化前相关性矩阵
              </Typography>
              <CorrelationTable factors={result.factors} matrix={result.correlationBefore} />
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 400px' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                正交化后相关性矩阵
              </Typography>
              <CorrelationTable factors={result.factors} matrix={result.correlationAfter} />
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}

const CorrelationTable = memo(function CorrelationTable({
  factors,
  matrix,
}: {
  factors: string[];
  matrix: number[][];
}) {
  return (
    <TableContainer sx={{ maxHeight: 400 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell />
            {factors.map((f) => (
              <TableCell key={f} align="center" sx={{ fontWeight: 600, fontSize: 12 }}>
                {f}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {factors.map((rowF, ri) => (
            <TableRow key={rowF}>
              <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{rowF}</TableCell>
              {matrix[ri].map((val, ci) => (
                <TableCell
                  key={ci}
                  align="center"
                  sx={{
                    bgcolor:
                      Math.abs(val) > 0.5
                        ? 'error.lighter'
                        : Math.abs(val) > 0.2
                          ? 'warning.lighter'
                          : 'transparent',
                    fontSize: 12,
                  }}
                >
                  {val.toFixed(3)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
});

// ─── Fama-MacBeth ─────────────────────────────────────────────

function FamaMacBethPanel({ allFactors }: { allFactors: FactorDef[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(dayjs().subtract(1, 'year').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [forwardDays, setForwardDays] = useState('20');
  const [result, setResult] = useState<FamaMacBethResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRun = useCallback(async () => {
    if (selected.length === 0) {
      setError('请选择因子');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await famaMacBeth({
        factorNames: selected,
        startDate: dayjs(startDate).format('YYYYMMDD'),
        endDate: dayjs(endDate).format('YYYYMMDD'),
        forwardDays: Number(forwardDays),
      });
      setResult(res);
    } catch {
      setError('Fama-MacBeth 检验失败');
    } finally {
      setLoading(false);
    }
  }, [selected, startDate, endDate, forwardDays]);

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Autocomplete
            multiple
            value={selected}
            onChange={(_, v) => setSelected(v)}
            options={allFactors.map((f) => f.name)}
            getOptionLabel={(name) => {
              const f = allFactors.find((x) => x.name === name);
              return f ? `${name} · ${f.label}` : name;
            }}
            renderInput={(p) => <TextField {...p} label="选择因子" size="small" />}
            renderTags={(value, getTagProps) =>
              value.map((name, index) => (
                <Chip label={name} {...getTagProps({ index })} key={name} size="small" />
              ))
            }
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <DatePicker
              label="开始日期"
              value={startDate ? dayjs(startDate) : null}
              onChange={(v) => setStartDate(v?.format('YYYY-MM-DD') ?? '')}
              format="YYYY-MM-DD"
              slotProps={{
                textField: { size: 'small', sx: { minWidth: 190 } },
                field: { clearable: true },
              }}
            />
            <DatePicker
              label="结束日期"
              value={endDate ? dayjs(endDate) : null}
              onChange={(v) => setEndDate(v?.format('YYYY-MM-DD') ?? '')}
              format="YYYY-MM-DD"
              slotProps={{
                textField: { size: 'small', sx: { minWidth: 190 } },
                field: { clearable: true },
              }}
            />
            <TextField
              label="持有天数"
              type="number"
              value={forwardDays}
              onChange={(e) => setForwardDays(e.target.value)}
              size="small"
              sx={{ width: 100 }}
            />
            <Button variant="contained" onClick={handleRun} disabled={loading}>
              运行检验
            </Button>
          </Box>
        </CardContent>
      </Card>

      {loading && <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />}
      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Fama-MacBeth 截面回归结果
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              平均 R² = {f4(result.rSquaredMean)} · 持有期 {result.forwardDays} 天
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>因子</TableCell>
                    <TableCell align="right">平均系数</TableCell>
                    <TableCell align="right">t 统计量</TableCell>
                    <TableCell align="right">p 值</TableCell>
                    <TableCell>显著性</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.factors.map((f) => (
                    <TableRow key={f.factorName} hover>
                      <TableCell>{f.factorLabel}</TableCell>
                      <TableCell align="right">{f4(f.avgCoeff)}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: Math.abs(f.tStat) > 2 ? 700 : 400 }}
                      >
                        {f4(f.tStat)}
                      </TableCell>
                      <TableCell align="right">{f4(f.pValue)}</TableCell>
                      <TableCell>
                        <Label color={f.significant ? 'success' : 'default'} variant="soft">
                          {f.significant ? '显著' : '不显著'}
                        </Label>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

// ─── Optimization ─────────────────────────────────────────────

function OptimizationPanel() {
  const [tsCodes, setTsCodes] = useState('');
  const [mode, setMode] = useState<'MVO' | 'MIN_VARIANCE' | 'RISK_PARITY' | 'MAX_DIVERSIFICATION'>(
    'MVO'
  );
  const [lookbackDays, setLookbackDays] = useState('250');
  const [maxWeight, setMaxWeight] = useState('0.1');
  const [result, setResult] = useState<FactorOptimizationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRun = useCallback(async () => {
    const codes = tsCodes
      .split(/[\n,;，；\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (codes.length < 2) {
      setError('请输入至少 2 个股票代码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await optimizeFactorPortfolio({
        tsCodes: codes,
        mode,
        lookbackDays: Number(lookbackDays),
        maxWeight: Number(maxWeight),
      });
      setResult(res);
    } catch {
      setError('组合优化失败');
    } finally {
      setLoading(false);
    }
  }, [tsCodes, mode, lookbackDays, maxWeight]);

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            label="股票代码列表"
            value={tsCodes}
            onChange={(e) => setTsCodes(e.target.value)}
            multiline
            minRows={2}
            maxRows={4}
            fullWidth
            placeholder="输入股票代码，逗号或换行分隔，如 000001.SZ, 600036.SH"
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>优化方法</InputLabel>
              <Select
                value={mode}
                label="优化方法"
                onChange={(e) => setMode(e.target.value as typeof mode)}
              >
                <MenuItem value="MVO">均值-方差优化</MenuItem>
                <MenuItem value="MIN_VARIANCE">最小方差</MenuItem>
                <MenuItem value="RISK_PARITY">风险平价</MenuItem>
                <MenuItem value="MAX_DIVERSIFICATION">最大分散化</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="回望天数"
              type="number"
              value={lookbackDays}
              onChange={(e) => setLookbackDays(e.target.value)}
              size="small"
              sx={{ width: 110 }}
            />
            <TextField
              label="单只上限"
              type="number"
              value={maxWeight}
              onChange={(e) => setMaxWeight(e.target.value)}
              size="small"
              sx={{ width: 110 }}
              slotProps={{ htmlInput: { step: 0.01, min: 0, max: 1 } }}
            />
            <Button variant="contained" onClick={handleRun} disabled={loading}>
              执行优化
            </Button>
          </Box>
        </CardContent>
      </Card>

      {loading && <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />}
      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              优化结果（
              {
                {
                  MVO: '均值-方差',
                  MIN_VARIANCE: '最小方差',
                  RISK_PARITY: '风险平价',
                  MAX_DIVERSIFICATION: '最大分散化',
                }[result.mode]
              }
              ）
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2">
                预期收益率：<strong>{fPct(result.expectedReturn)}</strong>
              </Typography>
              <Typography variant="body2">
                预期波动率：<strong>{fPct(result.expectedVolatility)}</strong>
              </Typography>
              <Typography variant="body2">
                夏普比率：<strong>{f4(result.sharpeRatio)}</strong>
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>股票代码</TableCell>
                    <TableCell>名称</TableCell>
                    <TableCell align="right">权重</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.weights
                    .sort((a, b) => b.weight - a.weight)
                    .map((w) => (
                      <TableRow key={w.tsCode} hover>
                        <TableCell>{w.tsCode}</TableCell>
                        <TableCell>{w.stockName ?? '--'}</TableCell>
                        <TableCell align="right">{fPct(w.weight)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
