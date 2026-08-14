import type { IndexQuoteWithSparklineItem } from 'src/api/market';

import { useState } from 'react';
import { screen, within, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { fetchIndexQuoteWithSparkline } from 'src/api/market';

import { DashboardMarketPulse } from '../dashboard-market-pulse';

vi.mock('src/api/market', () => ({
  fetchIndexQuoteWithSparkline: vi.fn(),
}));

vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/chart-sparkline', () => ({
  ChartSparkline: ({ color }: { color: string }) => <span data-testid="sparkline" data-color={color} />,
}));

const storageKey = 'dashboard.pulse-selection';

function indexItem(
  tsCode: string,
  name: string,
  pctChg: number | null,
  overrides: Partial<IndexQuoteWithSparklineItem> = {}
): IndexQuoteWithSparklineItem {
  return {
    tsCode,
    name,
    tradeDate: '20260808',
    close: 3500,
    preClose: 3490,
    change: 10,
    pctChg,
    vol: 100,
    amount: 1_200_000,
    baseDate: '20260708',
    basePoint: 100,
    sparkline: [3490, 3500],
    ...overrides,
  };
}

function response(indices: IndexQuoteWithSparklineItem[]) {
  return { tradeDate: '20260808', sparklinePeriod: '1m', indices };
}

function RefreshHarness() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setRefreshKey((key) => key + 1)}>
        触发首页刷新
      </button>
      <DashboardMarketPulse refreshKey={refreshKey} />
    </>
  );
}

describe('DashboardMarketPulse branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('恢复用户顺序并保持涨红跌绿、零值与 null 中性', async () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify(['399001.SZ', '000001.SH', '399006.SZ', '000688.SH'])
    );
    vi.mocked(fetchIndexQuoteWithSparkline).mockResolvedValue(
      response([
        indexItem('000001.SH', '', 1.25),
        indexItem('399001.SZ', '深证成指', -2.5),
        indexItem('399006.SZ', '创业板指', 0),
        indexItem('000688.SH', '科创50', null, {
          close: null,
          amount: null,
          sparkline: [],
        }),
      ])
    );
    const { container } = renderWithProviders(<DashboardMarketPulse />);

    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(4);
    expect(await screen.findByText('深证成指')).toBeInTheDocument();
    expect(fetchIndexQuoteWithSparkline).toHaveBeenCalledWith({ sparkline_period: '1m' });
    expect(container.textContent!.indexOf('深证成指')).toBeLessThan(
      container.textContent!.indexOf('上证指数')
    );
    expect(screen.getByText('-2.50%')).toHaveStyle({ color: 'rgb(34, 197, 94)' });
    expect(screen.getByText('+1.25%')).toHaveStyle({ color: 'rgb(255, 86, 48)' });
    expect(screen.getByText('0.00%')).toHaveStyle({ color: 'rgb(99, 115, 129)' });
    const nullCard = screen.getByText('科创50').closest<HTMLElement>('.MuiCard-root')!;
    expect(within(nullCard).getAllByText('—')).toHaveLength(2);
    expect(within(nullCard).getByText('成交额 —')).toBeInTheDocument();
    expect(screen.getAllByTestId('sparkline')).toHaveLength(4);
  });

  it('损坏或越界的持久化选择回退默认目录，缺行情显示明确占位', async () => {
    localStorage.setItem(storageKey, '{broken json');
    vi.mocked(fetchIndexQuoteWithSparkline).mockResolvedValue(response([]));
    const broken = renderWithProviders(<DashboardMarketPulse />);

    expect(await screen.findByText('上证指数')).toBeInTheDocument();
    expect(screen.getByText('深证成指')).toBeInTheDocument();
    expect(screen.getByText('创业板指')).toBeInTheDocument();
    expect(screen.getByText('科创50')).toBeInTheDocument();
    expect(screen.getAllByText('暂无数据')).toHaveLength(4);
    broken.unmount();

    localStorage.setItem(storageKey, JSON.stringify(Array.from({ length: 7 }, (_, i) => `X${i}`)));
    renderWithProviders(<DashboardMarketPulse />);
    expect(await screen.findByText('上证指数')).toBeInTheDocument();
    expect(screen.queryByText('X0')).not.toBeInTheDocument();
  });

  it('自定义对话框允许删选并持久化，达到六项上限时禁用未选项', async () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify([
        '000001.SH',
        '000010.SH',
        '000688.SH',
        '000698.SH',
        '399001.SZ',
        '399006.SZ',
      ])
    );
    vi.mocked(fetchIndexQuoteWithSparkline).mockResolvedValue(response([]));
    const { user } = renderWithProviders(<DashboardMarketPulse />);
    await screen.findByText('指数行情');

    await user.click(screen.getByRole('button', { name: '自定义指数卡片' }));
    const dialog = screen.getByRole('dialog', { name: /自定义指数卡片/ });
    expect(within(dialog).getByText('最多选择 6 个，已选 6 个')).toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: '沪深300' })).toBeDisabled();

    await user.click(within(dialog).getByRole('checkbox', { name: '上证180' }));
    expect(within(dialog).getByRole('checkbox', { name: '沪深300' })).toBeEnabled();
    await user.click(within(dialog).getByRole('checkbox', { name: '沪深300' }));
    await user.click(within(dialog).getByRole('button', { name: '确定' }));

    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual([
      '000001.SH',
      '000688.SH',
      '000698.SH',
      '399001.SZ',
      '399006.SZ',
      '000300.SH',
    ]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('沪深300')).toBeInTheDocument();
  });

  it('首次失败可局部重试，刷新失败保留旧行情并显示 stale 提示', async () => {
    vi.mocked(fetchIndexQuoteWithSparkline)
      .mockRejectedValueOnce(new Error('指数服务不可用'))
      .mockResolvedValueOnce(response([indexItem('000001.SH', '上证指数', 1)]))
      .mockRejectedValueOnce(new Error('刷新超时'));
    const { user } = renderWithProviders(<RefreshHarness />);

    expect(await screen.findByRole('alert')).toHaveTextContent('指数服务不可用');
    await user.click(screen.getByRole('button', { name: '重试' }));
    expect(await screen.findByText('+1.00%')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '触发首页刷新' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '刷新失败，当前展示上次数据：刷新超时'
    );
    expect(screen.getByText('+1.00%')).toBeInTheDocument();
    await waitFor(() => expect(fetchIndexQuoteWithSparkline).toHaveBeenCalledTimes(3));
  });
});
