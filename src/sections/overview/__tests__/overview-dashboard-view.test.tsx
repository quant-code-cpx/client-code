import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { OverviewDashboardView } from '../view/overview-dashboard-view';

const state = vi.hoisted(() => ({
  isAdmin: false,
  profile: { nickname: '小量', account: 'quant' } as {
    nickname?: string | null;
    account: string;
  } | null,
}));

vi.mock('src/auth', () => ({ useAuth: () => ({ userProfile: state.profile }) }));

vi.mock('src/permission/use-permission', () => ({
  usePermission: () => ({ hasMinRole: () => state.isAdmin }),
}));

vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock('../dashboard-quick-nav', () => ({ DashboardQuickNav: () => <div>快捷导航</div> }));
vi.mock('../dashboard-market-pulse', () => ({
  DashboardMarketPulse: ({ refreshKey }: { refreshKey: number }) => (
    <div>{`市场脉搏-${refreshKey}`}</div>
  ),
}));
vi.mock('../dashboard-market-temperature', () => ({
  DashboardMarketTemperature: ({
    refreshKey,
    onTradeDateResolved,
  }: {
    refreshKey: number;
    onTradeDateResolved: (date: string) => void;
  }) => (
    <button type="button" onClick={() => onTradeDateResolved('20260812')}>
      {`市场温度-${refreshKey}`}
    </button>
  ),
}));
vi.mock('../dashboard-capital-radar', () => ({
  DashboardCapitalRadar: ({ refreshKey }: { refreshKey: number }) => (
    <div>{`资金雷达-${refreshKey}`}</div>
  ),
}));
vi.mock('../dashboard-signal-center', () => ({
  DashboardSignalCenter: ({ refreshKey }: { refreshKey: number }) => (
    <div>{`信号中心-${refreshKey}`}</div>
  ),
}));
vi.mock('../dashboard-sector-wind', () => ({
  DashboardSectorWind: ({ refreshKey }: { refreshKey: number }) => (
    <div>{`行业风向-${refreshKey}`}</div>
  ),
}));
vi.mock('../dashboard-main-flow-ranking', () => ({
  DashboardMainFlowRanking: ({ refreshKey }: { refreshKey: number }) => (
    <div>{`主力排行-${refreshKey}`}</div>
  ),
}));
vi.mock('../dashboard-news-highlights', () => ({
  DashboardNewsHighlights: ({ refreshKey }: { refreshKey: number }) => (
    <div>{`新闻精选-${refreshKey}`}</div>
  ),
}));
vi.mock('../dashboard-system-status', () => ({
  DashboardSystemStatus: () => <div>系统状态</div>,
}));

beforeEach(() => {
  vi.useFakeTimers();
  state.isAdmin = false;
  state.profile = { nickname: '小量', account: 'quant' };
});

afterEach(() => {
  vi.useRealTimers();
});

describe('OverviewDashboardView', () => {
  it('展示昵称、开市状态，回传并格式化最新交易日', () => {
    vi.setSystemTime(new Date(2026, 7, 13, 10, 0));
    renderWithProviders(<OverviewDashboardView />);

    expect(screen.getByRole('heading', { name: '早上好，小量' })).toBeInTheDocument();
    expect(screen.getByText('交易中')).toBeInTheDocument();
    expect(screen.getByText('快捷导航')).toBeInTheDocument();
    expect(screen.queryByText('系统状态')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '市场温度-0' }));
    expect(screen.getByText('2026-08-12')).toBeInTheDocument();
  });

  it('全局刷新把 refreshKey 同步传给全部数据面板', () => {
    vi.setSystemTime(new Date(2026, 7, 13, 15, 30));
    renderWithProviders(<OverviewDashboardView />);

    expect(screen.getByText('已收盘')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '刷新全部数据' }));

    ['市场脉搏', '市场温度', '资金雷达', '信号中心', '行业风向', '主力排行', '新闻精选'].forEach(
      (label) => expect(screen.getByText(`${label}-1`)).toBeInTheDocument()
    );
  });

  it('管理员可见系统状态，昵称为空时回退到账户', () => {
    vi.setSystemTime(new Date(2026, 7, 13, 13, 0));
    state.isAdmin = true;
    state.profile = { nickname: '', account: 'admin01' };
    renderWithProviders(<OverviewDashboardView />);

    expect(screen.getByRole('heading', { name: '中午好，admin01' })).toBeInTheDocument();
    expect(screen.getByText('系统状态')).toBeInTheDocument();
    expect(screen.getByText('交易中')).toBeInTheDocument();
  });

  it.each([
    [new Date(2026, 0, 1, 10, 0), '早上好'],
    [new Date(2026, 7, 15, 10, 0), '早上好'],
    [new Date(2026, 7, 13, 3, 0), '夜深了'],
    [new Date(2026, 7, 13, 16, 0), '下午好'],
    [new Date(2026, 7, 13, 20, 0), '晚上好'],
  ])('节假日、周末和全天问候均按本地时间计算：%s', (now, greeting) => {
    vi.setSystemTime(now);
    state.profile = null;
    renderWithProviders(<OverviewDashboardView />);

    expect(screen.getByRole('heading', { name: greeting })).toBeInTheDocument();
    expect(screen.getByText('已收盘')).toBeInTheDocument();
  });
});
