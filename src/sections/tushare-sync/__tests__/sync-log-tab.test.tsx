import { screen, waitFor } from '@testing-library/react';

import { tushareSyncApi } from 'src/api/tushare-sync';
import { renderWithProviders } from 'src/test/test-utils';

import { SyncLogTab } from '../sync-log-tab';

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('src/components/date-picker', () => ({
  DatePicker: ({ label, value }: { label: string; value: { format: () => string } | null }) => (
    <input aria-label={label} value={value?.format() ?? ''} readOnly />
  ),
}));

vi.mock('src/api/tushare-sync', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('src/api/tushare-sync')>();
  return {
    ...actual,
    tushareSyncApi: {
      ...actual.tushareSyncApi,
      getSyncLogs: vi.fn(),
      getSyncLogsSummary: vi.fn(),
    },
  };
});

describe('SyncLogTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tushareSyncApi.getSyncLogsSummary).mockResolvedValue([]);
    vi.mocked(tushareSyncApi.getSyncLogs).mockResolvedValue({
      total: 0,
      page: 1,
      pageSize: 20,
      items: [],
    });
  });

  it('[OPS-B08] deep-link filters remain visible and are applied to the request', async () => {
    renderWithProviders(
      <SyncLogTab
        initialFilters={{
          task: 'DAILY',
          status: 'FAILED',
          startDate: '2026-08-08',
          endDate: '2026-08-08',
        }}
      />
    );

    await waitFor(() => {
      expect(tushareSyncApi.getSyncLogs).toHaveBeenCalledWith({
        task: 'DAILY',
        status: 'FAILED',
        startDate: '2026-08-08',
        endDate: '2026-08-08',
        page: 1,
        pageSize: 20,
      });
    });
    expect(screen.getByRole('textbox', { name: '任务类型' })).toHaveValue('DAILY');
    expect(screen.getByRole('combobox', { name: '状态' })).toHaveTextContent('失败');
  });
});
