/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import type { ComparisonConfigResponse } from 'src/api/backtest';

import { vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { getRunDetail, createComparison } from 'src/api/backtest';

import { ComparisonCreateView } from '../view/comparison-create-view';

import type { ComparisonStrategyFormItem } from '../types';

const routerPush = vi.hoisted(() => vi.fn());

vi.mock('src/api/backtest', () => ({
  getRunDetail: vi.fn(),
  createComparison: vi.fn(),
}));
vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock('src/routes/components', () => ({
  RouterLink: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/date-picker', () => ({
  DatePicker: ({ label, value }: { label: string; value: { format: (fmt: string) => string } | null }) => (
    <span>{label}：{value?.format('YYYY-MM-DD') ?? '-'}</span>
  ),
}));
vi.mock('../comparison-strategy-card', () => ({
  ComparisonStrategyCard: ({
    index,
    item,
    onChange,
    onRemove,
    canRemove,
  }: {
    index: number;
    item: ComparisonStrategyFormItem;
    onChange: (patch: Partial<ComparisonStrategyFormItem>) => void;
    onRemove: () => void;
    canRemove: boolean;
  }) => (
    <section aria-label={`策略卡 ${index + 1}`}>
      <span>{item.label}</span>
      <span>{item.strategyType}</span>
      <button
        type="button"
        onClick={() =>
          onChange({
            label: '增强策略',
            strategyType: 'MA_CROSS_SINGLE',
            strategyConfig: { tsCode: '000001.SZ', shortWindow: 5, longWindow: 20 },
            rebalanceFrequency: 'WEEKLY',
          })
        }
      >
        修改策略 {index + 1}
      </button>
      <button type="button" onClick={onRemove} disabled={!canRemove}>
        移除策略 {index + 1}
      </button>
    </section>
  ),
}));

const comparisonConfig: ComparisonConfigResponse = {
  groupId: 'source-group',
  commonConfig: {
    name: '旧对比',
    startDate: '20260102',
    endDate: '20260630',
    benchmarkTsCode: '000001.SH',
    universe: 'CSI500',
    initialCapital: 2_000_000,
  },
  strategies: [
    {
      label: null,
      type: 'MA_CROSS_SINGLE',
      config: { tsCode: '600519.SH' },
      freq: 'WEEKLY',
    },
    {
      label: '价值策略',
      strategyType: 'FACTOR_RANKING',
      strategyConfig: { topN: 20 },
      rebalanceFrequency: 'MONTHLY',
    },
  ],
};

describe('ComparisonCreateView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.history.replaceState({}, '');
    vi.mocked(createComparison).mockResolvedValue({
      groupId: 'group-1',
      jobId: 'job-1',
      status: 'QUEUED',
    });
  });

  it('编辑策略并以 YYYYMMDD Body 创建任务，保存 jobId 后导航详情', async () => {
    const { user } = renderWithProviders(<ComparisonCreateView />);

    expect(screen.getAllByRole('region', { name: /策略卡/ })).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: '添加策略 (2/10)' }));
    expect(screen.getAllByRole('region', { name: /策略卡/ })).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: '移除策略 3' }));
    expect(screen.getAllByRole('region', { name: /策略卡/ })).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: '修改策略 1' }));
    const name = screen.getByRole('textbox', { name: '对比名称（可选）' });
    await user.type(name, '多模型基准对比');
    const capital = screen.getByRole('spinbutton', { name: '初始资金' });
    await user.clear(capital);
    await user.type(capital, '1500000');
    await user.click(screen.getByRole('button', { name: '提交对比任务' }));

    await waitFor(() =>
      expect(createComparison).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '多模型基准对比',
          startDate: '20200101',
          endDate: '20241231',
          benchmarkTsCode: '000300.SH',
          universe: 'HS300',
          initialCapital: 1_500_000,
          strategies: expect.arrayContaining([
            {
              label: '增强策略',
              strategyType: 'MA_CROSS_SINGLE',
              strategyConfig: { tsCode: '000001.SZ', shortWindow: 5, longWindow: 20 },
              rebalanceFrequency: 'WEEKLY',
            },
          ]),
        })
      )
    );
    expect(window.sessionStorage.getItem('compare:job:group-1')).toBe('job-1');
    expect(routerPush).toHaveBeenCalledWith('/backtest/comparison/group-1', {
      state: { jobId: 'job-1' },
    });
  });

  it('复制配置兼容新旧字段与紧凑日期，提交仍保持后端日期契约', async () => {
    window.history.replaceState({ usr: { comparisonConfig } }, '');
    const { user } = renderWithProviders(<ComparisonCreateView />);

    expect(screen.getByRole('textbox', { name: '对比名称（可选）' })).toHaveValue('旧对比（复制）');
    expect(screen.getByText('开始日期：2026-01-02')).toBeInTheDocument();
    expect(screen.getByText('结束日期：2026-06-30')).toBeInTheDocument();
    expect(screen.getByText('策略1')).toBeInTheDocument();
    expect(screen.getByText('价值策略')).toBeInTheDocument();
    expect(getRunDetail).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '提交对比任务' }));
    expect(createComparison).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '旧对比（复制）',
        startDate: '20260102',
        endDate: '20260630',
        benchmarkTsCode: '000001.SH',
        universe: 'CSI500',
        initialCapital: 2_000_000,
        strategies: [
          {
            label: '策略1',
            strategyType: 'MA_CROSS_SINGLE',
            strategyConfig: { tsCode: '600519.SH' },
            rebalanceFrequency: 'WEEKLY',
          },
          {
            label: '价值策略',
            strategyType: 'FACTOR_RANKING',
            strategyConfig: { topN: 20 },
            rebalanceFrequency: 'MONTHLY',
          },
        ],
      })
    );
  });

  it('历史 run 预填覆盖 loading/成功与错误，并限制最多读取 10 条', async () => {
    const sourceRunIds = Array.from({ length: 12 }, (_, index) => `run-${index + 1}`);
    window.history.replaceState({ usr: { sourceRunIds } }, '');
    const details = sourceRunIds.map((runId, index) => ({
      runId,
      name: `历史任务${index + 1}`,
      strategyType: index % 2 ? 'FACTOR_RANKING' : 'SCREENING_ROTATION',
      strategyConfig: { topN: index + 5 },
      rebalanceFrequency: 'MONTHLY',
      startDate: '20250101',
      endDate: '20251231',
      benchmarkTsCode: '000300.SH',
      universe: 'ALL_A',
      initialCapital: 800_000,
    }));
    vi.mocked(getRunDetail).mockImplementation(async (runId) => {
      const detail = details.find((item) => item.runId === runId);
      return detail as unknown as Awaited<ReturnType<typeof getRunDetail>>;
    });
    const first = renderWithProviders(<ComparisonCreateView />);

    expect(screen.getByRole('button', { name: '正在预填…' })).toBeDisabled();
    expect(await screen.findByDisplayValue('历史任务对比（10 条）')).toBeInTheDocument();
    expect(getRunDetail).toHaveBeenCalledTimes(10);
    expect(screen.getAllByRole('region', { name: /策略卡/ })).toHaveLength(10);
    first.unmount();

    window.history.replaceState({ usr: { sourceRunIds: ['bad-1', 'bad-2'] } }, '');
    vi.mocked(getRunDetail).mockRejectedValueOnce(new Error('历史任务已清理'));
    const second = renderWithProviders(<ComparisonCreateView />);
    expect(await screen.findByText('历史任务已清理')).toBeInTheDocument();
    second.unmount();
  });

  it('创建失败保留可关闭错误，不写入 job 导航状态', async () => {
    vi.mocked(createComparison).mockRejectedValueOnce('offline');
    const { user } = renderWithProviders(<ComparisonCreateView />);
    await user.click(screen.getByRole('button', { name: '提交对比任务' }));
    expect(await screen.findByText('提交失败')).toBeInTheDocument();
    expect(routerPush).not.toHaveBeenCalled();
    expect(window.sessionStorage.length).toBe(0);
  });
});
