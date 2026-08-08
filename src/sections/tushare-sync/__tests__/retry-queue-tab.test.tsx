import { screen, waitFor } from '@testing-library/react';

import { tushareSyncApi } from 'src/api/tushare-sync';
import { renderWithProviders } from 'src/test/test-utils';

import { RetryQueueTab } from '../retry-queue-tab';

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
      getRetryQueue: vi.fn(),
      resetRetryQueue: vi.fn(),
    },
  };
});

describe('RetryQueueTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tushareSyncApi.getRetryQueue).mockResolvedValue({
      total: 0,
      page: 1,
      pageSize: 20,
      items: [],
    });
  });

  it('[OPS-B03] task search is delegated to server and restarts from page one', async () => {
    const { user } = renderWithProviders(<RetryQueueTab />);
    await waitFor(() => expect(tushareSyncApi.getRetryQueue).toHaveBeenCalled());

    await user.type(screen.getByRole('textbox', { name: '任务名搜索' }), 'DAILY');

    await waitFor(() => {
      expect(tushareSyncApi.getRetryQueue).toHaveBeenLastCalledWith(undefined, 1, 20, 'DAILY');
    });
  });

  it('[OPS-B04] reset feedback displays backend count', async () => {
    vi.mocked(tushareSyncApi.resetRetryQueue).mockResolvedValue({ message: 'done', count: 3 });
    const { user } = renderWithProviders(<RetryQueueTab />);

    await user.click(screen.getByRole('button', { name: '重置耗尽记录' }));
    await user.click(screen.getByRole('button', { name: '确认重置' }));

    expect(await screen.findByText('已重置 3 条耗尽记录为等待重试')).toBeInTheDocument();
  });
});
