import type { EventSample } from 'src/api/event-study';

import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { EventAnalysisSamplesTable } from '../event-analysis-samples-table';

// ----------------------------------------------------------------------

const sample: EventSample = {
  tsCode: '600519.SH',
  name: '贵州茅台',
  eventDate: '20260808',
  car: 0.032,
  arSeries: [],
};

describe('event-study clickable table accessibility', () => {
  it('activates a sample row with Enter and Space', () => {
    const onSampleClick = vi.fn();

    renderWithProviders(
      <EventAnalysisSamplesTable
        title="正向样本"
        samples={[sample]}
        color="success"
        onSampleClick={onSampleClick}
      />
    );

    const row = screen.getByRole('button', { name: '查看样本 贵州茅台 20260808' });

    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyDown(row, { key: ' ' });

    expect(onSampleClick).toHaveBeenCalledTimes(2);
    expect(onSampleClick).toHaveBeenNthCalledWith(1, sample);
  });
});
