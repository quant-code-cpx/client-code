import type { ReactNode } from 'react';
import type {
  TechnicalSignalDefinition,
  TechnicalSignalStatisticsResponse,
} from 'src/api/technical-signal';

import { MemoryRouter } from 'react-router-dom';
import { act, screen, fireEvent } from '@testing-library/react';

import { ThemeProvider } from '@mui/material/styles';

import { ApiError } from 'src/api/client';
import { render } from 'src/test/test-utils';
import { createTheme } from 'src/theme/create-theme';

import { TechnicalSignalStatisticsPanel } from '../technical-signal-statistics-panel';

const mocks = vi.hoisted(() => ({
  listDefinitions: vi.fn(),
  queryStatistics: vi.fn(),
}));

vi.mock('src/api/technical-signal', () => ({
  technicalSignalApi: {
    listDefinitions: mocks.listDefinitions,
    queryStatistics: mocks.queryStatistics,
  },
}));

vi.mock('../technical-signal-performance-chart', () => ({
  TechnicalSignalPerformanceChart: () => <div>表现图</div>,
}));

vi.mock('@mui/material/Tooltip', () => ({ default: ({ children }: { children: ReactNode }) => children }));

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const definitions: TechnicalSignalDefinition[] = [
  {
    signalKey: 'macd.golden-cross',
    semanticsVersion: 'macd.v1',
    definitionHash: 'definition-hash',
    displayName: 'MACD 金叉',
    direction: 'BULLISH',
    source: 'LOCAL_QFQ_OHLCV',
    description: 'DIF 上穿 DEA',
    parameters: {},
    stable: true,
    deprecatedAt: null,
  },
];

const response: TechnicalSignalStatisticsResponse = {
  meta: {
    tsCode: '600519.SH',
    stockName: '贵州茅台',
    dataAsOf: '20260731',
    computedAt: '2026-08-03T08:00:00.000Z',
    servedAt: '2026-08-03T08:00:00.000Z',
    timezone: 'Asia/Shanghai',
    signalSource: 'LOCAL_QFQ_OHLCV',
    indicatorAlgorithmVersion: 'technical-indicator.v2',
    entryMode: 'SIGNAL_CLOSE',
    adjustment: 'ADJ_FACTOR_RATIO',
    dataVersions: {
      tradeCal: 'trade-cal-v1',
      daily: 'daily-v1',
      adjFactor: 'adj-v1',
      suspendD: 'suspend-v1',
      indexDaily: 'index-v1',
    },
    statisticsAlgorithmVersion: 'signal-statistics.v1',
    returnPolicyVersion: 'adjusted-return.v1',
    confidenceIntervalVersion: 'student-t-wilson.v1',
    confidenceLevel: 0.95,
    benchmarkTsCode: '000300.SH',
    cacheHit: false,
    warnings: [],
  },
  groups: [
    {
      period: '1Y',
      requestedStartDate: '20250801',
      actualStartDate: '20250801',
      endDate: '20260731',
      signalKey: 'macd.golden-cross',
      semanticsVersion: 'macd.v1',
      definitionHash: 'definition-hash',
      direction: 'BULLISH',
      evaluable: true,
      notEvaluableReason: null,
      requiredValidRows: 35,
      actualValidRows: 251,
      occurrenceCount: 12,
      horizons: [
        {
          horizon: 5,
          eligibleOutcomeCount: 12,
          validOutcomeCount: 10,
          immatureCount: 1,
          missingCount: 1,
          overlappingOccurrenceCount: 0,
          missingReasons: {},
          benchmarkMissingCount: 0,
          benchmarkMissingReasons: {},
          raw: {
            sampleCount: 10,
            upCount: 6,
            downCount: 4,
            flatCount: 0,
            upRatio: 0.6,
            downRatio: 0.4,
            flatRatio: 0,
            averageReturnPct: 1.2,
            medianReturnPct: 0.8,
            minimumReturnPct: -2,
            maximumReturnPct: 4,
            stdDevPct: 1.5,
            p25ReturnPct: -0.5,
            p75ReturnPct: 2.1,
            meanConfidenceLowerPct: 0.2,
            meanConfidenceUpperPct: 2.2,
          },
          directional: {
            sampleCount: 10,
            successCount: 6,
            failureCount: 4,
            flatCount: 0,
            successRatio: 0.6,
            averageDirectionalReturnPct: 1.2,
            medianDirectionalReturnPct: 0.8,
            minimumDirectionalReturnPct: -2,
            maximumDirectionalReturnPct: 4,
            stdDevDirectionalReturnPct: 1.5,
            p25DirectionalReturnPct: -0.5,
            p75DirectionalReturnPct: 2.1,
            meanDirectionalConfidenceLowerPct: 0.2,
            meanDirectionalConfidenceUpperPct: 2.2,
            successConfidenceLower: 0.31,
            successConfidenceUpper: 0.83,
          },
          excess: null,
          excursion: {
            completePathCount: 10,
            partialPathCount: 0,
            averageMfePct: 2.3,
            medianMfePct: 1.8,
            averageMaePct: -1.1,
            medianMaePct: -0.7,
            averageDirectionalMfePct: 2.3,
            averageDirectionalMaePct: -1.1,
          },
          minSampleDate: '20250808',
          maxSampleDate: '20260720',
        },
      ],
    },
  ],
};

describe('TechnicalSignalStatisticsPanel', () => {
  beforeEach(() => {
    mocks.listDefinitions.mockReset();
    mocks.queryStatistics.mockReset();
    mocks.listDefinitions.mockResolvedValue(definitions);
    mocks.queryStatistics.mockResolvedValue(response);
  });

  it('loads default catalog and summary without relying on legacy endpoints', async () => {
    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <MemoryRouter>
            <TechnicalSignalStatisticsPanel tsCode="600519.SH" />
          </MemoryRouter>
        </ThemeProvider>
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    await vi.waitFor(() => expect(screen.getByText('信号表现矩阵')).toBeInTheDocument());

    expect(mocks.listDefinitions).toHaveBeenCalledWith({ includeDeprecated: false }, expect.any(AbortSignal));
    expect(mocks.queryStatistics).toHaveBeenCalledWith(
      {
        tsCode: '600519.SH',
        periods: ['1Y', '3Y'],
        horizons: [1, 3, 5, 10, 20],
        entryMode: 'SIGNAL_CLOSE',
        includeBenchmark: true,
      },
      expect.any(AbortSignal)
    );
    expect(screen.getByText('MACD 金叉')).toBeInTheDocument();
    expect(screen.getByText('数据截至 2026-07-31')).toBeInTheDocument();
  });

  it('hides the prior stock result while the next stock request is in flight', async () => {
    let resolveNextStock: (() => void) | undefined;
    mocks.queryStatistics.mockImplementation(({ tsCode }: { tsCode: string }) => {
      if (tsCode === '600519.SH') return Promise.resolve(response);
      return new Promise<TechnicalSignalStatisticsResponse>((resolve) => {
        resolveNextStock = () => resolve({ ...response, meta: { ...response.meta, tsCode } });
      });
    });

    let view!: ReturnType<typeof render>;
    await act(async () => {
      view = render(
        <ThemeProvider theme={createTheme()}>
          <MemoryRouter>
            <TechnicalSignalStatisticsPanel tsCode="600519.SH" />
          </MemoryRouter>
        </ThemeProvider>
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    await vi.waitFor(() => expect(screen.getByText('数据截至 2026-07-31')).toBeInTheDocument());

    await act(async () => {
      view.rerender(
        <ThemeProvider theme={createTheme()}>
          <MemoryRouter>
            <TechnicalSignalStatisticsPanel tsCode="000001.SZ" />
          </MemoryRouter>
        </ThemeProvider>
      );
      await Promise.resolve();
    });

    await vi.waitFor(() =>
      expect(mocks.queryStatistics).toHaveBeenCalledWith(
        expect.objectContaining({ tsCode: '000001.SZ' }),
        expect.any(AbortSignal)
      )
    );

    expect(screen.queryByText('数据截至 2026-07-31')).not.toBeInTheDocument();
    await act(async () => {
      resolveNextStock?.();
      await Promise.resolve();
    });
  });

  it('blocks the summary request and hides raw route errors when the signal catalog fails', async () => {
    mocks.listDefinitions
      .mockRejectedValueOnce(
        new ApiError('Cannot POST /api/stock/detail/analysis/signal-definitions/list', {
          status: 404,
          code: 404,
        })
      )
      .mockResolvedValueOnce(definitions);

    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <MemoryRouter>
            <TechnicalSignalStatisticsPanel tsCode="600519.SH" />
          </MemoryRouter>
        </ThemeProvider>
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    await vi.waitFor(() => expect(screen.getByText('标准信号目录暂不可用，请稍后重试。')).toBeInTheDocument());
    expect(screen.queryByText(/Cannot POST/)).not.toBeInTheDocument();
    expect(mocks.queryStatistics).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '重试' }));
      await Promise.resolve();
    });

    await vi.waitFor(() => expect(mocks.listDefinitions).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(mocks.queryStatistics).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(screen.getByText('MACD 金叉')).toBeInTheDocument());
  });

  it('hides the raw route error when the statistics endpoint is unavailable', async () => {
    mocks.queryStatistics.mockRejectedValueOnce(
      new ApiError('Cannot POST /api/stock/detail/analysis/signal-statistics/query', {
        status: 404,
        code: 404,
      })
    );

    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <MemoryRouter>
            <TechnicalSignalStatisticsPanel tsCode="600519.SH" />
          </MemoryRouter>
        </ThemeProvider>
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    await vi.waitFor(() =>
      expect(screen.getByText('当前环境暂未提供技术信号统计服务，请稍后重试。')).toBeInTheDocument()
    );
    expect(screen.queryByText(/Cannot POST/)).not.toBeInTheDocument();
  });

  it('offers to disable the benchmark for the current numeric-code backend error contract', async () => {
    mocks.queryStatistics
      .mockRejectedValueOnce(
        new ApiError('TECHNICAL_SIGNAL_BENCHMARK_NOT_READY: 000300.SH 全历史基座尚未就绪', {
          status: 409,
          code: 409,
        })
      )
      .mockResolvedValueOnce({
        ...response,
        meta: { ...response.meta, benchmarkTsCode: null },
      });

    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <MemoryRouter>
            <TechnicalSignalStatisticsPanel tsCode="600519.SH" />
          </MemoryRouter>
        </ThemeProvider>
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    await vi.waitFor(() => expect(screen.getByText('沪深 300 基准数据未就绪')).toBeInTheDocument());
    expect(screen.getByText('000300.SH 全历史基座尚未就绪')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '关闭对标后重试' }));
      await Promise.resolve();
    });

    await vi.waitFor(() =>
      expect(mocks.queryStatistics).toHaveBeenLastCalledWith(
        expect.objectContaining({ includeBenchmark: false }),
        expect.any(AbortSignal)
      )
    );
    await vi.waitFor(() => expect(screen.getByText('信号表现矩阵')).toBeInTheDocument());
  });

  it('shows a readable data-readiness error without exposing the backend error code', async () => {
    mocks.queryStatistics.mockRejectedValueOnce(
      new ApiError('TECHNICAL_SIGNAL_DATA_NOT_READY: 19980520 缺日线且无停牌事实', {
        status: 409,
        code: 409,
      })
    );

    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <MemoryRouter>
            <TechnicalSignalStatisticsPanel tsCode="600089.SH" />
          </MemoryRouter>
        </ThemeProvider>
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    await vi.waitFor(() => expect(screen.getByText('基础行情数据未就绪')).toBeInTheDocument());
    expect(screen.getByText('19980520 缺日线且无停牌事实')).toBeInTheDocument();
    expect(screen.queryByText(/TECHNICAL_SIGNAL_DATA_NOT_READY/)).not.toBeInTheDocument();
  });
});
