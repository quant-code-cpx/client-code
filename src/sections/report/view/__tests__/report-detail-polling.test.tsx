import type * as ReportApiModule from 'src/api/report';
import type * as ReactRouterDomModule from 'react-router-dom';

import { act, screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { ReportDetailView } from '../report-detail-view';

const mocks = vi.hoisted(() => ({
  getReportDetail: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDomModule>();
  return { ...actual, useParams: () => ({ id: 'report-pending' }) };
});

vi.mock('src/api/report', async (importOriginal) => {
  const actual = await importOriginal<typeof ReportApiModule>();
  return { ...actual, getReportDetail: mocks.getReportDetail };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

const pendingReport: ReportApiModule.Report = {
  id: 'report-pending',
  userId: 1,
  type: 'STOCK',
  title: '生成中的报告',
  params: {},
  data: null,
  filePath: null,
  format: 'JSON',
  status: 'GENERATING',
  errorMessage: null,
  fileSize: null,
  createdAt: '2026-08-10T00:00:00.000Z',
  completedAt: null,
};

afterEach(() => {
  vi.useRealTimers();
});

describe('ReportDetailView polling', () => {
  it('waits for a slow request to complete before scheduling the next poll', async () => {
    vi.useFakeTimers();
    const slowPoll = deferred<ReportApiModule.Report>();
    mocks.getReportDetail
      .mockResolvedValueOnce(pendingReport)
      .mockReturnValueOnce(slowPoll.promise)
      .mockResolvedValue(pendingReport);

    renderWithProviders(<ReportDetailView />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: '生成中的报告' })).toBeInTheDocument();
    expect(mocks.getReportDetail).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(mocks.getReportDetail).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    expect(mocks.getReportDetail).toHaveBeenCalledTimes(2);

    await act(async () => {
      slowPoll.resolve(pendingReport);
      await slowPoll.promise;
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2999);
    });
    expect(mocks.getReportDetail).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(mocks.getReportDetail).toHaveBeenCalledTimes(3);
  });
});
