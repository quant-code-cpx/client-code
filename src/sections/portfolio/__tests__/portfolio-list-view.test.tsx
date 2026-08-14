import type { ReactNode } from 'react';
import type { PortfolioListItem } from 'src/api/portfolio';

import { screen, within, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const {
  mockListPortfolios,
  mockCreatePortfolio,
  mockUpdatePortfolio,
  mockDeletePortfolio,
} = vi.hoisted(() => ({
  mockListPortfolios: vi.fn(),
  mockCreatePortfolio: vi.fn(),
  mockUpdatePortfolio: vi.fn(),
  mockDeletePortfolio: vi.fn(),
}));

vi.mock('src/api/portfolio', () => ({
  listPortfolios: mockListPortfolios,
  createPortfolio: mockCreatePortfolio,
  updatePortfolio: mockUpdatePortfolio,
  deletePortfolio: mockDeletePortfolio,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/label', () => ({
  Label: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock('src/routes/components', () => ({ RouterLink: 'a' }));

import { PortfolioListView } from '../view/portfolio-list-view';

function portfolio(
  id: string,
  name: string,
  patch: Partial<PortfolioListItem> = {}
): PortfolioListItem {
  return {
    id,
    name,
    description: `${name} 描述`,
    initialCash: 1000000,
    holdingCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-08-12T08:00:00.000Z',
    kind: 'PAPER',
    isArchived: false,
    todayPnl: null,
    todayPnlPct: null,
    totalMarketValue: null,
    cumulativeReturn: null,
    sparkline: [{ date: '20260812', nav: null }],
    ...patch,
  };
}

const live = portfolio('live-1', '实盘核心', {
  kind: 'LIVE',
  todayPnl: 1200,
  todayPnlPct: 0.012,
  totalMarketValue: 1120000,
  cumulativeReturn: 0.12,
  sparkline: [
    { date: '20260811', nav: 1 },
    { date: '20260812', nav: 1.02 },
  ],
});
const paper = portfolio('paper-1', '模拟成长');
const archived = portfolio('archived-1', '历史归档', { isArchived: true });

beforeEach(() => {
  vi.clearAllMocks();
  mockCreatePortfolio.mockResolvedValue({});
  mockUpdatePortfolio.mockResolvedValue({});
  mockDeletePortfolio.mockResolvedValue({ message: 'ok' });
});

describe('PortfolioListView', () => {
  it('列表失败可重试；空列表提供三类建仓引导', async () => {
    mockListPortfolios.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce([]);
    const { user } = renderWithProviders(<PortfolioListView />);

    expect(await screen.findByText('加载组合列表失败')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));
    expect(await screen.findByText('新建空白组合')).toBeInTheDocument();
    expect(screen.getByText('从回测导入')).toBeInTheDocument();
    expect(screen.getByText('复制成熟模板')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建第一个组合' })).toBeEnabled();
    expect(mockListPortfolios).toHaveBeenCalledTimes(2);
  });

  it('按实盘/归档及关键词筛选，不把 archived 计入全部', async () => {
    mockListPortfolios.mockResolvedValue([live, paper, archived]);
    const { user } = renderWithProviders(<PortfolioListView />);

    expect(await screen.findByText('实盘核心')).toBeInTheDocument();
    expect(screen.getByText('模拟成长')).toBeInTheDocument();
    expect(screen.queryByText('历史归档')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '全部 2' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '实盘 1' }));
    expect(screen.getByText('实盘核心')).toBeInTheDocument();
    expect(screen.queryByText('模拟成长')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '归档 1' }));
    expect(screen.getByText('历史归档')).toBeInTheDocument();
    expect(screen.queryByText('实盘核心')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('搜索组合名称 / 描述'), '不存在');
    expect(screen.getByText('当前筛选下暂无组合，换个条件再看看。')).toBeInTheDocument();
  });

  it('创建时校验负资金，提交 trim 后的 Body 并刷新列表', async () => {
    const created = portfolio('new-1', '新组合', { description: '价值策略' });
    mockListPortfolios.mockResolvedValueOnce([]).mockResolvedValueOnce([created]);
    const { user } = renderWithProviders(<PortfolioListView />);

    await screen.findByText('新建空白组合');
    await user.click(screen.getByRole('button', { name: '新建组合' }));
    await user.type(screen.getByLabelText(/组合名称/), '  新组合  ');
    await user.type(screen.getByLabelText('描述（可选）'), '  价值策略  ');
    await user.clear(screen.getByLabelText('初始资金'));
    await user.type(screen.getByLabelText('初始资金'), '-1');
    await user.click(screen.getByRole('button', { name: '创建' }));
    expect(await screen.findByText('初始资金不能为负数')).toBeInTheDocument();
    expect(mockCreatePortfolio).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('初始资金'));
    await user.type(screen.getByLabelText('初始资金'), '500000');
    await user.click(screen.getByRole('button', { name: '创建' }));

    expect(mockCreatePortfolio).toHaveBeenCalledWith({
      name: '新组合',
      description: '价值策略',
      initialCash: 500000,
    });
    expect(await screen.findByText('新组合')).toBeInTheDocument();
    expect(mockListPortfolios).toHaveBeenCalledTimes(2);
  });

  it('编辑与删除均提交资源 ID，并在成功后刷新', async () => {
    mockListPortfolios.mockResolvedValue([live]);
    const { user } = renderWithProviders(<PortfolioListView />);

    await screen.findByText('实盘核心');
    await user.click(screen.getByRole('button', { name: '更多操作' }));
    await user.click(await screen.findByRole('menuitem', { name: '编辑' }));
    const editDialog = screen.getByRole('dialog', { name: '编辑组合' });
    const nameInput = within(editDialog).getByLabelText(/组合名称/);
    await user.clear(nameInput);
    await user.type(nameInput, '实盘核心 2');
    await user.click(within(editDialog).getByRole('button', { name: '保存' }));

    expect(mockUpdatePortfolio).toHaveBeenCalledWith({
      id: 'live-1',
      name: '实盘核心 2',
      description: '实盘核心 描述',
    });
    await waitFor(() => expect(mockListPortfolios).toHaveBeenCalledTimes(2));

    await user.click(await screen.findByRole('button', { name: '更多操作' }));
    await user.click(await screen.findByRole('menuitem', { name: '删除' }));
    const deleteDialog = screen.getByRole('dialog', { name: '确认删除' });
    expect(deleteDialog).toHaveTextContent('实盘核心');
    await user.click(within(deleteDialog).getByRole('button', { name: '确认删除' }));

    expect(mockDeletePortfolio).toHaveBeenCalledWith({ portfolioId: 'live-1' });
    await waitFor(() => expect(mockListPortfolios).toHaveBeenCalledTimes(3));
  });
});
