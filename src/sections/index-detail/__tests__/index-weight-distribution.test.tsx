import type { IndexConstituentItem } from 'src/api/index-detail';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { IndexWeightDistribution } from '../index-weight-distribution';

const chartMock = vi.hoisted(() => vi.fn());

vi.mock('src/components/chart', () => ({
  useChart: (options: unknown) => options,
  Chart: (props: unknown) => {
    chartMock(props);
    return <div data-testid="weight-chart" />;
  },
}));

beforeEach(() => chartMock.mockClear());

describe('IndexWeightDistribution', () => {
  it('缺失权重不按 0 参与饼图或行业合计', () => {
    renderWithProviders(
      <IndexWeightDistribution
        constituents={[constituent('A', '银行', 12.5), constituent('B', '银行', null)]}
      />
    );

    expect(screen.getByText('1 只成分股缺少权重，未计入权重图')).toBeInTheDocument();
    const props = chartMock.mock.calls[0][0] as { series: number[] };
    expect(props.series).toEqual([12.5]);
    expect(screen.getByText('12.50')).toBeInTheDocument();
  });

  it('全部权重缺失时显示明确空态，不渲染零值饼图', () => {
    renderWithProviders(
      <IndexWeightDistribution constituents={[constituent('A', '银行', null)]} />
    );

    expect(screen.getByText('暂无有效权重数据')).toBeInTheDocument();
    expect(screen.queryByTestId('weight-chart')).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});

function constituent(
  tsCode: string,
  industry: string,
  weight: number | null
): IndexConstituentItem {
  return {
    tsCode,
    name: tsCode,
    industry,
    weight,
    close: null,
    pctChg: null,
    totalMv: null,
    circMv: null,
  };
}
