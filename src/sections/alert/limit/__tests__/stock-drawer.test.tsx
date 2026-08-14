import type { LimitListItem } from 'src/api/alert';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { AlertLimitStockDrawer } from '../stock-drawer';

const push = vi.hoisted(() => vi.fn());

vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push }) }));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));

function item(overrides: Partial<LimitListItem> = {}): LimitListItem {
  return {
    tradeDate: '20260808',
    tsCode: '300001.SZ',
    stockName: '特锐德',
    limitType: 'UP',
    close: 12.34,
    pctChg: 20,
    firstSealTime: '09:25:30',
    lastSealTime: '14:59:00',
    streakDays: 3,
    sealAmount: 12_345,
    sealRatio: 0.0125,
    sealCount: 2,
    industry: '电气设备',
    concepts: ['充电桩', '新能源'],
    streakStatus: 'PROMOTE',
    pctChgLimit: 20,
    sealPattern: 'REOPENED',
    recentLimitCount60d: 8,
    ...overrides,
  };
}

describe('AlertLimitStockDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未选择股票显示明确空态，并允许 Drawer 自身关闭', async () => {
    const onClose = vi.fn();
    const { user } = renderWithProviders(
      <AlertLimitStockDrawer open item={null} onClose={onClose} />
    );

    expect(screen.getByText('未选择股票')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('完整涨停数据展示板高、形态、封单与概念，操作准确回传和下钻', async () => {
    const selected = item();
    const onClose = vi.fn();
    const onCreateAlert = vi.fn();
    const { user } = renderWithProviders(
      <AlertLimitStockDrawer
        open
        item={selected}
        onClose={onClose}
        onCreateAlert={onCreateAlert}
      />
    );

    expect(screen.getByText('特锐德')).toBeInTheDocument();
    expect(screen.getByText('300001.SZ · 电气设备')).toBeInTheDocument();
    expect(screen.getByText('涨停 · 20cm')).toBeInTheDocument();
    expect(screen.getByText('+20.00%')).toHaveStyle({ color: 'var(--palette-error-main)' });
    expect(screen.getByText('12.34')).toBeInTheDocument();
    expect(screen.getByText('3 连板')).toBeInTheDocument();
    expect(screen.getByText('晋级')).toBeInTheDocument();
    expect(screen.getByText('回封')).toBeInTheDocument();
    expect(screen.getByText('09:25 集合')).toBeInTheDocument();
    expect(screen.getByText('14:59')).toBeInTheDocument();
    expect(screen.getByText(/12,345 万 · 占流通 1.3%/)).toBeInTheDocument();
    expect(screen.getByText('近 60 日涨停次数')).toBeInTheDocument();
    expect(screen.getByText('充电桩')).toBeInTheDocument();
    expect(screen.getByText('新能源')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '创建预警' }));
    expect(onCreateAlert).toHaveBeenCalledWith(selected);
    await user.click(screen.getByRole('button', { name: '查看详情' }));
    expect(push).toHaveBeenCalledWith('/stock/detail?code=300001.SZ');
    await user.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('跌停与炸板分支使用真实语义，缺失封板字段保持占位', () => {
    const down = renderWithProviders(
      <AlertLimitStockDrawer
        open
        item={item({
          tsCode: '600001.SH',
          stockName: '*ST测试',
          limitType: 'DOWN',
          pctChg: -5,
          pctChgLimit: null,
          streakDays: null,
          consecutiveDays: 2,
          firstSealTime: null,
          lastSealTime: null,
          sealCount: null,
          sealAmount: null,
          sealRatio: null,
          streakStatus: null,
          sealPattern: null,
          concepts: [],
          recentLimitCount60d: null,
        })}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('跌停 · 5cm')).toBeInTheDocument();
    expect(screen.getByText('2 连续跌停')).toBeInTheDocument();
    expect(screen.getByText('-5.00%')).toHaveStyle({ color: 'var(--palette-success-main)' });
    expect(screen.getAllByText('—')).toHaveLength(4);
    expect(screen.queryByText('关联概念')).not.toBeInTheDocument();
    down.unmount();

    renderWithProviders(
      <AlertLimitStockDrawer
        open
        item={item({
          tsCode: '688001.SH',
          stockName: '炸板股票',
          limitType: 'BROKEN',
          pctChgLimit: null,
          streakDays: null,
          consecutiveDays: null,
          openTimes: 2,
          streakStatus: null,
          sealPattern: null,
        })}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('炸板 · 20cm')).toBeInTheDocument();
    expect(screen.getByText('开板 2 次')).toBeInTheDocument();
  });
});
