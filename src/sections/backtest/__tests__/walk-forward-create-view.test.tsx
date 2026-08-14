/** @vitest-environment jsdom */

import type { ReactNode } from 'react';

import { screen, waitFor } from '@testing-library/react';
import { vi, it, expect, describe, beforeEach } from 'vitest';

import { renderWithProviders } from 'src/test/test-utils';
import { createWalkForwardRun, createRollingBacktest } from 'src/api/backtest';

import type { ParamSearchSpaceItemLocal } from '../types';

const routerPush = vi.hoisted(() => vi.fn());

vi.mock('src/api/backtest', () => ({
  createWalkForwardRun: vi.fn(),
  createRollingBacktest: vi.fn(),
}));
vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/date-picker', () => ({
  DatePicker: ({ label }: { label: string }) => <span>{label}</span>,
}));
vi.mock('src/sections/backtest/backtest-strategy-config-panel', () => ({
  BacktestStrategyConfigPanel: () => <div>策略参数</div>,
}));
vi.mock('src/sections/backtest/walk-forward-create-mode-tabs', () => ({
  WalkForwardCreateModeTabs: ({
    onChange,
  }: {
    onChange: (mode: 'WF_ROLLING' | 'WF_ANCHORED' | 'ROLLING') => void;
  }) => (
    <div role="tablist" aria-label="walk forward create mode tabs">
      <button type="button" role="tab" onClick={() => onChange('WF_ROLLING')}>
        滚动 WF
      </button>
      <button type="button" role="tab" onClick={() => onChange('ROLLING')}>
        滚动窗口
      </button>
    </div>
  ),
}));
vi.mock('src/sections/backtest/walk-forward-window-preview', () => ({
  WalkForwardWindowPreview: () => <div>窗口预览</div>,
}));
vi.mock('src/sections/backtest/walk-forward-param-space-editor', () => ({
  WalkForwardParamSpaceEditor: ({
    onChange,
  }: {
    onChange: (next: Record<string, ParamSearchSpaceItemLocal>) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange({ topN: { type: 'range', min: 5, max: 25, step: 5 } })}
    >
      启用 topN 搜索
    </button>
  ),
}));

import { WalkForwardCreateView } from '../view/walk-forward-create-view';

describe('WalkForwardCreateView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createWalkForwardRun).mockResolvedValue({
      wfRunId: 'wf-1',
      jobId: 'job-1',
      status: 'QUEUED',
    });
    vi.mocked(createRollingBacktest).mockResolvedValue({
      wfRunId: 'rolling-1',
      jobId: 'job-2',
      status: 'QUEUED',
    });
  });

  it('submits WF validation fields and navigates to the created run', async () => {
    const { user } = renderWithProviders(<WalkForwardCreateView />);

    expect(screen.getByRole('button', { name: '提交 Walk-Forward 任务' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '启用 topN 搜索' }));
    await user.click(screen.getByRole('button', { name: '提交 Walk-Forward 任务' }));

    await waitFor(() =>
      expect(createWalkForwardRun).toHaveBeenCalledWith({
        name: undefined,
        mode: 'WF',
        windowMode: 'ROLLING',
        baseStrategyType: 'SCREENING_ROTATION',
        baseStrategyConfig: {
          rankBy: 'totalMv',
          rankOrder: 'desc',
          topN: 20,
          minDaysListed: 60,
        },
        paramSearchSpace: { topN: { type: 'range', min: 5, max: 25, step: 5 } },
        fullStartDate: '20180101',
        fullEndDate: '20241231',
        inSampleDays: 252,
        outOfSampleDays: 63,
        stepDays: 63,
        optimizeMetric: 'sharpeRatio',
        benchmarkTsCode: '000300.SH',
        universe: 'HS300',
        initialCapital: 1_000_000,
        rebalanceFrequency: 'MONTHLY',
        purgeDays: 0,
        embargoDays: 0,
        minOosTrades: 0,
      })
    );
    expect(routerPush).toHaveBeenCalledWith('/backtest/walk-forward/wf-1');
  });

  it('uses the dedicated Rolling API body after mode switching', async () => {
    const { user } = renderWithProviders(<WalkForwardCreateView />);

    await user.click(screen.getByRole('tab', { name: '滚动窗口' }));
    expect(screen.getByText('Rolling 窗口设置')).toBeInTheDocument();
    expect(screen.queryByText('防泄漏与最小样本约束')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '启用 topN 搜索' }));
    await user.click(screen.getByRole('button', { name: '提交 Rolling 任务' }));

    await waitFor(() =>
      expect(createRollingBacktest).toHaveBeenCalledWith({
        name: undefined,
        strategyType: 'SCREENING_ROTATION',
        strategyConfig: {
          rankBy: 'totalMv',
          rankOrder: 'desc',
          topN: 20,
          minDaysListed: 60,
        },
        rollingParamSpace: { topN: { type: 'range', min: 5, max: 25, step: 5 } },
        startDate: '20180101',
        endDate: '20241231',
        lookbackDays: 252,
        holdingPeriodDays: 63,
        optimizeMetric: 'sharpeRatio',
        benchmarkTsCode: '000300.SH',
        universe: 'HS300',
        initialCapital: 1_000_000,
        rebalanceFrequency: 'MONTHLY',
      })
    );
    expect(createWalkForwardRun).not.toHaveBeenCalled();
    expect(routerPush).toHaveBeenCalledWith('/backtest/walk-forward/rolling-1');
  });
});
