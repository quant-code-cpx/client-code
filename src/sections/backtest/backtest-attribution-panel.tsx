import type { BrinsonPeriodItem, BrinsonAttributionResponse } from 'src/api/backtest';

import { memo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Collapse from '@mui/material/Collapse';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { runAttribution } from 'src/api/backtest';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface BacktestAttributionPanelProps {
  runId: string;
}

function fPct(v: number | null | undefined) {
  if (v == null) return '--';
  return `${(v * 100).toFixed(2)}%`;
}

function colorSx(v: number | null | undefined) {
  if (v == null) return {};
  return { color: v >= 0 ? 'success.main' : 'error.main' };
}

const PeriodRow = memo(function PeriodRow({ row }: { row: BrinsonPeriodItem }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen((p) => !p)}>
            <Iconify
              icon={open ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
              width={16}
            />
          </IconButton>
        </TableCell>
        <TableCell>{row.periodLabel}</TableCell>
        <TableCell sx={colorSx(row.totalActiveReturn)}>{fPct(row.totalActiveReturn)}</TableCell>
        <TableCell sx={colorSx(row.totalAllocationEffect)}>
          {fPct(row.totalAllocationEffect)}
        </TableCell>
        <TableCell sx={colorSx(row.totalSelectionEffect)}>
          {fPct(row.totalSelectionEffect)}
        </TableCell>
        <TableCell sx={colorSx(row.totalInteractionEffect)}>
          {fPct(row.totalInteractionEffect)}
        </TableCell>
      </TableRow>

      {/* Industry detail collapse */}
      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0, px: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ px: 3, py: 1, bgcolor: 'background.neutral' }}>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', mb: 1, display: 'block' }}
              >
                行业归因明细
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>行业</TableCell>
                    <TableCell align="right">组合权重</TableCell>
                    <TableCell align="right">基准权重</TableCell>
                    <TableCell align="right">组合收益</TableCell>
                    <TableCell align="right">基准收益</TableCell>
                    <TableCell align="right">总归因</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.industries.map((ind) => (
                    <TableRow key={ind.industryCode} hover>
                      <TableCell>{ind.industryName}</TableCell>
                      <TableCell align="right">{fPct(ind.portfolioWeight)}</TableCell>
                      <TableCell align="right">{fPct(ind.benchmarkWeight)}</TableCell>
                      <TableCell align="right" sx={colorSx(ind.portfolioReturn)}>
                        {fPct(ind.portfolioReturn)}
                      </TableCell>
                      <TableCell align="right" sx={colorSx(ind.benchmarkReturn)}>
                        {fPct(ind.benchmarkReturn)}
                      </TableCell>
                      <TableCell align="right" sx={colorSx(ind.totalEffect)}>
                        {fPct(ind.totalEffect)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
});

export function BacktestAttributionPanel({ runId }: BacktestAttributionPanelProps) {
  const [benchmarkTsCode, setBenchmarkTsCode] = useState('000300.SH');
  const [granularity, setGranularity] = useState<'MONTHLY' | 'DAILY' | 'WEEKLY'>('MONTHLY');
  const [result, setResult] = useState<BrinsonAttributionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRun = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await runAttribution({ runId, benchmarkTsCode, granularity });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '归因分析失败');
    } finally {
      setLoading(false);
    }
  }, [runId, benchmarkTsCode, granularity]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <FormControl size="small" sx={{ width: 200 }}>
          <InputLabel>基准指数</InputLabel>
          <Select
            label="基准指数"
            value={benchmarkTsCode}
            onChange={(e) => setBenchmarkTsCode(e.target.value)}
            disabled={loading}
          >
            <MenuItem value="000300.SH">沪深300</MenuItem>
            <MenuItem value="000905.SH">中证500</MenuItem>
            <MenuItem value="000985.SH">中证全指</MenuItem>
            <MenuItem value="399001.SZ">深证成指</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ width: 140 }}>
          <InputLabel>分析频率</InputLabel>
          <Select
            label="分析频率"
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as typeof granularity)}
            disabled={loading}
          >
            <MenuItem value="MONTHLY">月度</MenuItem>
            <MenuItem value="WEEKLY">周度</MenuItem>
            <MenuItem value="DAILY">日度</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={handleRun}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {loading ? '分析中…' : '运行归因'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {result && (
        <>
          {/* Cumulative summary */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: '配置效应', value: result.cumulative.totalAllocationEffect },
              { label: '选择效应', value: result.cumulative.totalSelectionEffect },
              { label: '交互效应', value: result.cumulative.totalInteractionEffect },
              { label: '超额收益', value: result.cumulative.totalActiveReturn },
            ].map((item) => (
              <Grid key={item.label} size={{ xs: 6, sm: 3 }}>
                <Card variant="outlined">
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', display: 'block' }}
                    >
                      {item.label}（累计）
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{
                        mt: 0.5,
                        color: item.value >= 0 ? 'success.main' : 'error.main',
                      }}
                    >
                      {fPct(item.value)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Period attribution table */}
          <Card>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Box sx={{ px: 2, py: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  分期归因（点击行查看行业明细）
                </Typography>
              </Box>
              <Divider />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={40} />
                      <TableCell>期间</TableCell>
                      <TableCell align="right">超额收益</TableCell>
                      <TableCell align="right">配置效应</TableCell>
                      <TableCell align="right">选择效应</TableCell>
                      <TableCell align="right">交互效应</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.periods.map((row) => (
                      <PeriodRow key={row.periodLabel} row={row} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}

      {!result && !loading && (
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
            选择基准指数和分析频率后，点击「运行归因」
          </Typography>
        </Box>
      )}
    </Box>
  );
}
