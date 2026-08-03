import type { ReactNode } from 'react';
import type {
  SignalPeriodStatistics,
  TechnicalSignalOccurrenceListResponse,
} from 'src/api/technical-signal';

import { act, screen } from '@testing-library/react';

import { ThemeProvider } from '@mui/material/styles';

import { render } from 'src/test/test-utils';
import { createTheme } from 'src/theme/create-theme';

import { TechnicalSignalOccurrenceDrawer } from '../technical-signal-occurrence-drawer';

const mocks = vi.hoisted(() => ({ listOccurrences: vi.fn() }));

vi.mock('src/api/technical-signal', () => ({
  technicalSignalApi: { listOccurrences: mocks.listOccurrences },
}));

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@mui/material/Drawer', () => ({
  default: ({ children, open }: { children: ReactNode; open: boolean }) => (open ? <div>{children}</div> : null),
}));

const group: SignalPeriodStatistics = {
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
  horizons: [],
};

const response: TechnicalSignalOccurrenceListResponse = {
  page: 1,
  pageSize: 20,
  total: 1,
  items: [
    {
      signalId: 'signal-id',
      tsCode: '600519.SH',
      signalKey: 'macd.golden-cross',
      semanticsVersion: 'macd.v1',
      definitionHash: 'definition-hash',
      source: 'LOCAL_QFQ_OHLCV',
      indicatorAlgorithmVersion: 'technical-indicator.v2',
      signalDate: '20260701',
      direction: 'BULLISH',
      evidence: {
        previous: { dif: 1.2 },
        current: { dif: 1.4 },
        parameters: { fastPeriod: 12 },
      },
      outcomes: [
        {
          horizon: 5,
          expectedEntryDate: '20260701',
          expectedTargetDate: '20260708',
          qualityStatus: 'VALID',
          missingReason: null,
          entryRawPrice: 100,
          entryAdjFactor: 1,
          targetRawPrice: 102,
          targetAdjFactor: 1,
          rawReturnPct: 2,
          directionalReturnPct: 2,
          benchmarkReturnPct: 1,
          excessReturnPct: 1,
          benchmarkMissingReason: null,
          pathCoverageStatus: 'COMPLETE',
          pathMissingDates: [],
          rawMfePct: 2.5,
          rawMaePct: -0.5,
          directionalMfePct: 2.5,
          directionalMaePct: -0.5,
        },
      ],
    },
  ],
};

describe('TechnicalSignalOccurrenceDrawer', () => {
  beforeEach(() => {
    mocks.listOccurrences.mockReset();
    mocks.listOccurrences.mockResolvedValue(response);
  });

  it('loads only the selected horizon with one-based API pagination', async () => {
    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <TechnicalSignalOccurrenceDrawer
            entryMode="SIGNAL_CLOSE"
            group={group}
            includeBenchmark
            onClose={vi.fn()}
            open
            selectedHorizon={5}
            tsCode="600519.SH"
          />
        </ThemeProvider>
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    await vi.waitFor(() => expect(screen.getAllByText('2026-07-01')).toHaveLength(2));

    expect(mocks.listOccurrences).toHaveBeenCalledWith(
      {
        tsCode: '600519.SH',
        signalKey: 'macd.golden-cross',
        semanticsVersion: 'macd.v1',
        startDate: '20250801',
        endDate: '20260731',
        horizons: [5],
        entryMode: 'SIGNAL_CLOSE',
        includeBenchmark: true,
        qualityStatuses: ['VALID', 'IMMATURE', 'MISSING'],
        page: 1,
        pageSize: 20,
      },
      expect.any(AbortSignal)
    );
    expect(screen.getAllByText('2.00%')).toHaveLength(2);
    expect(screen.getAllByText('1.00%')).toHaveLength(2);
    expect(screen.getByText('原始 2.50% / -0.50%')).toBeInTheDocument();
    expect(screen.getByText('方向 2.50% / -0.50%')).toBeInTheDocument();
    expect(screen.getByText('完整')).toBeInTheDocument();
  });
});
