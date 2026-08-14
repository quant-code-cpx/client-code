import type { ReactNode } from 'react';
import type {
  LimitListItem,
  LimitSummaryDay,
  LimitNextDayResponse,
} from 'src/api/alert';

import dayjs from 'dayjs';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { fetchLimitList, fetchLimitSummary, fetchLimitNextDayPerf } from 'src/api/alert';

import { AlertLimitListView } from '../view/alert-limit-list-view';

import type { LimitFilterState } from '../limit/hooks/use-limit-filters';

const filters = vi.hoisted(() => ({
  state: null as unknown as LimitFilterState,
  update: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('src/api/alert', () => ({
  fetchLimitList: vi.fn(),
  fetchLimitSummary: vi.fn(),
  fetchLimitNextDayPerf: vi.fn(),
}));

vi.mock('../limit/hooks/use-limit-filters', () => ({ useLimitFilters: () => filters }));

vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

vi.mock('src/components/stock-search-autocomplete', () => ({
  stockItemFromCode: (tsCode: string) => ({
    tsCode,
    symbol: tsCode.split('.')[0],
    name: '',
    market: null,
    industry: null,
    listStatus: null,
  }),
}));

vi.mock('../limit/filter-bar', () => ({
  AlertLimitFilterBar: ({
    onChange,
    onReset,
    onRefresh,
    industries,
    concepts,
  }: {
    onChange: (patch: Partial<LimitFilterState>) => void;
    onReset: () => void;
    onRefresh: () => void;
    industries: string[];
    concepts: string[];
  }) => (
    <section>
      <span>行业候选:{industries.join('|')}</span>
      <span>概念候选:{concepts.join('|')}</span>
      <button type="button" onClick={() => onChange({ minStreak: 4 })}>
        修改筛选
      </button>
      <button type="button" onClick={onRefresh}>
        刷新列表
      </button>
      <button type="button" onClick={onReset}>
        重置筛选
      </button>
    </section>
  ),
}));

vi.mock('../limit/top-summary', () => ({
  AlertLimitTopSummary: ({
    items,
    summary,
    onMaxStreakClick,
  }: {
    items: LimitListItem[];
    summary: LimitSummaryDay[] | null;
    onMaxStreakClick: () => void;
  }) => (
    <section>
      摘要:{items.length}/{summary?.length ?? 0}
      <button type="button" onClick={onMaxStreakClick}>
        定位最高板
      </button>
    </section>
  ),
}));

vi.mock('../limit/mainstream-bar', () => ({
  AlertLimitMainstreamBar: ({
    onIndustryClick,
  }: {
    onIndustryClick: (industry: string) => void;
  }) => (
    <button type="button" onClick={() => onIndustryClick('银行')}>
      主流行业
    </button>
  ),
}));

vi.mock('../limit/seal-time-histogram', () => ({
  AlertLimitSealTimeHistogram: () => <div>封板时段</div>,
}));

vi.mock('../limit/streak-ladder', () => ({
  AlertLimitStreakLadder: ({
    items,
    onSelect,
  }: {
    items: LimitListItem[];
    onSelect: (item: LimitListItem) => void;
  }) => (
    <button type="button" onClick={() => items[0] && onSelect(items[0])}>
      连板梯队
    </button>
  ),
}));

vi.mock('../limit/list-table-v2', () => ({
  AlertLimitListTableV2: ({
    items,
    onSelect,
    onCreateAlert,
  }: {
    items: LimitListItem[];
    onSelect: (item: LimitListItem) => void;
    onCreateAlert: (item: LimitListItem) => void;
  }) => (
    <section>
      列表:{items.length}
      <button type="button" onClick={() => items[0] && onSelect(items[0])}>
        打开详情
      </button>
      <button type="button" onClick={() => items[0] && onCreateAlert(items[0])}>
        创建预警
      </button>
    </section>
  ),
}));

vi.mock('../limit/next-day-matrix', () => ({
  AlertLimitNextDayMatrix: ({
    data,
    loading,
    error,
  }: {
    data: LimitNextDayResponse | null;
    loading: boolean;
    error: string;
  }) => <div>次日:{loading ? 'loading' : error || data?.total || 'empty'}</div>,
}));

vi.mock('../limit/history-tab', () => ({
  AlertLimitHistoryTab: ({
    summary,
    loading,
    error,
  }: {
    summary: LimitSummaryDay[] | null;
    loading: boolean;
    error: string;
  }) => <div>历史:{loading ? 'loading' : error || summary?.length || 'empty'}</div>,
}));

vi.mock('../limit/stock-drawer', () => ({
  AlertLimitStockDrawer: ({
    open,
    item: selectedItem,
    onClose,
    onCreateAlert,
  }: {
    open: boolean;
    item: LimitListItem | null;
    onClose: () => void;
    onCreateAlert: (item: LimitListItem) => void;
  }) => (
    <section>
      抽屉:{open ? selectedItem?.tsCode : 'closed'}
      {open && selectedItem ? (
        <>
          <button type="button" onClick={onClose}>
            关闭抽屉
          </button>
          <button type="button" onClick={() => onCreateAlert(selectedItem)}>
            抽屉创建预警
          </button>
        </>
      ) : null}
    </section>
  ),
}));

vi.mock('../alert-price-rule-dialog', () => ({
  AlertPriceRuleDialog: ({
    open,
    defaultStock,
    onClose,
    onSaved,
  }: {
    open: boolean;
    defaultStock: { tsCode: string } | null;
    onClose: () => void;
    onSaved: () => void;
  }) => (
    <section>
      预警弹窗:{open ? defaultStock?.tsCode : 'closed'}
      {open ? (
        <>
          <button type="button" onClick={onClose}>
            关闭弹窗
          </button>
          <button type="button" onClick={onSaved}>
            保存弹窗
          </button>
        </>
      ) : null}
    </section>
  ),
}));

function item(overrides: Partial<LimitListItem> = {}): LimitListItem {
  return {
    tradeDate: '20260811',
    tsCode: '000001.SZ',
    stockName: '平安银行',
    limitType: 'UP',
    close: 12,
    pctChg: 10,
    firstSealTime: '093000',
    lastSealTime: '145000',
    industry: '银行',
    concepts: ['中特估', '金融科技'],
    ...overrides,
  };
}

const summary: LimitSummaryDay[] = [
  {
    date: '20260811',
    limitUp: 1,
    limitDown: 0,
    maxStreak: 2,
    sealRate: 0.8,
    promoteRate: 0.5,
    failRate: 0.2,
  },
];

function setState(patch: Partial<LimitFilterState> = {}) {
  filters.state = {
    tab: 'today',
    tradeDate: dayjs('2026-08-12'),
    limitType: 'UP',
    industry: '银行',
    concept: '中特估',
    mvBucket: '50_200',
    pctChgLimit: 20,
    sealPattern: 'REOPENED',
    minStreak: 2,
    ...patch,
  };
}

describe('AlertLimitListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setState();
    vi.mocked(fetchLimitList).mockResolvedValue({ items: [item()] });
    vi.mocked(fetchLimitSummary).mockResolvedValue(summary);
    vi.mocked(fetchLimitNextDayPerf).mockResolvedValue({
      date: '20260813',
      baseDate: '20260812',
      nextTradeDate: '20260813',
      total: 1,
      avgPctChg: 2,
      upRatio: 1,
      rows: [],
    });
  });

  it('按完整筛选请求列表与摘要，展示回退交易日和聚合候选项', async () => {
    vi.mocked(fetchLimitList).mockResolvedValue({
      items: [item(), item({ tsCode: '000002.SZ', industry: '地产', concepts: ['中特估'] })],
      meta: { actualDate: '20260811', requestedDate: '20260812', isHoliday: true },
    });
    const { user } = renderWithProviders(<AlertLimitListView />);

    expect(await screen.findByText(/已自动切换至最近交易日 2026-08-11/)).toBeInTheDocument();
    expect(screen.getByText('显示日期：2026-08-11')).toBeInTheDocument();
    expect(screen.getByText('行业候选:地产|银行')).toBeInTheDocument();
    expect(screen.getByText('概念候选:中特估|金融科技')).toBeInTheDocument();
    expect(screen.getByText('摘要:2/1')).toBeInTheDocument();
    expect(screen.getByText('列表:2')).toBeInTheDocument();

    expect(fetchLimitList).toHaveBeenCalledWith({
      trade_date: '20260812',
      limit_type: 'UP',
      min_consecutive: 2,
      industry: '银行',
      concept: '中特估',
      mv_bucket: '50_200',
      pct_chg_limit: 20,
      seal_pattern: 'REOPENED',
    });
    expect(fetchLimitSummary).toHaveBeenCalledWith({ trade_date: '20260812', range: 5 });
    expect(fetchLimitNextDayPerf).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '刷新列表' }));
    await waitFor(() => expect(fetchLimitList).toHaveBeenCalledTimes(2));
    await user.click(screen.getByRole('button', { name: '修改筛选' }));
    await user.click(screen.getByRole('button', { name: '重置筛选' }));
    expect(filters.update).toHaveBeenCalledWith({ minStreak: 4 });
    expect(filters.reset).toHaveBeenCalledOnce();
  });

  it('详情抽屉和单股预警弹窗共享所选股票，并都可关闭', async () => {
    const { user } = renderWithProviders(<AlertLimitListView />);
    await screen.findByText('列表:1');

    await user.click(screen.getByRole('button', { name: '打开详情' }));
    expect(screen.getByText('抽屉:000001.SZ')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '抽屉创建预警' }));
    expect(screen.getByText('预警弹窗:000001.SZ')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '保存弹窗' }));
    expect(screen.getByText('预警弹窗:closed')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '关闭抽屉' }));
    expect(screen.getByText('抽屉:closed')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '创建预警' }));
    expect(screen.getByText('预警弹窗:000001.SZ')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭弹窗' }));
    expect(screen.getByText('预警弹窗:closed')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '主流行业' }));
    expect(filters.update).toHaveBeenCalledWith({ industry: '银行' });
  });

  it('次日 Tab 仅请求次日矩阵所需过滤字段，并透传接口错误', async () => {
    setState({ tab: 'next-day', limitType: 'ALL', minStreak: '' });
    vi.mocked(fetchLimitNextDayPerf).mockRejectedValueOnce(new Error('次日行情未同步'));
    renderWithProviders(<AlertLimitListView />);

    expect(await screen.findByText('次日:次日行情未同步')).toBeInTheDocument();
    expect(fetchLimitNextDayPerf).toHaveBeenCalledWith({
      trade_date: '20260812',
      limit_type: undefined,
      min_consecutive: undefined,
    });
    expect(screen.queryByText(/列表:/)).not.toBeInTheDocument();
  });

  it('列表与历史汇总失败分别进入可见错误状态，Tab 切换写回 URL 状态', async () => {
    setState({ tab: 'history', tradeDate: null });
    vi.mocked(fetchLimitList).mockRejectedValueOnce('unknown');
    vi.mocked(fetchLimitSummary).mockRejectedValueOnce(new Error('汇总服务不可用'));
    const { user } = renderWithProviders(<AlertLimitListView />);

    expect(await screen.findByText('加载涨跌停数据失败')).toBeInTheDocument();
    expect(await screen.findByText('历史:汇总服务不可用')).toBeInTheDocument();
    expect(fetchLimitList).toHaveBeenCalledWith(
      expect.objectContaining({ trade_date: undefined })
    );

    await user.click(screen.getByRole('tab', { name: '次日表现' }));
    expect(filters.update).toHaveBeenCalledWith({ tab: 'next-day' });
  });
});
