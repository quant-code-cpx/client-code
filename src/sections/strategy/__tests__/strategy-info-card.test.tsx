import type { Strategy } from 'src/api/strategy';

import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const { mockUpdateStrategy } = vi.hoisted(() => ({ mockUpdateStrategy: vi.fn() }));

vi.mock('src/api/strategy', () => ({ updateStrategy: mockUpdateStrategy }));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));

import { StrategyInfoCard } from '../strategy-info-card';

const strategy: Strategy = {
  id: 'strategy-alpha',
  userId: 1,
  name: 'Alpha 策略',
  description: '旧描述',
  strategyType: 'MA_CROSS_SINGLE',
  strategyConfig: {},
  backtestDefaults: null,
  tags: ['价值'],
  version: 1,
  isPublic: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-08-12T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StrategyInfoCard', () => {
  it('只展示后端返回可见性；编辑区不提供契约未支持的公开开关', async () => {
    const { user } = renderWithProviders(
      <StrategyInfoCard strategy={strategy} onUpdate={vi.fn()} />
    );
    expect(screen.getByText('私有')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '编辑' }));
    expect(screen.queryByRole('checkbox', { name: '公开策略' })).not.toBeInTheDocument();
  });

  it('提交 trim 后字段并完全采用服务端响应，不在前端伪造 isPublic', async () => {
    const serverUpdated = {
      ...strategy,
      name: 'Alpha V2',
      description: '新描述',
      updatedAt: '2026-08-13T00:00:00.000Z',
      isPublic: false,
    };
    mockUpdateStrategy.mockResolvedValue(serverUpdated);
    const onUpdate = vi.fn();
    const { user } = renderWithProviders(
      <StrategyInfoCard strategy={strategy} onUpdate={onUpdate} />
    );

    await user.click(screen.getByRole('button', { name: '编辑' }));
    const name = screen.getByLabelText(/策略名称/);
    const description = screen.getByLabelText('策略描述（可选）');
    await user.clear(name);
    await user.type(name, '  Alpha V2  ');
    await user.clear(description);
    await user.type(description, '  新描述  ');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(mockUpdateStrategy).toHaveBeenCalledWith({
      id: 'strategy-alpha',
      name: 'Alpha V2',
      description: '新描述',
      tags: ['价值'],
    });
    expect(onUpdate).toHaveBeenCalledWith(serverUpdated);
    await waitFor(() => expect(screen.queryByLabelText(/策略名称/)).not.toBeInTheDocument());
  });

  it('空名称前端阻断；服务端失败保留编辑态和业务错误', async () => {
    mockUpdateStrategy.mockRejectedValue(new Error('策略名称重复'));
    const { user } = renderWithProviders(
      <StrategyInfoCard strategy={strategy} onUpdate={vi.fn()} />
    );
    await user.click(screen.getByRole('button', { name: '编辑' }));
    const name = screen.getByLabelText(/策略名称/);
    await user.clear(name);
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByText('策略名称不能为空')).toBeInTheDocument();
    expect(mockUpdateStrategy).not.toHaveBeenCalled();

    await user.type(name, '重名策略');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByText('策略名称重复')).toBeInTheDocument();
    expect(screen.getByLabelText(/策略名称/)).toHaveValue('重名策略');
  });
});
