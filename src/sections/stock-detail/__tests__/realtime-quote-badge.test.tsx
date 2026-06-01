import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { RealtimeQuoteBadge } from '../realtime-quote-badge';
import { useRealtimeQuote } from '../hooks/use-realtime-quote';

vi.mock('../hooks/use-realtime-quote', () => ({
  useRealtimeQuote: vi.fn(),
}));

const mockUseRealtimeQuote = vi.mocked(useRealtimeQuote);

const snapshot = {
  tsCode: '300364.SZ',
  snapshotPrice: 25.0,
  snapshotPctChg: -1.2,
  snapshotChange: -0.3,
  limitStatus: null,
};

describe('RealtimeQuoteBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('展示实时报价并显示「实时」徽标（交易时段有数据）', () => {
    mockUseRealtimeQuote.mockReturnValue({
      quote: { price: 26.5, change: 1.5, changePercent: 6.0 },
      dataTime: Date.now(),
      session: 'open',
      isLive: true,
      isStale: false,
    });

    renderWithProviders(<RealtimeQuoteBadge {...snapshot} />);

    expect(screen.getByText('26.5')).toBeInTheDocument();
    expect(screen.getByText('实时')).toBeInTheDocument();
  });

  it('实时数据陈旧时显示「延迟」徽标', () => {
    mockUseRealtimeQuote.mockReturnValue({
      quote: { price: 26.5, change: 1.5, changePercent: 6.0 },
      dataTime: Date.now() - 60_000,
      session: 'open',
      isLive: true,
      isStale: true,
    });

    renderWithProviders(<RealtimeQuoteBadge {...snapshot} />);

    expect(screen.getByText('延迟')).toBeInTheDocument();
  });

  it('非交易时段回退到快照并显示「收盘价」徽标', () => {
    mockUseRealtimeQuote.mockReturnValue({
      quote: null,
      dataTime: null,
      session: 'closed',
      isLive: false,
      isStale: false,
    });

    renderWithProviders(<RealtimeQuoteBadge {...snapshot} />);

    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('收盘价')).toBeInTheDocument();
  });
});
