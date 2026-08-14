/** @vitest-environment jsdom */

import { vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { createParamSensitivity, getParamSensitivityResult } from 'src/api/backtest';

import {
  BacktestParamSensitivityPanel,
  getParamSensitivityValueColor,
} from '../backtest-param-sensitivity-panel';

import type { ParamSearchSpaceItemLocal } from '../types';

vi.mock('src/api/backtest', () => ({
  createParamSensitivity: vi.fn(),
  getParamSensitivityResult: vi.fn(),
}));

vi.mock('src/components/chart', () => ({
  useChart: (options: unknown) => options,
  Chart: ({ series }: { series: Array<{ name: string }> }) => (
    <div>参数热力图序列：{series.map((item) => item.name).join(',')}</div>
  ),
}));

vi.mock('../walk-forward-param-space-editor', () => ({
  WalkForwardParamSpaceEditor: ({
    onChange,
  }: {
    onChange: (value: Record<string, ParamSearchSpaceItemLocal>) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => onChange({ shortWindow: { type: 'range', min: 3, max: 5, step: 1 } })}
      >
        配置一维区间
      </button>
      <button
        type="button"
        onClick={() =>
          onChange({
            shortWindow: { type: 'range', min: 3, max: 5, step: 1 },
            allowFlat: { type: 'enum', values: [true, false] },
          })
        }
      >
        配置二维区间
      </button>
    </div>
  ),
}));

describe('BacktestParamSensitivityPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('年化收益使用 A 股涨红跌绿，零值与缺失值保持中性', () => {
    expect(getParamSensitivityValueColor('annualizedReturn', 0.12)).toBe('error.main');
    expect(getParamSensitivityValueColor('annualizedReturn', -0.08)).toBe('success.main');
    expect(getParamSensitivityValueColor('annualizedReturn', 0)).toBe('text.secondary');
    expect(getParamSensitivityValueColor('annualizedReturn', null)).toBe('text.secondary');
    expect(getParamSensitivityValueColor('sharpeRatio', 1.2)).toBe('success.main');
  });

  it('扩展 range/enum 参数为 API Body，轮询完成后展示二维矩阵和最优组合', async () => {
    vi.mocked(createParamSensitivity).mockResolvedValue({
      sweepId: 'sweep-1',
      totalCombinations: 6,
      status: 'QUEUED',
      metric: 'sharpeRatio',
    });
    vi.mocked(getParamSensitivityResult).mockResolvedValue({
      sweepId: 'sweep-1',
      baseRunId: 'run-1',
      status: 'COMPLETED',
      totalCombinations: 6,
      completedCount: 6,
      metric: 'sharpeRatio',
      paramX: { paramKey: 'shortWindow', values: [3, 4, 5] },
      paramY: { paramKey: 'allowFlat', values: [true, false] },
      heatmap: [
        [0.8, 1.1, 0.9],
        [null as unknown as number, -0.2, 0.5],
      ],
    });

    renderWithProviders(<BacktestParamSensitivityPanel runId="run-1" />);
    fireEvent.click(screen.getByRole('button', { name: '配置二维区间' }));
    fireEvent.click(screen.getByRole('button', { name: '提交扫描' }));

    await waitFor(() =>
      expect(createParamSensitivity).toHaveBeenCalledWith({
        runId: 'run-1',
        paramX: { paramKey: 'shortWindow', values: [3, 4, 5] },
        paramY: { paramKey: 'allowFlat', values: [true, false] },
        metric: 'sharpeRatio',
      })
    );
    expect(await screen.findByText('扫描进行中…（共 6 次回测）')).toBeInTheDocument();

    await waitFor(() => expect(getParamSensitivityResult).toHaveBeenCalledWith('sweep-1'), {
      timeout: 4000,
    });
    expect(await screen.findByText('全部结果（6 组）')).toBeInTheDocument();
    expect(screen.getByText(/最优：shortWindow=4, allowFlat=true/)).toBeInTheDocument();
    expect(screen.getByText('参数热力图序列：allowFlat=true,allowFlat=false')).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();
  }, 8000);

  it('一维扫描不渲染热力图，并在服务端 FAILED 时停止轮询', async () => {
    vi.mocked(createParamSensitivity).mockResolvedValue({
      sweepId: 'sweep-failed',
      totalCombinations: 3,
      status: 'QUEUED',
      metric: 'sharpeRatio',
    });
    vi.mocked(getParamSensitivityResult).mockResolvedValue({
      sweepId: 'sweep-failed',
      baseRunId: 'run-1',
      status: 'FAILED',
      totalCombinations: 3,
      completedCount: 1,
      metric: 'sharpeRatio',
      paramX: { paramKey: 'shortWindow', values: [3, 4, 5] },
      heatmap: [],
    });

    renderWithProviders(<BacktestParamSensitivityPanel runId="run-1" />);
    fireEvent.click(screen.getByRole('button', { name: '配置一维区间' }));
    fireEvent.click(screen.getByRole('button', { name: '提交扫描' }));
    await waitFor(() => expect(createParamSensitivity).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getParamSensitivityResult).toHaveBeenCalledWith('sweep-failed'), {
      timeout: 4000,
    });

    expect(await screen.findByText('参数扫描任务失败')).toBeInTheDocument();
    expect(screen.queryByText(/参数热力图序列/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交扫描' })).toBeEnabled();
  }, 8000);

  it('提交失败后恢复配置能力并展示原始错误', async () => {
    vi.mocked(createParamSensitivity).mockRejectedValue(new Error('扫描队列已满'));
    renderWithProviders(<BacktestParamSensitivityPanel runId="run-1" />);
    fireEvent.click(screen.getByRole('button', { name: '配置一维区间' }));
    fireEvent.click(screen.getByRole('button', { name: '提交扫描' }));

    expect(await screen.findByText('扫描队列已满')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交扫描' })).toBeEnabled();
  });
});
