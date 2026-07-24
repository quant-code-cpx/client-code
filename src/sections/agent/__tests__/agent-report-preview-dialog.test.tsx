import type { AgentResponse } from 'src/api/agent';

import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { AgentReportPreviewDialog } from '../components/agent-report-preview-dialog';

const mocks = vi.hoisted(() => ({ saveReport: vi.fn() }));

vi.mock('src/api/agent', () => ({ agentApi: mocks }));

type ReportSaveResponse = AgentResponse<'/agent/reports/save'>;

const preview: ReportSaveResponse = {
  requiresConfirmation: true,
  confirmationToken: 'confirmation-token-v1',
  preview: {
    runId: 'run_1',
    messageId: 'message_1',
    messageVersion: 1,
    title: '贵州茅台估值研究',
    summary: '关注估值与需求变化。',
    dataAsOf: '2026-07-22',
    citations: [
      {
        citationId: 'citation_1',
        blockId: 'block_1',
        claimKey: 'valuation',
        title: '上市公司公告',
        canonicalUrl: 'https://example.com/announcement',
        retrievedAt: '2026-07-22T10:00:00.000Z',
      },
    ],
    contentBlocks: [],
    confirmationExpiresAt: '2026-07-22T11:00:00.000Z',
  },
};

const saved: ReportSaveResponse = {
  requiresConfirmation: false,
  report: {
    reportId: 'report_1',
    runId: 'run_1',
    conversationId: 'conversation_1',
    messageId: 'message_1',
    messageVersion: 1,
    version: 1,
    status: 'QUEUED',
    title: '贵州茅台估值研究',
    summary: '关注估值与需求变化。',
    dataAsOf: '2026-07-22',
    journalId: null,
    errorMessage: null,
    createdAt: '2026-07-22T10:01:00.000Z',
    renderedAt: null,
    deletedAt: null,
  },
};

describe('AgentReportPreviewDialog', () => {
  beforeEach(() => {
    mocks.saveReport.mockReset();
  });

  it('RPT-UI-001: 打开仅请求预览，用户确认后才携带 token 与幂等键保存', async () => {
    mocks.saveReport.mockResolvedValueOnce(preview).mockResolvedValueOnce(saved);
    const onSaved = vi.fn();
    const { user } = renderWithProviders(
      <AgentReportPreviewDialog open runId="run_1" onClose={vi.fn()} onSaved={onSaved} />
    );

    expect(await screen.findByText('贵州茅台估值研究')).toBeInTheDocument();
    expect(screen.getByText('上市公司公告')).toBeInTheDocument();
    expect(mocks.saveReport).toHaveBeenCalledTimes(1);
    expect(mocks.saveReport).toHaveBeenCalledWith({ runId: 'run_1' });
    expect(onSaved).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '确认保存' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved.report));
    expect(mocks.saveReport).toHaveBeenCalledTimes(2);
    expect(mocks.saveReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ confirmationToken: 'confirmation-token-v1', clientRequestId: expect.any(String) })
    );
  });

  it('RPT-UI-002: 投资日志变更后必须刷新预览，不能用旧 token 确认写入', async () => {
    const refreshed = {
      ...preview,
      confirmationToken: 'confirmation-token-v2',
      preview: { ...preview.preview!, confirmationExpiresAt: '2026-07-22T11:05:00.000Z' },
    } satisfies ReportSaveResponse;
    mocks.saveReport.mockResolvedValueOnce(preview).mockResolvedValueOnce(refreshed).mockResolvedValueOnce(saved);
    const onSaved = vi.fn();
    const { user } = renderWithProviders(
      <AgentReportPreviewDialog open runId="run_1" onClose={vi.fn()} onSaved={onSaved} />
    );

    await screen.findByText('贵州茅台估值研究');
    await user.type(screen.getByLabelText('投资判断'), '估值回落后分批观察');

    expect(screen.getByRole('button', { name: '确认保存' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '更新预览' }));

    await waitFor(() =>
      expect(mocks.saveReport).toHaveBeenLastCalledWith({
        runId: 'run_1',
        journal: { thesis: '估值回落后分批观察' },
      })
    );
    expect(screen.getByRole('button', { name: '确认保存' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: '确认保存' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved.report));
    expect(mocks.saveReport).toHaveBeenLastCalledWith(
      expect.objectContaining({
        confirmationToken: 'confirmation-token-v2',
        clientRequestId: expect.any(String),
        journal: { thesis: '估值回落后分批观察' },
      })
    );
  });
});
