import type { ReactNode } from 'react';
import type { LimitListItem, LimitSummaryDay, LimitNextDayResponse } from 'src/api/alert';

import dayjs from 'dayjs';
import { screen, within, cleanup, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { AlertLimitFilterBar } from '../filter-bar';
import { AlertLimitTopSummary } from '../top-summary';
import { AlertLimitListTableV2 } from '../list-table-v2';
import { AlertLimitStreakLadder } from '../streak-ladder';
import { AlertLimitMainstreamBar } from '../mainstream-bar';
import { AlertLimitNextDayMatrix } from '../next-day-matrix';
import { AlertLimitSealTimeHistogram } from '../seal-time-histogram';

import type { LimitFilterState } from '../hooks/use-limit-filters';

const push = vi.hoisted(() => vi.fn());

vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push }) }));

vi.mock('src/components/iconify', () => ({
  Iconify: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

vi.mock('src/components/date-picker', () => ({
  DatePicker: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: { format: (pattern: string) => string } | null;
    onChange: (value: null) => void;
  }) => (
    <button type="button" aria-label={label} onClick={() => onChange(null)}>
      {value?.format('YYYY-MM-DD') ?? '未选日期'}
    </button>
  ),
}));

vi.mock('src/components/label', () => ({
  Label: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

function item(overrides: Partial<LimitListItem> = {}): LimitListItem {
  return {
    tradeDate: '20260812',
    tsCode: '000001.SZ',
    stockName: '平安银行',
    limitType: 'UP',
    close: 12.34,
    pctChg: 10.01,
    firstSealTime: '093015',
    lastSealTime: '145900',
    streakDays: 1,
    sealAmount: 12345,
    sealRatio: 0.0125,
    sealCount: 2,
    industry: '银行',
    concepts: ['中特估'],
    streakStatus: 'FIRST_LIMIT',
    pctChgLimit: 10,
    sealPattern: 'EARLY_SEAL',
    ...overrides,
  };
}

const summary: LimitSummaryDay[] = [
  {
    date: '20260812',
    limitUp: 2,
    limitDown: 1,
    maxStreak: 3,
    sealRate: 0.8,
    promoteRate: 0.5,
    failRate: 0.2,
  },
  {
    date: '20260811',
    limitUp: 1,
    limitDown: 2,
    maxStreak: 2,
    sealRate: null,
    promoteRate: null,
    failRate: null,
  },
];

describe('涨跌停工作台组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('列表按板高排序，支持键盘选中，行内操作不误触发选中', async () => {
    const onSelect = vi.fn();
    const onCreateAlert = vi.fn();
    const low = item();
    const high = item({
      tsCode: '300001.SZ',
      stockName: '特锐德',
      streakDays: 3,
      pctChg: 20,
      pctChgLimit: 20,
      sealAmount: null,
      sealRatio: null,
      sealPattern: null,
      streakStatus: 'PROMOTE',
      firstSealTime: null,
      sealCount: null,
    });
    const broken = item({
      tsCode: '600001.SH',
      stockName: '邯郸钢铁',
      limitType: 'BROKEN',
      streakDays: null,
      consecutiveDays: null,
      openTimes: 2,
      pctChg: -1.5,
    });
    const { user, unmount } = renderWithProviders(
      <AlertLimitListTableV2
        items={[low, high, broken]}
        onSelect={onSelect}
        onCreateAlert={onCreateAlert}
      />
    );

    let rows = screen.getAllByRole('button', { name: /查看 .+ 封板详情/ });
    expect(rows[0]).toHaveAccessibleName('查看 特锐德 封板详情');
    expect(screen.getByText('开板 2 次')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);

    rows[0].focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(high);

    await user.click(within(rows[0]).getByRole('button', { name: '创建预警' }));
    expect(onCreateAlert).toHaveBeenCalledWith(high);
    expect(onSelect).toHaveBeenCalledTimes(1);

    await user.click(within(rows[0]).getByRole('button', { name: '查看详情' }));
    expect(push).toHaveBeenCalledWith('/stock/detail?code=300001.SZ');
    expect(onSelect).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: '连板/状态' }));
    rows = screen.getAllByRole('button', { name: /查看 .+ 封板详情/ });
    expect(rows[0]).toHaveAccessibleName('查看 邯郸钢铁 封板详情');

    unmount();
    renderWithProviders(<AlertLimitListTableV2 items={[]} />);
    expect(screen.getByText('该日无封板股票')).toBeInTheDocument();
  });

  it('摘要从明细与多日汇总推导 KPI，并支持最高板键盘锚定', async () => {
    const onMaxStreakClick = vi.fn();
    const { user, unmount } = renderWithProviders(
      <AlertLimitTopSummary
        items={[
          item({ streakDays: 3 }),
          item({ tsCode: '000002.SZ', stockName: '万科A', streakDays: 2 }),
          item({ tsCode: '000003.SZ', stockName: '国华网安', limitType: 'DOWN' }),
        ]}
        summary={summary}
        onMaxStreakClick={onMaxStreakClick}
      />
    );

    expect(screen.getByText('今日涨停')).toBeInTheDocument();
    expect(screen.getByText('今日跌停')).toBeInTheDocument();
    expect(screen.getByText('连板≥2')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText(/vs 5 日均值/)).toBeInTheDocument();
    expect(screen.getByText('近 2 日 · 涨停家数')).toBeInTheDocument();

    const maxCard = screen.getByRole('button', { name: '最高板：3 板' });
    maxCard.focus();
    await user.keyboard(' ');
    expect(onMaxStreakClick).toHaveBeenCalledOnce();

    unmount();
    renderWithProviders(<AlertLimitTopSummary items={[]} summary={null} />);
    expect(screen.queryByRole('button', { name: /最高板/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('筛选栏把日期、枚举、数字和操作准确回传', async () => {
    const onChange = vi.fn();
    const onReset = vi.fn();
    const onRefresh = vi.fn();
    const state: LimitFilterState = {
      tab: 'today',
      tradeDate: dayjs('2026-08-12'),
      limitType: 'ALL',
      industry: '',
      concept: '',
      mvBucket: '',
      pctChgLimit: '',
      sealPattern: '',
      minStreak: '',
    };
    const { user } = renderWithProviders(
      <AlertLimitFilterBar
        state={state}
        onChange={onChange}
        onReset={onReset}
        onRefresh={onRefresh}
        industries={['银行']}
        concepts={['中特估']}
      />
    );

    await user.click(screen.getByRole('button', { name: '交易日期' }));
    expect(onChange).toHaveBeenCalledWith({ tradeDate: null });
    await user.click(screen.getByRole('button', { name: '涨停' }));
    expect(onChange).toHaveBeenCalledWith({ limitType: 'UP' });

    const selects = screen.getAllByRole('combobox');
    await user.click(selects[0]);
    await user.click(await screen.findByRole('option', { name: '银行' }));
    expect(onChange).toHaveBeenCalledWith({ industry: '银行' });

    await user.click(selects[1]);
    await user.click(await screen.findByRole('option', { name: '中特估' }));
    expect(onChange).toHaveBeenCalledWith({ concept: '中特估' });

    await user.click(selects[2]);
    await user.click(await screen.findByRole('option', { name: '50-200 亿' }));
    expect(onChange).toHaveBeenCalledWith({ mvBucket: '50_200' });

    await user.click(selects[3]);
    await user.click(await screen.findByRole('option', { name: '20cm' }));
    expect(onChange).toHaveBeenCalledWith({ pctChgLimit: 20 });

    await user.click(selects[4]);
    await user.click(await screen.findByRole('option', { name: '回封' }));
    expect(onChange).toHaveBeenCalledWith({ sealPattern: 'REOPENED' });

    const minStreak = screen.getByRole('spinbutton', { name: '最低连板' });
    fireEvent.change(minStreak, { target: { value: '3.8' } });
    expect(onChange).toHaveBeenCalledWith({ minStreak: 3 });
    fireEvent.change(minStreak, { target: { value: '0' } });
    expect(onChange).toHaveBeenCalledWith({ minStreak: '' });

    await user.click(screen.getByRole('button', { name: '刷新' }));
    await user.click(screen.getByRole('button', { name: '重置' }));
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('次日矩阵区分 loading、错误、缺行情、空样本和正常 null 数据', () => {
    const { container } = renderWithProviders(<AlertLimitNextDayMatrix data={null} loading />);
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();

    cleanup();
    renderWithProviders(<AlertLimitNextDayMatrix data={null} error="次日接口不可用" />);
    expect(screen.getByText('次日接口不可用')).toBeInTheDocument();

    const noNextDate: LimitNextDayResponse = {
      date: '',
      baseDate: '20260812',
      nextTradeDate: null,
      total: 2,
      avgPctChg: null,
      upRatio: null,
      rows: [],
    };
    cleanup();
    renderWithProviders(<AlertLimitNextDayMatrix data={noNextDate} />);
    expect(screen.getByText('暂无下一交易日行情，待日线数据同步后显示')).toBeInTheDocument();

    cleanup();
    renderWithProviders(<AlertLimitNextDayMatrix data={{ ...noNextDate, total: 0 }} />);
    expect(screen.getByText('暂无可统计样本')).toBeInTheDocument();

    const data: LimitNextDayResponse = {
      date: '20260813',
      baseDate: '20260812',
      nextTradeDate: '20260813',
      total: 3,
      avgPctChg: null,
      upRatio: 2 / 3,
      rows: [
        {
          prevStreak: 1,
          total: 3,
          avgNextDayPct: -3.2,
          today: {
            LIMIT_UP: 1,
            ABOVE_5: 0,
            IN_5: 1,
            BELOW_0: 1,
            BELOW_5: 0,
            LIMIT_DOWN: 0,
          },
        },
      ],
    };
    cleanup();
    renderWithProviders(<AlertLimitNextDayMatrix data={data} />);
    expect(screen.getByText('基准日 2026-08-12 · 次日 2026-08-13')).toBeInTheDocument();
    expect(screen.getByText('首板')).toBeInTheDocument();
    expect(screen.getByText('66.7%')).toBeInTheDocument();
    expect(screen.getByText('-3.2%')).toBeInTheDocument();
    expect(screen.getAllByText('—')).not.toHaveLength(0);
  });

  it('题材主线仅统计涨停行业，按数量排序并支持键盘筛选', async () => {
    const onIndustryClick = vi.fn();
    const { user } = renderWithProviders(
      <AlertLimitMainstreamBar
        topN={2}
        onIndustryClick={onIndustryClick}
        items={[
          item({ tsCode: '1', industry: '银行' }),
          item({ tsCode: '2', industry: '银行' }),
          item({ tsCode: '3', industry: '算力' }),
          item({ tsCode: '4', industry: '医药' }),
          item({ tsCode: '5', industry: '银行', limitType: 'DOWN' }),
          item({ tsCode: '6', industry: null }),
        ]}
      />
    );

    expect(screen.getByRole('button', { name: '按行业 银行 筛选' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '按行业 算力 筛选' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '按行业 医药 筛选' })).not.toBeInTheDocument();
    const bank = screen.getByRole('button', { name: '按行业 银行 筛选' });
    bank.focus();
    await user.keyboard('{Enter}');
    expect(onIndustryClick).toHaveBeenCalledWith('银行');

    cleanup();
    renderWithProviders(<AlertLimitMainstreamBar items={[item({ industry: null })]} />);
    expect(screen.getByText('等待后端字段：industry')).toBeInTheDocument();

    cleanup();
    renderWithProviders(
      <AlertLimitMainstreamBar items={[item({ limitType: 'DOWN', industry: '银行' })]} />
    );
    expect(screen.getByText('今日无封板个股')).toBeInTheDocument();
  });

  it('封板直方图区分涨停/炸板时段，连板梯队分组并回传所选股票', async () => {
    const up = item({ streakDays: 5, streakStatus: 'CONSECUTIVE', firstSealTime: '09:26:00' });
    const broken = item({
      tsCode: '000002.SZ',
      stockName: '万科A',
      limitType: 'BROKEN',
      streakDays: 0,
      firstSealTime: '13:02:00',
    });
    const down = item({
      tsCode: '000003.SZ',
      stockName: '国华网安',
      limitType: 'DOWN',
      streakDays: 2,
      firstSealTime: 'bad-time',
    });
    const noTime = item({ tsCode: '000004.SZ', stockName: '国农科技', firstSealTime: null });
    const onSelect = vi.fn();
    const { container, user } = renderWithProviders(
      <>
        <AlertLimitSealTimeHistogram items={[up, broken, down, noTime]} />
        <AlertLimitStreakLadder items={[up, broken, down]} onSelect={onSelect} />
      </>
    );

    expect(container.querySelector('[title="09:25 | 涨停 1 · 炸板 0"]')).toBeInTheDocument();
    expect(container.querySelector('[title="13:00 | 涨停 0 · 炸板 1"]')).toBeInTheDocument();
    expect(screen.getByText('连板 · 1 只')).toBeInTheDocument();
    expect(screen.getByText('连续跌停 · 1 只')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '续板 · 000001.SZ' }));
    expect(onSelect).toHaveBeenCalledWith(up);

    cleanup();
    renderWithProviders(
      <>
        <AlertLimitSealTimeHistogram items={[noTime]} />
        <AlertLimitStreakLadder items={[]} />
      </>
    );
    expect(screen.getByText('等待后端字段：firstSealTime')).toBeInTheDocument();
    expect(screen.getByText('今日无连板股')).toBeInTheDocument();
    expect(screen.getByText('今日无连续跌停股')).toBeInTheDocument();
  });
});
