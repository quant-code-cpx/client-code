import type { FactorAttributionResponse, FactorBacktestSubmitResponse } from 'src/api/factor';

import dayjs from 'dayjs';
import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
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
import TableContainer from '@mui/material/TableContainer';

import { getFactorAttribution, submitFactorBacktest, saveFactorAsStrategy } from 'src/api/factor';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

const UNIVERSE_OPTIONS = [
  { label: '全市场', value: '' },
  { label: '沪深300', value: '000300.SH' },
  { label: '中证500', value: '000905.SH' },
  { label: '中证1000', value: '000852.SH' },
];

function fPct(v: number | null) {
  if (v == null) return '--';
  return `${(v * 100).toFixed(2)}%`;
}

// ----------------------------------------------------------------------

interface FactorBacktestPanelProps {
  factorName: string;
  params: { startDate: string; endDate: string; universe?: string };
}

export function FactorBacktestPanel({ factorName, params }: FactorBacktestPanelProps) {
  const [universe, setUniverse] = useState(params.universe ?? '');
  const [quantiles, setQuantiles] = useState('5');
  const [rebalanceDays, setRebalanceDays] = useState('20');
  const [topN, setTopN] = useState('50');
  const [weightMethod, setWeightMethod] = useState<'equal_weight' | 'factor_weight'>(
    'equal_weight'
  );

  const [backtestResult, setBacktestResult] = useState<FactorBacktestSubmitResponse | null>(null);
  const [attribution, setAttribution] = useState<FactorAttributionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attrLoading, setAttrLoading] = useState(false);
  const [attrError, setAttrError] = useState('');

  const [strategyName, setStrategyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError('');
    setAttrError('');
    setAttribution(null);
    let runId: string | null = null;
    try {
      const res = await submitFactorBacktest({
        conditions: [{ factorName, operator: 'top_pct', percent: Number(topN) }],
        startDate: params.startDate,
        endDate: params.endDate,
        universe: universe || undefined,
        rebalanceDays: Number(rebalanceDays),
        topN: Number(topN),
        weightMethod,
      });
      setBacktestResult(res);
      runId = res.runId;
    } catch {
      setError('因子回测提交失败');
    } finally {
      setLoading(false);
    }
    if (!runId) return;
    setAttrLoading(true);
    try {
      const attr = await getFactorAttribution({ backtestId: runId });
      setAttribution(attr);
    } catch {
      setAttrError('归因数据加载失败');
    } finally {
      setAttrLoading(false);
    }
  }, [
    factorName,
    params.startDate,
    params.endDate,
    universe,
    quantiles,
    rebalanceDays,
    topN,
    weightMethod,
  ]);

  const handleSaveAsStrategy = useCallback(async () => {
    if (!strategyName.trim()) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await saveFactorAsStrategy({
        conditions: [{ factorName, operator: 'top_pct', percent: Number(topN) }],
        universe: universe || undefined,
        weightMethod,
        sortBy: factorName,
        topN: Number(topN),
        name: strategyName,
      });
      setSaveMsg('已成功保存为策略');
    } catch {
      setSaveMsg('保存失败');
    } finally {
      setSaving(false);
    }
  }, [factorName, universe, topN, weightMethod, strategyName]);

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            因子回测参数
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>股票池</InputLabel>
              <Select value={universe} label="股票池" onChange={(e) => setUniverse(e.target.value)}>
                {UNIVERSE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="分组数"
              type="number"
              value={quantiles}
              onChange={(e) => setQuantiles(e.target.value)}
              size="small"
              sx={{ width: 100 }}
            />
            <TextField
              label="调仓天数"
              type="number"
              value={rebalanceDays}
              onChange={(e) => setRebalanceDays(e.target.value)}
              size="small"
              sx={{ width: 110 }}
            />
            <TextField
              label="选股数 Top N"
              type="number"
              value={topN}
              onChange={(e) => setTopN(e.target.value)}
              size="small"
              sx={{ width: 120 }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>权重方式</InputLabel>
              <Select
                value={weightMethod}
                label="权重方式"
                onChange={(e) =>
                  setWeightMethod(e.target.value as 'equal_weight' | 'factor_weight')
                }
              >
                <MenuItem value="equal_weight">等权</MenuItem>
                <MenuItem value="factor_weight">因子加权</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" onClick={handleSubmit} disabled={loading}>
              提交回测
            </Button>
          </Box>
        </CardContent>
      </Card>

      {loading && <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />}
      {!loading && error && <Alert severity="error">{error}</Alert>}

      {backtestResult && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                回测结果
              </Typography>
              <Label
                color={backtestResult.status === 'COMPLETED' ? 'success' : 'warning'}
                variant="soft"
              >
                {backtestResult.status}
              </Label>
            </Box>
            <Typography variant="body2" color="text.secondary">
              运行 ID：{backtestResult.runId} · 创建时间：
              {dayjs(backtestResult.createdAt).format('YYYY-MM-DD HH:mm')}
            </Typography>
          </CardContent>
        </Card>
      )}

      {attrLoading && (
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2, mb: 3 }} />
      )}
      {!attrLoading && attrError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {attrError}
        </Alert>
      )}

      {attribution && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              归因分析（总超额收益：{fPct(attribution.totalExcess)}）
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>因子</TableCell>
                    <TableCell align="right">配置效应</TableCell>
                    <TableCell align="right">选择效应</TableCell>
                    <TableCell align="right">交互效应</TableCell>
                    <TableCell align="right">合计</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attribution.items.map((item) => (
                    <TableRow key={item.factorName} hover>
                      <TableCell>{item.factorLabel}</TableCell>
                      <TableCell align="right">{fPct(item.allocation)}</TableCell>
                      <TableCell align="right">{fPct(item.selection)}</TableCell>
                      <TableCell align="right">{fPct(item.interaction)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {fPct(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {backtestResult && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              保存为策略
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label="策略名称"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                size="small"
                placeholder="输入策略名称"
              />
              <Button
                variant="outlined"
                onClick={handleSaveAsStrategy}
                disabled={saving || !strategyName.trim()}
              >
                {saving ? '保存中...' : '保存为策略'}
              </Button>
            </Box>
            {saveMsg && (
              <Alert severity={saveMsg.includes('成功') ? 'success' : 'error'} sx={{ mt: 2 }}>
                {saveMsg}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
