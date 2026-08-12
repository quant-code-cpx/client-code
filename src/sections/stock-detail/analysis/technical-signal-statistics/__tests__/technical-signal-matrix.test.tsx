import type { ReactNode } from 'react';
import type {
  SignalPeriodStatistics,
  SignalHorizonStatistics,
  TechnicalSignalDefinition,
} from 'src/api/technical-signal';

import { screen, fireEvent } from '@testing-library/react';

import { ThemeProvider } from '@mui/material/styles';

import { render } from 'src/test/test-utils';
import { createTheme } from 'src/theme/create-theme';

import { TechnicalSignalMatrix } from '../technical-signal-matrix';

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

const horizon: SignalHorizonStatistics = {
  horizon: 1,
  eligibleOutcomeCount: 0,
  validOutcomeCount: 0,
  immatureCount: 0,
  missingCount: 0,
  overlappingOccurrenceCount: 0,
  missingReasons: {},
  benchmarkMissingCount: 0,
  benchmarkMissingReasons: {},
  raw: {
    sampleCount: 0,
    upCount: 0,
    downCount: 0,
    flatCount: 0,
    upRatio: null,
    downRatio: null,
    flatRatio: null,
    averageReturnPct: null,
    medianReturnPct: null,
    minimumReturnPct: null,
    maximumReturnPct: null,
    stdDevPct: null,
    p25ReturnPct: null,
    p75ReturnPct: null,
    meanConfidenceLowerPct: null,
    meanConfidenceUpperPct: null,
  },
  directional: {
    sampleCount: 0,
    successCount: 0,
    failureCount: 0,
    flatCount: 0,
    successRatio: null,
    averageDirectionalReturnPct: null,
    medianDirectionalReturnPct: null,
    minimumDirectionalReturnPct: null,
    maximumDirectionalReturnPct: null,
    stdDevDirectionalReturnPct: null,
    p25DirectionalReturnPct: null,
    p75DirectionalReturnPct: null,
    meanDirectionalConfidenceLowerPct: null,
    meanDirectionalConfidenceUpperPct: null,
    successConfidenceLower: null,
    successConfidenceUpper: null,
  },
  excess: null,
  excursion: {
    completePathCount: 0,
    partialPathCount: 0,
    averageMfePct: null,
    medianMfePct: null,
    averageMaePct: null,
    medianMaePct: null,
    averageDirectionalMfePct: null,
    averageDirectionalMaePct: null,
  },
  minSampleDate: null,
  maxSampleDate: null,
};

function renderMatrix(
  groups: SignalPeriodStatistics[],
  requestedHorizons = [1, 3],
  onSelect = vi.fn()
) {
  return render(
    <ThemeProvider theme={createTheme()}>
      <TechnicalSignalMatrix
        activePeriod="1Y"
        definitions={definitions}
        groups={groups}
        onSelect={onSelect}
        requestedHorizons={requestedHorizons}
        selectedHorizon={null}
        selectedSignalKey={null}
      />
    </ThemeProvider>
  );
}

describe('TechnicalSignalMatrix', () => {
  it('keeps requested horizon columns aligned when every group lacks history', () => {
    renderMatrix([
      {
        period: '1Y',
        requestedStartDate: '20250801',
        actualStartDate: null,
        endDate: '20260731',
        signalKey: 'macd.golden-cross',
        semanticsVersion: 'macd.v1',
        definitionHash: 'definition-hash',
        direction: 'BULLISH',
        evaluable: false,
        notEvaluableReason: 'INSUFFICIENT_HISTORY',
        requiredValidRows: 35,
        actualValidRows: 12,
        occurrenceCount: 0,
        horizons: [],
      },
    ]);

    expect(screen.getByText('T+1')).toBeInTheDocument();
    expect(screen.getByText('T+3')).toBeInTheDocument();
    expect(screen.getByText(/历史不足/).closest('td')).toHaveAttribute('colspan', '2');
  });

  it('labels an evaluable signal with zero occurrences as absent in the interval', () => {
    renderMatrix([
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
        occurrenceCount: 0,
        horizons: [horizon],
      },
    ]);

    expect(screen.getByText('区间内未出现')).toBeInTheDocument();
  });

  it('activates the row and an individual horizon cell without bubbling twice', () => {
    const onSelect = vi.fn();
    renderMatrix(
      [
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
          occurrenceCount: 1,
          horizons: [horizon],
        },
      ],
      [1],
      onSelect
    );

    fireEvent.keyDown(screen.getByRole('button', { name: '查看 MACD 金叉 信号统计' }), {
      key: 'Enter',
    });
    fireEvent.keyDown(screen.getByRole('button', { name: '查看 MACD 金叉 T+1 统计' }), {
      key: ' ',
    });

    expect(onSelect).toHaveBeenNthCalledWith(1, 'macd.golden-cross', 1);
    expect(onSelect).toHaveBeenNthCalledWith(2, 'macd.golden-cross', 1);
    expect(onSelect).toHaveBeenCalledTimes(2);
  });
});
