import type * as EventStudyApi from 'src/api/event-study';

import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { createAuthenticatedContext } from 'src/test/factories/auth-context';

import { OverviewTab } from '../overview-tab';
import { SignalRulesTab } from '../signal-rules-tab';
import { EventAnalysisTab } from '../event-analysis-tab';

const apiMocks = vi.hoisted(() => ({
  listSignalRules: vi.fn(),
  getEventCalendar: vi.fn(),
  getSignalRuleStats: vi.fn(),
  backtestSignalRule: vi.fn(),
  analyzeEvent: vi.fn(),
  analyzeBySegment: vi.fn(),
}));

vi.mock('src/api/event-study', async (importOriginal) => {
  const actual = await importOriginal<typeof EventStudyApi>();
  return { ...actual, ...apiMocks };
});

vi.mock('../signal-rule-wizard-dialog', () => ({ SignalRuleWizardDialog: () => null }));
vi.mock('../_shared/progress-snackbar', () => ({ ProgressSnackbar: () => null }));
vi.mock('../event-calendar-heatmap', () => ({ EventCalendarHeatmap: () => null }));
vi.mock('src/components/date-picker', () => ({ DatePicker: () => <div /> }));
vi.mock('../event-analysis-chart', () => ({ EventAnalysisChart: () => <div>整体分析图</div> }));
vi.mock('../event-analysis-summary-cards', () => ({
  EventAnalysisSummaryCards: () => <div>整体分析摘要</div>,
}));
vi.mock('../event-analysis-samples-table', () => ({
  EventAnalysisSamplesTable: ({ title }: { title: string }) => <div>{title}</div>,
}));

const activeRule: EventStudyApi.SignalRule = {
  id: 7,
  userId: 1,
  name: '业绩预告规则',
  description: null,
  eventType: 'FORECAST',
  conditions: {},
  signalType: 'BUY',
  status: 'ACTIVE',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  apiMocks.listSignalRules.mockResolvedValue({
    items: [activeRule],
    total: 1,
    page: 1,
    pageSize: 20,
  });
  apiMocks.getEventCalendar.mockResolvedValue({ cells: [] });
  apiMocks.analyzeEvent.mockResolvedValue({
    eventType: 'FORECAST',
    eventLabel: '业绩预告',
    sampleCount: 10,
    window: '-5,+20',
    benchmark: '000300.SH',
    aarSeries: [],
    caarSeries: [],
    caar: 0.02,
    tStatistic: 2,
    pValue: 0.04,
    topSamples: [],
    bottomSamples: [],
  });
});

describe('event-study unavailable capability degradation', () => {
  it('lists rules without requesting missing stats and disables rule backtest', async () => {
    renderWithProviders(<SignalRulesTab eventTypes={[]} />, {
      authContext: createAuthenticatedContext(),
    });

    expect(await screen.findByText('业绩预告规则')).toBeInTheDocument();
    expect(apiMocks.getSignalRuleStats).not.toHaveBeenCalled();
    expect(apiMocks.backtestSignalRule).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '规则回测未开放' })).toBeDisabled();
    expect(
      screen.getByText('规则统计与规则回测能力尚未开放；创建、编辑、启停和信号扫描不受影响。')
    ).toBeInTheDocument();
  });

  it('keeps overview rule data while marking statistics unavailable', async () => {
    renderWithProviders(<OverviewTab />);

    expect(await screen.findByText('业绩预告规则')).toBeInTheDocument();
    expect(screen.getByText('规则统计能力尚未开放')).toBeInTheDocument();
    await waitFor(() => expect(apiMocks.getEventCalendar).toHaveBeenCalledTimes(1));
    expect(apiMocks.getSignalRuleStats).not.toHaveBeenCalled();
  });

  it('keeps overall analysis available while segment analysis stays disabled', async () => {
    const { user } = renderWithProviders(
      <EventAnalysisTab
        eventTypes={[{ type: 'FORECAST', label: '业绩预告', description: '业绩预告事件' }]}
      />
    );

    await user.click(screen.getByRole('combobox', { name: '事件类型 *' }));
    await user.click(screen.getByRole('option', { name: '业绩预告' }));
    await user.click(screen.getByRole('button', { name: '开始分析' }));

    expect(await screen.findByText('整体分析摘要')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '分段对比（未开放）' })).toBeDisabled();
    expect(
      screen.getByText('分段对比能力尚未开放；整体事件分析结果仍可正常使用。')
    ).toBeInTheDocument();
    expect(apiMocks.analyzeEvent).toHaveBeenCalledTimes(1);
    expect(apiMocks.analyzeBySegment).not.toHaveBeenCalled();
  });
});
