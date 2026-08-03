import type { ReactNode } from 'react';

import { MemoryRouter } from 'react-router-dom';
import { act, screen } from '@testing-library/react';

import { ThemeProvider } from '@mui/material/styles';

import { render } from 'src/test/test-utils';
import { createTheme } from 'src/theme/create-theme';

import { AnalysisTechnicalTab } from '../../analysis-technical-tab';

const mocks = vi.hoisted(() => ({ technicalIndicators: vi.fn() }));

vi.mock('src/api/stock', () => ({
  stockDetailApi: { technicalIndicators: mocks.technicalIndicators },
}));

vi.mock('../technical-signal-statistics-panel', () => ({
  TechnicalSignalStatisticsPanel: ({ tsCode }: { tsCode: string }) => <div>统计面板：{tsCode}</div>,
}));

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('AnalysisTechnicalTab', () => {
  beforeEach(() => {
    mocks.technicalIndicators.mockReset();
  });

  it('does not load legacy technical indicators when historical statistics mode is selected', async () => {
    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <MemoryRouter initialEntries={['/?technicalView=signal-statistics']}>
            <AnalysisTechnicalTab tsCode="600519.SH" />
          </MemoryRouter>
        </ThemeProvider>
      );
      await Promise.resolve();
    });

    expect(screen.getByText('统计面板：600519.SH')).toBeInTheDocument();
    expect(mocks.technicalIndicators).not.toHaveBeenCalled();
  });
});
