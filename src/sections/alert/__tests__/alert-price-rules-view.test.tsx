import type { PriceAlertRule } from 'src/api/alert';

import { act, screen, within, waitFor } from '@testing-library/react';

import { alertApi } from 'src/api/alert';
import { getWatchlists } from 'src/api/watchlist';
import { listPortfolios } from 'src/api/portfolio';
import { renderWithProviders } from 'src/test/test-utils';

import { AlertPriceRulesView } from '../view/alert-price-rules-view';

const auth = vi.hoisted(() => ({ role: 'ADMIN' }));
vi.mock('src/auth/context', () => ({ useAuth: () => auth }));

vi.mock('src/api/alert', () => ({
  alertApi: {
    getPriceRules: vi.fn(),
    createPriceRule: vi.fn(),
    updatePriceRule: vi.fn(),
    deletePriceRule: vi.fn(),
    scanPriceRules: vi.fn(),
  },
}));

vi.mock('src/api/watchlist', () => ({ getWatchlists: vi.fn() }));
vi.mock('src/api/portfolio', () => ({ listPortfolios: vi.fn() }));

const socket = vi.hoisted(() => ({ on: vi.fn(), off: vi.fn() }));
vi.mock('src/lib/socket', () => ({ getSocket: () => socket }));

vi.mock('src/components/stock-search-autocomplete', () => ({
  stockItemFromCode: (tsCode: string) => ({
    tsCode,
    symbol: tsCode.split('.')[0],
    name: '',
    market: null,
    industry: null,
    listStatus: null,
  }),
  StockSearchAutocomplete: ({ onChange }: { onChange: (item: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange({
          tsCode: '000001.SZ',
          symbol: '000001',
          name: '平安银行',
          market: null,
          industry: null,
          listStatus: null,
        })
      }
    >
      选择平安银行
    </button>
  ),
}));

const activeRule: PriceAlertRule = {
  id: 1,
  userId: 7,
  tsCode: '000001.SZ',
  stockName: '平安银行',
  watchlistId: null,
  portfolioId: null,
  sourceName: null,
  ruleType: 'PCT_CHANGE_UP',
  threshold: 5,
  memo: '突破提醒',
  status: 'ACTIVE',
  triggerCount: 3,
  lastTriggeredAt: new Date().toISOString(),
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

describe('AlertPriceRulesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.role = 'ADMIN';
    vi.mocked(alertApi.getPriceRules).mockResolvedValue([activeRule]);
    vi.mocked(alertApi.createPriceRule).mockResolvedValue(activeRule);
    vi.mocked(alertApi.updatePriceRule).mockResolvedValue(activeRule);
    vi.mocked(alertApi.deletePriceRule).mockResolvedValue({ message: 'ok' });
    vi.mocked(alertApi.scanPriceRules).mockResolvedValue({ triggered: 2 });
    vi.mocked(getWatchlists).mockResolvedValue([]);
    vi.mocked(listPortfolios).mockResolvedValue([]);
  });

  it('展示 loading 后的 empty 状态', async () => {
    let resolveRules!: (value: PriceAlertRule[]) => void;
    vi.mocked(alertApi.getPriceRules).mockImplementationOnce(
      () => new Promise((resolve) => { resolveRules = resolve; })
    );
    const { container } = renderWithProviders(<AlertPriceRulesView />);

    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(7);
    await act(async () => resolveRules([]));

    expect(await screen.findByText('暂无预警规则')).toBeInTheDocument();
    expect(screen.getByText('点击「新建规则」开始设置价格预警')).toBeInTheDocument();
  });

  it('请求失败展示真实错误', async () => {
    vi.mocked(alertApi.getPriceRules).mockRejectedValueOnce(new Error('规则服务不可用'));
    renderWithProviders(<AlertPriceRulesView />);

    expect(await screen.findByText('规则服务不可用')).toBeInTheDocument();
  });

  it('渲染规则统计与 null/date 字段，并支持暂停和确认删除', async () => {
    const nullRule: PriceAlertRule = {
      ...activeRule,
      id: 2,
      tsCode: null,
      stockName: null,
      sourceName: '核心组合',
      portfolioId: 'portfolio-1',
      ruleType: 'LIMIT_UP',
      threshold: null,
      memo: null,
      status: 'PAUSED',
      lastTriggeredAt: null,
    };
    vi.mocked(alertApi.getPriceRules).mockResolvedValue([activeRule, nullRule]);
    const { user } = renderWithProviders(<AlertPriceRulesView />);

    expect(await screen.findByRole('link', { name: '000001.SZ' })).toHaveAttribute(
      'href',
      '/stock/detail?code=000001.SZ'
    );
    expect(screen.getByText('核心组合')).toBeInTheDocument();
    expect(screen.getByText('今日触发')).toBeInTheDocument();
    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);

    const firstRow = screen.getByRole('link', { name: '000001.SZ' }).closest('tr')!;
    await user.click(within(firstRow).getByRole('button', { name: '暂停' }));
    expect(alertApi.updatePriceRule).toHaveBeenCalledWith(1, { status: 'PAUSED' });

    await user.click(within(firstRow).getByRole('button', { name: '删除' }));
    expect(screen.getByText(/确定删除股票/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '删除' }));
    expect(alertApi.deletePriceRule).toHaveBeenCalledWith(1);
  });

  it('新建单股规则校验必填项并提交准确 Body', async () => {
    const { user } = renderWithProviders(<AlertPriceRulesView />);
    await user.click(await screen.findByRole('button', { name: '新建规则' }));

    await user.click(screen.getByRole('button', { name: '创建' }));
    expect(screen.getByText('请选择股票')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '选择平安银行' }));
    await user.click(screen.getByRole('button', { name: '创建' }));
    expect(screen.getByText('请输入阈值')).toBeInTheDocument();

    await user.type(screen.getByRole('spinbutton', { name: '阈值' }), '6.5');
    await user.type(screen.getByRole('textbox', { name: '备注（可选）' }), '  突破新高  ');
    await user.click(screen.getByRole('button', { name: '创建' }));

    expect(alertApi.createPriceRule).toHaveBeenCalledWith({
      tsCode: '000001.SZ',
      ruleType: 'PCT_CHANGE_UP',
      threshold: 6.5,
      memo: '突破新高',
    });
    await waitFor(() => expect(alertApi.getPriceRules).toHaveBeenCalledTimes(2));
  });

  it('编辑规则预填值并提交 update Body', async () => {
    const { user } = renderWithProviders(<AlertPriceRulesView />);
    const firstRow = (await screen.findByRole('link', { name: '000001.SZ' })).closest('tr')!;
    await user.click(within(firstRow).getByRole('button', { name: '编辑' }));

    expect(screen.getByRole('spinbutton', { name: '阈值' })).toHaveValue(5);
    await user.clear(screen.getByRole('spinbutton', { name: '阈值' }));
    await user.type(screen.getByRole('spinbutton', { name: '阈值' }), '7');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(alertApi.updatePriceRule).toHaveBeenCalledWith(1, {
      tsCode: '000001.SZ',
      ruleType: 'PCT_CHANGE_UP',
      threshold: 7,
      memo: '突破提醒',
    });
  });

  it('管理员扫描显示触发数并刷新；普通用户不渲染扫描入口或订阅 socket', async () => {
    const { user, unmount } = renderWithProviders(<AlertPriceRulesView />);
    await screen.findByRole('link', { name: '000001.SZ' });
    await user.click(screen.getByRole('button', { name: '立即扫描' }));

    expect(alertApi.scanPriceRules).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('价格预警扫描完成，触发 2 条规则')).toBeInTheDocument();
    await waitFor(() => expect(alertApi.getPriceRules).toHaveBeenCalledTimes(2));
    unmount();
    expect(socket.off).toHaveBeenCalledWith('price-alert', expect.any(Function));

    vi.clearAllMocks();
    auth.role = 'USER';
    vi.mocked(alertApi.getPriceRules).mockResolvedValue([]);
    renderWithProviders(<AlertPriceRulesView />);
    await screen.findByText('暂无预警规则');
    expect(screen.queryByRole('button', { name: '立即扫描' })).not.toBeInTheDocument();
    expect(socket.on).not.toHaveBeenCalled();
  });
});
