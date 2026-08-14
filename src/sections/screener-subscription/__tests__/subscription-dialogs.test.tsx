import type { ScreenerStrategy } from 'src/api/screener';
import type { ScreenerSubscription } from 'src/api/screener-subscription';

import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { SubscriptionEditDialog } from '../subscription-edit-dialog';
import { SubscriptionCreateDialog } from '../subscription-create-dialog';

const apiMocks = vi.hoisted(() => ({
  fetchStrategies: vi.fn(),
  createSubscription: vi.fn(),
  updateSubscription: vi.fn(),
}));

vi.mock('src/api/screener', () => ({ fetchStrategies: apiMocks.fetchStrategies }));
vi.mock('src/api/screener-subscription', () => ({
  createSubscription: apiMocks.createSubscription,
  updateSubscription: apiMocks.updateSubscription,
}));

const strategy: ScreenerStrategy = {
  id: 5,
  name: '高质量低估值',
  description: '质量与估值组合',
  filters: { minRoe: 15 },
  sortBy: 'roe',
  sortOrder: 'desc',
  type: 'user',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const subscription: ScreenerSubscription = {
  id: 9,
  name: '原订阅',
  strategyId: null,
  filters: {
    minPeTtm: 5,
    maxPeTtm: 30,
    minRoe: 12,
    minRevenueYoy: 8,
    minTotalMv: 1_000_000,
    maxTotalMv: 5_000_000,
    minBuySignalCount: 2,
    industries: ['银行'],
  },
  sortBy: 'roe',
  sortOrder: 'desc',
  frequency: 'DAILY',
  status: 'ACTIVE',
  lastRunAt: null,
  lastRunResult: null,
  lastMatchCodes: [],
  consecutiveFails: 0,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-10T00:00:00.000Z',
};

describe('SubscriptionCreateDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.fetchStrategies.mockResolvedValue({ strategies: [strategy] });
    apiMocks.createSubscription.mockResolvedValue({ ...subscription, id: 10, name: '新订阅' });
    apiMocks.updateSubscription.mockResolvedValue(subscription);
  });

  it('策略模式校验名称与策略，并提交频率和 strategyId', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const { user } = renderWithProviders(
      <SubscriptionCreateDialog open onClose={onClose} onSuccess={onSuccess} />
    );

    await waitFor(() => expect(apiMocks.fetchStrategies).toHaveBeenCalledOnce());
    await user.click(screen.getByRole('button', { name: '创建' }));
    expect(screen.getByRole('alert')).toHaveTextContent('请输入订阅名称');
    expect(apiMocks.createSubscription).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/订阅名称/), '  策略周报  ');
    await user.click(screen.getByRole('button', { name: '创建' }));
    expect(screen.getByRole('alert')).toHaveTextContent('请选择一个策略');

    await user.click(screen.getByLabelText('选择策略'));
    await user.click(screen.getByRole('option', { name: '高质量低估值' }));
    await user.click(screen.getByRole('button', { name: '每周' }));
    await user.click(screen.getByRole('button', { name: '创建' }));

    await waitFor(() =>
      expect(apiMocks.createSubscription).toHaveBeenCalledWith({
        name: '策略周报',
        frequency: 'WEEKLY',
        strategyId: 5,
      })
    );
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: 10 }));
  });

  it('自定义模式把市值亿元转换为后端万元，并只发送填写条件', async () => {
    const { user } = renderWithProviders(
      <SubscriptionCreateDialog open onClose={vi.fn()} onSuccess={vi.fn()} />
    );
    await waitFor(() => expect(apiMocks.fetchStrategies).toHaveBeenCalledOnce());
    await user.type(screen.getByLabelText(/订阅名称/), '自定义成长');
    await user.click(screen.getByRole('tab', { name: '自定义条件' }));
    await user.type(screen.getByLabelText('PE 最小值'), '8');
    await user.type(screen.getByLabelText('ROE 最小值 (%)'), '15');
    await user.type(screen.getByLabelText('营收增速最小值 (%)'), '20');
    await user.type(screen.getByLabelText('市值最小值 (亿)'), '100');
    await user.type(screen.getByLabelText('市值最大值 (亿)'), '500');
    await user.type(screen.getByLabelText('至少命中偏多信号数'), '3');
    await user.click(screen.getByRole('button', { name: '每月' }));
    await user.click(screen.getByRole('button', { name: '创建' }));

    await waitFor(() =>
      expect(apiMocks.createSubscription).toHaveBeenCalledWith({
        name: '自定义成长',
        frequency: 'MONTHLY',
        filters: {
          minPeTtm: 8,
          minRoe: 15,
          minRevenueYoy: 20,
          minTotalMv: 1_000_000,
          maxTotalMv: 5_000_000,
          minBuySignalCount: 3,
        },
      })
    );
  });

  it('创建失败保留输入并显示服务端原因，取消时清空状态', async () => {
    apiMocks.createSubscription.mockRejectedValueOnce(new Error('订阅名称已存在'));
    const onClose = vi.fn();
    const { user } = renderWithProviders(
      <SubscriptionCreateDialog open onClose={onClose} onSuccess={vi.fn()} />
    );
    await waitFor(() => expect(apiMocks.fetchStrategies).toHaveBeenCalledOnce());
    await user.type(screen.getByLabelText(/订阅名称/), '重复订阅');
    await user.click(screen.getByLabelText('选择策略'));
    await user.click(screen.getByRole('option', { name: '高质量低估值' }));
    await user.click(screen.getByRole('button', { name: '创建' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('订阅名称已存在');
    expect(screen.getByLabelText(/订阅名称/)).toHaveValue('重复订阅');
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByLabelText(/订阅名称/)).toHaveValue('');
  });
});

describe('SubscriptionEditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.updateSubscription.mockResolvedValue({ ...subscription, name: '更新订阅' });
  });

  it('加载现有快照，保留历史条件并正确换算市值后更新', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const { user } = renderWithProviders(
      <SubscriptionEditDialog
        open
        subscription={subscription}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    expect(screen.getByLabelText(/订阅名称/)).toHaveValue('原订阅');
    expect(screen.getByLabelText('市值最小值 (亿)')).toHaveValue(100);
    expect(screen.getByText('行业 银行')).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/订阅名称/));
    await user.type(screen.getByLabelText(/订阅名称/), '  更新订阅  ');
    await user.clear(screen.getByLabelText('PE 最大值'));
    await user.clear(screen.getByLabelText('市值最小值 (亿)'));
    await user.type(screen.getByLabelText('市值最小值 (亿)'), '250');
    await user.click(screen.getByRole('button', { name: '每月' }));
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() =>
      expect(apiMocks.updateSubscription).toHaveBeenCalledWith({
        id: 9,
        name: '更新订阅',
        frequency: 'MONTHLY',
        filters: expect.objectContaining({
          industries: ['银行'],
          minPeTtm: 5,
          maxPeTtm: undefined,
          minTotalMv: 2_500_000,
        }),
      })
    );
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ name: '更新订阅' }));
  });

  it('空名称不请求，更新失败保留表单并展示原因', async () => {
    apiMocks.updateSubscription.mockRejectedValueOnce(new Error('版本冲突，请刷新'));
    const { user } = renderWithProviders(
      <SubscriptionEditDialog
        open
        subscription={subscription}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await user.clear(screen.getByLabelText(/订阅名称/));
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByText('请输入订阅名称')).toBeInTheDocument();
    expect(apiMocks.updateSubscription).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/订阅名称/), '冲突订阅');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByText('版本冲突，请刷新')).toBeInTheDocument();
    expect(screen.getByLabelText(/订阅名称/)).toHaveValue('冲突订阅');
  });
});
