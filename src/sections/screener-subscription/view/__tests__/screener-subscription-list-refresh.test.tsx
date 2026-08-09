import type { ScreenerSubscription } from 'src/api/screener-subscription';

import { act, screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { listSubscriptions } from 'src/api/screener-subscription';

import { ScreenerSubscriptionListView } from '../screener-subscription-list-view';

// ----------------------------------------------------------------------

const { mockGetSocket } = vi.hoisted(() => ({ mockGetSocket: vi.fn() }));

vi.mock('src/lib/socket', () => ({ getSocket: mockGetSocket }));
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));
vi.mock('src/routes/hooks', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('src/api/screener-subscription', () => ({
  listSubscriptions: vi.fn(),
  pauseSubscription: vi.fn(),
  deleteSubscription: vi.fn(),
  resumeSubscription: vi.fn(),
}));
vi.mock('src/sections/screener-subscription/subscription-summary-cards', () => ({
  SubscriptionSummaryCards: () => null,
}));
vi.mock('src/sections/screener-subscription/subscription-list-toolbar', () => ({
  SubscriptionListToolbar: () => null,
}));
vi.mock('src/sections/screener-subscription/subscription-list-card', () => ({
  SubscriptionListCard: ({ subscription }: { subscription: ScreenerSubscription }) => (
    <div>{subscription.name}</div>
  ),
}));

type EventHandler = (payload: { subscriptionId: number }) => void;

const socket = {
  connect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

function emit(event: string, payload: { subscriptionId: number }) {
  const handler = socket.on.mock.calls.find(([name]) => name === event)?.[1] as
    | EventHandler
    | undefined;
  handler?.(payload);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createSubscription(id: number, name: string): ScreenerSubscription {
  return {
    id,
    name,
    strategyId: null,
    filters: {},
    sortBy: null,
    sortOrder: null,
    frequency: 'DAILY',
    status: 'ACTIVE',
    lastRunAt: null,
    lastRunResult: null,
    lastMatchCodes: [],
    consecutiveFails: 0,
    createdAt: '2026-08-09T00:00:00.000Z',
    updatedAt: '2026-08-09T00:00:00.000Z',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSocket.mockReturnValue(socket);
});

describe('ScreenerSubscriptionListView WebSocket refresh ordering', () => {
  it('连续刷新时只应用最后发起的响应，较早请求晚到不会覆盖', async () => {
    const first = deferred<{ subscriptions: ScreenerSubscription[] }>();
    const latest = deferred<{ subscriptions: ScreenerSubscription[] }>();
    vi.mocked(listSubscriptions)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(latest.promise);

    renderWithProviders(<ScreenerSubscriptionListView />);
    await waitFor(() => expect(listSubscriptions).toHaveBeenCalledTimes(1));

    act(() => emit('screener_subscription_failed', { subscriptionId: 7 }));
    await waitFor(() => expect(listSubscriptions).toHaveBeenCalledTimes(2));

    await act(async () => {
      latest.resolve({ subscriptions: [createSubscription(2, '最新状态')] });
      await latest.promise;
    });
    expect(await screen.findByText('最新状态')).toBeInTheDocument();

    await act(async () => {
      first.resolve({ subscriptions: [createSubscription(1, '陈旧状态')] });
      await first.promise;
    });
    expect(screen.getByText('最新状态')).toBeInTheDocument();
    expect(screen.queryByText('陈旧状态')).not.toBeInTheDocument();
  });
});
