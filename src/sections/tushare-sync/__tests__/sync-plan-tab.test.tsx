import { screen } from '@testing-library/react';

import { tushareSyncApi } from 'src/api/tushare-sync';
import { renderWithProviders } from 'src/test/test-utils';

import { SyncPlanTab } from '../sync-plan-tab';

vi.mock('src/contexts/sync-notification-context', () => ({
  useSyncNotification: () => ({
    isSyncing: false,
    lastSyncError: null,
    lastSyncResult: null,
    clearLastResult: vi.fn(),
  }),
}));

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('src/api/tushare-sync', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('src/api/tushare-sync')>();

  return {
    ...actual,
    tushareSyncApi: {
      ...actual.tushareSyncApi,
      getPlans: vi.fn(),
      manualSync: vi.fn(),
      getSyncLogsSummary: vi.fn(),
    },
  };
});

const mockGetPlans = vi.mocked(tushareSyncApi.getPlans);
const mockGetSyncLogsSummary = vi.mocked(tushareSyncApi.getSyncLogsSummary);

describe('SyncPlanTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlans.mockResolvedValue([
      {
        task: 'STOCK_BASIC',
        label: '股票列表',
        category: 'basic',
        schedule: null,
        bootstrapEnabled: true,
        supportsManual: true,
        supportsFullSync: true,
        requiresTradeDate: false,
      },
      {
        task: 'TRADE_CAL',
        label: '交易日历',
        category: 'basic',
        schedule: null,
        bootstrapEnabled: true,
        supportsManual: true,
        supportsFullSync: true,
        requiresTradeDate: false,
      },
    ]);
    mockGetSyncLogsSummary.mockResolvedValue([
      {
        task: 'TRADE_CAL',
        lastStatus: 'FAILED',
        lastSyncAt: '2026-06-25T15:00:00.000Z',
        lastRowCount: null,
        consecutiveFailures: 1,
      },
    ]);
  });

  it('统一调度 toolbar 操作控件使用 small theme baseline，避免尺寸混用和错位', async () => {
    renderWithProviders(<SyncPlanTab />);

    await screen.findByText('股票列表');

    const controls = [
      screen.getByRole('button', { name: '增量同步' }),
      screen.getByRole('button', { name: '全量同步' }),
      screen.getByRole('button', { name: '同步基础数据' }),
      screen.getByRole('button', { name: '补最近失败' }),
      screen.getByRole('button', { name: /开始同步/ }),
    ];

    expect(
      controls.slice(0, 2).every((control) => control.classList.contains('MuiToggleButton-sizeSmall'))
    ).toBe(true);
    expect(
      controls.slice(2).every((control) => control.classList.contains('MuiButton-sizeSmall'))
    ).toBe(true);
  });
});
