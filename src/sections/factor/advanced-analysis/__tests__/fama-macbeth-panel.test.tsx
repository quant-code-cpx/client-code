import type { FamaMacBethResponse } from 'src/api/factor';

import dayjs from 'dayjs';
import { screen, waitFor } from '@testing-library/react';

import { famaMacBeth } from 'src/api/factor';
import { renderWithProviders } from 'src/test/test-utils';

import { FamaMacBethPanel } from '../panels/fama-macbeth-panel';

vi.mock('src/api/factor', () => ({ famaMacBeth: vi.fn() }));

vi.mock('src/components/date-picker', () => ({
  DatePicker: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: dayjs.Dayjs;
    onChange: (value: dayjs.Dayjs) => void;
  }) => (
    <button type="button" aria-label={label} onClick={() => onChange(dayjs('2026-07-01'))}>
      {value.format('YYYY-MM-DD')}
    </button>
  ),
}));

vi.mock('../shared/empty-guide', () => ({
  EmptyGuide: ({ title }: { title: string }) => <div>{title}</div>,
}));
vi.mock('../shared/result-card', () => ({
  ResultCard: ({
    title,
    subtitle,
    children,
    actions,
    pendingNotice,
  }: {
    title: string;
    subtitle?: string | null;
    children: React.ReactNode;
    actions?: React.ReactNode;
    pendingNotice?: string;
  }) => (
    <section>
      <h2>{title}</h2>
      <div>{subtitle}</div>
      <div>{pendingNotice}</div>
      {actions}
      {children}
    </section>
  ),
}));
vi.mock('../shared/result-actions', () => ({
  ResultActions: ({ onCopy }: { onCopy: () => void }) => (
    <button type="button" onClick={onCopy}>
      复制结果
    </button>
  ),
}));

const response: FamaMacBethResponse = {
  startDate: '20260105',
  endDate: '20260812',
  forwardDays: 20,
  rSquaredMean: 0.12345,
  factors: [
    {
      factorName: 'roe',
      factorLabel: '净资产收益率',
      avgCoeff: 0.02,
      tStat: 1.2,
      pValue: 0.23,
      significant: false,
      tStatNW: null,
      pValueNW: null,
    },
    {
      factorName: 'mom',
      factorLabel: '动量',
      avgCoeff: 0.05,
      tStat: -3.2,
      pValue: 0.01,
      significant: true,
      tStatNW: -2.8,
      pValueNW: 0.02,
    },
  ],
  seriesPerDate: [{ date: '20260812', rSquared: 0.12, coeffs: { roe: 0.02 } }],
};

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof FamaMacBethPanel>> = {}
) {
  const props: React.ComponentProps<typeof FamaMacBethPanel> = {
    allFactors: [],
    universe: '000300.SH',
    factors: ['roe', 'mom'],
    onHistorySave: vi.fn(),
    prefillRequest: {
      factorNames: ['roe', 'mom'],
      startDate: '20260105',
      endDate: '20260812',
      forwardDays: 20,
    },
    ...overrides,
  };
  return { ...renderWithProviders(<FamaMacBethPanel {...props} />), props };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(famaMacBeth).mockResolvedValue(response);
});

describe('FamaMacBethPanel', () => {
  it('无因子时保留明确空态与运行门禁', () => {
    renderPanel({ factors: [], prefillRequest: null });

    expect(screen.getByText('开始 Fama-MacBeth 截面回归检验')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '运行检验' })).toBeDisabled();
    expect(famaMacBeth).not.toHaveBeenCalled();
  });

  it('预填请求、提交 Body、日期展示、NW 与历史记录均准确', async () => {
    const { user, props } = renderPanel();

    await waitFor(() => expect(screen.getByRole('button', { name: '开始日期' })).toHaveTextContent('2026-01-05'));
    await user.click(screen.getByRole('button', { name: '运行检验' }));

    expect(famaMacBeth).toHaveBeenCalledWith({
      factorNames: ['roe', 'mom'],
      startDate: '20260105',
      endDate: '20260812',
      universe: '000300.SH',
      forwardDays: 20,
      neweyWestLag: undefined,
    });
    expect(await screen.findByText(/时间窗 2026-01-05 → 2026-08-12/)).toBeInTheDocument();
    expect(screen.queryByText(/时间窗 20260105/)).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 't (NW)' })).toBeInTheDocument();
    expect(screen.getByText('共 1 个截面；时间序列图待后续接入 ApexCharts。')).toBeInTheDocument();
    expect(props.onHistorySave).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success', summary: expect.stringContaining('显著 1') })
    );
  });

  it('结果按 t 绝对值排序，并支持复制完整响应', async () => {
    const { user } = renderPanel();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    await user.click(screen.getByRole('button', { name: '运行检验' }));

    const rows = await screen.findAllByRole('row');
    expect(rows[1]).toHaveTextContent('动量');
    expect(rows[2]).toHaveTextContent('净资产收益率');
    await user.click(screen.getByRole('button', { name: '复制结果' }));
    expect(writeText).toHaveBeenCalledWith(JSON.stringify(response, null, 2));
  });

  it('日期选择与持有期修改进入请求，错误保留且写入失败历史', async () => {
    vi.mocked(famaMacBeth).mockRejectedValue(new Error('截面数据不足'));
    const { user, props } = renderPanel();
    await user.click(screen.getByRole('button', { name: '开始日期' }));
    await user.click(screen.getByRole('combobox', { name: '持有天数' }));
    await user.click(screen.getByRole('option', { name: '5' }));
    await user.click(screen.getByRole('button', { name: '运行检验' }));

    expect(famaMacBeth).toHaveBeenCalledWith(expect.objectContaining({
      startDate: '20260701',
      forwardDays: 5,
    }));
    expect(await screen.findByText('截面数据不足')).toBeInTheDocument();
    expect(props.onHistorySave).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });
});
