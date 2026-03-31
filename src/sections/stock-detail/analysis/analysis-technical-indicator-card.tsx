import type { TechnicalDataPoint } from 'src/api/stock';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

function fmtD(d: string): string {
  if (!d) return d;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (d.includes('T')) return d.slice(0, 10);
  return d;
}

const CLASSIC_INDICATORS = ['MACD', 'KDJ', 'RSI', 'BOLL', 'WR', 'CCI', 'DMI'];
const EXTENDED_INDICATORS = ['TRIX', 'DMA', 'BIAS', 'OBV', 'VR', 'EMV', 'ROC', 'PSY', 'BR/AR', 'CR', 'SAR'];

type Props = { history: TechnicalDataPoint[] };

function zeroLine() {
  return [{ y: 0, borderColor: '#999', strokeDashArray: 3 }];
}

function refLines(...values: number[]) {
  return values.map((y) => ({ y, borderColor: '#999', strokeDashArray: 3 }));
}

function IndicatorChart({ activeIndicator, history }: { activeIndicator: string; history: TechnicalDataPoint[] }) {
  const commonOpts = {
    xaxis: { type: 'category' as const, tickAmount: 8, labels: { rotate: -30 } },
    legend: { show: true },
    tooltip: { shared: true },
  };

  const series: { name: string; type?: string; data: { x: string; y: number | null }[] }[] = [];
  let extraOpts: object = {};

  if (activeIndicator === 'MACD') {
    series.push(
      { name: 'HIST', type: 'bar', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.macdHist })) },
      { name: 'DIF', type: 'line', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.macdDif })) },
      { name: 'DEA', type: 'line', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.macdDea })) },
    );
    extraOpts = {
      chart: { type: 'bar' },
      stroke: { width: [0, 2, 2] },
      colors: ['#EF5350', '#1877F2', '#FF9800'],
      plotOptions: {
        bar: {
          colors: {
            ranges: [
              { from: -1e9, to: 0, color: '#26A69A' },
              { from: 0, to: 1e9, color: '#EF5350' },
            ],
          },
        },
      },
      annotations: { yaxis: zeroLine() },
      yaxis: { labels: { formatter: (v: number) => v.toFixed(3) } },
    };
  } else if (activeIndicator === 'KDJ') {
    series.push(
      { name: 'K', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.kdjK })) },
      { name: 'D', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.kdjD })) },
      { name: 'J', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.kdjJ })) },
    );
    extraOpts = {
      colors: ['#EF5350', '#1877F2', '#FF9800'],
      annotations: { yaxis: refLines(20, 80) },
      yaxis: { min: 0, max: 100, labels: { formatter: (v: number) => v.toFixed(1) } },
    };
  } else if (activeIndicator === 'RSI') {
    series.push(
      { name: 'RSI6', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.rsi6 })) },
      { name: 'RSI12', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.rsi12 })) },
      { name: 'RSI24', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.rsi24 })) },
    );
    extraOpts = {
      colors: ['#EF5350', '#1877F2', '#FF9800'],
      annotations: { yaxis: refLines(20, 30, 70, 80) },
      yaxis: { min: 0, max: 100, labels: { formatter: (v: number) => v.toFixed(1) } },
    };
  } else if (activeIndicator === 'BOLL') {
    series.push(
      { name: '收盘价', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.close })) },
      { name: '上轨', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.bollUpper })) },
      { name: '中轨', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.bollMid })) },
      { name: '下轨', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.bollLower })) },
    );
    extraOpts = {
      colors: ['#333333', '#EF5350', '#1877F2', '#26A69A'],
      stroke: { width: [2, 1, 1, 1], curve: 'smooth' },
      yaxis: { labels: { formatter: (v: number) => v.toFixed(2) } },
    };
  } else if (activeIndicator === 'WR') {
    series.push(
      { name: 'WR6', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.wr6 })) },
      { name: 'WR10', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.wr10 })) },
    );
    extraOpts = {
      colors: ['#EF5350', '#1877F2'],
      annotations: { yaxis: refLines(-20, -80) },
      yaxis: { min: -100, max: 0, labels: { formatter: (v: number) => v.toFixed(1) } },
    };
  } else if (activeIndicator === 'CCI') {
    series.push(
      { name: 'CCI', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.cci })) },
    );
    extraOpts = {
      colors: ['#1877F2'],
      annotations: { yaxis: refLines(100, -100) },
      yaxis: { labels: { formatter: (v: number) => v.toFixed(1) } },
    };
  } else if (activeIndicator === 'DMI') {
    series.push(
      { name: '+DI', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.dmiPdi })) },
      { name: '-DI', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.dmiMdi })) },
      { name: 'ADX', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.dmiAdx })) },
      { name: 'ADXR', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.dmiAdxr })) },
    );
    extraOpts = {
      colors: ['#EF5350', '#26A69A', '#1877F2', '#FF9800'],
      annotations: { yaxis: refLines(25) },
      yaxis: { labels: { formatter: (v: number) => v.toFixed(2) } },
    };
  } else if (activeIndicator === 'TRIX') {
    series.push(
      { name: 'TRIX', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.trix })) },
      { name: 'MATRIX', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.trixMa })) },
    );
    extraOpts = {
      colors: ['#EF5350', '#1877F2'],
      annotations: { yaxis: zeroLine() },
      yaxis: { labels: { formatter: (v: number) => v.toFixed(4) } },
    };
  } else if (activeIndicator === 'DMA') {
    series.push(
      { name: 'DMA', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.dma })) },
      { name: 'AMA', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.dmaMa })) },
    );
    extraOpts = {
      colors: ['#EF5350', '#1877F2'],
      annotations: { yaxis: zeroLine() },
      yaxis: { labels: { formatter: (v: number) => v.toFixed(2) } },
    };
  } else if (activeIndicator === 'BIAS') {
    series.push(
      { name: 'BIAS6', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.bias6 })) },
      { name: 'BIAS12', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.bias12 })) },
      { name: 'BIAS24', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.bias24 })) },
    );
    extraOpts = {
      colors: ['#EF5350', '#1877F2', '#FF9800'],
      annotations: { yaxis: zeroLine() },
      yaxis: { labels: { formatter: (v: number) => v.toFixed(2) } },
    };
  } else if (activeIndicator === 'OBV') {
    series.push(
      { name: 'OBV', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.obv })) },
      { name: 'OBVMA', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.obvMa })) },
    );
    extraOpts = {
      colors: ['#1877F2', '#FF9800'],
      yaxis: { labels: { formatter: (v: number) => v.toFixed(0) } },
    };
  } else if (activeIndicator === 'VR') {
    series.push(
      { name: 'VR', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.vr })) },
    );
    extraOpts = {
      colors: ['#1877F2'],
      annotations: { yaxis: refLines(70, 150, 450) },
      yaxis: { labels: { formatter: (v: number) => v.toFixed(1) } },
    };
  } else if (activeIndicator === 'EMV') {
    series.push(
      { name: 'EMV', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.emv })) },
      { name: 'EMVMA', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.emvMa })) },
    );
    extraOpts = {
      colors: ['#1877F2', '#FF9800'],
      annotations: { yaxis: zeroLine() },
      yaxis: { labels: { formatter: (v: number) => v.toFixed(4) } },
    };
  } else if (activeIndicator === 'ROC') {
    series.push(
      { name: 'ROC', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.roc })) },
      { name: 'ROCMA', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.rocMa })) },
    );
    extraOpts = {
      colors: ['#1877F2', '#FF9800'],
      annotations: { yaxis: zeroLine() },
      yaxis: { labels: { formatter: (v: number) => v.toFixed(2) } },
    };
  } else if (activeIndicator === 'PSY') {
    series.push(
      { name: 'PSY', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.psy })) },
      { name: 'PSYMA', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.psyMa })) },
    );
    extraOpts = {
      colors: ['#1877F2', '#FF9800'],
      annotations: { yaxis: refLines(25, 75) },
      yaxis: { min: 0, max: 100, labels: { formatter: (v: number) => v.toFixed(1) } },
    };
  } else if (activeIndicator === 'BR/AR') {
    series.push(
      { name: 'BR', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.br })) },
      { name: 'AR', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.ar })) },
    );
    extraOpts = {
      colors: ['#EF5350', '#1877F2'],
      annotations: { yaxis: refLines(50, 150, 300) },
      yaxis: { labels: { formatter: (v: number) => v.toFixed(1) } },
    };
  } else if (activeIndicator === 'CR') {
    series.push(
      { name: 'CR', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.cr })) },
    );
    extraOpts = {
      colors: ['#1877F2'],
      annotations: { yaxis: refLines(40, 200) },
      yaxis: { labels: { formatter: (v: number) => v.toFixed(1) } },
    };
  } else if (activeIndicator === 'SAR') {
    series.push(
      { name: 'SAR', type: 'scatter', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.sar })) },
      { name: '收盘价', type: 'line', data: history.map((d) => ({ x: fmtD(d.tradeDate), y: d.close })) },
    );
    extraOpts = {
      colors: ['#EF5350', '#333333'],
      markers: { size: [4, 0] },
      stroke: { width: [0, 2] },
      yaxis: { labels: { formatter: (v: number) => v.toFixed(2) } },
    };
  }

  const chartOptions = useChart({
    ...commonOpts,
    ...extraOpts,
  });

  if (history.length === 0) {
    return <Typography color="text.secondary" textAlign="center" py={4}>暂无数据</Typography>;
  }

  return <Chart key={activeIndicator} type="line" series={series} options={chartOptions} sx={{ height: 280 }} />;
}

export function AnalysisTechnicalIndicatorCard({ history }: Props) {
  const [activeIndicator, setActiveIndicator] = useState('MACD');

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>技术指标</Typography>
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>经典指标</Typography>
            <ToggleButtonGroup
              value={activeIndicator}
              exclusive={true}
              onChange={(_, v) => { if (v) setActiveIndicator(v); }}
              size="small"
              sx={{ flexWrap: 'wrap' }}
            >
              {CLASSIC_INDICATORS.map((ind) => (
                <ToggleButton key={ind} value={ind}>{ind}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>扩展指标</Typography>
            <ToggleButtonGroup
              value={activeIndicator}
              exclusive={true}
              onChange={(_, v) => { if (v) setActiveIndicator(v); }}
              size="small"
              sx={{ flexWrap: 'wrap' }}
            >
              {EXTENDED_INDICATORS.map((ind) => (
                <ToggleButton key={ind} value={ind}>{ind}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Stack>
        <IndicatorChart activeIndicator={activeIndicator} history={history} />
      </CardContent>
    </Card>
  );
}
