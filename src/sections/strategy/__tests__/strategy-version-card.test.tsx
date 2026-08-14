import type { ReactNode } from 'react';
import type { StrategyVersionItem, CompareVersionsResponse } from 'src/api/strategy';

import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const { mockListStrategyVersions, mockCompareStrategyVersions } = vi.hoisted(() => ({
  mockListStrategyVersions: vi.fn(),
  mockCompareStrategyVersions: vi.fn(),
}));

vi.mock('src/api/strategy', () => ({
  listStrategyVersions: mockListStrategyVersions,
  compareStrategyVersions: mockCompareStrategyVersions,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/label', () => ({
  Label: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { StrategyVersionCard } from '../strategy-version-card';

function version(versionNumber: number, current = false): StrategyVersionItem {
  return {
    version: versionNumber,
    strategyConfig: { topN: versionNumber * 10 },
    backtestDefaults: null,
    changelog: versionNumber === 1 ? null : `升级到 v${versionNumber}`,
    createdAt: `2026-08-0${versionNumber}T08:00:00.000Z`,
    isCurrent: current,
  };
}

const versions = [version(1), version(2), version(3, true)];

const diff: CompareVersionsResponse = {
  strategyId: 'strategy-alpha',
  versionA: versions[1],
  versionB: versions[2],
  configDiff: [
    { path: 'strategyConfig.topN', oldValue: 20, newValue: 30, changeType: 'CHANGED' },
    { path: 'strategyConfig.rankBy', oldValue: undefined, newValue: 'totalMv', changeType: 'ADDED' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockListStrategyVersions.mockResolvedValue(versions);
  mockCompareStrategyVersions.mockResolvedValue(diff);
});

describe('StrategyVersionCard', () => {
  it('加载版本并静默计算最新 diff 摘要，快速对比请求精确版本 Body', async () => {
    const { user } = renderWithProviders(<StrategyVersionCard strategyId="strategy-alpha" />);

    expect((await screen.findAllByText('v3')).length).toBeGreaterThan(0);
    expect(screen.getByText('当前')).toBeInTheDocument();
    expect(await screen.findByText('2 项配置变更')).toBeInTheDocument();
    expect(mockListStrategyVersions).toHaveBeenCalledWith('strategy-alpha');
    expect(mockCompareStrategyVersions).toHaveBeenCalledWith({
      strategyId: 'strategy-alpha',
      versionA: 2,
      versionB: 3,
    });

    await user.click(screen.getAllByRole('button', { name: '对比' })[0]);
    expect(await screen.findByRole('dialog', { name: '版本对比 v2 → v3' })).toBeInTheDocument();
    await waitFor(() => expect(mockCompareStrategyVersions).toHaveBeenCalledTimes(2));
    expect(screen.getByText('strategyConfig.topN')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('修改')).toBeInTheDocument();
    expect(screen.getByText('新增')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /版本对比/ })).not.toBeInTheDocument()
    );
  });

  it('列表错误可通过刷新恢复到空态', async () => {
    mockListStrategyVersions.mockRejectedValue(new Error('版本服务超时'));
    const { user } = renderWithProviders(<StrategyVersionCard strategyId="strategy-alpha" />);

    expect(await screen.findByText('版本服务超时')).toBeInTheDocument();
    mockListStrategyVersions.mockResolvedValue([]);
    await user.click(screen.getByRole('button', { name: '刷新版本列表' }));

    expect(await screen.findByText('暂无版本记录')).toBeInTheDocument();
    expect(mockListStrategyVersions).toHaveBeenCalledTimes(2);
  });

  it('diff 请求失败显示错误，不残留上一次对比数据', async () => {
    mockCompareStrategyVersions.mockRejectedValue(new Error('对比接口失败'));
    const { user } = renderWithProviders(<StrategyVersionCard strategyId="strategy-alpha" />);
    await screen.findAllByText('v3');

    await user.click(screen.getAllByRole('button', { name: '对比' })[0]);
    expect(await screen.findByText('对比接口失败')).toBeInTheDocument();
    expect(screen.queryByText('strategyConfig.topN')).not.toBeInTheDocument();
  });
});
