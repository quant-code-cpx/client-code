import type * as ReportApiModule from 'src/api/report';
import type * as ReactRouterDomModule from 'react-router-dom';

import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { ReportListView } from '../report-list-view';
import { ReportDetailView } from '../report-detail-view';

const mocks = vi.hoisted(() => ({
  listReports: vi.fn(),
  getReportDetail: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDomModule>();
  return { ...actual, useParams: () => ({ id: 'report-pending' }) };
});

vi.mock('src/api/report', async (importOriginal) => {
  const actual = await importOriginal<typeof ReportApiModule>();
  return {
    ...actual,
    listReports: mocks.listReports,
    getReportDetail: mocks.getReportDetail,
  };
});

const pendingListItem: ReportApiModule.ReportListItem = {
  id: 'report-pending',
  type: 'STOCK',
  title: '生成中的报告',
  format: 'JSON',
  status: 'PENDING',
  fileSize: null,
  createdAt: '2026-08-09T00:00:00.000Z',
  completedAt: null,
};

const pendingReport: ReportApiModule.Report = {
  ...pendingListItem,
  userId: 7,
  params: {},
  data: null,
  filePath: null,
  errorMessage: null,
  progress: { stage: 'loading', percent: 10 },
};

function disabledTooltipWarnings(consoleError: ReturnType<typeof vi.spyOn>) {
  return consoleError.mock.calls
    .flat()
    .filter((value) => String(value).includes('disabled `button` child'));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('量化报告 disabled Tooltip', () => {
  it('列表加载时由 span 承载刷新 Tooltip', async () => {
    mocks.listReports.mockReturnValueOnce(new Promise(() => undefined));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderWithProviders(<ReportListView />);

    const refreshButton = screen.getByRole('button', { name: '刷新' });
    await waitFor(() => expect(refreshButton).toBeDisabled());
    expect(refreshButton.parentElement?.tagName).toBe('SPAN');
    expect(disabledTooltipWarnings(consoleError)).toHaveLength(0);

    consoleError.mockRestore();
  });

  it('生成中报告的禁用操作由 span 承载 Tooltip', async () => {
    mocks.getReportDetail.mockResolvedValueOnce(pendingReport);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderWithProviders(<ReportDetailView />);

    expect(await screen.findByRole('heading', { name: '生成中的报告' })).toBeInTheDocument();
    const printButton = screen.getByRole('button', { name: '打印' });
    const regenerateButton = screen.getByRole('button', { name: '重新生成（未开放）' });
    expect(printButton).toBeDisabled();
    expect(regenerateButton).toBeDisabled();
    expect(printButton.parentElement?.tagName).toBe('SPAN');
    expect(regenerateButton.parentElement?.tagName).toBe('SPAN');
    expect(disabledTooltipWarnings(consoleError)).toHaveLength(0);

    consoleError.mockRestore();
  });

  it('列表中的生成中报告也保留可触发 Tooltip 的包装层', async () => {
    mocks.listReports.mockResolvedValueOnce({ items: [pendingListItem], total: 1 });

    renderWithProviders(<ReportListView />);

    const regenerateButton = await screen.findByRole('button', { name: '重新生成（未开放）' });
    expect(regenerateButton).toBeDisabled();
    expect(regenerateButton.parentElement?.tagName).toBe('SPAN');
  });
});
