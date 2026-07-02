import type { FactorDef, FamaMacBethRequest, FamaMacBethResponse } from 'src/api/factor';

import dayjs from 'dayjs';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import ButtonGroup from '@mui/material/ButtonGroup';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FormControlLabel from '@mui/material/FormControlLabel';

import { famaMacBeth } from 'src/api/factor';

import { Label } from 'src/components/label';

import { METHODOLOGY } from '../methodology';
import { EmptyGuide } from '../shared/empty-guide';
import { ResultCard } from '../shared/result-card';
import { ResultActions } from '../shared/result-actions';
import { f4, presetToRange, defaultTradeDate } from '../utils';
import { useAdvancedAnalysisRun } from '../use-advanced-analysis-run';
import { BE_PENDING_TOOLTIP, FORWARD_DAYS_PRESETS } from '../constants';

import type { AnalysisHistoryItem } from '../use-analysis-history';

// ----------------------------------------------------------------------

type Props = {
  allFactors: FactorDef[];
  universe: string;
  factors: string[];
  onHistorySave: (entry: Omit<AnalysisHistoryItem, 'id' | 'createdAt'>) => void;
  prefillRequest: FamaMacBethRequest | null;
};

export function FamaMacBethPanel({ universe, factors, onHistorySave, prefillRequest }: Props) {
  const [startDate, setStartDate] = useState<dayjs.Dayjs>(() => presetToRange('1Y').start);
  const [endDate, setEndDate] = useState<dayjs.Dayjs>(() => defaultTradeDate());
  const [forwardDays, setForwardDays] = useState<number>(20);
  const [enableNw, setEnableNw] = useState(false);

  const { data, loading, error, run, elapsedMs } = useAdvancedAnalysisRun<
    FamaMacBethRequest,
    FamaMacBethResponse
  >(famaMacBeth, 'Fama-MacBeth 检验失败');

  useEffect(() => {
    if (!prefillRequest) return;
    if (prefillRequest.startDate) setStartDate(dayjs(prefillRequest.startDate, 'YYYYMMDD'));
    if (prefillRequest.endDate) setEndDate(dayjs(prefillRequest.endDate, 'YYYYMMDD'));
    if (prefillRequest.forwardDays) setForwardDays(prefillRequest.forwardDays);
    if (prefillRequest.neweyWestLag != null) setEnableNw(prefillRequest.neweyWestLag > 0);
  }, [prefillRequest]);

  const canRun = factors.length >= 1;
  const reason = !canRun ? '请至少选择 1 个因子' : '';

  const handleRun = useCallback(async () => {
    const req: FamaMacBethRequest = {
      factorNames: factors,
      startDate: startDate.format('YYYYMMDD'),
      endDate: endDate.format('YYYYMMDD'),
      universe: universe || undefined,
      forwardDays,
      neweyWestLag: enableNw ? forwardDays : undefined,
    };
    const res = await run(req);
    const sigCount = res?.factors.filter((f) => f.significant).length ?? 0;
    onHistorySave({
      type: 'fama-macbeth',
      request: req,
      summary: res
        ? `${factors.length} 因子 · 显著 ${sigCount} · R²̄=${f4(res.rSquaredMean)}`
        : '运行失败',
      status: res ? 'success' : 'error',
      elapsedMs: null,
    });
  }, [factors, startDate, endDate, universe, forwardDays, enableNw, run, onHistorySave]);

  const handlePreset = useCallback((p: '1M' | '3M' | '6M' | '1Y') => {
    const r = presetToRange(p);
    setStartDate(r.start);
    setEndDate(r.end);
  }, []);

  const handleCopy = useCallback(() => {
    if (!data) return;
    void navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
  }, [data]);

  const subtitle = useMemo(() => {
    if (!data) return null;
    const elapsed = elapsedMs ? `${(elapsedMs / 1000).toFixed(1)}s` : '';
    const sig = data.factors.filter((f) => f.significant).length;
    return `时间窗 ${data.startDate} → ${data.endDate} · 持有 ${data.forwardDays} 日 · 平均 R² ${f4(data.rSquaredMean)} · 显著因子 ${sig}/${data.factors.length}${elapsed ? ` · 耗时 ${elapsed}` : ''}`;
  }, [data, elapsedMs]);

  const hasNw = data?.factors.some((f) => f.tStatNW != null) ?? false;
  const hasSeries = (data?.seriesPerDate?.length ?? 0) > 0;

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { xs: 'stretch', md: 'center' }, flexWrap: 'wrap' }}
          >
            <DatePicker
              label="开始日期"
              value={startDate}
              onChange={(v) => v && setStartDate(v)}
              format="YYYY-MM-DD"
              slotProps={{ textField: { size: 'small', sx: { width: { xs: '100%', sm: 180 } } } }}
            />
            <DatePicker
              label="结束日期"
              value={endDate}
              onChange={(v) => v && setEndDate(v)}
              format="YYYY-MM-DD"
              slotProps={{ textField: { size: 'small', sx: { width: { xs: '100%', sm: 180 } } } }}
            />
            <ButtonGroup
              size="small"
              sx={{
                height: 40,
                width: { xs: '100%', sm: 'auto' },
                '& .MuiButton-root': {
                  flex: { xs: 1, sm: 'initial' },
                  minHeight: 40,
                  px: 1.5,
                },
              }}
            >
              {(['1M', '3M', '6M', '1Y'] as const).map((p) => (
                <Button key={p} onClick={() => handlePreset(p)}>
                  近 {p}
                </Button>
              ))}
            </ButtonGroup>
            <FormControl size="small" sx={{ width: { xs: '100%', sm: 130 } }}>
              <InputLabel>持有天数</InputLabel>
              <Select
                value={String(forwardDays)}
                label="持有天数"
                onChange={(e) => setForwardDays(Number(e.target.value))}
              >
                {FORWARD_DAYS_PRESETS.map((d) => (
                  <MenuItem key={d} value={String(d)}>
                    {d}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title={BE_PENDING_TOOLTIP + '（BE-2 上线后启用 Newey-West）'} placement="top">
              <FormControlLabel
                disabled
                control={
                  <Switch checked={enableNw} onChange={(e) => setEnableNw(e.target.checked)} />
                }
                label="Newey-West"
                sx={{ ml: 0 }}
              />
            </Tooltip>
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }} />
            <Box
              sx={{
                display: 'flex',
                justifyContent: { md: 'flex-end' },
                width: { xs: '100%', md: 'auto' },
              }}
            >
              <Tooltip title={reason} placement="top">
                <Box component="span" sx={{ display: 'inline-flex', width: { xs: '100%', md: 'auto' } }}>
                  <Button
                    variant="contained"
                    onClick={handleRun}
                    disabled={!canRun || loading}
                    sx={{ width: { xs: '100%', md: 'auto' } }}
                  >
                  {loading ? '运行中…' : '运行检验'}
                </Button>
                </Box>
              </Tooltip>
            </Box>
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
          title="开始 Fama-MacBeth 截面回归检验"
          steps={[
            '在顶部上下文条选择因子',
            '选择起止日期与持有期 forwardDays',
            '点击「运行检验」查看每个因子的风险溢价显著性',
          ]}
          hint="持有期一般取 5 / 10 / 20 / 60 个交易日"
        />
      )}

      {data && (
        <Stack spacing={3}>
          <ResultCard
            title="Fama-MacBeth 截面回归结果"
            methodology={METHODOLOGY.famaMacBeth}
            subtitle={subtitle}
            actions={
              <ResultActions
                onCopy={handleCopy}
                nextActions={[
                  {
                    key: 'screening',
                    label: '把显著因子带到选股器（待对接）',
                    disabled: true,
                    disabledReason: '选股器联动入口待 BE-5 / 后续迭代上线',
                    onClick: () => {},
                  },
                ]}
              />
            }
            pendingNotice={
              !hasNw
                ? 'Newey-West 调整 t 值 / 每期 R² 时序图 / 系数分布图待后端 BE-2 上线'
                : undefined
            }
          >
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>因子</TableCell>
                    <TableCell align="right">平均系数</TableCell>
                    <TableCell align="right">t 统计量</TableCell>
                    <TableCell align="right">p 值</TableCell>
                    {hasNw && <TableCell align="right">t (NW)</TableCell>}
                    {hasNw && <TableCell align="right">p (NW)</TableCell>}
                    <TableCell>显著性</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...data.factors]
                    .sort((a, b) => Math.abs(b.tStat) - Math.abs(a.tStat))
                    .map((f) => (
                      <TableRow key={f.factorName} hover>
                        <TableCell sx={{ fontSize: 13 }}>
                          <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                            {f.factorLabel}
                          </Typography>
                          <Typography
                            variant="caption"
                            component="span"
                            color="text.secondary"
                            sx={{ ml: 0.5 }}
                          >
                            {f.factorName}
                          </Typography>
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {f4(f.avgCoeff)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: Math.abs(f.tStat) > 2 ? 700 : 400,
                            fontFeatureSettings: '"tnum"',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {f4(f.tStat)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {f4(f.pValue)}
                        </TableCell>
                        {hasNw && (
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: f.tStatNW != null && Math.abs(f.tStatNW) > 2 ? 700 : 400,
                              fontFeatureSettings: '"tnum"',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {f4(f.tStatNW ?? null)}
                          </TableCell>
                        )}
                        {hasNw && (
                          <TableCell
                            align="right"
                            sx={{
                              fontFeatureSettings: '"tnum"',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {f4(f.pValueNW ?? null)}
                          </TableCell>
                        )}
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
          </ResultCard>

          {hasSeries && (
            <ResultCard title="每期截面 R² 时序" methodology={METHODOLOGY.famaMacBeth}>
              <Typography variant="caption" color="text.secondary">
                共 {data.seriesPerDate?.length ?? 0} 个截面；时间序列图待后续接入 ApexCharts。
              </Typography>
            </ResultCard>
          )}
        </Stack>
      )}
    </Box>
  );
}
