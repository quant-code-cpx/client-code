import type * as ReportApi from 'src/api/report';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { ReportScheduleList } from '../report-schedule-list';
import { ReportNotesPanel } from '../components/report-notes-panel';
import { ReportShareDialog } from '../components/report-share-dialog';

const apiMocks = vi.hoisted(() => ({
  listSchedules: vi.fn(),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
  runScheduleNow: vi.fn(),
  listReportShareLinks: vi.fn(),
  createReportShareLink: vi.fn(),
  revokeReportShareLink: vi.fn(),
}));

vi.mock('src/api/report', async (importOriginal) => {
  const actual = await importOriginal<typeof ReportApi>();
  return { ...actual, ...apiMocks };
});

const schedule: ReportApi.ReportSchedule = {
  id: 'schedule-1',
  userId: 1,
  type: 'BACKTEST',
  title: '每日回测报告',
  params: { runId: 'run-1' },
  format: 'HTML',
  frequency: 'DAILY',
  cronExpression: '0 18 * * 1-5',
  enabled: true,
  lastRunAt: null,
  nextRunAt: null,
  createdAt: '2026-08-10T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  apiMocks.listSchedules.mockResolvedValue([schedule]);
});

describe('report unavailable capability degradation', () => {
  it('opens a static share notice without calling missing share endpoints', () => {
    renderWithProviders(
      <ReportShareDialog open reportId="report-1" onClose={vi.fn()} onMessage={vi.fn()} />
    );

    expect(screen.getByRole('heading', { name: '分享报告（未开放）' })).toBeInTheDocument();
    expect(
      screen.getByText('分享链接的创建、查询和吊销接口尚未开放。当前不会向后端发送分享请求。')
    ).toBeInTheDocument();
    expect(apiMocks.listReportShareLinks).not.toHaveBeenCalled();
    expect(apiMocks.createReportShareLink).not.toHaveBeenCalled();
    expect(apiMocks.revokeReportShareLink).not.toHaveBeenCalled();
  });

  it('keeps the scheduled list readable while every unsupported mutation stays disabled', async () => {
    renderWithProviders(<ReportScheduleList />);

    expect(await screen.findByText('每日回测报告')).toBeInTheDocument();
    expect(apiMocks.listSchedules).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '新建定时报告（未开放）' })).toBeDisabled();
    expect(
      screen.getByRole('checkbox', { name: '每日回测报告 启用状态（未开放）' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: '编辑定时报告未开放' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '立即运行定时报告未开放' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除定时报告未开放' })).toBeDisabled();
    expect(apiMocks.createSchedule).not.toHaveBeenCalled();
    expect(apiMocks.updateSchedule).not.toHaveBeenCalled();
    expect(apiMocks.deleteSchedule).not.toHaveBeenCalled();
    expect(apiMocks.runScheduleNow).not.toHaveBeenCalled();
  });

  it('keeps notes read-only without exposing a save request', () => {
    renderWithProviders(
      <ReportNotesPanel
        report={{
          id: 'report-1',
          userId: 1,
          type: 'STOCK',
          title: '个股报告',
          params: {},
          data: null,
          filePath: null,
          format: 'JSON',
          status: 'COMPLETED',
          errorMessage: null,
          fileSize: null,
          createdAt: '2026-08-10T00:00:00.000Z',
          completedAt: '2026-08-10T00:01:00.000Z',
          notes: '已有批注',
        }}
      />
    );

    expect(
      screen.getByText('批注保存能力尚未开放，当前仅展示报告已有批注，不会发送保存请求。')
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('textbox')).toHaveValue('已有批注');
  });
});
