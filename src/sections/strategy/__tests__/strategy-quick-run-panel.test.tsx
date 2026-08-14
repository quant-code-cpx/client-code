import type { Strategy } from 'src/api/strategy';

import dayjs from 'dayjs';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const { mockPush, mockRunStrategy } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRunStrategy: vi.fn(),
}));

vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('src/api/strategy', () => ({ runStrategy: mockRunStrategy }));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/date-picker', () => ({
  DatePicker: ({
    label,
    onChange,
  }: {
    label: string;
    onChange: (value: dayjs.Dayjs | null) => void;
  }) => (
    <>
      <button
        type="button"
        onClick={() => onChange(dayjs(label === '开始日期' ? '2026-01-02' : '2026-08-12'))}
      >
        {`设置${label}`}
      </button>
      <button type="button" onClick={() => onChange(null)}>{`清空${label}`}</button>
    </>
  ),
}));

import { StrategyQuickRunPanel } from '../strategy-quick-run-panel';

const strategy: Strategy = {
  id: 'strategy-alpha',
  userId: 1,
  name: 'Alpha 策略',
  description: null,
  strategyType: 'MA_CROSS_SINGLE',
  strategyConfig: {},
  backtestDefaults: {
    startDate: '2024-01-02',
    endDate: '2024-12-31',
    initialCapital: 2000000,
    benchmarkTsCode: '000905.SH',
    universe: 'CSI500',
    rebalanceFrequency: 'WEEKLY',
  },
  tags: [],
  version: 1,
  isPublic: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-08-12T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRunStrategy.mockResolvedValue({ runId: 'run-123', status: 'QUEUED', jobId: 'job-123' });
});

describe('StrategyQuickRunPanel', () => {
  it('读取策略默认值，提交 YYYYMMDD Body 并跳转新 run', async () => {
    const { user } = renderWithProviders(<StrategyQuickRunPanel strategy={strategy} />);

    expect(screen.getByLabelText('初始资金（元）')).toHaveValue(2000000);
    await user.type(screen.getByLabelText('任务名称（可选）'), '  八月验证  ');
    await user.click(screen.getByRole('button', { name: '设置开始日期' }));
    await user.click(screen.getByRole('button', { name: '设置结束日期' }));
    await user.click(screen.getByRole('button', { name: '开始回测' }));

    expect(mockRunStrategy).toHaveBeenCalledWith({
      strategyId: 'strategy-alpha',
      name: '八月验证',
      startDate: '20260102',
      endDate: '20260812',
      initialCapital: 2000000,
      benchmarkTsCode: '000905.SH',
      universe: 'CSI500',
      rebalanceFrequency: 'WEEKLY',
    });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/backtest/runs/run-123'));
  });

  it('缺日期和非正资金均前端阻断，不发 API', async () => {
    const { user } = renderWithProviders(<StrategyQuickRunPanel strategy={strategy} />);

    await user.click(screen.getByRole('button', { name: '清空开始日期' }));
    await user.click(screen.getByRole('button', { name: '开始回测' }));
    expect(await screen.findByText('请填写回测区间')).toBeInTheDocument();
    expect(mockRunStrategy).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '设置开始日期' }));
    await user.click(screen.getByRole('button', { name: '设置结束日期' }));
    await user.clear(screen.getByLabelText('初始资金（元）'));
    await user.type(screen.getByLabelText('初始资金（元）'), '0');
    await user.click(screen.getByRole('button', { name: '开始回测' }));
    expect(await screen.findByText('初始资金须大于 0')).toBeInTheDocument();
    expect(mockRunStrategy).not.toHaveBeenCalled();
  });

  it('API 错误保留业务消息且允许再次提交', async () => {
    mockRunStrategy.mockRejectedValueOnce(new Error('回测队列已满'));
    const { user } = renderWithProviders(<StrategyQuickRunPanel strategy={strategy} />);

    await user.click(screen.getByRole('button', { name: '开始回测' }));
    expect(await screen.findByText('回测队列已满')).toBeInTheDocument();

    mockRunStrategy.mockResolvedValue({ runId: 'run-retry', status: 'QUEUED', jobId: 'job-retry' });
    await user.click(screen.getByRole('button', { name: '开始回测' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/backtest/runs/run-retry'));
    expect(mockRunStrategy).toHaveBeenCalledTimes(2);
  });
});
