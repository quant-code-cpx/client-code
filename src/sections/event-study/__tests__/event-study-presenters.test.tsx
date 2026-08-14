/** @vitest-environment jsdom */

import type {
  EventSample,
  EventAnalyzeResult,
  EventCalendarResult,
} from 'src/api/event-study';

import { vi } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { EventAnalysisChart } from '../event-analysis-chart';
import { ProgressSnackbar } from '../_shared/progress-snackbar';
import { EventCalendarHeatmap } from '../event-calendar-heatmap';
import { EventDetailDrawer } from '../_shared/event-detail-drawer';
import { SampleDetailDrawer } from '../_shared/sample-detail-drawer';
import { EventAnalysisSummaryCards } from '../event-analysis-summary-cards';

const chartCalls = vi.hoisted(() => ({
  options: [] as unknown[],
  props: [] as unknown[],
}));

vi.mock('src/components/chart', () => ({
  useChart: (options: unknown) => {
    chartCalls.options.push(options);
    return options;
  },
  Chart: (props: { type: string; series: Array<{ name: string }> }) => {
    chartCalls.props.push(props);
    return (
      <div data-testid={`chart-${props.type}`}>
        {props.series.map((item) => item.name).join(' / ')}
      </div>
    );
  },
}));

const result: EventAnalyzeResult = {
  eventType: 'FORECAST',
  eventLabel: '业绩预告',
  sampleCount: 18,
  window: '1/1',
  benchmark: '000300.SH',
  aarSeries: [0.01, -0.02, 0.005],
  caarSeries: [0.01, -0.01, -0.005],
  aarStdSeries: [0.001, 0.002, 0.003],
  significantSegments: [{ from: 0, to: 1, direction: 'neg' }],
  caar: 0.0234,
  tStatistic: 2.3456,
  pValue: 0.01234,
  significantSampleRatio: 0.375,
  topSamples: [],
  bottomSamples: [],
};

describe('EventAnalysisChart', () => {
  beforeEach(() => {
    chartCalls.options.length = 0;
    chartCalls.props.length = 0;
  });

  it('将收益转为百分比，累计标准差生成 ±2σ，并标记事件日与显著区段', () => {
    renderWithProviders(<EventAnalysisChart result={result} />);

    expect(screen.getByTestId('chart-line')).toHaveTextContent(
      'CAAR上界(+2σ) / CAAR下界(-2σ) / CAAR (%) / AAR (%)'
    );
    const props = chartCalls.props.at(-1) as {
      series: Array<{ name: string; data: number[] }>;
    };
    expect(props.series[0].data).toEqual([1.2, -0.5528, 0.2483]);
    expect(props.series[1].data).toEqual([0.8, -1.4472, -1.2483]);
    expect(props.series[2].data).toEqual([1, -1, -0.5]);
    expect(props.series[3].data).toEqual([1, -2, 0.5]);

    const options = chartCalls.options.at(-1) as {
      xaxis: { categories: string[] };
      yaxis: Array<{ labels: { formatter: (value: number) => string } }>;
      tooltip: { y: { formatter: (value: number) => string } };
      annotations: { xaxis: Array<{ x: number; x2?: number; label: { text: string } }> };
    };
    expect(options.xaxis.categories).toEqual(['-1', '事件日(0)', '1']);
    expect(options.annotations.xaxis).toMatchObject([
      { x: 1, label: { text: '事件日' } },
      { x: 1, x2: 2, label: { text: '显著(负)' } },
    ]);
    expect(options.yaxis[0].labels.formatter(1.234)).toBe('1.23%');
    expect(options.tooltip.y.formatter(-1.23456)).toBe('-1.2346%');
  });

  it('缺少 window、标准差与显著区段时以序列中心和零方差兜底', () => {
    renderWithProviders(
      <EventAnalysisChart
        result={{
          ...result,
          window: '',
          aarStdSeries: undefined,
          significantSegments: undefined,
        }}
      />
    );
    const props = chartCalls.props.at(-1) as { series: Array<{ data: number[] }> };
    expect(props.series[0].data).toEqual([1, -1, -0.5]);
    expect(props.series[1].data).toEqual([1, -1, -0.5]);
    const options = chartCalls.options.at(-1) as { annotations: { xaxis: unknown[] } };
    expect(options.annotations.xaxis).toHaveLength(1);
  });
});

describe('EventCalendarHeatmap', () => {
  beforeEach(() => {
    chartCalls.options.length = 0;
    chartCalls.props.length = 0;
  });

  it('排序紧凑交易日、格式化展示日期，并为缺失类型日期补零', () => {
    const data: EventCalendarResult = {
      cells: [
        { date: '20260813', eventType: 'FORECAST', count: 8, significantCount: 2 },
        { date: '20260811', eventType: 'REPURCHASE', count: 3, significantCount: 0 },
        { date: '20260811', eventType: 'FORECAST', count: 1, significantCount: 0 },
      ],
    };
    renderWithProviders(<EventCalendarHeatmap data={data} title="自定义日历" height={360} />);

    expect(screen.getByText('自定义日历')).toBeInTheDocument();
    expect(screen.getByTestId('chart-heatmap')).toHaveTextContent('业绩预告 / 股票回购');
    const props = chartCalls.props.at(-1) as {
      series: Array<{ name: string; data: Array<{ x: string; y: number }> }>;
    };
    expect(props.series).toEqual([
      {
        name: '业绩预告',
        data: [
          { x: '2026-08-11', y: 1 },
          { x: '2026-08-13', y: 8 },
        ],
      },
      {
        name: '股票回购',
        data: [
          { x: '2026-08-11', y: 3 },
          { x: '2026-08-13', y: 0 },
        ],
      },
    ]);
    expect(JSON.stringify(props.series)).not.toContain('20260813');
  });

  it('空日历仍渲染可解释的空 series', () => {
    renderWithProviders(<EventCalendarHeatmap data={{ cells: [] }} />);
    const props = chartCalls.props.at(-1) as { series: unknown[] };
    expect(props.series).toEqual([]);
  });
});

describe('EventAnalysisSummaryCards', () => {
  it('按金融语义展示正收益、显著性与 null 占比', () => {
    const view = renderWithProviders(<EventAnalysisSummaryCards result={result} />);
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('+2.34%')).toBeInTheDocument();
    expect(screen.getByText('2.346')).toBeInTheDocument();
    expect(screen.getByText('0.0123')).toBeInTheDocument();
    expect(screen.getByText('37.5%')).toBeInTheDocument();

    view.rerender(
      <EventAnalysisSummaryCards
        result={{ ...result, caar: -0.01, pValue: 0.25, significantSampleRatio: undefined }}
      />
    );
    expect(screen.getByText('-1.00%')).toBeInTheDocument();
    expect(screen.getByText('0.2500')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});

describe('EventDetailDrawer', () => {
  it('兼容 camel/snake 字段，格式化紧凑日与 ISO 日并保留 null', async () => {
    const onClose = vi.fn();
    const { user } = renderWithProviders(
      <EventDetailDrawer
        open
        onClose={onClose}
        eventType="FORECAST"
        title="平安银行事件"
        detail={{
          tsCode: '000001.SZ',
          ann_date: '20260813',
          syncedAt: '2026-08-13T08:30:00Z',
          netProfitMin: null,
          customField: false,
        }}
      />
    );

    expect(screen.getByText('平安银行事件')).toBeInTheDocument();
    expect(screen.getByText('业绩预告')).toBeInTheDocument();
    expect(screen.getAllByText('2026-08-13')).toHaveLength(2);
    expect(screen.getByText('净利润下限(万元)')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('customField')).toBeInTheDocument();
    expect(screen.getByText('false')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('未知事件类型与空详情都有明确兜底', () => {
    renderWithProviders(
      <EventDetailDrawer open onClose={vi.fn()} eventType="CUSTOM" detail={null} />
    );
    expect(screen.getByText('CUSTOM')).toBeInTheDocument();
    expect(screen.getByText('暂无字段')).toBeInTheDocument();
  });
});

describe('SampleDetailDrawer', () => {
  beforeEach(() => {
    chartCalls.options.length = 0;
    chartCalls.props.length = 0;
  });

  it('紧凑日期转展示日期，正 CAR 使用涨红语义并转换 AR 百分比', async () => {
    const sample: EventSample = {
      tsCode: '000001.SZ',
      name: '平安银行',
      eventDate: '20260813',
      car: 0.035,
      arSeries: [-0.01, 0.005, 0.02],
    };
    const onClose = vi.fn();
    const { user } = renderWithProviders(
      <SampleDetailDrawer open onClose={onClose} sample={sample} preDays={1} />
    );

    expect(screen.getByText(/000001\.SZ · 2026-08-13/)).toBeInTheDocument();
    const car = screen.getByText('+3.50%');
    expect(getComputedStyle(car).color).toBe('var(--palette-error-main)');
    expect(screen.getByRole('link', { name: '查看个股' })).toHaveAttribute(
      'href',
      '/stock/detail?code=000001.SZ'
    );
    const props = chartCalls.props.at(-1) as {
      series: Array<{ name: string; data: number[] }>;
    };
    expect(props.series).toEqual([{ name: 'AR', data: [-1, 0.5, 2] }]);
    const options = chartCalls.options.at(-1) as {
      xaxis: { categories: string[] };
      yaxis: { labels: { formatter: (value: number) => string } };
    };
    expect(options.xaxis.categories).toEqual(['-1', '0', '1']);
    expect(options.yaxis.labels.formatter(-0.0123)).toBe('-1.23%');
    await user.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('负 CAR 使用跌绿语义；null 样本不伪造数据', () => {
    const view = renderWithProviders(
      <SampleDetailDrawer
        open
        onClose={vi.fn()}
        sample={{
          tsCode: '600000.SH',
          name: null,
          eventDate: '20260812',
          car: -0.02,
          arSeries: [],
        }}
        preDays={2}
      />
    );
    const car = screen.getByText('-2.00%');
    expect(getComputedStyle(car).color).toBe('var(--palette-success-main)');
    expect(screen.getByText('暂无 AR 数据')).toBeInTheDocument();

    view.rerender(<SampleDetailDrawer open onClose={vi.fn()} sample={null} preDays={2} />);
    expect(
      screen.getByText(
        (_, element) => element?.tagName === 'SPAN' && element.textContent?.trim() === '· —'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('暂无 AR 数据')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '查看个股' })).toHaveAttribute(
      'href',
      '/stock/detail?code='
    );
  });
});

describe('ProgressSnackbar', () => {
  it('确定进度夹紧到 0~100 且支持关闭', async () => {
    const onClose = vi.fn();
    const { user, rerender } = renderWithProviders(
      <ProgressSnackbar
        open
        onClose={onClose}
        title="信号扫描"
        message="正在处理行情"
        progress={1.8}
      />
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    await user.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<ProgressSnackbar open onClose={onClose} title="信号扫描" progress={-0.2} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('不确定进度不展示误导性百分比', () => {
    renderWithProviders(
      <ProgressSnackbar open onClose={vi.fn()} title="信号扫描" indeterminate />
    );
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });
});
