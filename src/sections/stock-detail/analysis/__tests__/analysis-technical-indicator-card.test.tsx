import type { TechnicalDataPoint } from 'src/api/stock';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { AnalysisTechnicalIndicatorCard } from '../analysis-technical-indicator-card';

vi.mock('src/components/chart', () => ({
  useChart: (options: unknown) => options,
  Chart: ({
    series,
    options,
  }: {
    series: Array<{ name: string; type?: string; data: Array<{ x: string; y: number | null }> }>;
    options: {
      colors?: string[];
      yaxis?: { min?: number | ((value: number) => number); max?: number | ((value: number) => number) };
    };
  }) => {
    const min = typeof options.yaxis?.min === 'function' ? options.yaxis.min(-12) : options.yaxis?.min;
    const max = typeof options.yaxis?.max === 'function' ? options.yaxis.max(115) : options.yaxis?.max;
    return (
      <div
        data-testid="indicator-chart"
        data-series={series.map((item) => item.name).join(',')}
        data-types={series.map((item) => item.type ?? 'line').join(',')}
        data-dates={series.flatMap((item) => item.data.map((point) => point.x)).join(',')}
        data-values={series.flatMap((item) => item.data.map((point) => String(point.y))).join(',')}
        data-colors={(options.colors ?? []).join(',')}
        data-min={min}
        data-max={max}
      />
    );
  },
}));

const point = {
  tradeDate: '20260812',
  close: 100,
  macdHist: null,
  macdDif: 1,
  macdDea: 0.5,
  kdjK: -12,
  kdjD: 50,
  kdjJ: 115,
  rsi6: 60,
  rsi12: 55,
  rsi24: 52,
  bollUpper: 110,
  bollMid: 100,
  bollLower: 90,
  wr6: -20,
  wr10: -30,
  cci: 120,
  dmiPdi: 30,
  dmiMdi: 20,
  dmiAdx: 25,
  dmiAdxr: 22,
  trix: 0.1,
  trixMa: 0.08,
  dma: 2,
  dmaMa: 1,
  bias6: 1,
  bias12: 2,
  bias24: 3,
  obv: 1000,
  obvMa: 900,
  vr: 160,
  emv: 0.2,
  emvMa: 0.1,
  roc: 4,
  rocMa: 3,
  psy: 65,
  psyMa: 60,
  br: 120,
  ar: 110,
  cr: 130,
  sar: 95,
} as unknown as TechnicalDataPoint;

const indicatorSeries: Record<string, string> = {
  MACD: 'HIST,DIF,DEA',
  KDJ: 'K,D,J',
  RSI: 'RSI6,RSI12,RSI24',
  BOLL: '收盘价,上轨,中轨,下轨',
  WR: 'WR6,WR10',
  CCI: 'CCI',
  DMI: '+DI,-DI,ADX,ADXR',
  TRIX: 'TRIX,MATRIX',
  DMA: 'DMA,AMA',
  BIAS: 'BIAS6,BIAS12,BIAS24',
  OBV: 'OBV,OBVMA',
  VR: 'VR',
  EMV: 'EMV,EMVMA',
  ROC: 'ROC,ROCMA',
  PSY: 'PSY,PSYMA',
  'BR/AR': 'BR,AR',
  CR: 'CR',
  SAR: 'SAR,收盘价',
};

describe('AnalysisTechnicalIndicatorCard', () => {
  it('18 类指标都使用各自数据序列，并统一格式化交易日', async () => {
    const { user } = renderWithProviders(<AnalysisTechnicalIndicatorCard history={[point]} />);

    for (const [indicator, expectedSeries] of Object.entries(indicatorSeries)) {
      if (indicator !== 'MACD') {
        await user.click(screen.getByRole('button', { name: indicator }));
      }
      const chart = screen.getByTestId('indicator-chart');
      expect(chart).toHaveAttribute('data-series', expectedSeries);
      expect(chart).toHaveAttribute('data-dates', expect.stringContaining('2026-08-12'));
      expect(chart).not.toHaveAttribute('data-dates', expect.stringContaining('20260812'));
    }
  });

  it('保留 null 指标值，MACD 柱线与 SAR 散点类型不会混淆', async () => {
    const { user } = renderWithProviders(<AnalysisTechnicalIndicatorCard history={[point]} />);

    expect(screen.getByTestId('indicator-chart')).toHaveAttribute('data-values', 'null,1,0.5');
    expect(screen.getByTestId('indicator-chart')).toHaveAttribute('data-types', 'bar,line,line');
    await user.click(screen.getByRole('button', { name: 'SAR' }));
    expect(screen.getByTestId('indicator-chart')).toHaveAttribute('data-types', 'scatter,line');
  });

  it('KDJ 轴同时容纳超卖负值和超过 100 的极值', async () => {
    const { user } = renderWithProviders(<AnalysisTechnicalIndicatorCard history={[point]} />);

    await user.click(screen.getByRole('button', { name: 'KDJ' }));
    expect(screen.getByTestId('indicator-chart')).toHaveAttribute('data-min', '-17');
    expect(screen.getByTestId('indicator-chart')).toHaveAttribute('data-max', '120');
  });

  it('历史为空时不初始化空图，明确展示暂无数据', () => {
    renderWithProviders(<AnalysisTechnicalIndicatorCard history={[]} />);

    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.queryByTestId('indicator-chart')).not.toBeInTheDocument();
  });
});
