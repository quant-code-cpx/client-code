import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { QualitySummaryCards } from '../quality-summary-cards';

describe('QualitySummaryCards', () => {
  it('[OPS-B06] cross-table fail takes priority over zero warnings', () => {
    renderWithProviders(
      <QualitySummaryCards
        loading={false}
        summary={{
          checkedAt: '2026-08-08T00:00:00.000Z',
          totalDataSets: 1,
          counts: { pass: 1, warn: 0, fail: 0 },
          failures: [],
          crossTableCounts: { pass: 7, warn: 0, fail: 1 },
          autoRepairTriggered: false,
          repairTaskCount: 0,
        }}
      />
    );

    expect(screen.getByText('1 项失败')).toBeInTheDocument();
    expect(screen.queryByText('全部通过')).not.toBeInTheDocument();
  });
});
